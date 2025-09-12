from flask import Flask, request, jsonify
from flask_cors import CORS  # Import CORS to handle cross-origin requests
import sys

# Assuming bot.py is in the same directory as app.py
sys.path.insert(0, './')  # Adjust if necessary
import bot

app = Flask(__name__)

# Enable CORS for all routes
CORS(app)

# Route for the bot to handle incoming requests
@app.route('/get_response', methods=['POST'])
def get_response():
    user_message = request.json.get('message')  # Get the message from the user
    bot_response = bot.get_bot_response(user_message)  # Get the bot's response
    return jsonify({'response': bot_response})  # Send back the response in JSON format

if __name__ == '__main__':
    app.run(debug=True)  # Run the Flask app in debug mode
