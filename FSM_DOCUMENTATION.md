# 🤖 Bot Finite State Machine (FSM) Documentation

## Overview

This FSM system provides intelligent bot AI for the 3D Battleground game. Each bot has 6 states and transitions between them based on game conditions.

## 📊 State Diagram

```
                    ┌─────────┐
                    │  IDLE   │
                    └────┬────┘
                         │ timer expires
                         ▼
    ┌────────────────────────────────────┐
    │           PATROL                   │
    └───┬──────────────────────────┬─────┘
        │ player detected          │
        ▼                          │
    ┌─────────┐                    │
    │  CHASE  │◄───────────────────┘
    └────┬────┘
         │ in attack range
         ▼
    ┌─────────┐
    │ ATTACK  │
    └────┬────┘
         │ health < 20
         ▼
    ┌─────────┐
    │  FLEE   │
    └────┬────┘
         │ health > 50
         └──────► CHASE
         
    Any state → DEAD (when health ≤ 0)
```

## 🎮 Bot States

### 1. **IDLE** (Starting State)
- Bot is stationary and not active
- **Transitions:**
  - → PATROL: After random timer (2-5 seconds)
  - → CHASE: If player detected within 30m

### 2. **PATROL**
- Bot moves around randomly
- **Transitions:**
  - → CHASE: If player spotted within 30m
  - → FLEE: If health < 20
  - → IDLE: After patrol duration (3-8 seconds)

### 3. **CHASE**
- Bot pursues the player
- **Transitions:**
  - → ATTACK: If player within 10m
  - → FLEE: If health < 20
  - → PATROL: If player out of sight or too far (45m+)

### 4. **ATTACK**
- Bot attacks the player
- **Transitions:**
  - → FLEE: If health < 20
  - → CHASE: If player moves beyond 10m
  - → CHASE: If player out of sight

### 5. **FLEE**
- Bot retreats from combat
- **Transitions:**
  - → CHASE: If health > 50 and player visible
  - → PATROL: If player no longer visible
  - → IDLE: If safe distance reached (60m+)

### 6. **DEAD** (Terminal State)
- Bot is eliminated
- **Transitions:** None (terminal state)

## 🔧 Configuration

### Bot Parameters
```python
CHASE_RANGE = 30.0          # Distance to start chasing
ATTACK_RANGE = 10.0         # Distance to start attacking
FLEE_HEALTH_THRESHOLD = 20  # Health level to flee
RECOVER_HEALTH_THRESHOLD = 50 # Health to re-engage
```

## 🌐 API Endpoints

### Base URL
```
http://localhost:5001
```

### 1. Create Bot
**POST** `/create`

**Request:**
```json
{
    "initial_health": 100
}
```

**Response:**
```json
{
    "success": true,
    "bot_id": "bot_1",
    "message": "Bot created successfully",
    "state": {
        "bot_id": "bot_1",
        "state": "idle",
        "reason": "Bot initialized",
        "health": 100,
        "max_health": 100,
        "player_visible": false,
        "player_distance": null,
        "time_in_state": 0.0
    }
}
```

### 2. Update Bot State
**POST** `/update`

**Request:**
```json
{
    "bot_id": "bot_1",
    "player_visible": true,
    "player_distance": 15.5
}
```

**Response:**
```json
{
    "success": true,
    "bot_id": "bot_1",
    "state": "chase",
    "reason": "Player detected nearby",
    "health": 100,
    "max_health": 100,
    "player_visible": true,
    "player_distance": 15.5,
    "time_in_state": 0.15
}
```

### 3. Reset Bot
**POST** `/reset`

**Request (Single Bot):**
```json
{
    "bot_id": "bot_1"
}
```

**Request (All Bots):**
```json
{
    "all": true
}
```

**Response:**
```json
{
    "success": true,
    "message": "Bot reset to idle state",
    "state": {...}
}
```

### 4. Apply Damage
**POST** `/damage`

**Request:**
```json
{
    "bot_id": "bot_1",
    "damage": 25
}
```

**Response:**
```json
{
    "success": true,
    "message": "Damage applied",
    "previous_health": 100,
    "current_health": 75,
    "damage_dealt": 25,
    "state": {...}
}
```

### 5. Heal Bot
**POST** `/heal`

**Request:**
```json
{
    "bot_id": "bot_1",
    "amount": 30
}
```

**Response:**
```json
{
    "success": true,
    "message": "Bot healed",
    "previous_health": 50,
    "current_health": 80,
    "amount_healed": 30,
    "state": {...}
}
```

### 6. Get Bot State
**GET** `/state?bot_id=bot_1`

**Response:**
```json
{
    "success": true,
    "state": {...}
}
```

### 7. Get All Bots
**GET** `/bots`

**Response:**
```json
{
    "success": true,
    "bot_count": 3,
    "bots": [
        {...},
        {...},
        {...}
    ]
}
```

### 8. Remove Bot
**POST** `/remove`

**Request:**
```json
{
    "bot_id": "bot_1"
}
```

**Response:**
```json
{
    "success": true,
    "message": "Bot 'bot_1' removed successfully"
}
```

## 🚀 Quick Start

### 1. Install Dependencies
```bash
pip install flask flask-cors
```

### 2. Start the FSM Server
```bash
python fsm_server.py
```

Output:
```
==================================================
BOT FSM API SERVER
==================================================
Server starting...
Access API at: http://localhost:5001
==================================================

Creating test bots...
  - Created bot_1
  - Created bot_2
  - Created bot_3

Total bots: 3
==================================================
```

### 3. Run Tests
```bash
python test_fsm.py
```

### 4. Test with cURL

**Create a bot:**
```bash
curl -X POST http://localhost:5001/create \
  -H "Content-Type: application/json" \
  -d '{"initial_health": 100}'
```

**Update bot state:**
```bash
curl -X POST http://localhost:5001/update \
  -H "Content-Type: application/json" \
  -d '{
    "bot_id": "bot_1",
    "player_visible": true,
    "player_distance": 15
  }'
```

**Apply damage:**
```bash
curl -X POST http://localhost:5001/damage \
  -H "Content-Type: application/json" \
  -d '{
    "bot_id": "bot_1",
    "damage": 30
  }'
```

## 📝 Example Usage Scenarios

### Scenario 1: Player Approaches Bot
```python
import requests

API_URL = "http://localhost:5001"

# Create bot
response = requests.post(f"{API_URL}/create")
bot_id = response.json()['bot_id']

# Player far away (IDLE/PATROL)
requests.post(f"{API_URL}/update", json={
    "bot_id": bot_id,
    "player_visible": True,
    "player_distance": 50
})

# Player gets closer (CHASE)
requests.post(f"{API_URL}/update", json={
    "bot_id": bot_id,
    "player_visible": True,
    "player_distance": 20
})

# Player in attack range (ATTACK)
requests.post(f"{API_URL}/update", json={
    "bot_id": bot_id,
    "player_visible": True,
    "player_distance": 8
})
```

### Scenario 2: Bot Takes Damage and Flees
```python
# Bot is attacking
requests.post(f"{API_URL}/update", json={
    "bot_id": bot_id,
    "player_visible": True,
    "player_distance": 8
})

# Bot takes heavy damage
requests.post(f"{API_URL}/damage", json={
    "bot_id": bot_id,
    "damage": 85
})

# Bot flees
response = requests.post(f"{API_URL}/update", json={
    "bot_id": bot_id,
    "player_visible": True,
    "player_distance": 8
})

print(response.json()['state'])  # Output: "flee"
```

### Scenario 3: Bot Recovers and Re-engages
```python
# Heal bot
requests.post(f"{API_URL}/heal", json={
    "bot_id": bot_id,
    "amount": 60
})

# Bot sees player again
response = requests.post(f"{API_URL}/update", json={
    "bot_id": bot_id,
    "player_visible": True,
    "player_distance": 20
})

print(response.json()['state'])  # Output: "chase"
```

## 🔄 Integration with Game

To integrate the FSM with your 3D Battleground game:

1. **Start FSM Server** alongside your game server
2. **Create bots** when enemies spawn in game
3. **Update bot states** every game tick with player position
4. **Apply damage** when player shoots bot
5. **Use bot state** to control bot behavior in game

### Example Integration Code:
```javascript
// In your game.js

// Create bot when enemy spawns
async function spawnEnemy() {
    const response = await fetch('http://localhost:5001/create', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({initial_health: 100})
    });
    const data = await response.json();
    return data.bot_id;
}

// Update bot state each frame
async function updateEnemyAI(botId, enemy) {
    const playerPos = localPlayer.getPosition();
    const enemyPos = enemy.getPosition();
    const distance = playerPos.distanceTo(enemyPos);
    const visible = isPlayerVisible(enemy, localPlayer);
    
    const response = await fetch('http://localhost:5001/update', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            bot_id: botId,
            player_visible: visible,
            player_distance: distance
        })
    });
    
    const data = await response.json();
    
    // Update enemy behavior based on state
    switch(data.state) {
        case 'idle':
            enemy.stop();
            break;
        case 'patrol':
            enemy.patrol();
            break;
        case 'chase':
            enemy.moveToward(playerPos);
            break;
        case 'attack':
            enemy.shootAt(playerPos);
            break;
        case 'flee':
            enemy.moveAwayFrom(playerPos);
            break;
        case 'dead':
            enemy.die();
            break;
    }
}
```

## 🎯 State Transition Rules

| Current State | Condition | Next State | Reason |
|--------------|-----------|------------|---------|
| IDLE | Timer expired | PATROL | "Idle timer expired" |
| IDLE | Player detected < 30m | CHASE | "Player detected nearby" |
| PATROL | Player detected < 30m | CHASE | "Player spotted during patrol" |
| PATROL | Health < 20 | FLEE | "Health critical, retreating" |
| PATROL | Timer expired | IDLE | "Patrol complete" |
| CHASE | Health < 20 | FLEE | "Health critical during chase" |
| CHASE | Distance < 10m | ATTACK | "Player in attack range" |
| CHASE | Not visible | PATROL | "Lost sight of player" |
| CHASE | Distance > 45m | PATROL | "Player out of range" |
| ATTACK | Health < 20 | FLEE | "Health critical, retreating from combat" |
| ATTACK | Distance > 10m | CHASE | "Player moved out of attack range" |
| ATTACK | Not visible | CHASE | "Lost visual on player" |
| FLEE | Health > 50 & visible | CHASE | "Health recovered, re-engaging" |
| FLEE | Not visible | PATROL | "Escaped, returning to patrol" |
| FLEE | Distance > 60m | IDLE | "Safe distance reached" |
| ANY | Health ≤ 0 | DEAD | "Health depleted" |

## 📊 Testing Results

Run `test_fsm.py` to see all transitions in action. Expected output shows:
- ✅ IDLE → PATROL (timer based)
- ✅ PATROL → CHASE (player detection)
- ✅ CHASE → ATTACK (range based)
- ✅ ATTACK → FLEE (health based)
- ✅ FLEE → CHASE (recovery)
- ✅ Any → DEAD (fatal damage)
- ✅ DEAD → IDLE (reset)

## 🐛 Troubleshooting

**Bot not transitioning:**
- Check that `player_visible` and `player_distance` are correct
- Verify health thresholds
- Ensure update is being called regularly

**Server not responding:**
- Check if server is running on port 5001
- Verify no firewall blocking
- Check for error messages in server console

**Multiple bots interfering:**
- Each bot has unique ID
- States are managed independently
- Use `/bots` endpoint to debug all bots

## 📚 Additional Resources

- `bot_fsm.py` - Core FSM logic
- `fsm_server.py` - Flask API server
- `test_fsm.py` - Test demonstrations
- Main game files in parent directory

## 🎮 Happy Bot Hunting!
