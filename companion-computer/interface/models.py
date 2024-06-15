from extensions import db

class TelemetryStatus(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    status = db.Column(db.String(80), nullable=False)
    packets_received = db.Column(db.Integer, default=0)
    vehicle_type = db.Column(db.String(80), nullable=True)
    firmware_version = db.Column(db.String(80), nullable=True)

class VehicleInfo(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    vehicle_type = db.Column(db.String(80), nullable=False)
    firmware_version = db.Column(db.String(80), nullable=False)

class UdpDestination(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    ip = db.Column(db.String(50))
    port = db.Column(db.Integer)