from flask import Blueprint, jsonify, request
from interface import db
from interface.models import Config, UdpDestination

config_bp = Blueprint('config', __name__)

@config_bp.route('/config', methods=['GET'])
def get_config():
    configs = Config.query.all()
    config_dict = {config.key: config.value for config in configs}
    return jsonify(config_dict)

@config_bp.route('/config', methods=['POST'])
def update_config():
    data = request.json
    for key, value in data.items():
        config = Config.query.filter_by(key=key).first()
        if config:
            config.value = value
        else:
            config = Config(key=key, value=value)
            db.session.add(config)
    db.session.commit()
    return jsonify({'status': 'Config updated'})

@config_bp.route('/config/udp-destinations', methods=['GET'])
def get_udp_destinations():
    destinations = UdpDestination.query.all()
    destination_list = [{'ip': dest.ip, 'port': dest.port} for dest in destinations]
    return jsonify(destination_list)

@config_bp.route('/config/udp-destinations', methods=['POST'])
def add_udp_destination():
    data = request.json
    ip = data.get('ip')
    port = data.get('port')
    destination = UdpDestination(ip=ip, port=port)
    db.session.add(destination)
    db.session.commit()
    return jsonify({'status': 'UDP destination added'})

@config_bp.route('/config/udp-destinations/<int:id>', methods=['DELETE'])
def delete_udp_destination(id):
    destination = UdpDestination.query.get(id)
    if destination:
        db.session.delete(destination)
        db.session.commit()
        return jsonify({'status': 'UDP destination deleted'})
    return jsonify({'error': 'UDP destination not found'}), 404