from flask import Blueprint, render_template, url_for, redirect
import docker
from docker.errors import NotFound
from models import Stage
from extensions import db
from models import Stage
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)
handler = logging.StreamHandler()
handler.setLevel(logging.INFO)
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
handler.setFormatter(formatter)
logger.addHandler(handler)

main = Blueprint('main', __name__)

@main.route('/')
def index():
    stages = Stage.query.all()
    return render_template('pages/simulator.html', stages=stages, current_page='home')

@main.route('/reset', methods=['POST'])
def reset_world():
    print('Resetting World Simulation...')
    stage1 = Stage.query.filter_by(name='Stage 1').first()
    stage1.status = 'Enabled'
    stage2 = Stage.query.filter_by(name='Stage 2').first()
    stage2.status = 'Disabled'
    stage3 = Stage.query.filter_by(name='Stage 3').first()
    stage3.status = 'Disabled'
    stage4 = Stage.query.filter_by(name='Stage 4').first()
    stage4.status = 'Disabled'
    stage5 = Stage.query.filter_by(name='Stage 5').first()
    stage5.status = 'Disabled'
    stage6 = Stage.query.filter_by(name='Stage 6').first()
    stage6.status = 'Disabled'
    db.session.commit()

    # Reset Flight Controller
    ########################################################
    client = docker.from_env()
    container = client.containers.get('flight-controller')
    kill_command_1 = "pkill -f sim_vehicle.py"
    container.exec_run(kill_command_1)
    kill_command_2 = "pkill -f arducopter"
    container.exec_run(kill_command_2)

    # Reset GCS
    ########################################################
    try:
        gcs_container = client.containers.get('ground-control-station')
        gcs_container.restart()
    except NotFound:
        print("GCS container not found.")

    # Reset Simulator
    ########################################################

    output = 'Reset'
    return render_template('pages/simulator.html', output=output, current_page='home')

@main.route('/stage1', methods=['POST', ])
def stage1():
    """
    Stage 1: Initial Boot
    """
    stage1 = Stage.query.filter_by(name='Stage 1').first()
    stage2 = Stage.query.filter_by(name='Stage 2').first()
    stage1.status = 'Active'
    stage2.status = 'Enabled'
    db.session.commit()

    client = docker.from_env()
    container = client.containers.get('flight-controller')
    logging.info('Triggering Stage 1...')
    command = "Tools/autotest/sim_vehicle.py --location=0,0,0 -v ArduCopter -f gazebo-iris --no-rebuild --no-mavproxy --sim-address=10.13.0.5 -A '--serial0=uart:/dev/ttyACM0:57600'"
    
    # Log the command before executing it
    logging.info("Executing command: %s", command)

    # Execute the command and capture the output in real-time
    output_stream = []
    for line in container.exec_run(command, stream=True):
        if isinstance(line, bytes):
            line = line.decode()
        logging.info("Command output: %s", line)
        output_stream.append(line)
    
    return render_template('pages/simulator.html', output=output_stream, current_page='home')

@main.route('/stage2', methods=['POST', ])
def stage2():
    """
    Stage 2: Arm & Takeoff
    """
    stage2 = Stage.query.filter_by(name='Stage 2').first()
    stage3 = Stage.query.filter_by(name='Stage 3').first()
    stage2.status = 'Active'
    stage3.status = 'Enabled'
    db.session.commit()

    client = docker.from_env()
    container = client.containers.get('ground-control-station')
    logging.info('Triggering Stage 2...')
    command = "python3 /arm-and-takeoff.py"
    
    # Log the command before executing it
    logging.info("Executing command: %s", command)

    # Execute the command and capture the output in real-time
    try:
        exit_code, output = container.exec_run(command, stream=False)
        output = output.decode() if isinstance(output, bytes) else output
        logging.info("Command output: %s", output)
    except Exception as e:
        logging.error("Container execution error: %s", str(e))
        output = str(e)
    
    return render_template('pages/simulator.html', output=output, current_page='home')


# @main.route('/stage3', methods=['POST', ])
# def stage3():
#     """
#     Stage 3: Operator Flight
#     """
#     stage3 = Stage.query.filter_by(name='Stage 3').first()
#     stage4 = Stage.query.filter_by(name='Stage 4').first()
#     stage3.status = 'Active'
#     stage4.status = 'Enabled'
#     db.session.commit()

#     client = docker.from_env()
#     container = client.containers.get('ground-control-station')
#     logging.info('Triggering Stage 3...')
#     command = "python3 /operator-flight.py"
    
#     # Log the command before executing it
#     logging.info("Executing command: %s", command)

#     # Execute the command and capture the output in real-time
#     try:
#         exit_code, output = container.exec_run(command, stream=False)
#         output = output.decode() if isinstance(output, bytes) else output
#         logging.info("Command output: %s", output)
#     except Exception as e:
#         logging.error("Container execution error: %s", str(e))
#         output = str(e)
    
#     return render_template('pages/simulator.html', output=output)

@main.route('/stage3', methods=['POST', ])
def stage3():
    """
    Stage 3: Autopilot Flight
    """
    stage3 = Stage.query.filter_by(name='Stage 3').first()
    stage4 = Stage.query.filter_by(name='Stage 4').first()
    stage3.status = 'Active'
    stage4.status = 'Enabled'
    db.session.commit()

    client = docker.from_env()
    container = client.containers.get('ground-control-station')
    logging.info('Triggering Stage 3...')
    command = "python3 /autopilot-flight.py"
    
    # Log the command before executing it
    logging.info("Executing command: %s", command)

    # Execute the command and capture the output in real-time
    try:
        exit_code, output = container.exec_run(command, stream=False)
        output = output.decode() if isinstance(output, bytes) else output
        logging.info("Command output: %s", output)
    except Exception as e:
        logging.error("Container execution error: %s", str(e))
        output = str(e)
    
    return render_template('pages/simulator.html', output=output, current_page='home')

@main.route('/stage4', methods=['POST', ])
def stage4():
    """
    Stage 4: Return to Land
    """
    stage4 = Stage.query.filter_by(name='Stage 4').first()
    stage5 = Stage.query.filter_by(name='Stage 5').first()
    stage4.status = 'Active'
    stage5.status = 'Enabled'
    db.session.commit()

    client = docker.from_env()
    container = client.containers.get('ground-control-station')
    logging.info('Triggering Stage 4...')
    command = "python3 /return-to-land.py"
    
    # Log the command before executing it
    logging.info("Executing command: %s", command)

    # Execute the command and capture the output in real-time
    try:
        exit_code, output = container.exec_run(command, stream=False)
        output = output.decode() if isinstance(output, bytes) else output
        logging.info("Command output: %s", output)
    except Exception as e:
        logging.error("Container execution error: %s", str(e))
        output = str(e)
    
    return render_template('pages/simulator.html', output=output, current_page='home')

@main.route('/stage5', methods=['POST', ])
def stage5():
    """
    Stage 5: Post Flight Analysis
    """
    stage5 = Stage.query.filter_by(name='Stage 5').first()
    stage5.status = 'Active'
    db.session.commit()

    client = docker.from_env()
    container = client.containers.get('ground-control-station')
    logging.info('Triggering Stage 5...')
    command = "python3 /post-flight-analysis.py"
    
    # Log the command before executing it
    logging.info("Executing command: %s", command)

    # Execute the command and capture the output in real-time
    try:
        exit_code, output = container.exec_run(command, stream=False)
        output = output.decode() if isinstance(output, bytes) else output
        logging.info("Command output: %s", output)
    except Exception as e:
        logging.error("Container execution error: %s", str(e))
        output = str(e)
    
    return render_template('pages/simulator.html', output=output, current_page='home')


###############################
# Getting Started
###############################
@main.route('/getting-started')
def getting_started():
    return render_template('pages/getting-started.html', section=None, current_page='getting-started')

@main.route('/guide/user-interface')
def user_interface():
    return render_template('pages/getting-started.html', section='guide', current_page='user-interface')



@main.errorhandler(404)
def page_not_found(e):
    return render_template('pages/404.html'), 404