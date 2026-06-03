#!/usr/bin/env python3
"""RTSP republisher: subscribe to /webcam/image_raw, expose via GStreamer
RTSP server on port 554.

Ported from rospy to rclpy for the ROS 2 Humble migration. The behavioural
contract is unchanged:
  - Subscribes to the same topic: /webcam/image_raw (sensor_msgs/msg/Image)
  - Serves the same RTSP path: rtsp://<host>:554/stream1
  - Encodes the same way: BGR -> H.264 (ultrafast, zerolatency)

Implementation note: in rospy, callback dispatch happens implicitly off
the global node spin. rclpy requires an explicit executor, so we spin the
node on a daemon thread while the GLib main loop runs in the foreground.

Subscriber QoS uses the SensorData preset (KEEP_LAST, BEST_EFFORT). The
Humble gazebo_ros_pkgs camera plugin publishes with that profile, so a
default RELIABLE subscription would silently fail to bind.
"""
import threading

import rclpy
from rclpy.logging import LoggingSeverity
from rclpy.qos import qos_profile_sensor_data
from sensor_msgs.msg import Image
import cv2
from cv_bridge import CvBridge
import gi

gi.require_version('Gst', '1.0')
gi.require_version('GstRtspServer', '1.0')
gi.require_version('GLib', '2.0')
from gi.repository import Gst, GstRtspServer, GLib

Gst.init(None)


class SensorFactory(GstRtspServer.RTSPMediaFactory):
    def __init__(self, node, **properties):
        super().__init__(**properties)
        self.node = node
        self.number_frames = 0
        self.bridge = CvBridge()
        self.cv_image = None
        self.launch_string = (
            'appsrc name=source is-live=true block=true format=GST_FORMAT_TIME '
            'caps=video/x-raw,format=BGR,width=640,height=480,framerate=30/1 ! '
            'videoconvert ! x264enc noise-reduction=10000 speed-preset=ultrafast '
            'tune=zerolatency ! rtph264pay name=pay0 pt=96'
        )
        self.sub = node.create_subscription(
            Image, '/webcam/image_raw', self.on_frame, qos_profile_sensor_data
        )

    def on_frame(self, data):
        self.node.get_logger().info('Frame received')
        try:
            self.cv_image = self.bridge.imgmsg_to_cv2(data, 'bgr8')
        except Exception as e:
            self.node.get_logger().error(
                'Error converting ROS Image message to OpenCV image: {}'.format(e)
            )

    def do_create_element(self, url):
        pipeline = Gst.parse_launch(self.launch_string)
        appsrc = pipeline.get_by_name('source')
        appsrc.connect('need-data', self.need_data)
        return pipeline

    def need_data(self, src, length):
        if self.cv_image is not None:
            data = self.cv_image.tobytes()
            buf = Gst.Buffer.new_allocate(None, len(data), None)
            buf.fill(0, data)
            src.emit('push-buffer', buf)
            self.number_frames += 1
        else:
            self.node.get_logger().warn('No image available')


class GstServer:
    def __init__(self, node):
        self.server = GstRtspServer.RTSPServer()
        self.server.set_service('554')
        factory = SensorFactory(node)
        factory.set_shared(True)
        self.server.get_mount_points().add_factory('/stream1', factory)
        self.server.attach(None)


def _spin_ros(node):
    try:
        rclpy.spin(node)
    except Exception:
        pass


if __name__ == '__main__':
    rclpy.init()
    node = rclpy.create_node('camera_rtsp_streamer')
    node.get_logger().set_level(LoggingSeverity.WARN)

    threading.Thread(target=_spin_ros, args=(node,), daemon=True).start()

    s = GstServer(node)
    loop = GLib.MainLoop()
    try:
        loop.run()
    except KeyboardInterrupt:
        loop.quit()
    finally:
        node.destroy_node()
        rclpy.shutdown()
