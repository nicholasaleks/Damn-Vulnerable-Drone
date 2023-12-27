# Damn Vulnerable Drone

Damn Vulnerable Drone is an intentionally vulnerable drone hacking simulator based on the ArduPilot/MAVLink drone architectures, providing a realistic environment for hands-on hacking exploration.

<p align="center">
  <img src="https://github.com/nicholasaleks/Damn-Vulnerable-Drone/blob/master/simulator/static/images/Damn-Vulnerable-Drone-Banner.png?raw=true" alt="DVD"/>
</p>

# Table of Contents

* [About Damn Vulnerable Drone](#about)
  * [Features](#features)
  * [Architecture](#features)
  * [Operating Modes](#drone-states)
* [Scenarios](#scenarios)
* [Prerequisites](#prerequisites)
* [Installation](#installation)
  * [Installation - Ubuntu](#ubuntu)
  * [Installation - Docker](#docker)
  * [Installation - Kali](#kali)
* [Management Console](#management-console)
* [Screenshots](#screenshots)
* [Maintainers](#maintainers)
* [Contributors](#contributors)
* [Mentions](#mentions)
* [Disclaimer](#disclaimer)
* [License](#license)

# About Damn Vulnerable Drone

Damn Vulnerable Drone (DVD) was build to provide offensive security professionals with safe virtualized environment to practice a wide range of drone hacking techniques. DVD takes advantage of SITL (Software-in-the-loop) drone simulation technology to mimic real-world drone behaviours and vulnerabiliites.

## Features

- **Realistic Drone Simulation**: Utilizes popular ArduPilot/MAVLink architectures to mimic real-world drone behaviors and vulnerabilities.
- **Virtualized Environment**: Runs in a completely virtualized setup, making it accessible and safe for experimentation.
- **Simulated Wireless Networking**: Simulated Wifi (802.11) interfaces to practice wireless drone attacks.
- **Management Interface**: Simple to use simulator management web console used to trigger scenarios and drone flight states.
- **Comprehensive Hacking Scenarios**: Ideal for practicing a wide range of drone hacking techniques, from basic reconnaissance to advanced exploitation.

## Architecture

Damn Vulnerable Drone is built on a Docker environment that encapsulates several containers of the typical drone-stack.
- *Drone Flight Control Unit (FCU)*: Controls the drone's flight mechanisms and autopilot.
- *Drone Companion Computer*: Simulates the drone's onboard computer.
- *Ground Control Stations (GCS)*: Acts as the command and control center for the drone.
- *Simulator*: Uses Gazebo to provide a realistic drone flight simulator

The above four containers make up the entire DVD simulated environment. This entire stack is intended to be built and executed on a Ubuntu 22.04 virtual machine. As an "attacker" you are intended to only interact with the simulated environment from you Kali virtual machine. You can manage the simulated environment by using the built-in DVD Management Console.

## Drone States

DVD simulates various drone states for a realistic testing environment. To simpliy management of the simulator this drones states can be triggered from the Management Console.
1. Initial Boot & Configuration
2. Idle Standby
3. Direct Active Flight
4. Autopilot Flight
5. Emergency, Return-To-Home (RTH) Landing
6. Post-Flight Data Processing

# Scenarios



# License

It is distributed under the MIT License. See LICENSE for more information.

