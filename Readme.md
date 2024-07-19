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
  * [Architecture](#architecture)
  * [Initializing flight states](#initializing-flight-states)
* [Attack Scenarios](#attack-scenarios)
* [Installation](#installation)
  * [Full-Deploy Mode Installation](#full-deploy-mode-installation)
  * [Half-Baked Mode Installation](#half-baked-mode-installation)
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


## Initializing flight states

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

The list of attack scenarios below is organized by stages. Note that some attacks are only possible during certain flight states.

| Reconnaissance              | Protocol Tampering   | Denial of Service            | Injection                      | Exfiltration           | Firmware Attacks      |
|-----------------------------|----------------------|------------------------------|--------------------------------|------------------------|-----------------------|
| Wifi Analysis & Cracking    | Telemetry Spoofing   | Battery Drain Attack         | MAVLink Command Injection      | Flight Log Extraction  | Firmware Decompile    |
| Drone Discovery             | Flight Mode Spoofing | Communication Link Flooding  | Camera Gimbal Takeover         | Parameter Extraction   | Firmware Modding      |
| Packet Sniffing             | Drone State Spoofing | Denial-of-Takeoff            | Waypoint Injection             | Mission Extraction     |                       |
| Protocol Fingerprinting     | GPS Spoofing         | Geo-Squeezing                | Sensor Data Injection          | FTP Eavesdropping      |                       |
| GPS & Telemetry Analysis    |                      | Altitude Limiting            | Flight Mode Injection          | Camera Feed Eavesdropping |                    |
| Payload Detection           |                      | GPS Jamming                  |                                |                        |                       |
|                             |                      | Wireless Deauthentication    |                                |                        |                       |


## Example Attack Scenario Walkthrough

Each of the attack scenarios has documentation which outlines what the attack scenario is, as well as a **Spoiler** step-by-step walkthrough for users to follow in order to execute the attack. These spoiler walkthroughs are hidden been a button, which when clicked will reveal the instructions.

<p align="center">
  <img src="https://github.com/nicholasaleks/Damn-Vulnerable-Drone/blob/master/simulator/mgmt/static/images/Walkthrough.png?raw=true" alt="Damn Vulnerable Drone Walkthrough"/>
</p>

# Installation

To support a wide variety of users and use cases the Damn Vulnerable Drone can be deployed in two modes. 

Note: Both installation modes require internet access.

## Full-Deploy Mode Installation 

"Full-Deploy Mode" allows for the most realistic virtual drone hacking simulation. It deploys a virtually simulated wifi network that you can interact with. This virtual wifi network acts as the data-link connection between the Ground Station and Drone Companion Computer, allowing for interesting attack scenarios. When you deploy the Damn Vulnerable Drone using Full-Deploy Mode you will have access to the "Drone_Wifi" SSID and 192.168.13.0/24 network. The 10.13.0.0/24 network is used as the sore simulator infrastructure network (and shouldn't be targetted.)

The system requirements to run "Full-Deploy Mode" a Kali VM with the following minimum requirements:
* Kali Linux VM (Ubuntu 22.04 is also supported)
  * 8-16 GB RAM
  * 2-4 Processor Cores
  * 100 GB Disk Storage
  * Docker
  * Docker Compose

*Note: Fully-Deploy Mode was only tested on Kali Linux*

### Install Docker & Docker Compose

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

`sudo usermod -aG docker $USER`

### Clone the repository

`git clone https://github.com/nicholasaleks/Damn-Vulnerable-Drone.git && cd Damn-Vulnerable-Drone`

## Starting & Stopping Damn Vulnerable Drone

The Damn Vulnerable Drone's *Full-Deploy Mode* includes three useful bash scripts which will help you manage the state of your simulator.

#### Build & Start

The start script is used to both build and start the Damn Vulnerable Drone simulator. This script will automatically create a `dvd.log` log file in the project directory, which you can use to view the simulator logs.

```
sudo ./start.sh -h

Usage: sudo ./start.sh [OPTION]
Start the Damn Vulnerable Drone simulator.

Options:
  --wifi      Start the simulation with a virtual drone Wi-Fi network.
  --no-wifi   Start the simulation with instant access to the drone network (default).
  -h, --help  Display this help and exit.

Example:
  sudo ./start.sh --wifi      # Starts with virtual Wi-Fi
  sudo ./start.sh --no-wifi   # Starts without virtual Wi-Fi
```

#### Stop

The stop script is used to perform a full cleanup of the Damn Vulnerable Drone simulator and all of its virtual interface artifacts. Stop logs are also appended to the `dvd.log` log file.

`sudo ./stop.sh`

#### Status

If you ever want to check the status of your simulator you can run the status script as shown below.

`sudo ./status.sh`

## Half-Baked Mode Installation

"Half-Baked Mode" essentially only runs the Damn Vulnerable Drone docker containers.
Unlike "Full-Deploy Mode" you are not limited to only running "Half-Baked Mode" within a Kali Linux VM.
However, "Half-Baked Mode" does not support wifi simulations and you will need to assume that you have an established foothold on the drone data-link connection (via the 10.13.0.0/24 network)

*Note: If you have already followed the "Full-Deploy Mode" installation instructions you can skip these steps.*
*We assume initial access connectivity to the drone network (10.13.0.0/24)."

### Clone the repository

`git clone https://github.com/nicholasaleks/Damn-Vulnerable-Drone.git && cd Damn-Vulnerable-Drone`

### Build and Start Docker Containers

`docker compose up --build`

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

- [David Bombal - Drone Hacking Demo](https://youtu.be/c1ZCHCwqWls?t=5705)
- [Simulated Drone Hacking - Red Team Village at DEFCON 32](https://x.com/Nick_Aleks/status/1790928597244317913)
- [Drone Hacking Simulator - Drone Software Meetup Group](https://www.meetup.com/drone-software-meetup-group/events/300478718/)

# Community Support

The Damn Vulnerable Drone platform thrives on the active participation and collaboration of its user community. This community is a collective of like-minded individuals ranging from cybersecurity enthusiasts to professional ethical hackers, all focused on sharing knowledge and advancing skills in drone security. Whether you're encountering technical issues, seeking advice on tackling scenarios, or looking to discuss the latest trends in drone vulnerabilities, the Damn Vulnerable Drone community is a valuable resource.

The community [Slack Channel](https://join.slack.com/t/damnvulnerabledrone/shared_invite/zt-2g9tp202t-x5csb~uTyvHurgptki_XwQ) is available for users to connect, share experiences, and provide mutual support. Users are encouraged to participate actively, ask questions, and offer help to others. Experienced members of the community often mentor newcomers, fostering a culture of continuous learning and improvement. Remember, every question you ask and every answer you provide helps the entire community grow stronger.

# Feedback & Contributions

The platform maintains a [GitHub open source repository](https://github.com/nicholasaleks/Damn-Vulnerable-Drone) where users can submit their contributions. These contributions are reviewed by the maintainers and, if aligned with the project's goals, are integrated into the platform. By contributing, you help ensure that the DVD remains a cutting-edge tool for learning and practicing drone hacking techniques in a safe and ethical manner.

If you have developed a new attack scenario, discovered a way to improve the simulation, or created educational content that could benefit others, create a [GitHub Pull Request](https://github.com/nicholasaleks/Damn-Vulnerable-Drone/pulls). Contributions can take various forms, from code patches and feature suggestions to writing documentation and creating tutorial videos.

Feedback is the cornerstone of growth for the Damn Vulnerable Drone platform. Users are encouraged to provide their insights by creating a [GitHub Issue](https://github.com/nicholasaleks/Damn-Vulnerable-Drone/issues). Do your best to including any challenges faced and suggestions for enhancements. This feedback is invaluable for the ongoing development and refinement of the platform.

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

