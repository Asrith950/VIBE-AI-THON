# Flask Backend Server for 3D Battleground Game
# Handles real-time multiplayer with Socket.IO

from flask import Flask, render_template, send_from_directory, request
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_cors import CORS
import time
import json
from datetime import datetime

# Initialize Flask app
app = Flask(__name__, 
            static_folder='.',
            template_folder='.')
app.config['SECRET_KEY'] = 'your-secret-key-here'

# Enable CORS for all routes
CORS(app)

# Initialize SocketIO
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

# Store connected players
players = {}
game_rooms = {}

# ==========================================
# FLASK ROUTES
# ==========================================

@app.route('/')
def index():
    """Serve the main game page"""
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    """Serve static files"""
    return send_from_directory('.', path)

# ==========================================
# SOCKET.IO EVENTS
# ==========================================

@socketio.on('connect')
def handle_connect(auth):
    """Handle new player connection"""
    sid = request.sid
    print(f'Player connected: {sid}')
    
    # Send current players to the new player
    emit('current_players', players)
    
    # Initialize new player data
    players[sid] = {
        'id': sid,
        'name': f'Player_{sid[:4]}',
        'position': {'x': 0, 'y': 0, 'z': 0},
        'rotation': {'x': 0, 'y': 0, 'z': 0},
        'health': 100,
        'maxHealth': 100,
        'kills': 0,
        'deaths': 0,
        'isAlive': True,
        'lastUpdate': time.time()
    }
    
    # Notify other players about new player
    emit('new_player', players[sid], broadcast=True, include_self=False)
    
    print(f'Total players: {len(players)}')

@socketio.on('disconnect')
def handle_disconnect():
    """Handle player disconnect"""
    sid = request.sid
    if sid in players:
        print(f'Player disconnected: {sid}')
        del players[sid]
        
        # Notify others
        emit('player_disconnected', {'id': sid}, broadcast=True)
        print(f'Remaining players: {len(players)}')

@socketio.on('player_update')
def handle_player_update(data):
    """Handle player position and rotation updates"""
    if request.sid in players:
        # Update player data
        players[request.sid]['position'] = data.get('position', players[request.sid]['position'])
        players[request.sid]['rotation'] = data.get('rotation', players[request.sid]['rotation'])
        players[request.sid]['lastUpdate'] = time.time()
        
        # Broadcast to other players (exclude sender)
        emit('player_moved', {
            'id': request.sid,
            'position': players[request.sid]['position'],
            'rotation': players[request.sid]['rotation']
        }, broadcast=True, include_self=False)

@socketio.on('player_shoot')
def handle_player_shoot(data):
    """Handle player shooting"""
    if request.sid in players and players[request.sid]['isAlive']:
        # Broadcast bullet to all other players
        emit('player_shot', {
            'id': request.sid,
            'position': data['position'],
            'direction': data['direction'],
            'timestamp': time.time()
        }, broadcast=True, include_self=False)

@socketio.on('player_hit')
def handle_player_hit(data):
    """Handle player taking damage"""
    target_id = data.get('targetId')
    damage = data.get('damage', 10)
    attacker_id = request.sid
    
    if target_id in players and players[target_id]['isAlive']:
        # Apply damage
        players[target_id]['health'] = max(0, players[target_id]['health'] - damage)
        
        # Broadcast damage event
        emit('player_damaged', {
            'targetId': target_id,
            'attackerId': attacker_id,
            'health': players[target_id]['health'],
            'damage': damage
        }, broadcast=True)
        
        # Check for death
        if players[target_id]['health'] <= 0:
            players[target_id]['isAlive'] = False
            players[target_id]['deaths'] += 1
            
            if attacker_id in players:
                players[attacker_id]['kills'] += 1
            
            # Broadcast death event
            emit('player_died', {
                'victimId': target_id,
                'killerId': attacker_id,
                'killerKills': players[attacker_id]['kills'] if attacker_id in players else 0
            }, broadcast=True)
            
            print(f'Player {target_id} killed by {attacker_id}')

@socketio.on('player_respawn')
def handle_player_respawn(data):
    """Handle player respawn"""
    if request.sid in players:
        # Reset player
        players[request.sid]['health'] = players[request.sid]['maxHealth']
        players[request.sid]['isAlive'] = True
        players[request.sid]['position'] = data.get('position', {'x': 0, 'y': 0, 'z': 0})
        
        # Notify all players
        emit('player_respawned', {
            'id': request.sid,
            'position': players[request.sid]['position'],
            'health': players[request.sid]['health']
        }, broadcast=True)
        
        print(f'Player {request.sid} respawned')

@socketio.on('get_leaderboard')
def handle_get_leaderboard():
    """Send current leaderboard"""
    # Sort players by kills
    leaderboard = sorted(
        players.values(),
        key=lambda p: p['kills'],
        reverse=True
    )[:10]  # Top 10
    
    emit('leaderboard_update', {
        'leaderboard': leaderboard,
        'totalPlayers': len(players)
    })

@socketio.on('chat_message')
def handle_chat_message(data):
    """Handle chat messages"""
    if request.sid in players:
        message_data = {
            'playerId': request.sid,
            'playerName': players[request.sid]['name'],
            'message': data.get('message', ''),
            'timestamp': datetime.now().strftime('%H:%M:%S')
        }
        
        # Broadcast to all players
        emit('chat_message', message_data, broadcast=True)

@socketio.on('player_animation')
def handle_player_animation(data):
    """Handle player animations (walking, jumping, etc.)"""
    if request.sid in players:
        emit('player_animation', {
            'id': request.sid,
            'animation': data.get('animation'),
            'state': data.get('state')
        }, broadcast=True, include_self=False)

# ==========================================
# BACKGROUND TASKS
# ==========================================

def cleanup_inactive_players():
    """Remove players who haven't sent updates in a while"""
    import threading
    
    def cleanup():
        while True:
            time.sleep(30)  # Check every 30 seconds
            current_time = time.time()
            inactive_players = []
            
            for player_id, player_data in players.items():
                if current_time - player_data['lastUpdate'] > 60:  # 60 seconds timeout
                    inactive_players.append(player_id)
            
            for player_id in inactive_players:
                print(f'Removing inactive player: {player_id}')
                del players[player_id]
                socketio.emit('player_disconnected', {'id': player_id})
    
    thread = threading.Thread(target=cleanup, daemon=True)
    thread.start()

# ==========================================
# API ROUTES (Optional)
# ==========================================

@app.route('/api/stats')
def get_stats():
    """Get server statistics"""
    return {
        'totalPlayers': len(players),
        'players': list(players.values()),
        'uptime': time.time(),
        'timestamp': datetime.now().isoformat()
    }

@app.route('/api/player/<player_id>')
def get_player(player_id):
    """Get specific player data"""
    if player_id in players:
        return players[player_id]
    return {'error': 'Player not found'}, 404

# ==========================================
# ERROR HANDLERS
# ==========================================

@app.errorhandler(404)
def not_found(error):
    return {'error': 'Not found'}, 404

@app.errorhandler(500)
def internal_error(error):
    return {'error': 'Internal server error'}, 500

# ==========================================
# MAIN
# ==========================================

if __name__ == '__main__':
    print('=' * 50)
    print('3D BATTLEGROUND - FLASK SERVER')
    print('=' * 50)
    print('Server starting...')
    print('Access game at: http://localhost:5000')
    print('=' * 50)
    
    # Start cleanup thread
    cleanup_inactive_players()
    
    # Run server
    socketio.run(
        app,
        host='0.0.0.0',
        port=5000,
        debug=True,
        allow_unsafe_werkzeug=True
    )
