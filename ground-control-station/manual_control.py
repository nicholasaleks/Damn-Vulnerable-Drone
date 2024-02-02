import asyncio
from mavsdk import System
from mavsdk.offboard import OffboardError, PositionNedYaw

async def run():
    drone = System()
    await drone.connect(system_address="udp://:14550")

    print("Waiting for drone to connect...")
    async for state in drone.core.connection_state():
        if state.is_connected:
            print("Drone connected!")
            break

    print("Waiting for drone to be ready to arm...")
    async for health in drone.telemetry.health():
        if health.is_global_position_ok:
            print("Drone health is good enough to arm")
            break

    print("Arming...")
    await drone.action.arm()

    await asyncio.sleep(15)

    #print("Taking off...")
    await drone.action.takeoff()
    await asyncio.sleep(10)  # Wait for the drone to reach the takeoff altitude

    print("Setting initial setpoint for offboard mode...")
    await drone.offboard.set_position_ned(PositionNedYaw(0.0, 0.0, -10.0, 0.0))

    try:
        print("Starting offboard mode...")
        await drone.offboard.start()
    except OffboardError as error:
        print(f"Failed to start offboard mode: {error._result.result}")
        return

    # Control loop to simulate manual control
    try:
        # Fly square pattern
        for _ in range(2):
            print("Flying North")
            await drone.offboard.set_position_ned(PositionNedYaw(0.0, 5.0, 0.0, 0.0))
            await asyncio.sleep(5)

            print("Flying East")
            await drone.offboard.set_position_ned(PositionNedYaw(5.0, 5.0, 0.0, 90.0))
            await asyncio.sleep(5)

            print("Flying South")
            await drone.offboard.set_position_ned(PositionNedYaw(5.0, 0.0, 0.0, 180.0))
            await asyncio.sleep(5)

            print("Flying West")
            await drone.offboard.set_position_ned(PositionNedYaw(0.0, 0.0, 0.0, 270.0))
            await asyncio.sleep(5)

    except asyncio.CancelledError:
        pass

    finally:
        print("Stopping offboard mode...")
        await drone.offboard.stop()

        print("Disarming...")
        await drone.action.disarm()

if __name__ == "__main__":
    asyncio.run(run())
