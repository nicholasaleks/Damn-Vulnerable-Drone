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

wifi_bp = Blueprint('wifi', __name__)

@wifi_bp.route('/wifi-network')
def wifi_network():
    return render_template('wifiNetwork.html')