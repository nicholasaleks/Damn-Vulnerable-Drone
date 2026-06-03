from __future__ import annotations

from pathlib import Path
import os
import json
import logging
import subprocess
import threading
import time
from logging.handlers import RotatingFileHandler
from typing import Optional
import queue

from flask import (
    Flask,
    flash,
    jsonify,
    make_response,
    redirect,
    render_template,
    request,
    url_for,
)
from flask_login import (
    LoginManager,
    current_user,
    login_required,
    login_user,
    logout_user,
)
from flask_socketio import SocketIO, emit
from flask_sock import Sock

from extensions import db
import mavlink_connection
from mavlink_connection import initialize_socketio, listen_to_mavlink
from gimbal_bridge import start_gimbal_bridge
from models import TelemetryStatus, UdpDestination, User
from routes.camera import camera_bp
from routes.logs import logs_bp
from routes.telemetry import telemetry_bp
from routes.wifi import wifi_bp

# ---------------------------------------------------------------------------
# Globals / singletons
# ---------------------------------------------------------------------------

socketio = SocketIO(
    async_mode="threading",
    cors_allowed_origins="*",
    logger=False,
    engineio_logger=False,
    serve_client=True,
    path="socket.io",
)
sock: Sock = Sock()

login_manager: LoginManager = LoginManager()
login_manager.login_view = "login"
login_manager.login_message = "You must be logged in to access this page."

DATABASE_PATH = "sqlite:///telemetry.db"
CONFIG_FILE = Path("/interface/config.json")
LOG_PATH = Path("logs/damn-vulnerable-companion-computer.log")

# ---- WS fanout state (for Flask-Sock) --------------------------------------
_ws_lock = threading.Lock()
_ws_queues: set[queue.Queue] = set()
_last_mav: dict | None = None


def _ws_publish(payload: dict) -> None:
    """Fan out payload to all connected Flask-Sock clients via their queues."""
    global _last_mav
    _last_mav = payload
    with _ws_lock:
        drop: list[queue.Queue] = []
        for q in list(_ws_queues):
            try:
                q.put_nowait(payload)
            except queue.Full:
                try:
                    _ = q.get_nowait()  # drop oldest
                except Exception:
                    pass
                try:
                    q.put_nowait(payload)
                except Exception:
                    drop.append(q)
        for q in drop:
            _ws_queues.discard(q)


# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------

@login_manager.user_loader
def load_user(user_id: str) -> Optional[User]:
    return User.query.get(int(user_id))


def configure_logging(app: Flask) -> None:
    LOG_PATH.parent.mkdir(exist_ok=True)
    file_handler = RotatingFileHandler(LOG_PATH, maxBytes=10_240, backupCount=10)
    file_handler.setFormatter(
        logging.Formatter("%(asctime)s %(levelname)s: %(message)s [%(pathname)s:%(lineno)d]")
    )
    file_handler.setLevel(logging.INFO)
    app.logger.addHandler(file_handler)


def get_host_gateway_ip() -> Optional[str]:
    try:
        out = subprocess.check_output(
            ["getent", "ahostsv4", "host.docker.internal"],
            stderr=subprocess.DEVNULL,
            text=True,
        ).strip()
        if out:
            return out.split()[0]
    except (FileNotFoundError, subprocess.CalledProcessError):
        pass
    try:
        out = subprocess.check_output(["ip", "route"], stderr=subprocess.DEVNULL, text=True)
        for line in out.splitlines():
            if line.startswith("default"):
                return line.split()[2]
    except (FileNotFoundError, subprocess.CalledProcessError):
        pass
    try:
        out = subprocess.check_output(["route", "-n"], stderr=subprocess.DEVNULL, text=True)
        for line in out.splitlines():
            cols = line.split()
            if cols and cols[0] == "0.0.0.0":
                return cols[1]
    except (FileNotFoundError, subprocess.CalledProcessError):
        pass
    return None


def create_app() -> Flask:
    app = Flask(__name__)
    app.secret_key = os.environ.get("FLASK_SECRET_KEY", "supersecretkey")

    # Initialise extensions
    login_manager.init_app(app)
    socketio.init_app(app, cors_allowed_origins="*")
    sock.init_app(app)  # <-- NEW (Flask-Sock)
    initialize_socketio(socketio)  # your existing pipeline that emits 'mavlink_message'

    # DB
    app.config.update(
        SQLALCHEMY_DATABASE_URI=DATABASE_PATH,
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
    )
    db.init_app(app)
    configure_logging(app)

    if CONFIG_FILE.exists():
        with CONFIG_FILE.open() as fp:
            app.config.update(json.load(fp))

    # Blueprints
    app.register_blueprint(telemetry_bp, url_prefix="/telemetry")
    app.register_blueprint(logs_bp, url_prefix="/logs")
    app.register_blueprint(wifi_bp, url_prefix="/wifi")
    app.register_blueprint(camera_bp, url_prefix="/camera")

    # -------------------- Pages --------------------

    @app.route("/")
    @login_required
    def index():
        return render_template("index.html")

    @app.route("/login", methods=["GET", "POST"])
    def login():
        if current_user.is_authenticated:
            return redirect(url_for("index"))

        if request.method == "POST":
            username = request.form.get("username")
            password = request.form.get("password")
            remember = request.form.get("remember_me") == "on"

            user = User.query.filter_by(username=username).first()
            if user and user.check_password(password):
                login_user(user, remember=remember)
                return redirect(request.args.get("next") or url_for("index"))

            flash("Invalid username or password")
            response = make_response(render_template("login.html"))
            response.status_code = 403
            return response

        return render_template("login.html")

    @app.route("/logout")
    def logout():
        logout_user()
        return redirect(url_for("index"))

    @app.route("/config", methods=["GET"])
    def get_config():
        if CONFIG_FILE.exists():
            with CONFIG_FILE.open() as fp:
                return jsonify(json.load(fp))
        return jsonify({}), 404

    # -------------------- Socket.IO --------------------

    @socketio.on("connect")
    def handle_connect(auth):  # noqa: D401, ANN001
        telemetry_status = TelemetryStatus.query.first()
        if not telemetry_status:
            telemetry_status = TelemetryStatus(status="Not Connected")
            db.session.add(telemetry_status)
            db.session.commit()

        if telemetry_status.status in {"Connected", "Connecting"}:
            try:
                subprocess.run(["pgrep", "-f", "mavlink-routerd"], check=True)
            except subprocess.CalledProcessError:
                telemetry_status.status = "Not Connected"
                db.session.commit()

        emit("telemetry_status", {"isTelemetryRunning": telemetry_status.status})

    @socketio.on("disconnect")
    def handle_disconnect():  # noqa: D401
        emit("telemetry_status", {"status": "disconnected"})

    # ---- Tee 'mavlink_message' to Flask-Sock --------------------------------
    _orig_emit = socketio.emit

    def _tee_emit(event, data=None, *args, **kwargs):
        try:
            if event == "mavlink_message" and data is not None:
                _ws_publish(data)
        except Exception:
            logging.exception("Flask-Sock publish failed")
        return _orig_emit(event, data, *args, **kwargs)

    socketio.emit = _tee_emit  # monkey-patch after init

    # -------------------- Flask-Sock WS --------------------

    @sock.route("/ws/telemetry")
    def ws_telemetry(ws):
        """
        Plain WebSocket feed for sim-lite.
        Sends the exact dict your server emits as 'mavlink_message'.
        """
        q: queue.Queue = queue.Queue(maxsize=200)
        with _ws_lock:
            _ws_queues.add(q)

        # Optional: push last known MAV frame immediately
        if _last_mav is not None:
            try:
                ws.send(json.dumps(_last_mav, default=str))
            except Exception:
                pass

        try:
            while True:
                payload = q.get()  # block until new frame
                ws.send(json.dumps(payload, default=str))
        except Exception:
            # client disconnected or send failed
            pass
        finally:
            with _ws_lock:
                _ws_queues.discard(q)

    @app.route("/socket-health")
    def socket_health():
        return jsonify({"socketio": True, "ws": "/ws/telemetry", "status": "up"})

    return app


# ---------------------------------------------------------------------------
# DB initialisation helpers
# ---------------------------------------------------------------------------

def add_default_user() -> None:
    if not User.query.filter_by(username="admin").first():
        new_user = User(username="admin")
        new_user.set_password("cyberdrone")
        db.session.add(new_user)
        db.session.commit()


def _ensure_mavros_endpoint() -> None:
    """mavlink-routerd forwards to every UdpDestination row as an `-e` peer.
    mavros listens on 14560 (kept off 14540 so it never contends with the
    Flask pymavlink listener). Seeded outside the first-run guard below so an
    existing telemetry.db still picks it up.
    """
    if not UdpDestination.query.filter_by(ip="127.0.0.1", port=14560).first():
        db.session.add(UdpDestination(ip="127.0.0.1", port=14560))
        db.session.commit()


def initialize_udp_destinations() -> None:
    _ensure_mavros_endpoint()
    if UdpDestination.query.filter(UdpDestination.port != 14560).first():
        return
    db.session.add(UdpDestination(ip="127.0.0.1", port=14540))

    ip_list = subprocess.check_output("hostname -I", shell=True, text=True).split()
    if "192.168.13.1" in ip_list:
        db.session.add(UdpDestination(ip="192.168.13.14", port=14550))
    else:
        db.session.add(UdpDestination(ip="10.13.0.4", port=14550))

    db.session.add(UdpDestination(ip="10.13.0.6", port=14550))

    host_ip = get_host_gateway_ip()
    if host_ip:
        if not UdpDestination.query.filter_by(ip=host_ip, port=14550).first():
            db.session.add(UdpDestination(ip=host_ip, port=14550))
    else:
        if not UdpDestination.query.filter_by(ip="255.255.255.255", port=14550).first():
            db.session.add(UdpDestination(ip="255.255.255.255", port=14550))

    db.session.commit()


# ---------------------------------------------------------------------------
# MAVLink thread helper
# ---------------------------------------------------------------------------

def start_mavlink_thread() -> None:
    while True:
        t = threading.Thread(target=listen_to_mavlink, daemon=True)
        t.start()
        t.join()
        print("MAVLink thread stopped, restarting in 5 seconds …")
        time.sleep(5)


# ---------------------------------------------------------------------------
# Entrypoint
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    app = create_app()

    with app.app_context():
        db.create_all()
        add_default_user()
        initialize_udp_destinations()
        threading.Thread(target=start_mavlink_thread, daemon=True).start()
        # Bridge ROS 2 /gimbal/cmd <-> Gazebo JointTrajectory + MAVLink
        # mount control. Lazy mav_connection getter because the MAVLink
        # listener thread above hasn't necessarily finished its first
        # handshake yet when we get here.
        start_gimbal_bridge(lambda: mavlink_connection.mav_connection)
        app.logger.info("Application startup")

    # debug=False: the Werkzeug reloader would otherwise fork a SECOND app
    # process, giving two of every ROS node (two gimbal_bridge subscribers,
    # two camera streamers, two MAVLink listeners on :14540) — which doubles
    # log lines and shows phantom subscribers in `ros2 topic info -v`. The
    # reloader is useless here anyway since code is baked into the image.
    socketio.run(app, debug=False, host="0.0.0.0", port=3000, allow_unsafe_werkzeug=True)
