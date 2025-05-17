from flask import Flask, request, jsonify
from flask_cors import CORS
from terminal import run_command

app = Flask(__name__)
CORS(app)

@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.json
    cmd = data.get('message', '').strip()
    if not cmd:
        return jsonify({'error': 'Comando não fornecido'}), 400

    output = run_command(cmd)
    return jsonify(output)

@app.route('/api/test', methods=['GET'])
def test():
    return jsonify({'status': 'API simulando terminal Linux!'})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
