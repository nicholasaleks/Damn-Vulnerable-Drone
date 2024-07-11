from flask import Flask, render_template, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_socketio import SocketIO, emit
import json
import time
from models import UdpDestination, TelemetryStatus, User
import subprocess
import threading
from extensions import db
from routes.telemetry import telemetry_bp
from routes.logs import logs_bp
from routes.wifi import wifi_bp
from routes.camera import camera_bp
from mavlink_connection import listen_to_mavlink, initialize_socketio
import logging
from logging.handlers import RotatingFileHandler
import os
import rospy
from flask_login import LoginManager
from flask_login import current_user, login_user, logout_user, login_required
from flask import request, redirect, url_for, flash, make_response


socketio = SocketIO()
login_manager = LoginManager()
login_manager.login_view = 'login'
login_manager.login_message = "You must be logged in to access this page."

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

def configure_logging(app):
    # Configure logging
    if not os.path.exists('logs'):
        os.makedirs('logs')
    file_handler = RotatingFileHandler('logs/damn-vulnerable-companion-computer.log', maxBytes=10240, backupCount=10)
    file_handler.setFormatter(logging.Formatter(
        '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'))
    file_handler.setLevel(logging.INFO)
    app.logger.addHandler(file_handler)

def create_app():
    app = Flask(__name__)
    app.secret_key = 'supersecretkey'
    login_manager.init_app(app)
    rospy.init_node('camera_display_node', anonymous=True)

    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///telemetry.db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    db.init_app(app)
    socketio.init_app(app)
    initialize_socketio(socketio)

    configure_logging(app)

    # Load configuration
    with open('/interface/config.json') as config_file:
        config = json.load(config_file)

    # Register blueprints
    app.register_blueprint(telemetry_bp, url_prefix='/telemetry')
    app.register_blueprint(logs_bp, url_prefix='/logs')
    app.register_blueprint(wifi_bp, url_prefix='/wifi')
    app.register_blueprint(camera_bp, url_prefix='/camera')

    @app.route('/')
    @login_required
    def index():
        return render_template('index.html')
    
    @app.route('/login', methods=['GET', 'POST'])
    def login():
        if current_user.is_authenticated:
            return redirect(url_for('index'))

        if request.method == 'POST':
            username = request.form.get('username')
            password = request.form.get('password')
            remember = request.form.get('remember_me') == 'on'

            user = User.query.filter_by(username=username).first()
            if user and user.check_password(password):
                login_user(user, remember=remember)
                next_page = request.args.get('next') or url_for('index')
                return redirect(next_page)
            else:
                flash('Invalid username or password')
                response = make_response(render_template('login.html'))
                response.status_code = 403
                return response

        return render_template('login.html')

    @app.route('/logout')
    def logout():
        logout_user()
        return redirect(url_for('index'))

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

def add_default_user():
    
    # Check if the default user exists
    default_user = User.query.filter_by(username='admin').first()
    if not default_user:
        # Create and add the default user
        new_user = User(username='admin')
        new_user.set_password('defaultpassword')
        db.session.add(new_user)
        db.session.commit()
        print('Added default user')
    else:
        print('Default user already exists')

def initialize_udp_destinations():

    default_destination = UdpDestination.query.filter_by(ip='127.0.0.1', port=14540).first()
    if not default_destination:
        local_destination = UdpDestination(ip='127.0.0.1', port=14540)
        db.session.add(local_destination)

        ip_list = subprocess.check_output("hostname -I", shell=True).decode().split(" ")
        if "192.168.13.1" in ip_list:
            # Add 192.168.13.14 as a default destination
            gcs_destination = UdpDestination(ip='192.168.13.14', port=14550)
        else:
            # Add 10.13.0.4 as a default destination
            gcs_destination = UdpDestination(ip='10.13.0.4', port=14550)

        db.session.add(gcs_destination)

        qgc_destination = UdpDestination(ip='10.13.0.6', port=14550)
        db.session.add(qgc_destination)

        db.session.commit()


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
        add_default_user()
        initialize_udp_destinations()
        threading.Thread(target=start_mavlink_thread).start()
        app.logger.info('Application startup')
    socketio.run(app, debug=True, host='0.0.0.0', port=3000, allow_unsafe_werkzeug=True)