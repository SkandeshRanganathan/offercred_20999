
import random

def get_bot_response(user_input):
    responses = [
        "Hello! How can I assist you today?",
        "I'm here to help! What can I do for you?",
        "Hi there! Let me know what you need.",
        "How can I make your day better?",
        "I'm happy to assist you! What do you need help with?"
    ]
    return random.choice(responses)
