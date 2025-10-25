# 🎯 Stance System - Crouch & Prone

## ✅ New Features Added

### Three Stance System
Your game now has a complete stance system with three positions:

1. **STANDING** (Default)
   - Full height and speed
   - Can run with Shift
   - Can jump with Space
   - Full movement capability

2. **CROUCHING** (Press C)
   - 65% height (harder to hit)
   - 53% speed (slower movement)
   - Cannot run or jump
   - Good for cover and stealth

3. **PRONE** (Press X)
   - 30% height (lowest profile)
   - 27% speed (slowest movement)
   - Body rotates horizontal
   - Cannot run or jump
   - Best for hiding and sniping

---

## 🎮 Controls

| Key | Action |
|-----|--------|
| **C** | Toggle Crouch (Standing ↔ Crouching) |
| **X** | Toggle Prone (Any stance → Prone) |
| **Space** | Jump (Only when Standing) |
| **Shift** | Run (Only when Standing) |

---

## 📊 Stance Specifications

### Height Changes
```
Standing:  2.0 units (100%)
Crouching: 1.3 units (65%)
Prone:     0.6 units (30%)
```

### Speed Changes
```
Running:   0.35 units/frame (233% of walking)
Walking:   0.15 units/frame (100%)
Crouching: 0.08 units/frame (53%)
Prone:     0.04 units/frame (27%)
```

### Camera Height
```
Standing:  1.6 units (eye level)
Crouching: 1.04 units (65% of standing)
Prone:     0.56 units (35% of standing)
```

---

## 🎨 Visual Indicators

### Stance Display
- Located in **top-left HUD**
- Shows current stance in **bold text**
- Color-coded:
  - 🟢 **GREEN** = Standing
  - 🟡 **YELLOW** = Crouching
  - 🟠 **ORANGE** = Prone

### Player Model Changes
- **Crouching**: Body compressed vertically, legs bent
- **Prone**: Body rotated 90°, lying flat on ground
- **Smooth transitions** between all stances

---

## ⚙️ Technical Details

### Smooth Transitions
- All stance changes use **lerp interpolation** (15% per frame)
- Height transitions are gradual, not instant
- Camera height adjusts smoothly
- Model scaling updates in real-time

### Gameplay Balance
- **Standing**: Best for mobility and combat
- **Crouching**: Balance between stealth and movement
- **Prone**: Maximum cover, minimum mobility

### Restrictions
- Can only jump when **standing**
- Can only run when **standing**
- Must be on ground to change stance
- Prone has most restricted movement

---

## 🎯 Strategic Uses

### When to Crouch
- Taking cover behind obstacles
- Moving quietly through enemy territory
- Reducing your hitbox in combat
- Approaching enemies without being seen

### When to Go Prone
- Maximum cover behind low obstacles
- Sniping from a stationary position
- Hiding in tall grass or bushes
- Avoiding detection when enemies nearby
- Emergency evasion when low on health

### When to Stand
- Active combat and shooting
- Quick repositioning
- Jumping over obstacles
- Fastest movement speed with Shift

---

## 🔄 How It Works

### Stance Toggle Logic
```
Press C:
  Standing → Crouching
  Crouching → Standing
  Prone → (no effect)

Press X:
  Standing → Prone
  Crouching → Prone
  Prone → Standing
```

### Model Adaptation
- Body parts scale proportionally to stance
- Arms and legs adjust position
- Gun position updates based on height
- Collision detection uses current height

---

## 🎨 Animation Details

### Standing
- Normal walk animation
- Enhanced run animation (Shift)
- Full arm and leg swing
- Minimal body bob

### Crouching
- Slower walk animation
- Reduced arm swing
- Legs stay bent
- Lower center of gravity

### Prone
- Body horizontal
- Minimal animation
- Head slightly raised
- Arms and legs flat

---

## 💡 Tips & Tricks

1. **Quick Cover**: Press X to instantly drop prone when under fire
2. **Peek Shooting**: Crouch behind cover, stand to shoot, crouch again
3. **Stealth Approach**: Use prone to cross open areas undetected
4. **Speed vs Safety**: Stand for speed, crouch for balance, prone for safety
5. **Combat Stance**: Crouch in firefights to reduce your hitbox

---

## 🚀 Future Enhancements (Optional)

### Possible Additions:
- **Lean Left/Right** (Q/E keys)
- **Slide mechanic** (Shift + C while running)
- **Stamina system** (affects stance duration)
- **Stance-based accuracy** (more accurate when prone)
- **Movement noise** (prone is silent, running is loud)
- **Stance-specific animations** for shooting
- **Cover system** (auto-crouch near walls)

---

## 📝 Configuration

All stance settings can be modified in `js/config.js`:

```javascript
PLAYER_HEIGHT: 2,              // Standing height
PLAYER_CROUCH_HEIGHT: 1.3,     // Crouching height
PLAYER_PRONE_HEIGHT: 0.6,      // Prone height
PLAYER_SPEED: 0.15,            // Walking speed
PLAYER_CROUCH_SPEED: 0.08,     // Crouching speed
PLAYER_PRONE_SPEED: 0.04,      // Prone speed
```

---

## ✅ Testing Checklist

- [x] C key toggles crouch on/off
- [x] X key goes to prone
- [x] X from prone returns to standing
- [x] Camera height adjusts smoothly
- [x] Movement speed changes per stance
- [x] Cannot jump when crouched/prone
- [x] Cannot run when crouched/prone
- [x] Stance indicator updates in UI
- [x] Player model scales correctly
- [x] Smooth transitions between stances

---

**Enjoy your new tactical stance system! 🎮**
