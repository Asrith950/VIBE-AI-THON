# 🎮 QUICK START - 3D Battleground Multiplayer

## ⚡ 3 Steps to Play Multiplayer

### 1. Install Dependencies
```powershell
pip install -r requirements.txt
```

### 2. Start Server
```powershell
python server.py
```
**OR** just double-click: `start-server.bat`

### 3. Open Browser
Open **http://localhost:5000** in **multiple tabs**

---

## 🎯 That's It!

- Move around in each tab
- **You'll see other players moving in real-time!**
- Shoot with left click
- Watch damage sync across all players

---

## 📋 Checklist

- ✅ Python installed
- ✅ Dependencies installed (`pip install -r requirements.txt`)
- ✅ Server running (`python server.py`)
- ✅ Multiple browser tabs open to http://localhost:5000
- ✅ Playing multiplayer! 🎮

---

## 🆘 Troubleshooting

**Problem:** "io is not defined"  
**Fix:** Refresh browser (Socket.IO client is now in HTML)

**Problem:** "ModuleNotFoundError"  
**Fix:** Run `pip install -r requirements.txt`

**Problem:** "Port 5000 in use"  
**Fix:** Close other apps using port 5000, or change port in `server.py` and `game.js`

**Problem:** Players can't see each other  
**Fix:** Check Flask terminal for errors, check browser console (F12)

---

## 🎮 Controls

| Key | Action |
|-----|--------|
| **WASD** | Move |
| **Mouse** | Look Around |
| **Left Click** | Shoot |
| **Space** | Jump |
| **Shift** | Run |
| **ESC** | Unlock Mouse |

---

## 📁 Important Files

- **server.py** - Flask backend server
- **js/game.js** - Multiplayer integration
- **index.html** - Socket.IO client included
- **requirements.txt** - Python dependencies

---

## 🌐 Server Endpoints

- **Game:** http://localhost:5000/
- **Stats:** http://localhost:5000/api/stats
- **Player:** http://localhost:5000/api/player/ID

---

## 🚀 Next Steps

See **MULTIPLAYER_COMPLETE.md** for:
- Feature enhancements
- Deployment guide
- Performance tuning
- Advanced customization

---

**Have fun! 🎯🔫**
