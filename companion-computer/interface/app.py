from flask import Flask, render_template, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_socketio import SocketIO, emit
import json
import time
import subprocess
import threading
from models import TelemetryStatus
from extensions import db
from routes.telemetry import telemetry_bp
from routes.logs import logs_bp
from mavlink_connection import listen_to_mavlink, initialize_socketio

socketio = SocketIO()

def create_app():
    app = Flask(__name__)
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///telemetry.db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    db.init_app(app)
    socketio.init_app(app)
    initialize_socketio(socketio)

    # Load configuration
    with open('/interface/config.json') as config_file:
        config = json.load(config_file)

    # Register blueprints
    app.register_blueprint(telemetry_bp, url_prefix='/telemetry')
    app.register_blueprint(logs_bp, url_prefix='/logs')

    @app.route('/')
    def index():
        return render_template('index.html')

    @app.route('/config', methods=['GET'])
    def get_config():
        with open('/interface/config.json') as config_file:
            config = json.load(config_file)
        return jsonify(config)

    @socketio.on('connect')
    def handle_connect(auth):
        telemetry_status = TelemetryStatus.query.first()

        if telemetry_status and telemetry_status.status == "Connected":
            try:
                subprocess.run(["pgrep", "-f", "mavlink-routerd"], check=True)
            except subprocess.CalledProcessError:
                telemetry_status.status = "Not Connected"
                db.session.commit()
        elif telemetry_status and telemetry_status.status == "Connecting":
            try:
                subprocess.run(["pgrep", "-f", "mavlink-routerd"], check=True)
            except subprocess.CalledProcessError:
                telemetry_status.status = "Not Connected"
                db.session.commit()
        else:
            telemetry_status = TelemetryStatus(status="Not Connected")
            db.session.add(telemetry_status)
            db.session.commit()

        emit('telemetry_status', {'isTelemetryRunning': telemetry_status.status})

    @socketio.on('disconnect')
    def handle_disconnect():
        emit('telemetry_status', {'status': 'disconnected'})

    return app

def start_mavlink_thread():
    while True:
        mavlink_thread = threading.Thread(target=listen_to_mavlink)
        mavlink_thread.start()
        mavlink_thread.join()  # Wait for the thread to finish
        print("MAVLink thread stopped, restarting in 5 seconds...")
        time.sleep(5)  # Wait a bit before restarting

if __name__ == '__main__':
    app = create_app()
    with app.app_context():
        db.create_all()
        threading.Thread(target=start_mavlink_thread).start()
    socketio.run(app, debug=True, host='0.0.0.0', port=3000, allow_unsafe_werkzeug=True)