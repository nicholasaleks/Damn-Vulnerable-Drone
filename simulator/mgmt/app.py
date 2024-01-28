from flask import Flask, render_template
import docker
from flask_cors import CORS

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "http://localhost:8080"}})

@app.route('/')
def index():
    client = docker.from_env()
    container = client.containers.get('companion-computer')
    exec_id = client.api.exec_create(container.id, 'ls')['Id']
    output = client.api.exec_start(exec_id)
    print(output.decode())
    return render_template('pages/simulator.html', output=output.decode())

@app.errorhandler(404)
def page_not_found(e):
    # Note that we set the 404 status explicitly
    return render_template('pages/404.html'), 404

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000, debug=True)