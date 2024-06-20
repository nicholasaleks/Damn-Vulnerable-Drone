from flask import Blueprint, jsonify, request
import socketio
from extensions import db
from models import TelemetryStatus, UdpDestination
import subprocess
from pymavlink import mavutil
import logging
import threading
import serial.tools.list_ports
from flask import render_template
from mavlink_connection import close_mavlink_connection, set_parameter

camera_bp = Blueprint('camera', __name__)

@camera_bp.route('/camera-stream')
def camera_stream():
    return render_template('cameraStream.html')