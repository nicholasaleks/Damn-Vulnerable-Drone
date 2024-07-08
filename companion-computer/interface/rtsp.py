#!/usr/bin/env python
import rospy
from sensor_msgs.msg import Image
import cv2
from cv_bridge import CvBridge
import gi
gi.require_version('Gst', '1.0')
gi.require_version('GstRtspServer', '1.0')
gi.require_version('GLib', '2.0')
from gi.repository import Gst, GstRtspServer, GLib

# Initialize GStreamer
Gst.init(None)

class SensorFactory(GstRtspServer.RTSPMediaFactory):
    def __init__(self, **properties):
        super(SensorFactory, self).__init__(**properties)
        self.number_frames = 0
        self.bridge = CvBridge()
        self.cv_image = None
        self.launch_string = (
            'appsrc name=source is-live=true block=true format=GST_FORMAT_TIME '
            'caps=video/x-raw,format=BGR,width=640,height=480,framerate=30/1 ! '
            'videoconvert ! x264enc noise-reduction=10000 speed-preset=ultrafast '
            'tune=zerolatency ! rtph264pay name=pay0 pt=96'
        )
        self.sub = rospy.Subscriber("/webcam/image_raw", Image, self.on_frame)

    def on_frame(self, data):
        rospy.loginfo("Frame received")
        try:
            self.cv_image = self.bridge.imgmsg_to_cv2(data, "bgr8")
        except Exception as e:
            rospy.logerr('Error converting ROS Image message to OpenCV image: {}'.format(e))

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
            rospy.logwarn('No image available')

class GstServer:
    def __init__(self):
        self.server = GstRtspServer.RTSPServer()
        self.server.set_service("554")
        factory = SensorFactory()
        factory.set_shared(True)
        self.server.get_mount_points().add_factory("/stream1", factory)
        self.server.attach(None)

if __name__ == '__main__':
    rospy.init_node('camera_rtsp_streamer', anonymous=True, log_level=rospy.WARN)
    s = GstServer()
    loop = GLib.MainLoop()
    try:
        loop.run()
    except KeyboardInterrupt:
        loop.quit()