"""ROS 2 Python launch file for the Damn Vulnerable Drone simulator.

Replaces the ROS 1 XML launch (damn-vulnerable-drone.launch). It includes
the gazebo_ros wrapper that boots Gazebo Classic 11 with the DVD world.
ArduPilot SITL still talks to Gazebo over the native libArduPilotPlugin
UDP channel — this launch file does not touch that side.

Headless / non-GUI flags match the pre-migration master branch behaviour.
"""

from launch import LaunchDescription
from launch.actions import IncludeLaunchDescription
from launch.launch_description_sources import PythonLaunchDescriptionSource
from launch.substitutions import PathJoinSubstitution
from launch_ros.substitutions import FindPackageShare


def generate_launch_description() -> LaunchDescription:
    gazebo_launch = PathJoinSubstitution(
        [FindPackageShare("gazebo_ros"), "launch", "gazebo.launch.py"]
    )

    return LaunchDescription(
        [
            IncludeLaunchDescription(
                PythonLaunchDescriptionSource([gazebo_launch]),
                launch_arguments={
                    "world": "/Simulator/ardupilot_gazebo/worlds/damn-vulnerable-drone.world",
                    "paused": "false",
                    "use_sim_time": "true",
                    "gui": "false",
                    "verbose": "true",
                }.items(),
            ),
        ]
    )
