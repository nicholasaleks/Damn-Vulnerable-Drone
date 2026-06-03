"""HTTP MJPEG video streamer used by /camera/video_feed.

Ported from rospy to rclpy for the ROS 2 Humble migration. Two changes
that aren't a straight 1:1 substitution:

1. Singleton via get_streamer(). The pre-migration master branch
   constructed a fresh VideoStreamer per HTTP request — under rclpy
   that means creating a new Node + subscription per request, which
   leaks rclpy resources and creates duplicate subscribers. We now
   build one VideoStreamer per process and route every request to it.

2. Explicit spin on a daemon thread. rospy dispatched callbacks
   implicitly; rclpy requires you to spin an executor. We do that on
   a daemon thread so the Flask request handlers (and the existing
   socketio loop) are unaffected.

Subscriber QoS is SensorData (KEEP_LAST, BEST_EFFORT) to match the
Humble gazebo_ros_pkgs camera plugin's default profile.
"""
import threading
import time

import rclpy
from rclpy.executors import SingleThreadedExecutor
from rclpy.qos import qos_profile_sensor_data
from sensor_msgs.msg import Image
from cv_bridge import CvBridge
import cv2


class VideoStreamer:
    def __init__(self):
        if not rclpy.ok():
            rclpy.init()
        self.node = rclpy.create_node('camera_video_streamer')
        self.bridge = CvBridge()
        self.frame = None
        self.subscription = self.node.create_subscription(
            Image, '/webcam/image_raw', self._image_callback, qos_profile_sensor_data
        )
        # Dedicated SingleThreadedExecutor per node. rclpy.spin(node) shares
        # a single process-wide global executor, so a second spin from
        # another thread (e.g. gimbal_bridge) raises "generator already
        # executing" and the callback never fires.
        self._executor = SingleThreadedExecutor()
        self._executor.add_node(self.node)
        self._spin_thread = threading.Thread(target=self._executor.spin, daemon=True)
        self._spin_thread.start()

    def _image_callback(self, msg):
        try:
            cv_image = self.bridge.imgmsg_to_cv2(msg, desired_encoding='bgr8')
            ret, jpeg = cv2.imencode('.jpg', cv_image)
            if ret:
                self.frame = jpeg.tobytes()
        except Exception as e:
            print(f"Error converting image: {e}")

    def get_frame(self):
        while rclpy.ok():
            if self.frame is not None:
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + self.frame + b'\r\n')
            time.sleep(0.1)


_singleton = None
_lock = threading.Lock()


def get_streamer() -> VideoStreamer:
    """Return the per-process VideoStreamer, constructing it on first call."""
    global _singleton
    with _lock:
        if _singleton is None:
            _singleton = VideoStreamer()
    return _singleton


def main():
    get_streamer()
    try:
        while rclpy.ok():
            time.sleep(1)
    except KeyboardInterrupt:
        pass


if __name__ == '__main__':
    main()
