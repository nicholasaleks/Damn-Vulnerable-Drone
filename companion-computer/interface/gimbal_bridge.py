"""ROS 2 <-> MAVLink gimbal bridge.

Subscribes to /gimbal/cmd (geometry_msgs/msg/Vector3) where each message
represents a delta in degrees:
    x = tilt delta (positive = up)
    y = pan  delta (positive = right)
    z = unused

On each message the bridge:
  1. Accumulates the delta into running pan / tilt targets, clamped to
     ArduPilot's mount limits (MNT1_PITCH_MIN/MAX, MNT1_YAW_MIN/MAX in
     drone.parm: +/-90 deg).
  2. Sends a MAV_CMD_DO_MOUNT_CONTROL MAVLink command on the shared
     pymavlink connection.

That single MAVLink command is the canonical control path on this branch:
ArduPilot's mount controller (MNT1_TYPE=1, MAVLink_Targeting mode)
processes it, ArduPilot computes servo PWM on SERVO9 (Mount1Yaw) and
SERVO10 (Mount1Pitch), libArduPilotPlugin reads those PWM values from
the FDM link, and runs a per-joint PID on gimbal_small_2d's pan_joint
and tilt_joint. The gimbal moves end-to-end through the real ArduPilot
servo path.

This is also what makes /gimbal/cmd a meaningful attack surface in the
lab: any participant on ROS_DOMAIN_ID=42 can publish to it and the
companion will dutifully translate to MAV_CMD_DO_MOUNT_CONTROL —
bypassing the Flask @login_required gate on /camera/gimbal/<direction>.

The bridge runs on a daemon thread inside the Flask app process so it
can share the existing pymavlink connection without fighting for the
UDP socket on :14540.
"""
import threading
import math
from typing import Callable

import rclpy
from rclpy.node import Node
from geometry_msgs.msg import Vector3

from pymavlink import mavutil


# Mount limits, mirroring MNT1_PITCH_MIN/MAX and MNT1_YAW_MIN/MAX in
# flight-controller/drone.parm. Bridge clamps locally so we never send a
# target ArduPilot would silently truncate.
PAN_MIN_DEG = -90.0
PAN_MAX_DEG = 90.0
TILT_MIN_DEG = -90.0
TILT_MAX_DEG = 90.0


def _clamp(value: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, value))


class GimbalBridge(Node):
    def __init__(self, get_mav_connection: Callable[[], object]):
        super().__init__('gimbal_bridge')
        # Lazy connection: resolved on every command because the MAVLink
        # listener thread may not have completed its first handshake yet
        # when the bridge starts.
        self._get_mav = get_mav_connection
        self._pan_deg = 0.0
        self._tilt_deg = 0.0

        self._sub = self.create_subscription(
            Vector3, '/gimbal/cmd', self._on_cmd, 10
        )
        self.get_logger().info(
            'Gimbal bridge up: /gimbal/cmd -> MAV_CMD_DO_MOUNT_CONTROL'
        )

    def _on_cmd(self, msg: Vector3) -> None:
        self._tilt_deg = _clamp(self._tilt_deg + msg.x, TILT_MIN_DEG, TILT_MAX_DEG)
        self._pan_deg = _clamp(self._pan_deg + msg.y, PAN_MIN_DEG, PAN_MAX_DEG)

        self._send_mavlink_mount_control()

        self.get_logger().info(
            f'cmd dx={msg.x:+.1f} dy={msg.y:+.1f} -> '
            f'pan={self._pan_deg:+.1f}deg tilt={self._tilt_deg:+.1f}deg'
        )

    def _send_mavlink_mount_control(self) -> None:
        mav = self._get_mav()
        if mav is None:
            self.get_logger().warn(
                'MAVLink connection not yet established; skipping mount command'
            )
            return
        try:
            mav.mav.command_long_send(
                mav.target_system,
                mav.target_component,
                mavutil.mavlink.MAV_CMD_DO_MOUNT_CONTROL,
                0,                                              # confirmation
                self._tilt_deg,                                 # param1: pitch deg
                0.0,                                            # param2: roll deg
                self._pan_deg,                                  # param3: yaw deg
                0.0, 0.0, 0.0,                                  # params 4-6 unused
                mavutil.mavlink.MAV_MOUNT_MODE_MAVLINK_TARGETING,  # param7: mode
            )
        except Exception as e:
            self.get_logger().warn(f'MAV_CMD_DO_MOUNT_CONTROL send failed: {e}')


_node: GimbalBridge = None
_thread: threading.Thread = None


def start_gimbal_bridge(get_mav_connection: Callable[[], object]) -> GimbalBridge:
    """Start the bridge on a daemon thread. Idempotent.

    get_mav_connection is a callable that returns the current pymavlink
    connection (or None if not yet established). It is resolved lazily on
    every command, so the bridge can be started before the MAVLink
    listener has finished its first handshake.
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
