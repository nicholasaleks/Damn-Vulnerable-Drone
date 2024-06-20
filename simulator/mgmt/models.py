from extensions import db

STATUS_CHOICES = ['Disabled', 'Enabled', 'Loading', 'Active']

class Stage(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(50), unique=True, nullable=False)
    name = db.Column(db.String(50), unique=True, nullable=False)
    status = db.Column(db.String(50), default='Disabled')

    def __repr__(self):
        return f'<Stage {self.name}, Status {self.status}>'

    @db.validates('status')
    def validate_status(self, key, status):
        if status not in STATUS_CHOICES:
            raise ValueError("Invalid status")
        return status

def create_initial_stages():

    stage_names = ["Stage 1", "Stage 2", "Stage 3", "Stage 4", "Stage 5", "Stage 6"]
    for name in stage_names:
        if not Stage.query.filter_by(name=name).first():
            if name == "Stage 1":
                stage = Stage(name=name, code=name.replace(" ", "").lower(), status="Enabled")
            else:
                stage = Stage(name=name, code=name.replace(" ", "").lower(), status="Disabled")
            db.session.add(stage)
        # Else update the status of all stages (except Stage 1 which should be enabled) to Disabled
        else:
            stage = Stage.query.filter_by(name=name).first()
            if name == "Stage 1":
                stage.status = "Enabled"
            else:
                stage.status = "Disabled"

    db.session.commit()