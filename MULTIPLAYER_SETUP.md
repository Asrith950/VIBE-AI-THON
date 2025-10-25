# 🎮 Multiplayer Setup Guide

## Quick Start

### 1️⃣ Install Python Dependencies

Open a terminal in the `battleground-3d` folder and run:

```bash
pip install -r requirements.txt
```

This will install:
- Flask (web server)
- Flask-SocketIO (real-time communication)
- Flask-CORS (cross-origin support)
- eventlet (async support)

### 2️⃣ Start the Flask Server

In the same terminal, run:

```bash
python server.py
```

You should see:
```
 * Running on http://0.0.0.0:5000
 * Socket.IO is running
```

### 3️⃣ Open Multiple Browser Windows

1. Open your browser to: **http://localhost:5000**
2. Open another tab/window to: **http://localhost:5000**
3. Open a third tab if you want more players!

### 4️⃣ Test Multiplayer

In each browser window:
- Click to start the game
- Move around with **WASD**
- Look with your **mouse**
- Shoot with **left click**

**You should see other players moving in real-time!** 🎯

---

## 🔧 Troubleshooting

### Problem: "io is not defined" error in console

**Solution:** Make sure Socket.IO client library is loaded. Check that this line exists in `index.html`:
```html
<script src="https://cdn.socket.io/4.5.4/socket.io.min.js"></script>
```

### Problem: Python dependencies not installing

**Solution:** Try upgrading pip first:
```bash
python -m pip install --upgrade pip
pip install -r requirements.txt
```

### Problem: Port 5000 already in use

**Solution:** Change the port in two places:

1. In `server.py` (last line):
```python
socketio.run(app, host='0.0.0.0', port=5001, debug=True)
```

2. In `js/game.js` (top of file):
```javascript
const socket = io('http://localhost:5001');
```

### Problem: Players can't see each other

**Solution:** Check the browser console (F12) for errors. Make sure:
- Flask server is running (check terminal)
- Socket.IO connection shows "Connected to server" in console
- No firewall blocking port 5000

---

## 🌐 How the Multiplayer Works

### Client-Side (Browser)
- **game.js** connects to Flask server using Socket.IO
- Sends position updates **20 times per second** (every 50ms)
- Receives updates from other players in real-time
- Creates "remote player" objects for each connected player

### Server-Side (Flask)
- **server.py** maintains a list of all connected players
- Broadcasts movements to all other players
- Handles shooting events and damage
- Tracks kills/deaths and leaderboard
- Cleans up inactive players every 30 seconds

### Events Being Synchronized
1. **Player Connect/Disconnect** - Join/leave game
2. **Movement** - Position and rotation updates
3. **Shooting** - Bullet creation across all clients
4. **Damage** - Health reduction when hit
5. **Death** - Player elimination and respawn

---

## 📊 Server Endpoints

While the server is running, you can access:

- **Game:** http://localhost:5000/
- **Stats:** http://localhost:5000/api/stats (JSON)
- **Player Data:** http://localhost:5000/api/player/PLAYER_ID (JSON)

---

## 🚀 Next Steps

### Add Player Names
Modify the start screen to ask for a player name:

```javascript
// In game.js, when connecting:
socket.emit('player_update', {
    name: playerName, // Get from input field
    position: this.localPlayer.getPosition(),
    rotation: this.localPlayer.rotation
});
```

### Add Chat System
The server already supports chat! Add a chat UI:

```javascript
// Send message
socket.emit('chat_message', { message: 'Hello!' });

// Receive messages
socket.on('chat_message', (data) => {
    console.log(`${data.playerName}: ${data.message}`);
});
```

### Add Respawn System
The server supports respawning:

```javascript
// When player dies, wait 3 seconds then:
socket.emit('player_respawn');

// Listen for respawn
socket.on('player_respawned', (data) => {
    // Reset player health and position
});
```

### Deploy to Production
For real online multiplayer:
1. Deploy Flask server to cloud (Heroku, AWS, DigitalOcean)
2. Update socket URL to production server
3. Use production WSGI server (gunicorn)
4. Add authentication for security

---

## 🎯 Performance Tips

### Reduce Network Traffic
- Decrease update rate (change 50ms to 100ms)
- Only send updates when position changes significantly
- Compress data before sending

### Improve Synchronization
- Add client-side prediction (move immediately, sync later)
- Add interpolation for smoother remote player movement
- Implement lag compensation

### Scale to More Players
- Add rooms/lobbies (max 10 players per room)
- Use Redis for session storage
- Implement server clustering

---

## 📝 Technical Details

### Position Update Flow
```
Player moves → Client updates local position → 
Send to server (50ms interval) → Server broadcasts to all →
Other clients receive → Update remote player position
```

### Shooting Flow
```
Player clicks → Create bullet locally → Send shoot event →
Server broadcasts → Other clients create same bullet →
Bullet hits player → Send damage event → Server validates →
Update health on all clients
```

### Data Format
```javascript
// Position update
{
    position: { x: 0, y: 1.5, z: 0 },
    rotation: { x: 0, y: 0, z: 0 }
}

// Shoot event
{
    position: { x: 0, y: 1.5, z: 0 },
    direction: { x: 0, y: 0, z: 1 }
}

// Damage event
{
    targetId: 'player-123',
    damage: 10
}
```

---

## 🎮 Enjoy Your Multiplayer Game!

You now have a fully functional real-time multiplayer 3D battleground game! Invite friends to play by sharing your IP address (if on same network) or deploy to a cloud server for worldwide access.

**Have fun and happy gaming! 🎯🔫**
