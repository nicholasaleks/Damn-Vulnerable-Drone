import time
from flask import Blueprint, jsonify, render_template, request, send_from_directory
from mavlink_connection import create_mavlink_connection, mav_connection
from pymavlink import mavutil
import struct
import subprocess
import os
import logging

logs_bp = Blueprint('logs', __name__)

# Setup logging in this file to send log messages to the same file as the main application in app.py
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
file_handler = logging.FileHandler('logs/damn-vulnerable-companion-computer.log')
file_handler.setFormatter(formatter)
logger.addHandler(file_handler)

@logs_bp.route('/flight-logs')
def flight_logs():
    return render_template('flightLogs.html')

@logs_bp.route('/bin-logs', methods=['GET'])
def get_bin_logs():
    logger.info('Starting retrieval of binary logs from the vehicle')

    try:
        logger.debug("Establishing MAVLink connection over TCP to tcp:10.13.0.3:5760")
        mav_conn = mavutil.mavlink_connection('tcp:10.13.0.3:5760')

        logger.debug("Sending log request list message")
        mav_conn.mav.log_request_list_send(
            mav_conn.target_system,
            mav_conn.target_component,
            0,
            0xFFFF
        )

        logs = []
        received_log_ids = set()
        retries = 5  # Number of retries if no message is received

        while retries > 0:
            message = mav_conn.recv_match(type='LOG_ENTRY', blocking=True, timeout=10)
            if message:
                logger.debug(f"Received log entry: ID={message.id}, Size={message.size}, Time UTC={message.time_utc}")
                log_entry = {
                    'id': message.id,
                    'filename': f"{message.id:08d}.BIN",
                    'size': message.size,
                    'time_utc': message.time_utc,
                }
                if message.id not in received_log_ids:
                    logs.append(log_entry)
                    received_log_ids.add(message.id)
                    logger.debug(f"Added log entry {message.id} to list")
                retries = 5  # Reset retries on successful message reception

                # Check if we have received all logs
                if len(received_log_ids) == message.num_logs:
                    logger.info("All logs received")
                    break
            else:
                retries -= 1
                logger.warning(f"No message received, retries left: {retries}")

        logger.debug("Sending log request end message and closing connection")
        mav_conn.mav.log_request_end_send(
            mav_conn.target_system,
            mav_conn.target_component
        )
        mav_conn.close()

        # Sort logs by ID to ensure correct order
        logs.sort(key=lambda x: x['id'])
        logger.info("Successfully retrieved and sorted all logs")
        return jsonify(logs)
    except Exception as e:
        logger.error(f"Failed to retrieve logs: {e}", exc_info=True)
        # Close the connection in case of an exception
        if 'mav_conn' in locals():
            mav_conn.close()
        return jsonify({'error': str(e)}), 500
    
@logs_bp.route('/download-bin-log', methods=['GET'])
def download_bin_log():
    log_id = request.args.get('log_id')
    if not log_id:
        logger.error("Missing log_id parameter in request")
        return jsonify({'error': 'Missing log_id parameter'}), 400

    try:
        log_id_int = int(log_id)  # Validate that log_id is an integer
        formatted_log_id = f"{log_id_int:08d}.BIN"  # Pad the log_id with zeros to 8 digits and append .BIN extension
        local_file_path = f'/logs/{formatted_log_id}'
    except ValueError:
        logger.error(f"Invalid log_id parameter provided: {log_id}")
        return jsonify({'error': 'Invalid log_id parameter'}), 400

    if os.path.exists(local_file_path):
        logger.info(f"File {formatted_log_id} already exists locally and is now being served")
        return send_from_directory('/logs', formatted_log_id, as_attachment=True)

    # Connect to the flight controller
    master = mavutil.mavlink_connection('tcp:10.13.0.3:5760')
    master.wait_heartbeat()
    logger.info("Heartbeat from MAVLink system (ID %d component %d)" % (master.target_system, master.target_component))

    # Request to start log transfer
    master.mav.log_request_data_send(master.target_system, master.target_component, log_id_int, 0, 0xFFFFFFFF)
    
    # Attempt to receive the data
    try:
        with open(local_file_path, 'wb') as f:
            while True:
                msg = master.recv_match(type='LOG_DATA', blocking=True)
                if msg and msg.count > 0:
                    f.write(bytes(msg.data[:msg.count]))
                    logger.debug(f"Received log data segment: {bytes(msg.data[:msg.count]).hex()}")
                    if msg.count < 90:  # Typically less data indicates the last packet
                        logger.info(f"Completed downloading {formatted_log_id}")
                        break
                else:
                    logger.error("Failed to receive log data or incomplete data received.")
                    break
    except Exception as e:
        logger.error(f"An error occurred while downloading the file: {str(e)}")
        return jsonify({'error': 'Failed to download log file due to an error'}), 500

    # Check if file exists and serve it
    if os.path.exists(local_file_path):
        logger.info(f"File {formatted_log_id} downloaded successfully and is now being served")
        return send_from_directory('/logs', formatted_log_id, as_attachment=True)
    else:
        logger.error(f"File {formatted_log_id} does not exist after download attempt")
        return jsonify({'error': 'Failed to download log file'}), 500