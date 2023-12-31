# Damn Vulnerable Drone

Damn Vulnerable Drone is an intentionally vulnerable drone hacking simulator based on the popular ArduPilot/MAVLink architecture, providing a realistic environment for hands-on drone hacking.

<p align="center">
  <img src="https://github.com/nicholasaleks/Damn-Vulnerable-Drone/blob/master/simulator/static/images/Damn-Vulnerable-Drone-Banner.png?raw=true" alt="DVD"/>
</p>

# Table of Contents

* [About Damn Vulnerable Drone](#about-damn-vulnerable-drone)
  * [Features](#features)
  * [Architecture](#architecture)
  * [Flight States](#flight-states)
* [Attack Scenarios](#attack-scenarios)
* [Operating Modes](#operating-modes)
* [Installation](#installation)
  * [Full-Deploy Mode Installation](#full-deploy-mode-installation)
  * [Half-Baked Mode Installation](#half-baked-mode-installation)
* [Management Console](#management-console)
* [Screenshots](#screenshots)
* [Maintainers](#maintainers)
* [Contributors](#contributors)
* [Mentions](#mentions)
* [Disclaimer](#disclaimer)
* [License](#license)

# About Damn Vulnerable Drone

Damn Vulnerable Drone (DVD) was built to provide offensive security professionals with a safe virtualized environment to practice a wide range of drone hacking techniques.

DVD is engineered to mimic a compact Unmanned Aerial Vehicle (UAV) with limited endurance and a small operating range within Line-of-Sight (LOS), relying on a WiFi connection. It employs [MAVLink](https://mavlink.io/en/), a streamlined messaging protocol, for interactions with a virtual Conpanion Computer and Ground Control Station (GCS) using [QGroundControl](http://qgroundcontrol.com/). Additionally, the Drone utilizes [ArduPilot](https://ardupilot.org/), an open-source flight control software, for autonomous navigation and leverages Software-in-the-Loop (SITL) within [Gazebo](https://gazebosim.org/home), a dynamic physics simulator, to replicate authentic drone behaviors by executing real flight code and telemetry, typically embedded in drone systems

While the Damn Vulnerable Drone setup doesn't mirror every drone architecture or configuration, the integrated tactics, techniques and scenarios are broadly applicable across various drone systems, models and communication protocols.

Damn Vulnerable Drone also contains a Simulatior Management Console (SMC), to help provide users with full control of the simulator and guide the their learning experience.

## Features

- **Realistic Drone Simulation**: Utilizes the popular drone technologies and architectures to mimic real-world behaviors and vulnerabilities.
- **Virtualized Environment**: Runs in a completely virtualized setup, making it accessible and safe for experimentation.
- **Simulated Wireless Networking**: Simulated Wifi (802.11) interfaces to practice wireless drone attacks.
- **Simulator Management Console**: Simple to use simulator management web console used to trigger scenarios and drone flight states.
- **Comprehensive Hacking Scenarios**: Ideal for practicing a wide range of drone hacking techniques, from basic reconnaissance to advanced exploitation.

## Architecture

Damn Vulnerable Drone uses a Docker environment to encapsulate several containers which represent the common components found in most drone architectures.
- *Drone Flight Control Unit (FCU)*: Controls the drone's flight mechanisms and autopilot.
- *Drone Companion Computer*: Simulates the drone's onboard computer.
- *Ground Control Stations (GCS)*: Acts as the command and control center for the drone.
- *Simulator*: Uses Gazebo to provide a realistic drone flight simulator

The above four containers make up the simulated drone-stack. This stack is intended to be built and run with docker on a Kali VM.
You can manage the simulated environment by using the built-in DVD Management Console.

## Flight States

Damn Vulnerable Drone simulates various drone states for a realistic testing environment. Users can manage the drone states in real-time by using the Management Console.
1. Initial Boot & Configuration
2. Idle Standby
3. Active Flight
4. Autopilot Flight
5. Emergency, Return-To-Home (RTH) Landing
6. Post-Flight Data Processing
7. Shutdown

# Attack Scenarios

The list of attack scenarios below is organized by stages. Note that some attacks are only possible during certain flight states.

* **Reconnaissance**
  * Drone Discovery
  * Ground Station Discovery
  * Network Fingerprinting
* **Wireless Network Attacks**
  * WEP Network Cracking - using Aircrack-ng
  * Man-in-the-Middle Eavesdropping - using Wireshark
* **Denial of Service**
  * Ground Control DeAuth - using Airodump
  * Drone Computer Process Killing
  * Mid-flight Drone Shutdown
  * MAVLink Router Table Overflow 
**Reverse Engineering**
  * Telemtry Analysis
  * Decompling Firmware
* **Protocol Spoofing**
  * MAVLink Message Replaying
  * GPS Spoofing
  * Drone Telemtry Data Spoofing - Tricking the GCS
* **Command Injection & Hijacking**
  * MAVLink Message Command Injection
  * Drone Hijacking via Ground Control Station Spoofing
  * Ground Control Station Hijacking via Drone Laterl Movement
* **Firmware Attacks**
  * Malicious Firmware Upload
  * Jailbreaking Parameter Tampering
* **Data Collection & Exfiltration**
  * Onboard SD Card Data Collection
  * Flight Data Log Collection
  * AWS Secrets Extraction
  * Drone Wifi Client Data Leakage
  * Live Drone Video Camera Streaming

# Operating Modes

To support a wide variety of users and use cases Damn Vulnerable Drone can be deployed in two modes. 

### Full-Deploy Mode

"Full-Deploy Mode" allows for Damn Vulnerable Drone to use a virtually simulated wifi network as the data-link connection between the Ground Station and Drone Companion Computer.
The system requirements to run "Full-Deploy Mode" a Kali VM with the following minimum requirements:
* Kali Linux VM (Ubuntu 22.04 is also supported)
  * 8-16 GB RAM
  * 2-4 Processor Cores
  * 100 GB Disk Storage
  * Docker
  * Docker Compose

To install the "Full-Deploy Mode" see installation details below.

### Half-Baked Mode (Docker-Only)

"Half-Baked Mode" essentially only runs the Damn Vulnerable Drone docker containers.
Unlike "Full-Deploy Mode" you are not limited to only running "Half-Baked Mode" within a Kali Linux VM.
However, "Half-Baked Mode" does not support wifi simulations and you will need to assume that you have an established foothold on the drone data-link connection.

To install the "Half-Baked Mode" see installation details below.

# Installation

## Full-Deploy Mode Installation 

*Note: Fully-Deploy Mode was only tested on Kali Linux*

### Install Docker & Docker Compose

Add the docker apt source

`printf '%s\n' "deb https://download.docker.com/linux/debian bullseye stable" | sudo tee /etc/apt/sources.list.d/docker-ce.list`

Import the GPG Key

`curl -fsSL https://download.docker.com/linux/debian/gpg | sudo gpg --dearmor -o /etc/apt/trusted.gpg.d/docker-ce-archive-keyring.gpg`

Update the apt repository

`sudo apt update -y`

Install Docker and Docker Compose

`sudo apt install docker-ce docker-ce-cli containerd.io -y`

Start the Docker Service

`sudo systemctl enable docker –-now`

Add docker permissions to user

`sudo usermod -aG docker $USER`

### Clone the repository

`git clone https://github.com/nicholasaleks/Damn-Vulnerable-Drone.git && cd Damn-Vulnerable-Drone`

## Starting & Stopping Damn Vulnerable Drone

Damn Vulnerable Drone (Full-Deploy Mode) includes three useful bash scripts which will help you manage the state of your simulator.

#### Build & Start

The start script is used to both build and start the Damn Vulnerable Drone simulator. This script will automatically create a `dvd.log` log file in the project directory, which you can use to view the simulator logs.

`sudo ./start.sh`

#### Stop

The stop script is used to perform a full cleanup of the Damn Vulnerable Drone simulator and all of its virtual interface artifacts. Stop logs are also appended to the `dvd.log` log file.

`sudo ./stop.sh`

#### Status

If you ever want to check the status of your simulator you can run the status script as shown below.

`sudo ./status.sh`

## Half-Baked Mode Installation

*Note: If you have already followed the "Full-Deploy Mode" installation instructions you can skip these steps.*
*We assume you already have docker and docker compose on your system."

### Clone the repository

`git clone https://github.com/nicholasaleks/Damn-Vulnerable-Drone.git && cd Damn-Vulnerable-Drone`

### Build and Start Docker Containers

`docker compose up --build`

# Management Console

TBD

# Screenshots

TBD

# Maintainers

- [Nick Aleks](https://github.com/nicholasaleks)

# Contributor Appreciation

A big Thank You to the kind people who helped make Damn Vulnerable Drone better:

- [David Ansart](https://github.com/Raizo62)

# Mentions

TBD

# Disclaimer

Damn Vulnerable Drone is highly insecure, and as such, should not be deployed on internet facing servers.
It is intentionally flawed and vulnerable, as such, it comes with no warranties.
By using Damn Vulnerable Drone, you take full responsibility for using it.

# License

It is distributed under the MIT License. See LICENSE for more information.

