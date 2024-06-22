from flask import Blueprint, jsonify, request, Response, render_template
import logging
from video import VideoStreamer


camera_bp = Blueprint('camera', __name__)

# Setup logging in this file to send log messages to the same file as the main application in app.py
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
file_handler = logging.FileHandler('logs/damn-vulnerable-companion-computer.log')
file_handler.setFormatter(formatter)
logger.addHandler(file_handler)


@camera_bp.route('/video_feed')
def video_feed():
    video_streamer = VideoStreamer()  # Assumes this class is accessible/imported
    return Response(video_streamer.get_frame(),
                    mimetype='multipart/x-mixed-replace; boundary=frame')

@camera_bp.route('/camera-stream')
def camera_stream():
    # Assuming 'cameraStream.html' has an img element for displaying the video
    return render_template('cameraStream.html')