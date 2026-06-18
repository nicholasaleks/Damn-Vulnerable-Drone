# Damn Vulnerable Drone

The Damn Vulnerable Drone is an intentionally vulnerable drone hacking simulator based on the popular ArduPilot/MAVLink architecture, providing a realistic environment for hands-on drone hacking.

<p align="center">
  <img src="https://github.com/nicholasaleks/Damn-Vulnerable-Drone/blob/master/simulator/mgmt/static/images/Damn-Vulnerable-Drone-Banner.png?raw=true" alt="Damn Vulnerable Drone Logo"/>
</p>

# Table of Contents

* [About the Damn Vulnerable Drone](#about-damn-vulnerable-drone)
  * [What is the Damn Vulnerable Drone?](#what-is-the-damn-vulnerable-drone?)
  * [Why was it built?](#why-was-it-built?)
  * [How does it work?](#how-does-it-work?)
  * [Features](#features)
* [Installation](#installation)
  * [System Requirements](#system-requirements)
  * [Getting Docker](#getting-docker-key-dependency)
  * [Wi-Fi Mode](#wi-fi-mode)
  * [Non-Wi-Fi Mode](#non-wi-fi-mode)
* [Architecture](#architecture)
* [Flight States](#flight-states)
* [Attack Scenarios](#attack-scenarios)
* [Screenshots](#screenshots)
* [Mentions](#mentions)
* [Community Support](#community-support)
* [Feedback & Contributions](#feedback-&-contributions)
* [Maintainers](#maintainers)
* [Credits](#Credits)
* [Disclaimer](#disclaimer)
* [License](#license)

# About the Damn Vulnerable Drone

<p align="center">
  <a href="https://www.youtube.com/watch?v=EHTQv6IfnwI"><img src="https://github.com/nicholasaleks/Damn-Vulnerable-Drone/blob/master/simulator/mgmt/static/images/demo.png?raw=true" alt="Damn Vulnerable Drone Demo"/></a>
</p>

## What is the Damn Vulnerable Drone?

The Damn Vulnerable Drone is a virtually simulated environment designed for offensive security professionals to safely learn and practice drone hacking techniques. It simulates real-world [ArduPilot](https://ardupilot.org/) & [MAVLink](https://mavlink.io/en/) drone architectures and vulnerabilities, offering a hands-on experience in exploiting drone systems. 

## Why was it built?

The Damn Vulnerable Drone aims to enhance offensive security skills within a controlled environment, making it an invaluable tool for intermediate-level security professionals, pentesters, and hacking enthusiasts.

Similar to how pilots utilize flight simulators for training, we can use the Damn Vulnerable Drone simulator to gain in-depth knowledge of real-world drone systems, understand their vulnerabilities, and learn effective methods to exploit them.

The Damn Vulnerable Drone platform is open-source and available at no cost and was specifically designed to address the substantial expenses often linked with drone hardware, hacking tools, and maintenance. Its cost-free nature allows users to immerse themselves in drone hacking without financial concerns. This accessibility makes the Damn Vulnerable Drone a crucial resource for those in the fields of information security and penetration testing, promoting the development of offensive cybersecurity skills in a safe environment.

## How does it work?

The Damn Vulnerable Drone platform operates on the principle of [Software-in-the-Loop (SITL)](https://ardupilot.org/dev/docs/sitl-simulator-software-in-the-loop.html), a simulation technique that allows users to run drone software as if it were executing on an actual drone, thereby replicating authentic drone behaviors and responses.

ArduPilot's SITL allows for the execution of the drone's firmware within a virtual environment, mimicking the behavior of a real drone without the need for physical hardware. This simulation is further enhanced with Gazebo, a dynamic 3D robotics simulator, which provides a realistic environment and physics engine for the drone to interact with. Together, ArduPilot's SITL and Gazebo lay the foundation for a sophisticated and authentic drone simulation experience.

While the current Damn Vulnerable Drone setup doesn't mirror every drone architecture or configuration, the integrated tactics, techniques and scenarios are broadly applicable across various drone systems, models and communication protocols.

## Features

- **Docker-based Environment**: Runs in a completely virtualized docker-based setup, making it accessible and safe for drone hacking experimentation.
- **Simulated Wireless Networking**: Simulated Wifi (802.11) interfaces to practice wireless drone attacks.
- **Onboard Camera Streaming & Gimbal**: Simulated RTSP drone onboard camera stream with gimbal and companion computer integration.
- **Companion Computer Web Interface**: Companion Computer configuration management via web interface and simulated serial connection to Flight Controller.
- **QGroundControl/MAVProxy Integration**: One-click QGroundControl UI launching (only supported on x86 architecture) with MAVProxy GCS integration.
- **MAVLink Router Integration**: Telemetry forwarding via MAVLink Router on the Companion Computer Web Interface.
- **Dynamic Flight Logging**: Fully dynamic Ardupilot flight bin logs stored on a simulated SD Card.
- **Management Web Console**: Simple to use simulator management web console used to trigger scenarios and drone flight states.
- **Comprehensive Hacking Scenarios**: Ideal for practicing a wide range of drone hacking techniques, from basic reconnaissance to advanced exploitation.
- **Detailed Walkthroughs**: If you need help hacking against a particular scenario you can leverage the detailed walkthrough documentation as a spoiler.

# Installation

Please review the following instructions carefully to ensure a stable and well performing Damn Vulnerable Drone lab environment.

> [!NOTE]  
> Depending on your computer’s performance and internet speed, the full end-to-end installation process including container builds and image pulls, can take between *30-60 minutes*. Be patient and let each step complete before moving forward. 

## System Requirements

Damn Vulnerable Drone can be run in two modes depending on your available hardware:

### Lite Mode (No GPU Required)

- **Operating System:**
  - **Kali Linux** (recommended, but Lite mode may run on most Linux distros)
  - Works on **bare metal** or **VM** environments without GPU passthrough

- **Hardware (Minimum):**
  - **RAM:** 4–8 GB
  - **Processor Cores:** 2
  - **Disk Storage:** 100 GB
  - **Swap:** 4 GB

- **Graphics:**
  - No GPU required  
  - Runs a **2D lightweight simulator** using ArduPilot’s built-in flight dynamics model instead of Gazebo  

- **Software:**
  - **Docker**
  - **Docker Compose**

Lite Mode is recommended for users who cannot meet the GPU requirements of Full Mode or want a faster, more lightweight setup.

### Lite Mode Interface

<p align="center">
  <img src="https://github.com/nicholasaleks/Damn-Vulnerable-Drone/blob/master/simulator/mgmt/static/images/Lite-Mode.png?raw=true" alt="Damn Vulnerable Drone Lite Mode"/>
</p>

---

### Full Mode (3D Environment with Gazebo)

- **Operating System:**
  - **Kali Linux** (no other OS is supported)
  - For best performance, use **bare metal**
  - If you must use a VM, ensure **GPU passthrough** is enabled  
    - See [this guide on Hyper-V GPU passthrough](https://techcommunity.microsoft.com/t5/virtualization/bg-p/Virtualization) for setup help

- **Hardware (Minimum):**
  - **RAM:** 8–16 GB
  - **Processor Cores:** 2–4
  - **Disk Storage:** 100 GB
  - **Swap:** 10–12 GB

- **Graphics:**
  - At least 2 GB VRAM (4 GB+ recommended)
  - OpenGL 3.0 (or higher)
  - Dedicated GPU strongly recommended
  - For VMs: Enable **GPU passthrough** and **3D acceleration**

- **Software:**
  - **Docker**
  - **Docker Compose**

### Full 3D Mode Interface

<p align="center">
  <img src="https://github.com/nicholasaleks/Damn-Vulnerable-Drone/blob/master/simulator/mgmt/static/images/screenshot-1.png?raw=true" alt="Damn Vulnerable Drone Full Mode"/>
</p>

---

## Getting Docker (Key Dependency)

The following instructions are meant to be executed on the latest version of [Kali Linux](https://www.kali.org/).

**Step 1.** Add the docker apt source

`printf '%s\n' "deb https://download.docker.com/linux/debian bullseye stable" | sudo tee /etc/apt/sources.list.d/docker-ce.list`

**Step 2.** Import the GPG Key

`curl -fsSL https://download.docker.com/linux/debian/gpg | sudo gpg --dearmor -o /etc/apt/trusted.gpg.d/docker-ce-archive-keyring.gpg`

**Step 3.** Update the apt repository

`sudo apt update -y`

**Step 4.** Install Docker and Docker Compose

`sudo apt install docker-ce docker-ce-cli containerd.io -y`

**Step 5.** Start the Docker Service

`sudo systemctl enable docker --now`

**Step 6.** Add docker permissions to user

`sudo usermod -aG docker $USER && newgrp docker`

## Clone the repository

`git clone https://github.com/nicholasaleks/Damn-Vulnerable-Drone.git && cd Damn-Vulnerable-Drone`

---

## Pull or Build Docker Container Images

You can either pull prebuilt images from Docker Hub or build them locally.
Choose the appropriate docker-compose file depending on whether you want Full Mode or Lite Mode.

### Pull Images

**Full Mode** (with Gazebo 3D simulator):  
```
docker compose -f docker-compose.yaml pull
```

**Lite Mode** (no GPU, lightweight 2D simulator): 
```
docker compose -f docker-compose-lite.yaml pull
```

### Build Images from Source

If you’d rather build the images yourself (slower than pulling):

**Full Mode** (with Gazebo 3D simulator):  
```
docker compose -f docker-compose.yaml build
```

**Lite Mode** (no GPU, lightweight 2D simulator): 
```
docker compose -f docker-compose-lite.yaml build
```

## Operating Damn Vulnerable Drone

Damn Vulnerable Drone includes three useful bash scripts which will help you manage the state of your simulator.

#### Starting Damn Vulnerable Drone

The start script is used to start Damn Vulnerable Drone simulator. This script will automatically create a `dvd.log` log file in the project directory, which you can use to view the simulator logs. 

> [!TIP]  
> If you have not already built or pulled Damn Vulnerable Drone images the `start.sh` script will automatically pull and build them for you.

```
sudo ./start.sh -h

Usage: sudo ./start.sh [OPTION]
Start the Damn Vulnerable Drone simulator.

Options:
  --mode [full|lite]     Choose simulator mode:
                           - full: 3D environment (GPU + drivers required)
                           - lite: no GPU, minimal requirements
  --wifi  [wep|wpa2]    Start the simulation with a virtual drone Wi-Fi network.
  --no-wifi   Start the simulation with instant access to the drone network (default).
  -h, --help  Display this help and exit.

Example:
  sudo ./start.sh --wifi wpa2     # Starts with virtual Wi-Fi in WPA2 mode
  sudo ./start.sh --no-wifi   # Starts without virtual Wi-Fi
```

#### Stop

The stop script is used to perform a full cleanup of the Damn Vulnerable Drone simulator and all of its virtual interface artifacts. Stop logs are also appended to the `dvd.log` log file.

`sudo ./stop.sh`

#### Status

If you ever want to check the status of your simulator you can run the status script as shown below.

`sudo ./status.sh`

### Wi-Fi Mode 

"Wi-Fi Mode" (`--wifi`) allows for the most realistic virtual drone hacking simulation. It deploys a virtually simulated wireless network that you can interact with. This virtual wifi network acts as the data-link connection between the Ground Station and Drone Companion Computer, allowing for interesting scenarios from your attacker machine. When you deploy the Damn Vulnerable Drone using Wi-Fi Mode you will have access to the "Drone_Wifi" SSID and 192.168.13.0/24 network. There are two wifi modes supported WEP and WPA2.

> [!WARNING]  
> The 10.13.0.0/24 network is used to run the simulator infrastructure, should you attack this network, especially the simulator container on `10.13.0.5` this could cause your instance of Damn Vulnerable Drone to crash, warranting a potentially lengthy rebuild. 

### Non-Wi-Fi Mode

"Non-Wi-Fi Mode" (`--no-wifi`) essentially only runs the Damn Vulnerable Drone docker containers.
Unlike "Wi-Fi Mode" you are not limited to only running "Non-Wi-Fi Mode" within a Kali Linux VM. You'll be able to practice attacking the Damn Vulnerable Drone using just the stood up containers via `docker compose up --build`

> [!IMPORTANT]  
> Not, "Non-Wi-Fi Mode" does not support wifi simulations and you will need to assume that you have an established initial access foothold on the drone data-link connection (via the 10.13.0.0/24 network)

## Architecture

The Damn Vulnerable Drone simulation and core drone architectural components are integrated within Docker containers, providing a stable, isolated environment for each component of the drone system. Docker facilitates easy setup, consistent performance across different systems, and simplifies the process of simulating complex drone architectures and scenarios.

Below is a high-level overview of the Damn Vulnerable Drone architecture:

<p align="center">
  <img src="https://github.com/nicholasaleks/Damn-Vulnerable-Drone/blob/master/simulator/mgmt/static/images/Damn-Vulnerable-Drone-Architecture.png?raw=true" alt="Damn Vulnerable Drone Architecture"/>
</p>

| Component           | Description                                                                                                                                                              | Docker IP | Wireless IP    |
|---------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------|----------------|
| Flight Controller   | This is the brain of the drone, running the ArduPilot firmware to simulate a drone's flight controls. It interacts with the Gazebo simulator through a Gazebo driver, allowing it to process virtual sensor data and respond as if it were flying in the real world.                                                                                                        | 10.13.0.2 | -              |
| Companion Computer  | The Companion Computer (attached to the drone) handles higher-level processing tasks that are too complex for the flight controller. It manages wireless networking, telemetry logs, facilitates camera streaming for surveillance or reconnaissance, and interfaces with guidance systems for autonomous operations.                            | 10.13.0.3 | 192.168.13.1   |
| Ground Control Station | This component acts as the remote pilot's interface, providing mission planning capabilities, flight mapping, video streaming, and joystick control inputs. It communicates with the flight controller and companion computer over a simulated wireless MAVLink connection.                                                            | 10.13.0.4 | 192.168.13.14   |
| Simulator            | Gazebo provides a richly detailed 3D world where the physics of drone flight are accurately modeled. This allows for realistic simulations of how the drone would react to control inputs and environmental factors. It’s here that the rotors spin, and the virtual drone takes to the skies, all under the watchful control of the Simulator Management Web Console. Warning: Try not to target the simulator directly as this may break the Damn Vulnerable Drone | 10.13.0.5 | -              |


## Flight States

The Damn Vulnerable Drone has a range of flight states. Each flight state can be trigger by clicking on their buttons in the UI (http://localhost:8000). The ability to simulate these various flight states allows users to test and exploit different aspects of the drones operations. By clicking these states, you are essentially triggering the GCS to issue commands to the drone.

<p align="center">
  <img src="https://github.com/nicholasaleks/Damn-Vulnerable-Drone/blob/master/simulator/mgmt/static/images/flight-states.png?raw=true" alt="Damn Vulnerable Drone Flight States"/>
</p>

**1. Initial Boot:**
This simulates the drone's startup sequence, where all systems are initialized. Clicking this will simulate you "pressing" the power on button on the drone flight controller, allowing for the companion computer to establish a connection to it. This phase is critical for security/safety checks, calibration and ensuring communication protocols are setup before flight.

**2. Arm & Takeoff**
The phase where the drone transitions from a stationary state to airborne, testing the responsiveness of flight controls and the integrity of take-off protocols. Note: This may take some time to complete as the drone requires GPS & EKF3 to be ready)

**3. Autopilot Flight**
Represents the drone's ability to navigate autonomously based on predefined waypoints or dynamic commands, a vital state for exploring vulnerabilities in navigation and control systems.

**4. Emergency / Return-To-Land**
Simulates the drone's emergency protocols, automatically returning to a home location upon triggering fail-safes or loss of control signals, which can be a target for exploitation in hacking scenarios.

**5. Post-Flight Data Processing**
This state involves the handling of all data collected during the flight, including telemetry and logs, making it an important phase for understanding data exfiltration and integrity attacks.

# Attack Scenarios

The full list of Damn Vulnerable Drone attack scenarios and detailed walkthroughs can be found in the project's wiki here: [https://github.com/nicholasaleks/Damn-Vulnerable-Drone/wiki/Attack-Scenarios](https://github.com/nicholasaleks/Damn-Vulnerable-Drone/wiki/Attack-Scenarios)

| Reconnaissance                                      | Protocol Tampering                                | Denial of Service                                | Injection                                              | Exfiltration                                        | Firmware Attacks                                |
|----------------------------------------------------|---------------------------------------------------|--------------------------------------------------|--------------------------------------------------------|---------------------------------------------------|-------------------------------------------------|
| [Wifi Analysis & Cracking](https://github.com/nicholasaleks/Damn-Vulnerable-Drone/wiki/Wifi-Analysis-&-Cracking) | [Attitude Spoofing](https://github.com/nicholasaleks/Damn-Vulnerable-Drone/wiki/Attitude-Spoofing) | [Wifi Deauth Attack](https://github.com/nicholasaleks/Damn-Vulnerable-Drone/wiki/Wifi-Deauth-Attack) | [Ground Control Station Spoofing](https://github.com/nicholasaleks/Damn-Vulnerable-Drone/wiki/Ground-Control-Station-Spoofing) | [FTP Eavesdropping](https://github.com/nicholasaleks/Damn-Vulnerable-Drone/wiki/FTP-Eavesdropping) | [Firmware Modding](https://github.com/nicholasaleks/Damn-Vulnerable-Drone/wiki/Firmware-Modding) |
| [Drone Discovery](https://github.com/nicholasaleks/Damn-Vulnerable-Drone/wiki/Drone-Discovery)  | [Battery Spoofing](https://github.com/nicholasaleks/Damn-Vulnerable-Drone/wiki/Battery-Spoofing) | [Geofencing Attack](https://github.com/nicholasaleks/Damn-Vulnerable-Drone/wiki/Geofencing-Attack) | [Camera Gimbal Takeover](https://github.com/nicholasaleks/Damn-Vulnerable-Drone/wiki/Camera-Gimbal-Takeover) | [Parameter Extraction](https://github.com/nicholasaleks/Damn-Vulnerable-Drone/wiki/Parameter-Extraction) | [Firmware Decompile](https://github.com/nicholasaleks/Damn-Vulnerable-Drone/wiki/Firmware-Decompile) |
| [Companion Computer Detection](https://github.com/nicholasaleks/Damn-Vulnerable-Drone/wiki/Companion-Computer-Detection) | [GPS Spoofing](https://github.com/nicholasaleks/Damn-Vulnerable-Drone/wiki/GPS-Spoofing)   | [GPS Offset Glitching](https://github.com/nicholasaleks/Damn-Vulnerable-Drone/wiki/GPS-Offset-Glitching) | [GPS Data Injection](https://github.com/nicholasaleks/Damn-Vulnerable-Drone/wiki/GPS-Data-Injection) | [Wifi Client Data Leak](https://github.com/nicholasaleks/Damn-Vulnerable-Drone/wiki/Wifi-Client-Data-Leak) | |
| [Ground Control Station Discovery](https://github.com/nicholasaleks/Damn-Vulnerable-Drone/wiki/Ground-Control-Station-Discovery) | [Critical Error Spoofing](https://github.com/nicholasaleks/Damn-Vulnerable-Drone/wiki/Critical-Error-Spoofing) | [Flight Termination](https://github.com/nicholasaleks/Damn-Vulnerable-Drone/wiki/Flight-Termination) | [Return to Home Point Override](https://github.com/nicholasaleks/Damn-Vulnerable-Drone/wiki/Return-to-Home-Point-Override) | [Flight Log Extraction](https://github.com/nicholasaleks/Damn-Vulnerable-Drone/wiki/Flight-Log-Extraction) | |
| [Packet Sniffing](https://github.com/nicholasaleks/Damn-Vulnerable-Drone/wiki/Packet-Sniffing)  | [Emergency Status Spoofing](https://github.com/nicholasaleks/Damn-Vulnerable-Drone/wiki/Emergency-Status-Spoofing) | [Camera Feed ROS Topic Flooding](https://github.com/nicholasaleks/Damn-Vulnerable-Drone/wiki/Camera-Feed-ROS-Topic-Flooding) | [Companion Computer Web UI Login Brute Force](https://github.com/nicholasaleks/Damn-Vulnerable-Drone/wiki/Companion-Computer-Web-UI-Login-Brute-Force) | [Camera Feed Eavesdropping](https://github.com/nicholasaleks/Damn-Vulnerable-Drone/wiki/Camera-Feed-Eavesdropping) | |
| [Protocol Fingerprinting](https://github.com/nicholasaleks/Damn-Vulnerable-Drone/wiki/Protocol-Fingerprinting) | [Satellite Spoofing](https://github.com/nicholasaleks/Damn-Vulnerable-Drone/wiki/Satellite-Spoofing) | [Denial-of-Takeoff](https://github.com/nicholasaleks/Damn-Vulnerable-Drone/wiki/Denial-of-Takeoff) | [Waypoint Injection](https://github.com/nicholasaleks/Damn-Vulnerable-Drone/wiki/Waypoint-Injection) | [Mission Extraction](https://github.com/nicholasaleks/Damn-Vulnerable-Drone/wiki/Mission-Extraction) | |
| [Drone GPS & Telemetry Detection](https://github.com/nicholasaleks/Damn-Vulnerable-Drone/wiki/Drone-GPS-&-Telemetry-Detection) | [VFR HUD Spoofing](https://github.com/nicholasaleks/Damn-Vulnerable-Drone/wiki/VFR-HUD-Spoofing) | [Communication Link Flooding](https://github.com/nicholasaleks/Damn-Vulnerable-Drone/wiki/Communication-Link-Flooding) | [Companion Computer Takeover](https://github.com/nicholasaleks/Damn-Vulnerable-Drone/wiki/Companion-Computer-Takeover) | [ROS 2 Topic Replay](https://github.com/nicholasaleks/Damn-Vulnerable-Drone/wiki/ROS-2-Topic-Replay) | |
| [ROS 2 DDS Graph Enumeration](https://github.com/nicholasaleks/Damn-Vulnerable-Drone/wiki/ROS-2-DDS-Graph-Enumeration) | [System Status Spoofing](https://github.com/nicholasaleks/Damn-Vulnerable-Drone/wiki/System-Status-Spoofing) | | [MAVLink Injection Attack](https://github.com/nicholasaleks/Damn-Vulnerable-Drone/wiki/MAVLink-Injection-Attack) | | |
| | | | [Flight Mode Injection](https://github.com/nicholasaleks/Damn-Vulnerable-Drone/wiki/Flight-Mode-Injection) | | |
| | | | [ROS 2 Rogue Publisher Injection](https://github.com/nicholasaleks/Damn-Vulnerable-Drone/wiki/ROS-2-Rogue-Publisher-Injection) | | |

## Documentation & Walkthrough

Each of the attack scenarios have detailed documentation which outlines what the attack scenario is, as well as a **Spoiler** step-by-step walkthrough for users to follow in order to execute the attack. These walkthroughs are hidden behind a button, which when clicked, will reveal the instructions.

<p align="center">
  <img src="https://github.com/nicholasaleks/Damn-Vulnerable-Drone/blob/master/simulator/mgmt/static/images/Walkthrough.png?raw=true" alt="Damn Vulnerable Drone Walkthrough"/>
</p>


# Screenshots

<p align="center">
  <img src="https://github.com/nicholasaleks/Damn-Vulnerable-Drone/blob/master/simulator/mgmt/static/images/a43dbcd7-10b0-4f7a-b920-5925bac59642.gif?raw=true" alt="Damn Vulnerable Drone Demo"/>
</p>

<p>
  <img src="https://github.com/nicholasaleks/Damn-Vulnerable-Drone/blob/master/simulator/mgmt/static/images/Damn-Vulnerable-Drone-Interface.png?raw=true" alt="Damn Vulnerable Drone Interface"/>
</p>

<p align="center">
  <img src="https://github.com/nicholasaleks/Damn-Vulnerable-Drone/blob/master/simulator/mgmt/static/images/Damn-Vulnerable-Drone.png?raw=true" alt="Damn Vulnerable Drone"/>
</p>

<p align="center">
  <img src="https://github.com/nicholasaleks/Damn-Vulnerable-Drone/blob/master/simulator/mgmt/static/images/Ground-Control-Station.png?raw=true" alt="Ground Control Station"/>
</p>

<p align="center">
  <img src="https://github.com/nicholasaleks/Damn-Vulnerable-Drone/blob/master/simulator/mgmt/static/images/Drone-Hacker-Van.png?raw=true" alt="Drone Hacker Van"/>
</p>

<p align="center">
  <img src="https://github.com/nicholasaleks/Damn-Vulnerable-Drone/blob/master/simulator/mgmt/static/images/Drone-Hacking-Station.png?raw=true" alt="Drone Hacking Station"/>
</p>

<p align="center">
  <img src="https://github.com/nicholasaleks/Damn-Vulnerable-Drone/blob/master/simulator/mgmt/static/images/kali-drone-hacker.png?raw=true" alt="Damn Vulnerable Drone Desktop Background"/>
</p>

# Mentions

- [OWASP Top 10 Drone Security Risks](https://github.com/OWASP/CheatSheetSeries/issues/1412)
- [Kitploit](https://kitploit.com/2024/09/damn-vulnerable-drone-intentionally.html/)
- [David Bombal - Drone Hacking Demo](https://youtu.be/c1ZCHCwqWls?t=5705)
- [Red Team Village at DEFCON 32](https://becomingahacker.org/def-con-32-red-team-village-activities-e4e20895df37)
- [Aerospace Hacking Village DEFCON 32](https://www.aerospacevillage.org/defcon-32-workshop-schedule)
- [Cyberattacks and defenses for Autonomous Navigation Systems: A systematic literature review](https://www.researchgate.net/publication/391637526_Cyberattacks_and_defenses_for_Autonomous_Navigation_Systems_A_systematic_literature_review)
- [Drone Software Meetup Group](https://www.meetup.com/drone-software-meetup-group/events/300478718/)
- [National Cyber Security Service's](https://www.facebook.com/ncybersec/posts/-damn-vulnerable-drone-the-damn-vulnerable-drone-is-an-intentionally-vulnerable-/1040824904739615/)
- [OWASP Tunisia Chapter, Drone Security - Helmi Rais](https://www.youtube.com/watch?v=30gvG5EByHw)
- [Red Wrench - How to hack drones part 1](https://youtu.be/KYHbFEJl0AU?si=3tKzdYCN47W_Gkoc)

# Community Support

The Damn Vulnerable Drone platform thrives on the active participation and collaboration of its user community. This community is a collective of like-minded individuals ranging from cybersecurity enthusiasts to professional ethical hackers, all focused on sharing knowledge and advancing skills in drone security. Whether you're encountering technical issues, seeking advice on tackling scenarios, or looking to discuss the latest trends in drone vulnerabilities, the Damn Vulnerable Drone community is a valuable resource.

The community [Slack Channel](https://join.slack.com/t/damnvulnerabledrone/shared_invite/zt-2g9tp202t-x5csb~uTyvHurgptki_XwQ) is available for users to connect, share experiences, and provide mutual support. Users are encouraged to participate actively, ask questions, and offer help to others. Experienced members of the community often mentor newcomers, fostering a culture of continuous learning and improvement. Remember, every question you ask and every answer you provide helps the entire community grow stronger.

# Feedback & Contributions

The platform maintains a [GitHub open source repository](https://github.com/nicholasaleks/Damn-Vulnerable-Drone) where users can submit their contributions. These contributions are reviewed by the maintainers and, if aligned with the project's goals, are integrated into the platform. By contributing, you help ensure that the DVD remains a cutting-edge tool for learning and practicing drone hacking techniques in a safe and ethical manner.

If you have developed a new attack scenario, discovered a way to improve the simulation, or created educational content that could benefit others, create a [GitHub Pull Request](https://github.com/nicholasaleks/Damn-Vulnerable-Drone/pulls). Contributions can take various forms, from code patches and feature suggestions to writing documentation and creating tutorial videos.

Feedback is the cornerstone of growth for the Damn Vulnerable Drone platform. Users are encouraged to provide their insights by creating a [GitHub Issue](https://github.com/nicholasaleks/Damn-Vulnerable-Drone/issues). Do your best to including any challenges faced and suggestions for enhancements. This feedback is invaluable for the ongoing development and refinement of the platform.

# Roadmap
- Support PX4 Firmware
- Support Kali docker container
- Support Fixed-Wing Drone models

# Credits

Thanks to all the amazing [community contributors for sending PRs](https://github.com/nicholasaleks/Damn-Vulnerable-Drone/graphs/contributors) and keeping this project updated. :heart:

If you have an idea or some kind of improvement, you are welcome to contribute and participate in the project, feel free to send your PR.

<p align="center">
  <a href="https://github.com/nicholasaleks/Damn-Vulnerable-Drone/graphs/contributors">
    <img src="https://contrib.rocks/image?repo=nicholasaleks/Damn-Vulnerable-Drone" />
  </a>
</p>

# Disclaimer

The Damn Vulnerable Drone (DVD) platform is provided solely for educational and research purposes. Users are expected to adhere to ethical hacking principles, respecting privacy and laws, and must not use skills or knowledge acquired from Damn Vulnerable Drone for malicious activities. The creators and maintainers of Damn Vulnerable Drone are not liable for any misuse of the platform. By using Damn Vulnerable Drone, you agree to use it responsibly and within legal boundaries. Damn Vulnerable Drone is highly insecure, and as such, should not be deployed on drone hardware or internet facing servers. It is intentionally flawed and vulnerable, as such, it comes with no warranties.

# License

It is distributed under the MIT License. See LICENSE for more information.

