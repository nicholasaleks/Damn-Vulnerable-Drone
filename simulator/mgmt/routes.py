from flask import Blueprint, render_template
import docker
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
    return render_template('pages/simulator.html', stages=stages)

@main.route('/reset', methods=['POST'])
def reset_world():
    logging.info("Resetting world")

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

    # Reset Simulator
    ########################################################

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

    output = 'Reset'
    return render_template('pages/simulator.html', output=output)

@main.route('/stage1', methods=['POST', ])
def stage1():
    stage1 = Stage.query.filter_by(name='Stage 1').first()
    stage2 = Stage.query.filter_by(name='Stage 2').first()
    stage1.status = 'Active'
    stage2.status = 'Enabled'
    db.session.commit()

    client = docker.from_env()
    container = client.containers.get('flight-controller')
    logging.info("Executing command")
    print('Hello')
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
    
    return render_template('pages/simulator.html', output=output_stream)

@main.errorhandler(404)
def page_not_found(e):
    return render_template('pages/404.html'), 404