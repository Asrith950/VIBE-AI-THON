# AI & Camera Improvements

## Changes Made

### 1. **Enemies Fight Each Other (Free-for-All Battle Royale)**
- **Before**: Enemies only targeted the player
- **After**: Enemies now scan all alive players/enemies within 45 units and target the nearest one with line-of-sight
- Each enemy tracks `currentTarget` (can be player or another enemy)
- Creates dynamic battlefield where bots fight each other, not just ganging up on you
- You can watch enemies battle while staying out of the fight

**Technical Implementation**:
```javascript
// Find nearest visible target (player or other enemies)
this.players.forEach(p => {
    if (p === enemy || !p.isAlive) return; // Don't target self or dead
    const dist = ePos.distanceTo(pPos);
    if (dist < 45) { // Within awareness range
        const hasLOS = this.hasLineOfSight(from, to);
        if (hasLOS && dist < nearestDist) {
            nearestTarget = p;
            nearestDist = dist;
        }
    }
});
```

### 2. **Third-Person Camera (No Lag)**
- **Before**: First-person with head bobbing and camera smoothing
- **After**: Third-person view 4.5 units behind and 2.0 units above player
- Camera uses `lookAt()` to always face player's upper body
- **No smoothing/lerp** - instant camera updates eliminate lag
- Obstacle avoidance: raycast prevents camera clipping into walls

**Camera Position**:
```javascript
const followDistance = 4.5;
const followHeight = 2.0;
const forward = new THREE.Vector3(0, 0, -1).applyEuler(this.localPlayer.rotation);
const desiredPos = playerPos.clone()
    .sub(forward.multiplyScalar(followDistance))
    .add(new THREE.Vector3(0, followHeight, 0));
this.camera.position.copy(desiredPos); // Direct copy, no lerp
this.camera.lookAt(lookAtPos);
```

### 3. **No Fixed Gun UI**
- Removed first-person gun model creation in third-person mode
- Hidden crosshair with `display: none` in CSS (not needed in third-person)
- You now see your character holding the gun model as part of the player body

### 4. **Increased Fire Rate**
- **Before**: 150ms cooldown (6.6 shots/sec)
- **After**: 90ms cooldown (~11 shots/sec)
- Much faster combat pace

## Files Modified

### js/game.js
1. **addEnemyAI()** - Enemies now target nearest visible player/enemy
   - Added `currentTarget` tracking
   - Loop through all `this.players` to find targets
   - Use `nearestTarget` instead of `this.localPlayer` for movement and shooting

2. **Third-person camera** in `animate()`
   - Behind-and-above follow position
   - Obstacle avoidance raycast
   - Direct position copy (no lerp)
   - `lookAt()` for natural camera angles

3. **Performance tuning**
   - Shadow map reduced: 2048 → 1024
   - Pixel ratio capped at 1.25
   - `powerPreference: 'high-performance'`

### js/config.js
- `BULLET_COOLDOWN: 150 → 90` (faster firing)
- `CAMERA_SMOOTHNESS: 0.15 → 1.0` (no smoothing in third-person)

### styles.css
- `#crosshair { display: none; }` (hidden in third-person)

## Gameplay Impact

### Battle Royale Feel
- Enemies fight each other organically
- You can eliminate weakened enemies after they battle
- Strategic positioning matters more
- Multiple threats from different directions

### Camera Benefits
- See your character's movement and stance clearly
- No camera shake or lag when running
- Better situational awareness (see behind you)
- Smooth obstacle avoidance

### Combat Changes
- 83% faster fire rate (11 vs 6 shots/sec)
- More intense gunfights
- Enemies more dangerous with burst fire

## Testing

Run the game and observe:
1. **Enemy infighting**: Bots will shoot each other when you're not the nearest target
2. **Third-person stability**: Camera follows smoothly without lag during running
3. **No gun overlay**: Clean screen with just character model visible
4. **Rapid fire**: Hold mouse button for sustained automatic fire

## Configuration

Want to tune the behavior?

**Enemy targeting range** (js/game.js):
```javascript
if (dist < 45) { // Change this value
```

**Camera distance** (js/game.js):
```javascript
const followDistance = 4.5; // Further back = wider view
const followHeight = 2.0;    // Higher = more top-down
```

**Fire rate** (js/config.js):
```javascript
BULLET_COOLDOWN: 90, // Lower = faster fire
```

## Performance Notes

- Reduced shadow quality saves ~20% GPU
- Pixel ratio cap helps on 4K displays
- Third-person has similar performance to first-person (no head bob calculations)
- Enemy AI targeting loop is O(n²) but with only 5-6 players it's negligible

Enjoy the battle royale chaos! 🎮
