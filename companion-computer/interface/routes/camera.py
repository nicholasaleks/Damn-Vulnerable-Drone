from flask import Blueprint, jsonify, request, Response, render_template
import logging
import threading
from video import get_streamer
from flask_login import login_required

import rclpy
from geometry_msgs.msg import Vector3

camera_bp = Blueprint('camera', __name__)

# Setup logging in this file to send log messages to the same file as the main application in app.py
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
file_handler = logging.FileHandler('logs/damn-vulnerable-companion-computer.log')
file_handler.setFormatter(formatter)
logger.addHandler(file_handler)


# ---------------------------------------------------------------------------
# /gimbal/cmd publisher (module-level singleton).
#
# The web UI direction buttons POST to /camera/gimbal/<direction>, which
# is translated to a geometry_msgs/Vector3 delta and published to
# /gimbal/cmd. The gimbal_bridge subscriber (in the same Flask process)
# consumes the message, accumulates the target, and publishes a
# trajectory_msgs/msg/JointTrajectory to /set_joint_trajectory; the
# simulator's libgazebo_ros_joint_pose_trajectory plugin applies the
# target directly to the gimbal joints. No MAVLink path involved.
#
# Per click delta in degrees:
GIMBAL_STEP_DEG = 10.0

# direction -> (tilt_delta, pan_delta) in degrees
_GIMBAL_DELTAS = {
    'up':    ( GIMBAL_STEP_DEG, 0.0),
    'down':  (-GIMBAL_STEP_DEG, 0.0),
    'left':  (0.0, -GIMBAL_STEP_DEG),
    'right': (0.0,  GIMBAL_STEP_DEG),
}

_pub_lock = threading.Lock()
_gimbal_node = None
_gimbal_pub = None


def _get_gimbal_publisher():
    global _gimbal_node, _gimbal_pub
    with _pub_lock:
        if _gimbal_pub is None:
            if not rclpy.ok():
                rclpy.init()
            _gimbal_node = rclpy.create_node('camera_gimbal_cmd_publisher')
            _gimbal_pub = _gimbal_node.create_publisher(Vector3, '/gimbal/cmd', 10)
    return _gimbal_pub


@camera_bp.route('/video_feed')
def video_feed():
    return Response(get_streamer().get_frame(),
                    mimetype='multipart/x-mixed-replace; boundary=frame')


@camera_bp.route('/camera-stream')
@login_required
def camera_stream():
    # Assuming 'cameraStream.html' has an img element for displaying the video
    return render_template('cameraStream.html')


@camera_bp.route('/gimbal/<direction>', methods=['POST'])
@login_required
def gimbal_control(direction):
    """Move the gimbal one fixed step in the requested direction.

    direction: one of {'up', 'down', 'left', 'right'}
    """
    if direction not in _GIMBAL_DELTAS:
        return jsonify({'error': 'unknown direction', 'direction': direction}), 400

    tilt_delta, pan_delta = _GIMBAL_DELTAS[direction]
    msg = Vector3()
    msg.x = float(tilt_delta)
    msg.y = float(pan_delta)
    msg.z = 0.0
    _get_gimbal_publisher().publish(msg)

    logger.info('Gimbal step %s -> tilt %+.1fdeg / pan %+.1fdeg', direction, tilt_delta, pan_delta)
    return jsonify({'ok': True, 'direction': direction, 'tilt_delta_deg': tilt_delta, 'pan_delta_deg': pan_delta})