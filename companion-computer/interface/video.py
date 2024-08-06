# import rospy
# from sensor_msgs.msg import Image
# from cv_bridge import CvBridge
# import cv2
# from flask import Response

# class VideoStreamer:
#     def __init__(self):
#         self.bridge = CvBridge()
#         self.image_subscriber = rospy.Subscriber('/webcam/image_raw', Image, self.image_callback, queue_size=1)
#         self.frame = None

#     def image_callback(self, msg):
#         try:
#             cv_image = self.bridge.imgmsg_to_cv2(msg, desired_encoding='bgr8')
#             ret, jpeg = cv2.imencode('.jpg', cv_image)
#             if ret:
#                 self.frame = jpeg.tobytes()
#         except Exception as e:
#             print(f"Error converting image: {e}")

#     def get_frame(self):
#         while not rospy.is_shutdown():
#             if self.frame is not None:
#                 yield (b'--frame\r\n'
#                        b'Content-Type: image/jpeg\r\n\r\n' + self.frame + b'\r\n')
#             rospy.sleep(0.1)

def main():
    # rospy.init_node('camera_video_streamer', anonymous=True)
    # video_streamer = VideoStreamer()
    # rospy.spin()
    pass

if __name__ == '__main__':
    main()