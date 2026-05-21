"""ROS 2 <-> MAVLink gimbal bridge.

Subscribes to /gimbal/cmd (geometry_msgs/msg/Vector3) where each message
represents a delta in degrees:
    x = tilt delta (positive = up)
    y = pan  delta (positive = right)
    z = unused

On each message the bridge:
  1. Accumulates the delta into running pan / tilt targets, clamped to
     the joint limits declared in the gimbal SDF (pan +/-90 deg, tilt
     -5.7 .. 180 deg).
  2. Publishes a trajectory_msgs/msg/JointTrajectory to
     /gimbal/set_joint_trajectory. The libgazebo_ros_joint_pose_trajectory
     world plugin (declared in damn-vulnerable-drone.world) listens on
     that topic and instantly sets the named joints. This is what
     actually moves the gimbal visually.
  3. Sends a MAV_CMD_DO_MOUNT_CONTROL MAVLink command on the shared
     pymavlink connection. ArduPilot's mount type isn't configured for
     this gimbal (flight-controller is intentionally untouched per the
     migration constraints), so ArduPilot does not act on the command —
     but the frame is on the wire, visible to packet sniffers, and
     injectable by attackers, which is exactly the surface the lab wants
     to teach.

The bridge runs on a daemon thread inside the Flask app process so it
can share the existing mav_connection without fighting for the UDP
socket on :14540.
"""
import threading
import math
from typing import Callable, Optional

import rclpy
from rclpy.node import Node
from geometry_msgs.msg import Vector3
from trajectory_msgs.msg import JointTrajectory, JointTrajectoryPoint
from builtin_interfaces.msg import Duration

from pymavlink import mavutil


# Joint limits in radians, mirroring gimbal_small_2d/model.sdf.
PAN_MIN_RAD = -math.pi / 2.0
PAN_MAX_RAD = math.pi / 2.0
TILT_MIN_RAD = -0.1
TILT_MAX_RAD = math.pi


def _clamp(value: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, value))


class GimbalBridge(Node):
    def __init__(self, get_mav_connection: Callable[[], object]):
        super().__init__('gimbal_bridge')
        # We resolve the MAVLink connection lazily on every command because
        # the connection is established by listen_to_mavlink() in a separate
        # thread and may not exist yet at the moment the bridge is started.
        self._get_mav = get_mav_connection
        self._pan_rad = 0.0
        self._tilt_rad = 0.0

        self._sub = self.create_subscription(
            Vector3, '/gimbal/cmd', self._on_cmd, 10
        )
        self._traj_pub = self.create_publisher(
            JointTrajectory, '/gimbal/set_joint_trajectory', 10
        )
        self.get_logger().info(
            'Gimbal bridge up: /gimbal/cmd -> JointTrajectory + MAVLink mount control'
        )

    def _on_cmd(self, msg: Vector3) -> None:
        tilt_delta_rad = math.radians(msg.x)
        pan_delta_rad = math.radians(msg.y)

        self._tilt_rad = _clamp(self._tilt_rad + tilt_delta_rad, TILT_MIN_RAD, TILT_MAX_RAD)
        self._pan_rad = _clamp(self._pan_rad + pan_delta_rad, PAN_MIN_RAD, PAN_MAX_RAD)

        self._publish_joint_trajectory()
        self._send_mavlink_mount_control()

        self.get_logger().info(
            f'cmd dx={msg.x:+.1f} dy={msg.y:+.1f} -> '
            f'pan={math.degrees(self._pan_rad):+.1f}deg '
            f'tilt={math.degrees(self._tilt_rad):+.1f}deg'
        )

    def _publish_joint_trajectory(self) -> None:
        msg = JointTrajectory()
        msg.header.stamp = self.get_clock().now().to_msg()
        # Empty frame_id tells the plugin to search every model in the
        # world for the named joints. The gimbal joints have unique names
        # in this world so an unqualified lookup is unambiguous.
        msg.header.frame_id = ''
        msg.joint_names = ['pan_joint', 'tilt_joint']

        point = JointTrajectoryPoint()
        point.positions = [self._pan_rad, self._tilt_rad]
        point.time_from_start = Duration(sec=0, nanosec=0)
        msg.points = [point]

        self._traj_pub.publish(msg)

    def _send_mavlink_mount_control(self) -> None:
        mav = self._get_mav()
        if mav is None:
            return
        try:
            mav.mav.command_long_send(
                mav.target_system,
                mav.target_component,
                mavutil.mavlink.MAV_CMD_DO_MOUNT_CONTROL,
                0,                                              # confirmation
                math.degrees(self._tilt_rad),                   # param1: pitch deg
                0.0,                                            # param2: roll deg
                math.degrees(self._pan_rad),                    # param3: yaw deg
                0.0, 0.0, 0.0,                                  # params 4-6 unused
                mavutil.mavlink.MAV_MOUNT_MODE_MAVLINK_TARGETING,  # param7: mode
            )
        except Exception as e:
            self.get_logger().warn(f'MAV_CMD_DO_MOUNT_CONTROL send failed: {e}')


_node: Optional[GimbalBridge] = None
_thread: Optional[threading.Thread] = None


def start_gimbal_bridge(get_mav_connection: Callable[[], object]) -> GimbalBridge:
    """Start the bridge on a daemon thread. Idempotent.

    get_mav_connection is a callable that returns the current pymavlink
    connection (or None if not yet established). It is resolved lazily on
    every command, so the bridge can be started before the MAVLink
    listener has finished its first handshake.

    Returns the GimbalBridge node. Reuses the same rclpy context that
    video.py already initialised.
    """
    global _node, _thread
    if _node is not None:
        return _node

    if not rclpy.ok():
        rclpy.init()

    _node = GimbalBridge(get_mav_connection)

    def _spin():
        try:
            rclpy.spin(_node)
        except Exception:
            pass

    _thread = threading.Thread(target=_spin, daemon=True)
    _thread.start()
    return _node
