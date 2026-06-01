# ROS 2 Attack Scenarios (ros2-migration branch)

This branch migrates Damn Vulnerable Drone from ROS 1 Noetic to **ROS 2** and adds
a set of DDS-specific attack walkthroughs. This document explains what each
scenario is, *why it works*, and how the pieces fit together.

> **Where the walkthroughs live.** The source-of-truth versions are YAML files
> rendered by the management web console at `http://localhost:8000`
> (`simulator/mgmt/templates/pages/attacks/**/*.yaml`). Parallel Markdown copies
> for the public GitHub Wiki live in `wiki-staging/`. Keep the two in sync if you
> edit either.

---

## The one idea behind all of them: ROS 2 has no master, and no auth by default

In ROS 1 there was a central `ROS_MASTER_URI`. In ROS 2 that's gone. Nodes find
each other peer-to-peer over **DDS / RTPS** (Real-Time Publish-Subscribe) on UDP
ports in the `7400–7700` range. A node "joins the graph" simply by sharing the
same **`ROS_DOMAIN_ID`** and being reachable on the network — there is **no
authentication, no token, and no signature check** on the data plane unless you
deploy SROS 2 (which almost nobody does).

That single fact is what every scenario below exploits:

- **Enumerate** the graph because discovery is open (Reconnaissance).
- **Publish** to any topic because there's no publisher auth (Injection, DoS).
- **Record and replay** any topic because there's no per-topic permission and no
  replay protection (Exfiltration).

### How the lab is wired

| Container | IP | ROS 2 distro |
|---|---|---|
| companion-computer | `10.13.0.3` | Humble (Ubuntu 22.04) |
| simulator | `10.13.0.5` | Foxy (Ubuntu 20.04) |

- **Domain:** `ROS_DOMAIN_ID=42`
- **DDS impl:** Cyclone DDS (`RMW_IMPLEMENTATION=rmw_cyclonedds_cpp`)
- **Discovery:** multicast doesn't reliably cross Docker bridges, so the lab uses
  an explicit **unicast peers** list (`dds/cyclonedds.xml`) naming `10.13.0.3`
  and `10.13.0.5`.
- The simulator's Gazebo camera publishes frames on **`/webcam/image_raw`**; the
  companion-computer subscribes and re-serves them as the RTSP stream at
  `rtsp://10.13.0.3:554/stream1`.

### The attacker's standard foothold

Every scenario starts the same way: run a ROS 2 container on the lab's Docker
network, give it the lab's domain ID + Cyclone peers config, and you are now a
first-class participant in the graph.

```sh
docker run -it --network=simulator --ip=10.13.0.10 \
    osrf/ros:humble-desktop bash

# inside the container:
# osrf/ros:humble-desktop ships ONLY rmw_fastrtps_cpp. The lab speaks Cyclone
# DDS, so you must install the Cyclone RMW or every ros2 command aborts with
# "librmw_cyclonedds_cpp.so: cannot open shared object file".
apt-get update && apt-get install -y ros-humble-rmw-cyclonedds-cpp tcpdump

cat > /etc/cyclonedds.xml <<'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<CycloneDDS xmlns="https://cdds.io/config">
  <Domain id="any">
    <General><AllowMulticast>false</AllowMulticast></General>
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

### One ROS 2 gotcha that runs through everything: QoS, and which direction it bites

ROS 2 adds **Quality-of-Service profiles**, and matching is **Request-vs-Offered
(RxO)**: a subscriber receives from a publisher only when the publisher's
*offered* reliability is **at least as strong as** the subscriber's *requested*
reliability, where `RELIABLE` > `BEST_EFFORT`. Concretely (both verified live on
this lab):

- A **`RELIABLE` publisher** satisfies **both** `RELIABLE` and `BEST_EFFORT`
  subscribers.
- A **`BEST_EFFORT` publisher** satisfies **only** `BEST_EFFORT` subscribers; a
  `RELIABLE` subscriber rejects it (`incompatible QoS ...
  RELIABILITY_QOS_POLICY`) and receives nothing.

The Gazebo camera plugin publishes `KEEP_LAST` + **`BEST_EFFORT`** + `VOLATILE`,
so the rule cuts **two opposite ways** — this is the part most write-ups get
backwards:

- **Reading the feed → QoS matters.** To *subscribe* to `/webcam/image_raw` you
  must request `BEST_EFFORT`. The default rclpy profile is `RELIABLE`, which
  rejects the camera's `BEST_EFFORT` publisher and delivers **zero** frames. This
  is why the companion's `video.py` and any recon `ros2 topic echo` must use
  `qos_profile_sensor_data`. It's the trap that bites *defenders and analysts*.
- **Injecting / flooding → QoS does *not* gate the attack.** When you publish to
  the topic, the companion is the `BEST_EFFORT` *subscriber*, so even a default
  `RELIABLE` publisher is accepted and your frames land. Using
  `qos_profile_sensor_data` in the attack scripts is still good practice — it's
  lower-overhead and mirrors the profile you'd read off `ros2 topic info -v` — but
  it is **not** what makes the injection work.

Confirm the target's QoS first with `ros2 topic info /webcam/image_raw -v`.

---

## Scenario A — ROS 2 DDS Graph Enumeration (Reconnaissance)

**Goal:** map every node, topic, service, and message type in the live graph.

**How it works.** Two complementary techniques:

- **Passive** — sniff RTPS discovery traffic without joining the graph, leaving
  no trace. **DDS discovery ports are domain-dependent:** `7400 + 250 × domain_id`.
  This lab runs `ROS_DOMAIN_ID=42`, so discovery lands at `7400 + 250×42 = 17900`
  (verified: the lab containers listen on **17910–17915**). The common `7400–7700`
  filter is the **domain-0** range and captures *nothing* here:
  ```sh
  tcpdump -i any 'udp portrange 17900-18200' -nn -v
  ```
  You'll see bursts between `10.13.0.3` and `10.13.0.5` containing `DATA(p)`
  participant announcements, `DATA(w)` writer (publisher) announcements, and
  `DATA(r)` reader (subscriber) announcements. For full payload decode (topic
  names, type names, **QoS policy blocks**), use **Wireshark with the `rtps`
  dissector** — that QoS detail is exactly what you need to craft a QoS-matched
  injector for Scenario B.

- **Active** — join the graph (standard foothold above) and just ask:
  ```sh
  ros2 node list
  ros2 topic list
  ros2 service list
  ros2 topic info /webcam/image_raw       # publishers, subscribers, QoS
  ros2 interface show sensor_msgs/msg/Image
  ```

**Why it works.** Discovery is open by design — anyone on the same domain with
network reachability enumerates the entire system. There is no authentication.

**Defence.** Network segmentation (force the attacker off the L2 segment / out of
the peers list) or SROS 2 identity. Note even SROS 2's keystore is usually
filesystem-readable and has no revocation flow.

---

## Scenario B — ROS 2 Rogue Publisher Injection (Injection)

**Goal:** inject synthetic sensor frames into a topic that legitimate nodes are
already publishing to.

**How it works.** From the standard foothold, run a small `rclpy` node
(`ros2_rogue_publisher.py`) that publishes a visually distinctive bright-red
vertical-bar `sensor_msgs/msg/Image` to **`/webcam/image_raw`** at
`qos_profile_sensor_data`. The companion's RTSP republisher is a `BEST_EFFORT`
subscriber, so it accepts the rogue frames **alongside** Gazebo's real frames
(a default `RELIABLE` injector would be accepted too — see the RxO note above) —
the two
streams interleave, so `ffplay rtsp://10.13.0.3:554/stream1` visibly flickers
between the Gazebo world and the attacker's pattern. Confirm with
`ros2 topic info /webcam/image_raw -v` — you'll now see **two** publishers.

**Generalises to any topic.** Retarget the same script at `/gps/fix`
(`NavSatFix` — false position), `/imu/data` (`Imu` — bad attitude), `/odom`
(`Odometry` — confused localisation), or any command topic.

**Bonus — steering the camera via `/gimbal/cmd`.** This branch routes the web
UI's gimbal buttons through ROS 2: a click POSTs to `/camera/gimbal/<dir>` on the
companion Flask app, which publishes a `geometry_msgs/msg/Vector3` (x = tilt°,
y = pan°) to `/gimbal/cmd`; an on-board bridge accumulates targets and drives the
gimbal. An attacker can publish straight to the topic and bypass the UI:
```sh
ros2 topic pub --once /gimbal/cmd geometry_msgs/msg/Vector3 "{x: -45.0, y: 30.0, z: 0.0}"
```
The pedagogical point: the Flask route is gated behind `@login_required`, but the
**ROS topic is not** — the login was effectively decorative, and the bridge can't
distinguish a UI click from a rogue publisher.

**Why it works.** DDS's open-by-default trust model: knowing domain + topic +
type + compatible QoS is all you need to publish.

**Defence.** SROS 2 enclave permissions (per-topic publish/subscribe allow-lists)
— rarely deployed, and a popped node still holds valid credentials.

---

## Scenario C — ROS 2 Topic Replay (Exfiltration)

**Goal:** record a whole flight's traffic, then exfiltrate it and/or replay it.

**How it works.** From the standard foothold, record every topic with one command
(no special privilege required):
```sh
ros2 bag record -a --output mission-<ts> --storage mcap
ros2 bag info mission-*          # per-topic count, frequency, type, bytes
```
Then two payoffs:

1. **Pure exfiltration** — copy the MCAP bag off the host and analyse offline
   (dump frames, load into Foxglove, etc.). One read-only command produces a
   complete dump of the drone's sensor + telemetry data.
2. **Confused-state replay** — during a *later* mission, `ros2 bag play` the old
   bag back into the live graph. `ros2 bag play` re-publishes messages with their
   original headers, so subscribers that don't dedupe by timestamp see today's
   and yesterday's streams interleaved. A subtler variant replays only command
   topics (e.g. `/cmd_vel`) to inject stale motion commands.

**Why it works.** No publish authentication, and ROS 2 messages carry no nonce or
mandatory replay protection — a replayed message is indistinguishable from a
fresh one.

> **Note:** this scenario was shipped in place of the originally-scoped *SROS 2
> Permission File Theft*, which needed build-time keystore generation and
> permission XML that was impractical to deliver without live lab access. Topic
> Replay is a real attack and works against the lab as-is with no companion
> changes.

---

## Scenario D — Camera Feed ROS Topic Flooding (Denial of Service)

**Goal:** drown the RTSP stream by flooding `/webcam/image_raw`.

This is the ROS-1→ROS-2 **rewrite** of the existing DoS scenario. The mechanics
are the same as injection, but the intent is volume: a flood script publishes
random-noise `Image` messages at ~1000 Hz (vs Gazebo's ~10 Hz), again at
`qos_profile_sensor_data` so they're actually accepted. The RTSP feed becomes a
chaotic mix of real video and attacker noise. Verify the rate with:
```sh
ros2 topic hz /webcam/image_raw    # ~10 Hz normally, hundreds-to-thousands under flood
```

**Why it works / why ROS 2 changes the picture.** There is no `rosnode kill` and
no master to revoke the attacker — the graph is decentralised, so the only way to
deny a publisher is to authenticate participants (SROS 2). Note the QoS
subtlety from above cuts the *other* way here: because the companion subscribes
`BEST_EFFORT`, even a default-`RELIABLE` flooder is accepted, so the flood lands
with or without `qos_profile_sensor_data`. (The QoS trap only bites when you try
to *read* the `BEST_EFFORT` camera with a `RELIABLE` subscriber.)

---

## Summary

| Scenario | Category | Topic / tool | Core weakness exploited |
|---|---|---|---|
| DDS Graph Enumeration | Reconnaissance | tcpdump/Wireshark + `ros2` CLI | Open, unauthenticated DDS discovery |
| Rogue Publisher Injection | Injection | `/webcam/image_raw`, `/gimbal/cmd` | No publisher authentication |
| Topic Replay | Exfiltration | `ros2 bag record/play` | No per-topic permission, no replay protection |
| Camera Feed Topic Flooding | Denial of Service | `/webcam/image_raw` | No participant auth + decentralised graph |

The single mitigation that addresses the root cause across all four is **SROS 2**
(signed participant identities + per-enclave topic permissions) — but it is
rarely enabled in practice, its keystore is typically readable to any process on
the robot, and it has no certificate revocation flow.
