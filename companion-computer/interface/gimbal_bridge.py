"""ROS 2 gimbal control bridge.

Subscribes to /gimbal/cmd (geometry_msgs/msg/Vector3), where each
message is a delta in degrees:
    x = tilt delta (positive = up)
    y = pan  delta (positive = right)
    z = unused

On each message the bridge accumulates the delta into running pan/tilt
targets (clamped to +/-90 deg) and publishes a
trajectory_msgs/msg/JointTrajectory to /set_joint_trajectory.

The libgazebo_ros_joint_pose_trajectory plugin loaded by the iris_demo
model picks the message up and sets the gimbal_small_2d::pan_joint and
gimbal_small_2d::tilt_joint positions directly. This bypasses ArduPilot
entirely — the MAVLink mount path produced FDM-side NaN that crashed
SITL with SIGFPE; pure ROS 2 keeps SITL untouched.

The bridge runs on a daemon thread inside the Flask app process. It
holds its own SingleThreadedExecutor because rclpy.spin() shares one
global executor across the process and the video streamer also needs
to spin its own node concurrently.
"""
import threading

import rclpy
from rclpy.executors import SingleThreadedExecutor
from rclpy.node import Node
from trajectory_msgs.msg import JointTrajectory, JointTrajectoryPoint
from geometry_msgs.msg import Vector3
from builtin_interfaces.msg import Duration


# Tilt (pitch) is gimbal_small_2d::tilt_joint. Pan (yaw) reuses the
# existing iris_gimbal_mount joint (axis 0 0 1) that attaches the gimbal
# to the drone — its limits were unlocked in iris_with_ardupilot/model.sdf.
# Adding a *new* pan_link was tried earlier and crashed SITL via ODE NaN;
# reusing an existing joint avoids adding inertia, so that failure mode
# does not apply.
#
# The UI's up/right buttons are inverted relative to the joints' positive
# rotation directions, so deltas are negated when accumulated (up tilts
# toward the horizon, down toward the ground; right yaws clockwise).
TILT_MIN_DEG = -5.7   # matches gimbal_small_2d tilt_joint lower limit (-0.1 rad)
TILT_MAX_DEG = 180.0  # matches gimbal_small_2d tilt_joint upper limit (pi rad)
PAN_MIN_DEG = -90.0   # matches iris_gimbal_mount lower limit (-1.5708 rad)
PAN_MAX_DEG = 90.0    # matches iris_gimbal_mount upper limit (+1.5708 rad)

# The joint_pose_trajectory plugin resolves names via Model::GetJoint,
# which matches a joint's full model-scoped name. gimbal_small_2d is
# included into the top-level iris_demo model, so the scoped name carries
# BOTH levels: iris_demo::gimbal_small_2d::tilt_joint. Dropping the
# iris_demo prefix makes the plugin log "Joint [...] not found".
TILT_JOINT = "iris_demo::gimbal_small_2d::tilt_joint"
PAN_JOINT = "iris_demo::iris_gimbal_mount"


def _clamp(value: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, value))


def _deg2rad(deg: float) -> float:
    return deg * 3.141592653589793 / 180.0


class GimbalBridge(Node):
    def __init__(self):
        super().__init__('gimbal_bridge')
        self._tilt_deg = 0.0
        self._pan_deg = 0.0

        self._sub = self.create_subscription(
            Vector3, '/gimbal/cmd', self._on_cmd, 10
        )
        self._traj_pub = self.create_publisher(
            JointTrajectory, '/set_joint_trajectory', 10
        )
        self.get_logger().info(
            f'Gimbal bridge up: /gimbal/cmd -> /set_joint_trajectory '
            f'(joint: {TILT_JOINT})'
        )

    def _on_cmd(self, msg: Vector3) -> None:
        # Negate: UI up/right are inverted vs. the joints' positive rotation.
        self._tilt_deg = _clamp(self._tilt_deg - msg.x, TILT_MIN_DEG, TILT_MAX_DEG)
        self._pan_deg = _clamp(self._pan_deg - msg.y, PAN_MIN_DEG, PAN_MAX_DEG)

        self._publish_trajectory()

        # debug-level: fires on every /gimbal/cmd, so it floods the compose
        # output during normal use. The one-time "Gimbal bridge up" info line
        # in __init__ is enough to confirm the bridge is running.
        self.get_logger().debug(
            f'cmd dx={msg.x:+.1f} dy={msg.y:+.1f} -> '
            f'tilt={self._tilt_deg:+.1f}deg pan={self._pan_deg:+.1f}deg'
        )

    def _publish_trajectory(self) -> None:
        traj = JointTrajectory()
        # The joint_pose_trajectory plugin reads header.frame_id as the
        # reference-link name. "world" tells it to drive the joints with no
        # reference link; an empty string makes it abort with
        # "needs a reference link [] as frame_id" and never moves the gimbal.
        traj.header.frame_id = 'world'
        traj.joint_names = [TILT_JOINT, PAN_JOINT]

        point = JointTrajectoryPoint()
        point.positions = [_deg2rad(self._tilt_deg), _deg2rad(self._pan_deg)]
        # libgazebo_ros_joint_pose_trajectory honors time_from_start; a
        # small non-zero value keeps the move smooth instead of teleporting.
        point.time_from_start = Duration(sec=0, nanosec=200_000_000)  # 0.2s
        traj.points.append(point)

        self._traj_pub.publish(traj)


_node: GimbalBridge = None
_thread: threading.Thread = None
_executor: SingleThreadedExecutor = None


def start_gimbal_bridge(get_mav_connection=None) -> GimbalBridge:
    """Start the bridge on a daemon thread. Idempotent.

    get_mav_connection is accepted for backward compatibility with the
    previous MAVLink-based bridge but is unused; the bridge no longer
    touches the MAVLink connection.
    """
    global _node, _thread, _executor
    if _node is not None:
        return _node

    if not rclpy.ok():
        rclpy.init()

    _node = GimbalBridge()
    _executor = SingleThreadedExecutor()
    _executor.add_node(_node)
    _thread = threading.Thread(target=_executor.spin, daemon=True)
    _thread.start()
    return _node
