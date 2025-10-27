"""
Flask API Server for Bot FSM
Provides REST endpoints for bot state management
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from bot_fsm import bot_manager, BotState
import random

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend communication

# ==========================================
# API ENDPOINTS
# ==========================================

@app.route('/')
def index():
    """API information"""
    return jsonify({
        "name": "3D Battleground Bot FSM API",
        "version": "1.0",
        "endpoints": {
            "/create": "POST - Create a new bot",
            "/update": "POST - Update bot state",
            "/reset": "POST - Reset bot to idle state",
            "/damage": "POST - Apply damage to bot",
            "/heal": "POST - Heal bot",
            "/state": "GET - Get bot current state",
            "/bots": "GET - Get all bots",
            "/remove": "POST - Remove a bot"
        }
    })


@app.route('/create', methods=['POST'])
def create_bot():
    """
    Create a new bot
    
    Request body (optional):
        {
            "initial_health": 100
        }
    
    Returns:
        {
            "success": true,
            "bot_id": "bot_1",
            "message": "Bot created successfully"
        }
    """
    data = request.get_json() or {}
    initial_health = data.get('initial_health', 100)
    
    bot_id = bot_manager.create_bot(initial_health)
    
    return jsonify({
        "success": True,
        "bot_id": bot_id,
        "message": "Bot created successfully",
        "state": bot_manager.get_bot(bot_id).get_state_info()
    })


@app.route('/update', methods=['POST'])
def update_bot():
    """
    Update bot state based on player information
    
    Request body:
        {
            "bot_id": "bot_1",
            "player_visible": true,
            "player_distance": 15.5
        }
    
    Returns:
        {
            "success": true,
            "bot_id": "bot_1",
            "state": "chase",
            "reason": "Player detected nearby",
            "health": 100,
            "player_visible": true,
            "player_distance": 15.5
        }
    """
    data = request.get_json()
    
    if not data:
        return jsonify({
            "success": False,
            "error": "No data provided"
        }), 400
    
    bot_id = data.get('bot_id')
    
    if not bot_id:
        return jsonify({
            "success": False,
            "error": "bot_id is required"
        }), 400
    
    bot = bot_manager.get_bot(bot_id)
    
    if not bot:
        return jsonify({
            "success": False,
            "error": f"Bot '{bot_id}' not found"
        }), 404
    
    # Get player information
    player_visible = data.get('player_visible', False)
    player_distance = data.get('player_distance', float('inf'))
    
    # Update bot state
    state_info = bot.update(player_visible, player_distance)
    
    return jsonify({
        "success": True,
        **state_info
    })


@app.route('/reset', methods=['POST'])
def reset_bot():
    """
    Reset bot to idle state
    
    Request body:
        {
            "bot_id": "bot_1"
        }
    
    Or for all bots:
        {
            "all": true
        }
    
    Returns:
        {
            "success": true,
            "message": "Bot reset to idle state",
            "state": {...}
        }
    """
    data = request.get_json() or {}
    
    # Check if resetting all bots
    if data.get('all'):
        bot_manager.reset_all()
        return jsonify({
            "success": True,
            "message": "All bots reset to idle state",
            "bot_count": len(bot_manager.get_all_bots())
        })
    
    bot_id = data.get('bot_id')
    
    if not bot_id:
        return jsonify({
            "success": False,
            "error": "bot_id is required"
        }), 400
    
    bot = bot_manager.get_bot(bot_id)
    
    if not bot:
        return jsonify({
            "success": False,
            "error": f"Bot '{bot_id}' not found"
        }), 404
    
    bot.reset()
    
    return jsonify({
        "success": True,
        "message": "Bot reset to idle state",
        "state": bot.get_state_info()
    })


@app.route('/damage', methods=['POST'])
def damage_bot():
    """
    Apply damage to bot
    
    Request body:
        {
            "bot_id": "bot_1",
            "damage": 25
        }
    
    Returns:
        {
            "success": true,
            "message": "Damage applied",
            "previous_health": 100,
            "current_health": 75,
            "state": {...}
        }
    """
    data = request.get_json()
    
    if not data:
        return jsonify({
            "success": False,
            "error": "No data provided"
        }), 400
    
    bot_id = data.get('bot_id')
    damage = data.get('damage', 0)
    
    if not bot_id:
        return jsonify({
            "success": False,
            "error": "bot_id is required"
        }), 400
    
    bot = bot_manager.get_bot(bot_id)
    
    if not bot:
        return jsonify({
            "success": False,
            "error": f"Bot '{bot_id}' not found"
        }), 404
    
    previous_health = bot.health
    bot.take_damage(damage)
    
    return jsonify({
        "success": True,
        "message": "Damage applied",
        "previous_health": previous_health,
        "current_health": bot.health,
        "damage_dealt": damage,
        "state": bot.get_state_info()
    })


@app.route('/heal', methods=['POST'])
def heal_bot():
    """
    Heal bot
    
    Request body:
        {
            "bot_id": "bot_1",
            "amount": 30
        }
    
    Returns:
        {
            "success": true,
            "message": "Bot healed",
            "previous_health": 50,
            "current_health": 80,
            "state": {...}
        }
    """
    data = request.get_json()
    
    if not data:
        return jsonify({
            "success": False,
            "error": "No data provided"
        }), 400
    
    bot_id = data.get('bot_id')
    amount = data.get('amount', 0)
    
    if not bot_id:
        return jsonify({
            "success": False,
            "error": "bot_id is required"
        }), 400
    
    bot = bot_manager.get_bot(bot_id)
    
    if not bot:
        return jsonify({
            "success": False,
            "error": f"Bot '{bot_id}' not found"
        }), 404
    
    previous_health = bot.health
    bot.heal(amount)
    
    return jsonify({
        "success": True,
        "message": "Bot healed",
        "previous_health": previous_health,
        "current_health": bot.health,
        "amount_healed": amount,
        "state": bot.get_state_info()
    })


@app.route('/state', methods=['GET'])
def get_bot_state():
    """
    Get bot current state
    
    Query parameters:
        bot_id: The bot ID
    
    Returns:
        {
            "success": true,
            "state": {...}
        }
    """
    bot_id = request.args.get('bot_id')
    
    if not bot_id:
        return jsonify({
            "success": False,
            "error": "bot_id parameter is required"
        }), 400
    
    bot = bot_manager.get_bot(bot_id)
    
    if not bot:
        return jsonify({
            "success": False,
            "error": f"Bot '{bot_id}' not found"
        }), 404
    
    return jsonify({
        "success": True,
        "state": bot.get_state_info()
    })


@app.route('/bots', methods=['GET'])
def get_all_bots():
    """
    Get all bots and their states
    
    Returns:
        {
            "success": true,
            "bot_count": 5,
            "bots": [...]
        }
    """
    bots = bot_manager.get_all_bots()
    
    return jsonify({
        "success": True,
        "bot_count": len(bots),
        "bots": [bot.get_state_info() for bot in bots.values()]
    })


@app.route('/remove', methods=['POST'])
def remove_bot():
    """
    Remove a bot
    
    Request body:
        {
            "bot_id": "bot_1"
        }
    
    Returns:
        {
            "success": true,
            "message": "Bot removed"
        }
    """
    data = request.get_json()
    
    if not data:
        return jsonify({
            "success": False,
            "error": "No data provided"
        }), 400
    
    bot_id = data.get('bot_id')
    
    if not bot_id:
        return jsonify({
            "success": False,
            "error": "bot_id is required"
        }), 400
    
    if bot_id not in bot_manager.get_all_bots():
        return jsonify({
            "success": False,
            "error": f"Bot '{bot_id}' not found"
        }), 404
    
    bot_manager.remove_bot(bot_id)
    
    return jsonify({
        "success": True,
        "message": f"Bot '{bot_id}' removed successfully"
    })


# ==========================================
# ERROR HANDLERS
# ==========================================

@app.errorhandler(404)
def not_found(error):
    return jsonify({
        "success": False,
        "error": "Endpoint not found"
    }), 404


@app.errorhandler(500)
def internal_error(error):
    return jsonify({
        "success": False,
        "error": "Internal server error"
    }), 500


# ==========================================
# MAIN
# ==========================================

if __name__ == '__main__':
    print("=" * 50)
    print("BOT FSM API SERVER")
    print("=" * 50)
    print("Server starting...")
    print("Access API at: http://localhost:5001")
    print("API Documentation at: http://localhost:5001")
    print("=" * 50)
    
    # Create some test bots on startup
    print("\nCreating test bots...")
    for i in range(3):
        bot_id = bot_manager.create_bot()
        print(f"  - Created {bot_id}")
    
    print(f"\nTotal bots: {len(bot_manager.get_all_bots())}")
    print("=" * 50)
    
    app.run(debug=True, port=5001, host='0.0.0.0')
