import time
import os
from flask import Flask, Blueprint, jsonify, request, send_file
from flask import render_template
from pymavlink import mavutil

logs_bp = Blueprint('logs', __name__)

@logs_bp.route('/flight-logs')
def flight_logs():
    return render_template('flightLogs.html')

