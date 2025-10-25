# 🎮 3D Battleground - Multiplayer Combat Game

A fully-featured 3D multiplayer battleground game built with **Three.js**, **HTML5**, **CSS3**, and **JavaScript**.

![Game Screenshot](https://via.placeholder.com/800x400?text=3D+Battleground+Game)

## ✨ Features

### Core Gameplay
- ✅ **3D Graphics** - Realistic battleground with Three.js rendering
- ✅ **Multiple Players** - Local player + 5 AI enemies
- ✅ **Smooth Movement** - WASD controls with running (Shift) and jumping (Space)
- ✅ **First-Person Camera** - Mouse-controlled view with smooth following
- ✅ **Weapon System** - Click to shoot projectiles with cooldown
- ✅ **Collision Detection** - Bullets hit players with damage
- ✅ **Health System** - 100 HP per player, visual health bars
- ✅ **Physics** - Realistic gravity, jumping, and motion

### Visual Features
- 🎯 **Minimap** - Top-down view in corner showing all players
- 🎯 **Particle Effects** - Bullet impacts create explosions
- 🎯 **Scoreboard** - Real-time player stats (health & kills)
- 🎯 **Health Bars** - Displayed above each player in 3D space
- 🎯 **HUD** - Crosshair, health bar, ammo counter
- 🎯 **Arena** - Grass ground, sky, boundary walls

### Game Mechanics
- 🏃 **Walking & Running** - Smooth movement with animation
- 🦘 **Jumping** - Space bar with gravity physics
- 🎯 **Aiming** - First-person view with crosshair
- 💥 **Shooting** - Projectile-based weapons with cooldown
- ❤️ **Damage System** - Take damage, flash red, health depletes
- 💀 **Death** - Game over screen with kill count
- 🤖 **AI Enemies** - Automatic movement and shooting

## 🎮 Controls

| Key | Action |
|-----|--------|
| **WASD** | Move (Forward, Left, Backward, Right) |
| **Mouse** | Look around / Aim |
| **Left Click** | Shoot |
| **Space** | Jump |
| **Shift** | Run (faster movement) |
| **ESC** | Unlock mouse cursor |

## 🚀 How to Run

### Option 1: Python Server (Recommended)
```bash
# Navigate to the game folder
cd battleground-3d

# Start local server
python -m http.server 8080

# Open browser
# Visit: http://localhost:8080
```

### Option 2: Node.js Server
```bash
# Install http-server globally
npm install -g http-server

# Navigate to folder and run
cd battleground-3d
http-server -p 8080

# Visit: http://localhost:8080
```

### Option 3: VS Code Live Server
1. Install "Live Server" extension in VS Code
2. Right-click `index.html`
3. Select "Open with Live Server"

## 📁 Project Structure

```
battleground-3d/
├── index.html          # Main HTML file
├── styles.css          # All styling and HUD
├── README.md          # This file
└── js/
    ├── config.js       # Game configuration
    ├── player.js       # Player class (movement, health, shooting)
    ├── bullet.js       # Bullet class (projectiles, collision)
    ├── minimap.js      # Minimap rendering
    └── game.js         # Main game loop and scene setup
```

## 🔧 Configuration

Edit `js/config.js` to customize:

```javascript
const CONFIG = {
    ARENA_SIZE: 100,           // Arena size
    PLAYER_SPEED: 0.15,        // Walk speed
    PLAYER_RUN_SPEED: 0.3,     // Run speed
    PLAYER_JUMP_FORCE: 0.3,    // Jump strength
    PLAYER_MAX_HEALTH: 100,    // Health points
    BULLET_SPEED: 2,           // Bullet velocity
    BULLET_DAMAGE: 10,         // Damage per hit
    BULLET_COOLDOWN: 300,      // Milliseconds between shots
    NUM_ENEMIES: 5,            // Number of AI enemies
    // ... more settings
};
```

## 🌐 Multiplayer Setup (Next Steps)

### Converting to Real Multiplayer with Socket.io

This game currently simulates multiplayer with AI enemies. To add real multiplayer:

#### 1. Install Socket.io Server

```bash
npm init -y
npm install express socket.io
```

#### 2. Create Server (`server.js`)

```javascript
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

// Serve static files
app.use(express.static(__dirname));

// Store connected players
const players = {};

io.on('connection', (socket) => {
    console.log('Player connected:', socket.id);
    
    // Send existing players to new player
    socket.emit('currentPlayers', players);
    
    // Notify others about new player
    socket.broadcast.emit('newPlayer', {
        id: socket.id,
        x: 0,
        z: 0,
        health: 100
    });
    
    // Add player to list
    players[socket.id] = {
        id: socket.id,
        x: 0,
        z: 0,
        health: 100
    };
    
    // Handle player movement
    socket.on('playerMovement', (data) => {
        if (players[socket.id]) {
            players[socket.id].x = data.x;
            players[socket.id].z = data.z;
            players[socket.id].rotation = data.rotation;
            
            // Broadcast to others
            socket.broadcast.emit('playerMoved', players[socket.id]);
        }
    });
    
    // Handle shooting
    socket.on('playerShoot', (data) => {
        socket.broadcast.emit('playerShot', {
            id: socket.id,
            position: data.position,
            direction: data.direction
        });
    });
    
    // Handle damage
    socket.on('playerHit', (data) => {
        if (players[data.targetId]) {
            players[data.targetId].health -= data.damage;
            
            io.emit('playerDamaged', {
                id: data.targetId,
                health: players[data.targetId].health,
                attackerId: socket.id
            });
            
            // Check death
            if (players[data.targetId].health <= 0) {
                io.emit('playerDied', {
                    id: data.targetId,
                    killerId: socket.id
                });
            }
        }
    });
    
    // Handle disconnect
    socket.on('disconnect', () => {
        console.log('Player disconnected:', socket.id);
        delete players[socket.id];
        io.emit('playerDisconnected', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
```

#### 3. Modify Client Code (`js/game.js`)

Add at the top of `game.js`:

```javascript
// Connect to Socket.io server
const socket = io('http://localhost:3000');

// In Game constructor, add:
constructor() {
    // ... existing code ...
    
    this.initMultiplayer();
}

initMultiplayer() {
    // Receive existing players
    socket.on('currentPlayers', (players) => {
        Object.values(players).forEach(playerData => {
            if (playerData.id !== socket.id) {
                const enemy = new Player(
                    this.scene, 
                    playerData.x, 
                    playerData.z, 
                    false, 
                    playerData.id
                );
                this.players.push(enemy);
            }
        });
    });
    
    // New player joined
    socket.on('newPlayer', (playerData) => {
        const enemy = new Player(
            this.scene, 
            playerData.x, 
            playerData.z, 
            false, 
            playerData.id
        );
        this.players.push(enemy);
    });
    
    // Player moved
    socket.on('playerMoved', (playerData) => {
        const player = this.players.find(p => p.name === playerData.id);
        if (player) {
            player.group.position.set(playerData.x, player.group.position.y, playerData.z);
            player.rotation.y = playerData.rotation;
        }
    });
    
    // Player shot
    socket.on('playerShot', (data) => {
        const player = this.players.find(p => p.name === data.id);
        if (player) {
            const bullet = new Bullet(
                this.scene,
                new THREE.Vector3(data.position.x, data.position.y, data.position.z),
                new THREE.Vector3(data.direction.x, data.direction.y, data.direction.z),
                player
            );
            this.bullets.push(bullet);
        }
    });
    
    // Send local player updates
    setInterval(() => {
        if (this.localPlayer && this.localPlayer.isAlive) {
            socket.emit('playerMovement', {
                x: this.localPlayer.group.position.x,
                z: this.localPlayer.group.position.z,
                rotation: this.localPlayer.rotation.y
            });
        }
    }, 50); // 20 updates per second
}

// Modify shoot method to emit to server:
if (player.isLocal) {
    socket.emit('playerShoot', {
        position: {
            x: spawnPos.x,
            y: spawnPos.y,
            z: spawnPos.z
        },
        direction: {
            x: direction.x,
            y: direction.y,
            z: direction.z
        }
    });
}
```

#### 4. Run Multiplayer Server

```bash
node server.js
```

Open multiple browser windows at `http://localhost:3000` to test!

### Alternative: WebRTC Peer-to-Peer

For peer-to-peer multiplayer without a central server:

1. Use **PeerJS** or **Simple-Peer**
2. One player hosts, others join with host ID
3. Direct data exchange between browsers
4. Lower latency but more complex

## 🎨 Customization Ideas

### Visual Enhancements
- Add different weapon models
- Create realistic terrain with height maps
- Add trees, rocks, buildings as cover
- Implement different player skins/teams
- Add weather effects (rain, fog)

### Gameplay Features
- Multiple weapon types (pistol, rifle, sniper)
- Power-ups (health packs, ammo, shields)
- Team-based gameplay (Red vs Blue)
- Respawn system with spawn points
- Killstreaks and achievements
- Voice chat integration

### Performance
- Implement object pooling for bullets
- Use Level of Detail (LOD) for distant objects
- Compress network data
- Add interpolation for smoother remote player movement

## 🐛 Troubleshooting

**Three.js not loading?**
- Check internet connection (CDN required)
- Or download Three.js locally

**Pointer lock not working?**
- Must be on `localhost` or `https://`
- Click anywhere to start

**Performance issues?**
- Reduce `NUM_ENEMIES` in config
- Lower shadow quality in game.js
- Disable fog/particles

**Mouse sensitivity too high/low?**
- Adjust `MOUSE_SENSITIVITY` in config.js

## 📄 License

MIT License - Free to use and modify!

## 🙏 Credits

- **Three.js** - 3D Graphics Library
- Built for hackathon/learning purposes
- Inspired by classic FPS games

## 🚀 Next Steps

1. ✅ Test the game locally
2. ✅ Experiment with config settings
3. ✅ Add Socket.io for real multiplayer
4. ✅ Deploy to Heroku/Vercel
5. ✅ Add more features!

---

**Have fun playing! 🎮🔫💥**
