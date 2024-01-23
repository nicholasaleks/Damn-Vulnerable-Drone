from flask import Flask, render_template

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('pages/simulator.html')

@app.errorhandler(404)
def page_not_found(e):
    # Note that we set the 404 status explicitly
    return render_template('pages/404.html'), 404

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000, debug=True)