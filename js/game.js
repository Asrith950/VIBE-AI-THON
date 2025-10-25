// ==========================================
// MAIN GAME FILE
// Handles scene setup, game loop, and controls
// ==========================================

// Socket.IO connection to Flask backend
const socket = io('http://localhost:5000');

class Game {
    constructor() {
        // Game state
        this.isPlaying = false;
        this.isPaused = false;
        this.playerName = 'Player'; // Store player name
        this.isScoped = false; // Scope/zoom state
        this.teamMode = 'solo'; // Team mode: solo, duo, squad
        this.teammates = []; // AI teammates
        
        // Players and bullets
        this.players = [];
        this.bullets = [];
        this.localPlayer = null;
        this.remotePlayers = {}; // Store remote players by ID
        
        // AI enemies
        this.enemies = [];
        
        // Input
        this.keys = {
            w: false,
            a: false,
            s: false,
            d: false,
            space: false,
            shift: false,
            c: false,      // Crouch
            x: false       // Prone
        };
        this.mouse = { x: 0, y: 0 };
        this.isPointerLocked = false;
        
        // Initialize
        this.initScene();
        this.initLights();
        this.initGround();
        this.initSkybox();
    this.initControls();

    // First-person camera only
    this.useThirdPerson = false;
        this.initUI();
        
        // Minimap
        this.minimap = new Minimap();
        
        // Show login screen first
        this.showLoginScreen();
        
        // Initialize multiplayer
        this.initMultiplayer();
    }

    // ==========================================
    // AI HELPERS (LOS, AIM)
    // ==========================================

    hasLineOfSight(fromPos, toPos) {
        if (!this.obstacles || this.obstacles.length === 0) return true;
        const dir = toPos.clone().sub(fromPos).normalize();
        const distance = fromPos.distanceTo(toPos);
        const raycaster = new THREE.Raycaster(fromPos, dir, 0, distance);
        const intersections = raycaster.intersectObjects(this.obstacles, false);
        return intersections.length === 0;
    }

    computeAimDirection(shooter, targetPlayer) {
        const shooterPos = shooter.getPosition();
        shooterPos.y += CONFIG.CAMERA_HEIGHT * 0.9;
        const targetPos = targetPlayer.getPosition();
        const targetVel = targetPlayer.velocity ? targetPlayer.velocity.clone() : new THREE.Vector3();
        const toTarget = targetPos.clone().sub(shooterPos);
        const distance = toTarget.length();
        const bulletSpeed = CONFIG.BULLET_SPEED * 60; // approx units/sec assuming 60fps
        const timeToHit = Math.max(0.05, distance / bulletSpeed);
        const predictedPos = targetPos.clone().add(targetVel.clone().multiplyScalar(timeToHit));
        const baseDir = predictedPos.sub(shooterPos).normalize();

        // Add accuracy noise based on distance and shooter movement
        const distFactor = Math.min(1, distance / 40);
        const moveFactor = shooter.velocity ? Math.min(1, shooter.velocity.length() / 0.5) : 0;
        const inaccuracy = 0.01 + 0.03 * distFactor + 0.02 * moveFactor; // radians - reduced for better accuracy
        const noise = new THREE.Vector3(
            (Math.random() - 0.5) * inaccuracy,
            (Math.random() - 0.5) * inaccuracy,
            (Math.random() - 0.5) * inaccuracy
        );
        const noisyDir = baseDir.clone().add(noise).normalize();
        return noisyDir;
    }

    findAutoAimTarget() {
        if (!this.localPlayer || !this.localPlayer.isAlive) return null;
        
        const playerPos = this.localPlayer.getPosition();
        playerPos.y += CONFIG.CAMERA_HEIGHT;
        const lookDir = new THREE.Vector3(0, 0, -1).applyEuler(this.localPlayer.rotation).normalize();
        
        let nearestTarget = null;
        let nearestAngle = Infinity;
        const autoAimCone = 0.15; // radians (~8.6 degrees)
        const autoAimRange = 35; // units
        
        this.players.forEach(p => {
            if (p === this.localPlayer || !p.isAlive) return;
            const targetPos = p.getPosition();
            targetPos.y += CONFIG.CAMERA_HEIGHT * 0.7;
            const toTarget = targetPos.clone().sub(playerPos);
            const dist = toTarget.length();
            if (dist > autoAimRange) return;
            
            const angle = lookDir.angleTo(toTarget.normalize());
            if (angle < autoAimCone && angle < nearestAngle) {
                const hasLOS = this.hasLineOfSight(playerPos, targetPos);
                if (hasLOS) {
                    nearestTarget = p;
                    nearestAngle = angle;
                }
            }
        });
        
        return nearestTarget;
    }
    
    // ==========================================
    // MULTIPLAYER (SOCKET.IO)
    // ==========================================
    
    initMultiplayer() {
        console.log('Initializing multiplayer connection...');
        
        // Connection established
        socket.on('connect', () => {
            console.log('Connected to server! Socket ID:', socket.id);
        });
        
        // Receive current players when joining
        socket.on('current_players', (players) => {
            console.log('Current players:', players);
            
            Object.values(players).forEach(playerData => {
                if (playerData.id !== socket.id && !this.remotePlayers[playerData.id]) {
                    this.addRemotePlayer(playerData);
                }
            });
        });
        
        // New player joined
        socket.on('new_player', (playerData) => {
            console.log('New player joined:', playerData.id);
            if (playerData.id !== socket.id && !this.remotePlayers[playerData.id]) {
                this.addRemotePlayer(playerData);
            }
        });
        
        // Player moved
        socket.on('player_moved', (data) => {
            const player = this.remotePlayers[data.id];
            if (player && player.isAlive) {
                // Smooth interpolation
                player.group.position.x = data.position.x;
                player.group.position.z = data.position.z;
                player.rotation.y = data.rotation.y;
                player.group.rotation.y = data.rotation.y;
            }
        });
        
        // Player shot
        socket.on('player_shot', (data) => {
            const player = this.remotePlayers[data.id];
            if (player && player.isAlive) {
                const direction = new THREE.Vector3(
                    data.direction.x,
                    data.direction.y,
                    data.direction.z
                );
                const position = new THREE.Vector3(
                    data.position.x,
                    data.position.y,
                    data.position.z
                );
                
                const bullet = new Bullet(this.scene, position, direction, player);
                this.bullets.push(bullet);
            }
        });
        
        // Player damaged
        socket.on('player_damaged', (data) => {
            if (data.targetId === socket.id && this.localPlayer) {
                // Local player hit
                this.localPlayer.health = data.health;
                this.localPlayer.updateHealthBar();
                
                // Flash effect
                if (this.localPlayer.body) {
                    this.localPlayer.body.material.emissive.setHex(0xFF0000);
                    setTimeout(() => {
                        if (this.localPlayer.body) {
                            this.localPlayer.body.material.emissive.setHex(0x000000);
                        }
                    }, 100);
                }
            } else {
                // Remote player hit
                const player = this.remotePlayers[data.targetId];
                if (player) {
                    player.health = data.health;
                    player.updateHealthBar();
                }
            }
        });
        
        // Player died
        socket.on('player_died', (data) => {
            console.log('Player died:', data.victimId, 'killed by', data.killerId);
            
            if (data.victimId === socket.id && this.localPlayer) {
                // Local player died
                this.localPlayer.die(this.remotePlayers[data.killerId]);
            } else {
                // Remote player died
                const player = this.remotePlayers[data.victimId];
                if (player) {
                    player.die(null);
                }
            }
            
            // Update killer's score
            if (data.killerId === socket.id && this.localPlayer) {
                this.localPlayer.kills = data.killerKills;
            } else if (this.remotePlayers[data.killerId]) {
                this.remotePlayers[data.killerId].kills = data.killerKills;
            }
        });
        
        // Player disconnected
        socket.on('player_disconnected', (data) => {
            console.log('Player disconnected:', data.id);
            
            if (this.remotePlayers[data.id]) {
                const player = this.remotePlayers[data.id];
                if (player.group.parent) {
                    this.scene.remove(player.group);
                }
                
                // Remove from players array
                const index = this.players.indexOf(player);
                if (index > -1) {
                    this.players.splice(index, 1);
                }
                
                delete this.remotePlayers[data.id];
            }
        });
        
        // Send updates to server periodically
        setInterval(() => {
            if (this.localPlayer && this.localPlayer.isAlive && this.isPlaying) {
                socket.emit('player_update', {
                    position: {
                        x: this.localPlayer.group.position.x,
                        y: this.localPlayer.group.position.y,
                        z: this.localPlayer.group.position.z
                    },
                    rotation: {
                        x: this.localPlayer.rotation.x,
                        y: this.localPlayer.rotation.y,
                        z: this.localPlayer.rotation.z
                    }
                });
            }
        }, 50); // 20 updates per second
    }
    
    addRemotePlayer(playerData) {
        const player = new Player(
            this.scene,
            playerData.position.x,
            playerData.position.z,
            false,
            playerData.name || playerData.id.substring(0, 8)
        );
        
        player.health = playerData.health;
        player.kills = playerData.kills;
        
        this.remotePlayers[playerData.id] = player;
        this.players.push(player);
        
        console.log('Added remote player:', playerData.id);
    }
    
    // ==========================================
    // SCENE SETUP
    // ==========================================
    
    initScene() {
        // Create scene with urban atmosphere
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB); // Sky blue for daytime city
        this.scene.fog = new THREE.Fog(0x87CEEB, 60, 180); // Atmospheric perspective
        
        // Create camera
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        
    // Create renderer (performance tuned)
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    // Clamp pixel ratio to avoid over-rendering on HiDPI displays
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.body.appendChild(this.renderer.domElement);
        
        // Handle window resize
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
        });
        
        // In third-person, skip first-person gun model
        if (!this.useThirdPerson) {
            this.createFirstPersonGun();
        }
    }
    
    // Create first-person gun model
    createFirstPersonGun() {
        this.fpGun = new THREE.Group();
        
        // Gun body
        const bodyGeometry = new THREE.BoxGeometry(0.08, 0.12, 0.3);
        const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0x222222 });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.set(0, 0, -0.15);
        this.fpGun.add(body);
        
        // Gun barrel
        const barrelGeometry = new THREE.CylinderGeometry(0.015, 0.015, 0.25, 8);
        const barrelMaterial = new THREE.MeshLambertMaterial({ color: 0x111111 });
        const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
        barrel.rotation.x = Math.PI / 2;
        barrel.position.set(0, 0.03, -0.4);
        this.fpGun.add(barrel);
        
        // Gun handle
        const handleGeometry = new THREE.BoxGeometry(0.05, 0.15, 0.08);
        const handle = new THREE.Mesh(handleGeometry, bodyMaterial);
        handle.position.set(0, -0.1, -0.05);
        this.fpGun.add(handle);
        
        // Magazine
        const magGeometry = new THREE.BoxGeometry(0.04, 0.12, 0.06);
        const magMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
        const magazine = new THREE.Mesh(magGeometry, magMaterial);
        magazine.position.set(0, -0.1, -0.1);
        this.fpGun.add(magazine);
        
        // Sight
        const sightGeometry = new THREE.BoxGeometry(0.02, 0.03, 0.02);
        const sightMaterial = new THREE.MeshLambertMaterial({ color: 0xFF0000 });
        const sight = new THREE.Mesh(sightGeometry, sightMaterial);
        sight.position.set(0, 0.08, -0.2);
        this.fpGun.add(sight);
        
        // Position gun in first-person view
        this.fpGun.position.set(0.2, -0.15, -0.3);
        this.fpGun.rotation.set(0, 0, 0);
        
        // Add gun to camera (so it follows camera movement)
        this.camera.add(this.fpGun);
        this.scene.add(this.camera);
    }
    
    initLights() {
        // Enhanced ambient light for better visibility
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        
        // Main directional light (sun) - enhanced
        const dirLight = new THREE.DirectionalLight(0xffffee, 0.8);
        dirLight.position.set(50, 100, 50);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        dirLight.shadow.camera.left = -100;
        dirLight.shadow.camera.right = 100;
        dirLight.shadow.camera.top = 100;
        dirLight.shadow.camera.bottom = -100;
        dirLight.shadow.camera.near = 0.5;
        dirLight.shadow.camera.far = 500;
        dirLight.shadow.bias = -0.0001;
        this.scene.add(dirLight);
        
        // Hemisphere light for more realistic sky/ground color mix
        const hemiLight = new THREE.HemisphereLight(0x87CEEB, 0x444444, 0.4);
        hemiLight.position.set(0, 50, 0);
        this.scene.add(hemiLight);
        
        // Add subtle point lights around the arena for atmosphere
        const pointLight1 = new THREE.PointLight(0xff8800, 0.5, 50);
        pointLight1.position.set(-30, 10, -30);
        this.scene.add(pointLight1);
        
        const pointLight2 = new THREE.PointLight(0x0088ff, 0.5, 50);
        pointLight2.position.set(30, 10, 30);
        this.scene.add(pointLight2);
    }
    
    initGround() {
        // City street ground with grid pattern
        const groundGeometry = new THREE.PlaneGeometry(CONFIG.GROUND_SIZE, CONFIG.GROUND_SIZE);
        
        // Create asphalt texture with street markings
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        // Asphalt base
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(0, 0, 512, 512);
        
        // Add street lines
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 3;
        ctx.setLineDash([20, 10]);
        
        // Horizontal lines
        for (let i = 0; i < 512; i += 128) {
            ctx.beginPath();
            ctx.moveTo(0, i);
            ctx.lineTo(512, i);
            ctx.stroke();
        }
        
        // Vertical lines
        for (let i = 0; i < 512; i += 128) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, 512);
            ctx.stroke();
        }
        
        // Sidewalk edges
        ctx.setLineDash([]);
        ctx.strokeStyle = '#555555';
        ctx.lineWidth = 8;
        ctx.strokeRect(5, 5, 502, 502);
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(4, 4);
        
        const groundMaterial = new THREE.MeshLambertMaterial({
            map: texture,
            side: THREE.DoubleSide
        });
        
        this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
        this.ground.rotation.x = -Math.PI / 2;
        this.ground.position.y = CONFIG.GROUND_Y;
        this.ground.receiveShadow = true;
        this.scene.add(this.ground);
        
        // Create city environment
        this.createCityEnvironment();
    }
    
    createCityEnvironment() {
        // Collect obstacles for AI line-of-sight checks
        this.obstacles = [];
        
        // Create city buildings
        this.createBuildings();
        
        // Create urban cover objects
        this.createUrbanCover();
        
        // Create boundary walls (concrete barriers)
        this.createBoundaryWalls();
    }
    
    createBuildings() {
        const buildingConfigs = [
            // Corner buildings (tall)
            { x: -35, z: -35, width: 15, height: 25, depth: 15, color: 0x4a4a4a },
            { x: 35, z: -35, width: 15, height: 28, depth: 15, color: 0x3a3a3a },
            { x: -35, z: 35, width: 15, height: 22, depth: 15, color: 0x555555 },
            { x: 35, z: 35, width: 15, height: 30, depth: 15, color: 0x404040 },
            
            // Mid-range buildings
            { x: -30, z: 0, width: 12, height: 18, depth: 10, color: 0x4a4a55 },
            { x: 30, z: 0, width: 12, height: 20, depth: 10, color: 0x505050 },
            { x: 0, z: -30, width: 10, height: 16, depth: 12, color: 0x454545 },
            { x: 0, z: 30, width: 10, height: 22, depth: 12, color: 0x3f3f3f },
            
            // Small buildings near center
            { x: -15, z: -10, width: 8, height: 12, depth: 8, color: 0x4f4f4f },
            { x: 15, z: -10, width: 8, height: 14, depth: 8, color: 0x3e3e3e },
            { x: -15, z: 10, width: 8, height: 10, depth: 8, color: 0x525252 },
            { x: 15, z: 10, width: 8, height: 13, depth: 8, color: 0x434343 },
        ];
        
        buildingConfigs.forEach(config => {
            this.createBuilding(config.x, config.z, config.width, config.height, config.depth, config.color);
        });
    }
    
    createBuilding(x, z, width, height, depth, color) {
        const buildingGroup = new THREE.Group();
        
        // Main building structure
        const buildingGeometry = new THREE.BoxGeometry(width, height, depth);
        const buildingMaterial = new THREE.MeshLambertMaterial({ color: color });
        const building = new THREE.Mesh(buildingGeometry, buildingMaterial);
        building.position.y = height / 2;
        building.castShadow = true;
        building.receiveShadow = true;
        buildingGroup.add(building);
        
        // Add windows
        const windowRows = Math.floor(height / 3);
        const windowCols = Math.floor(width / 2);
        
        const windowGeometry = new THREE.BoxGeometry(0.8, 1.2, 0.1);
        const windowMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x88ccff,
            emissive: 0x4488aa,
            emissiveIntensity: 0.3
        });
        
        // Front windows
        for (let row = 1; row <= windowRows; row++) {
            for (let col = 0; col < windowCols; col++) {
                const window = new THREE.Mesh(windowGeometry, windowMaterial);
                window.position.set(
                    -width / 2 + (col + 0.5) * (width / windowCols),
                    row * (height / (windowRows + 1)),
                    depth / 2 + 0.05
                );
                buildingGroup.add(window);
            }
        }
        
        // Roof detail
        const roofGeometry = new THREE.BoxGeometry(width + 0.5, 0.5, depth + 0.5);
        const roofMaterial = new THREE.MeshLambertMaterial({ color: 0x2a2a2a });
        const roof = new THREE.Mesh(roofGeometry, roofMaterial);
        roof.position.y = height;
        roof.castShadow = true;
        buildingGroup.add(roof);
        
        buildingGroup.position.set(x, 0, z);
        this.scene.add(buildingGroup);
        
        // Add to obstacles for collision/LOS
        this.obstacles.push(building);
        building.position.set(x, height / 2, z);
    }
    
    createUrbanCover() {
        // Concrete barriers
        const barrierMaterial = new THREE.MeshLambertMaterial({ color: 0x888888 });
        const barrierGeometry = new THREE.BoxGeometry(4, 1.2, 0.6);
        
        const barrierPositions = [
            { x: -10, z: -5, rotY: 0 },
            { x: 10, z: -5, rotY: 0 },
            { x: -10, z: 5, rotY: 0 },
            { x: 10, z: 5, rotY: 0 },
            { x: -5, z: -15, rotY: Math.PI / 2 },
            { x: 5, z: -15, rotY: Math.PI / 2 },
            { x: -5, z: 15, rotY: Math.PI / 2 },
            { x: 5, z: 15, rotY: Math.PI / 2 },
        ];
        
        barrierPositions.forEach(pos => {
            const barrier = new THREE.Mesh(barrierGeometry, barrierMaterial);
            barrier.position.set(pos.x, 0.6, pos.z);
            barrier.rotation.y = pos.rotY;
            barrier.castShadow = true;
            barrier.receiveShadow = true;
            this.scene.add(barrier);
            this.obstacles.push(barrier);
        });
        
        // Abandoned vehicles
        const carMaterial = new THREE.MeshLambertMaterial({ color: 0x8B0000 });
        const carBodyGeometry = new THREE.BoxGeometry(4, 1.5, 2);
        const carTopGeometry = new THREE.BoxGeometry(2.5, 1, 1.8);
        
        const carPositions = [
            { x: -20, z: -20 },
            { x: 20, z: -20 },
            { x: -20, z: 20 },
            { x: 20, z: 20 },
        ];
        
        carPositions.forEach(pos => {
            const carGroup = new THREE.Group();
            
            const body = new THREE.Mesh(carBodyGeometry, carMaterial);
            body.position.y = 0.75;
            body.castShadow = true;
            carGroup.add(body);
            
            const top = new THREE.Mesh(carTopGeometry, carMaterial);
            top.position.set(0, 1.75, 0);
            top.castShadow = true;
            carGroup.add(top);
            
            // Wheels
            const wheelGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 8);
            const wheelMaterial = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
            
            const wheelPositions = [
                { x: -1.3, z: -0.8 },
                { x: 1.3, z: -0.8 },
                { x: -1.3, z: 0.8 },
                { x: 1.3, z: 0.8 },
            ];
            
            wheelPositions.forEach(wPos => {
                const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
                wheel.rotation.z = Math.PI / 2;
                wheel.position.set(wPos.x, 0.4, wPos.z);
                carGroup.add(wheel);
            });
            
            carGroup.position.set(pos.x, 0, pos.z);
            this.scene.add(carGroup);
            this.obstacles.push(body);
        });
        
        // Dumpsters
        const dumpsterMaterial = new THREE.MeshLambertMaterial({ color: 0x2a4a2a });
        const dumpsterGeometry = new THREE.BoxGeometry(2, 1.8, 1.2);
        
        const dumpsterPositions = [
            { x: -8, z: -20 },
            { x: 8, z: -20 },
            { x: -8, z: 20 },
            { x: 8, z: 20 },
        ];
        
        dumpsterPositions.forEach(pos => {
            const dumpster = new THREE.Mesh(dumpsterGeometry, dumpsterMaterial);
            dumpster.position.set(pos.x, 0.9, pos.z);
            dumpster.castShadow = true;
            dumpster.receiveShadow = true;
            this.scene.add(dumpster);
            this.obstacles.push(dumpster);
        });
    }
    
    createBoundaryWalls() {
        const wallHeight = 5;
        const wallThickness = 1;
        const arenaSize = CONFIG.ARENA_SIZE;
        
        const wallMaterial = new THREE.MeshLambertMaterial({
            color: 0x666666, // Concrete grey
            transparent: false
        });
        
        // North wall
        const northWall = new THREE.Mesh(
            new THREE.BoxGeometry(arenaSize, wallHeight, wallThickness),
            wallMaterial
        );
        northWall.position.set(0, wallHeight / 2, -arenaSize / 2);
        northWall.castShadow = true;
        northWall.receiveShadow = true;
        this.scene.add(northWall);
        this.obstacles.push(northWall);
        
        // South wall
        const southWall = northWall.clone();
        southWall.position.z = arenaSize / 2;
        this.scene.add(southWall);
        this.obstacles.push(southWall);
        
        // East wall
        const eastWall = new THREE.Mesh(
            new THREE.BoxGeometry(wallThickness, wallHeight, arenaSize),
            wallMaterial
        );
        eastWall.position.set(arenaSize / 2, wallHeight / 2, 0);
        eastWall.castShadow = true;
        eastWall.receiveShadow = true;
        this.scene.add(eastWall);
        this.obstacles.push(eastWall);
        
        // West wall
        const westWall = eastWall.clone();
        westWall.position.x = -arenaSize / 2;
        this.scene.add(westWall);
        this.obstacles.push(westWall);
    }
    
    initSkybox() {
        // Simple gradient sky
        const skyGeometry = new THREE.SphereGeometry(500, 32, 32);
        const skyMaterial = new THREE.MeshBasicMaterial({
            color: CONFIG.COLORS.sky,
            side: THREE.BackSide
        });
        const sky = new THREE.Mesh(skyGeometry, skyMaterial);
        this.scene.add(sky);
    }
    
    // ==========================================
    // CONTROLS
    // ==========================================
    
    initControls() {
        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            const key = e.key.toLowerCase();
            if (key in this.keys) {
                this.keys[key] = true;
            }
            
            // Handle Space key (jump)
            if (e.code === 'Space' || e.key === ' ') {
                this.keys.space = true;
                e.preventDefault(); // Prevent page scroll
            }
            
            // Handle weapon switching (Q key or number keys 1/2)
            if ((e.key === 'q' || e.key === 'Q' || e.key === '1' || e.key === '2') && this.localPlayer && this.isPlaying) {
                const weaponName = this.localPlayer.switchWeapon();
                this.showWeaponSwitchNotification(weaponName);
                e.preventDefault();
            }
            
            // ESC to unlock pointer
            if (e.key === 'Escape') {
                document.exitPointerLock();
            }
        });
        
        document.addEventListener('keyup', (e) => {
            const key = e.key.toLowerCase();
            if (key in this.keys) {
                this.keys[key] = false;
            }
            
            // Handle Space key release
            if (e.code === 'Space' || e.key === ' ') {
                this.keys.space = false;
            }
        });
        
        // Mouse controls
        document.addEventListener('mousemove', (e) => {
            if (!this.isPointerLocked || !this.localPlayer) return;
            
            const movementX = e.movementX || 0;
            const movementY = e.movementY || 0;
            
            // Update player rotation
            this.localPlayer.rotation.y -= movementX * CONFIG.MOUSE_SENSITIVITY;
            this.localPlayer.rotation.x -= movementY * CONFIG.MOUSE_SENSITIVITY;
            
            // Clamp vertical rotation
            const maxAngle = Math.PI / 2 - 0.1;
            this.localPlayer.rotation.x = Math.max(-maxAngle, Math.min(maxAngle, this.localPlayer.rotation.x));
        });
        
        // Mouse click (shoot)
        document.addEventListener('click', (e) => {
            // Don't lock pointer if clicking on login screen elements
            if (!this.isPlaying) {
                return; // Exit early if not in game
            }
            
            if (!this.localPlayer || !this.localPlayer.isAlive) return;
            
            // Request pointer lock if not locked yet
            if (!this.isPointerLocked) {
                this.requestPointerLock();
                return; // Don't shoot on the click that requests lock
            }
            
            // Only shoot if pointer is locked and player is playing
            if (this.isPointerLocked && this.isPlaying && this.localPlayer.isAlive) {
                // Auto-aim: find nearest enemy in crosshair cone
                const aimTarget = this.findAutoAimTarget();
                let shootDirection = null;
                
                if (aimTarget) {
                    // Aim at target
                    const targetPos = aimTarget.getPosition();
                    targetPos.y += CONFIG.CAMERA_HEIGHT * 0.7; // Chest height
                    const playerPos = this.localPlayer.getPosition();
                    playerPos.y += CONFIG.CAMERA_HEIGHT;
                    shootDirection = targetPos.clone().sub(playerPos).normalize();
                }
                
                // Shoot locally (with auto-aim direction if locked)
                const bullet = this.localPlayer.shoot(this.scene, this.bullets, shootDirection);
                
                // No gun recoil animation (removed per user request)
                
                // Emit to server
                if (bullet) {
                    socket.emit('player_shoot', {
                        position: {
                            x: bullet.mesh.position.x,
                            y: bullet.mesh.position.y,
                            z: bullet.mesh.position.z
                        },
                        direction: {
                            x: bullet.velocity.x / CONFIG.BULLET_SPEED,
                            y: bullet.velocity.y / CONFIG.BULLET_SPEED,
                            z: bullet.velocity.z / CONFIG.BULLET_SPEED
                        }
                    });
                }
            }
        });
        
        // Right-click for scope/zoom
        document.addEventListener('mousedown', (e) => {
            if (e.button === 2 && this.isPlaying && this.localPlayer && this.localPlayer.isAlive) {
                this.toggleScope(true);
            }
        });
        
        document.addEventListener('mouseup', (e) => {
            if (e.button === 2) {
                this.toggleScope(false);
            }
        });
        
        // Prevent context menu on right-click
        document.addEventListener('contextmenu', (e) => {
            if (this.isPlaying) {
                e.preventDefault();
                return false;
            }
        });
        
        // Pointer lock events
        document.addEventListener('pointerlockchange', () => {
            this.isPointerLocked = document.pointerLockElement !== null;
        });
    }
    
    toggleScope(enable) {
        this.isScoped = enable;
        
        if (enable) {
            // Zoom in camera (narrow FOV)
            this.camera.fov = 35; // Zoomed in from 75
            this.camera.updateProjectionMatrix();
            
            // Add scope overlay
            document.getElementById('scope-overlay').style.display = 'block';
            
            // Hide normal crosshair
            document.getElementById('crosshair').style.display = 'none';
        } else {
            // Zoom out camera (normal FOV)
            this.camera.fov = 75;
            this.camera.updateProjectionMatrix();
            
            // Remove scope overlay
            document.getElementById('scope-overlay').style.display = 'none';
            
            // Show normal crosshair
            document.getElementById('crosshair').style.display = 'block';
        }
    }
    
    requestPointerLock() {
        document.body.requestPointerLock();
    }
    
    // ==========================================
    // UI
    // ==========================================
    
    initUI() {
        // Login form submission
        document.getElementById('login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const nameInput = document.getElementById('player-name');
            const name = nameInput.value.trim();
            
            if (name.length >= 3) {
                this.playerName = name;
                this.hideLoginScreen();
                this.showTeamSelectionScreen();
            } else {
                alert('Please enter a name with at least 3 characters');
            }
        });
        
        // Team mode selection
        document.querySelectorAll('.team-mode-card').forEach(card => {
            card.addEventListener('click', () => {
                this.teamMode = card.dataset.mode;
                this.hideTeamSelectionScreen();
                this.showStartScreen();
            });
        });
        
        // Start screen click
        document.getElementById('start-screen').addEventListener('click', () => {
            this.startGame();
        });
        
        // Restart button
        document.getElementById('restart-btn').addEventListener('click', () => {
            this.restartGame();
        });
    }
    
    showLoginScreen() {
        document.getElementById('login-screen').style.display = 'flex';
        document.getElementById('team-selection-screen').style.display = 'none';
        document.getElementById('start-screen').style.display = 'none';
        document.getElementById('game-over').style.display = 'none';
        
        // Focus on name input
        setTimeout(() => {
            document.getElementById('player-name').focus();
        }, 100);
    }
    
    hideLoginScreen() {
        document.getElementById('login-screen').style.display = 'none';
    }
    
    showTeamSelectionScreen() {
        document.getElementById('team-selection-screen').style.display = 'flex';
    }
    
    hideTeamSelectionScreen() {
        document.getElementById('team-selection-screen').style.display = 'none';
    }
    
    showStartScreen() {
        document.getElementById('start-screen').style.display = 'flex';
        document.getElementById('game-over').style.display = 'none';
    }
    
    hideStartScreen() {
        document.getElementById('start-screen').style.display = 'none';
    }
    
    updateAutoAimCrosshair() {
        const crosshair = document.getElementById('crosshair');
        if (!crosshair) return;
        
        const target = this.findAutoAimTarget();
        if (target) {
            crosshair.classList.add('target-locked');
        } else {
            crosshair.classList.remove('target-locked');
        }
    }
    
    showGameOver(isVictory = false) {
        // Exit pointer lock when game over
        if (document.pointerLockElement) {
            document.exitPointerLock();
        }
        
        // Show cursor when game over
        document.body.classList.remove('playing');
        this.isPointerLocked = false;
        
        // Set victory or defeat text
        const resultText = document.getElementById('game-result-text');
        if (isVictory) {
            resultText.textContent = 'VICTORY';
            resultText.style.color = '#0f0';
            resultText.style.textShadow = '0 0 40px rgba(0, 255, 0, 0.9), 0 6px 15px rgba(0, 0, 0, 0.5), 0 0 80px rgba(0, 255, 0, 0.8)';
        } else {
            resultText.textContent = 'DEFEAT';
            resultText.style.color = '#fff';
            resultText.style.textShadow = '0 0 40px rgba(255, 255, 255, 0.9), 0 6px 15px rgba(0, 0, 0, 0.5), 0 0 80px rgba(255, 50, 50, 0.8)';
        }
        
        document.getElementById('game-over').style.display = 'flex';
        document.getElementById('final-score').textContent = 
            `Kills: ${this.localPlayer.kills}`;
    }
    
    updateHealthUI() {
        if (!this.localPlayer) return;
        
        const healthPercent = (this.localPlayer.health / this.localPlayer.maxHealth) * 100;
        document.getElementById('health-bar').style.width = healthPercent + '%';
        document.getElementById('health-text').textContent = 
            `${Math.ceil(this.localPlayer.health)}/${this.localPlayer.maxHealth}`;
    }
    
    updateStanceUI() {
        if (!this.localPlayer) return;
        
        const stanceText = document.getElementById('stance-text');
        const stance = this.localPlayer.stance.toUpperCase();
        stanceText.textContent = stance;
        
        // Color based on stance
        if (stance === 'STANDING') {
            stanceText.style.color = '#00ff00'; // Green
        } else if (stance === 'CROUCHING') {
            stanceText.style.color = '#ffeb3b'; // Yellow
        } else if (stance === 'PRONE') {
            stanceText.style.color = '#ff9800'; // Orange
        }
    }
    
    updateWeaponUI() {
        if (!this.localPlayer || !this.localPlayer.weapons) return;
        
        const weaponText = document.getElementById('weapon-text');
        const currentWeapon = this.localPlayer.weapons[this.localPlayer.currentWeapon];
        weaponText.textContent = currentWeapon.name;
    }
    
    showWeaponSwitchNotification(weaponName) {
        // Create or update notification element
        let notification = document.getElementById('weapon-switch-notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'weapon-switch-notification';
            notification.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(0, 0, 0, 0.85);
                color: #ffeb3b;
                padding: 20px 40px;
                border-radius: 10px;
                font-size: 24px;
                font-weight: bold;
                text-align: center;
                z-index: 9999;
                pointer-events: none;
                border: 2px solid #ffeb3b;
                box-shadow: 0 0 20px rgba(255, 235, 59, 0.5);
                text-shadow: 0 0 10px rgba(255, 235, 59, 0.8);
            `;
            document.body.appendChild(notification);
        }
        
        notification.textContent = `🔫 ${weaponName}`;
        notification.style.display = 'block';
        notification.style.animation = 'none';
        
        // Trigger animation
        setTimeout(() => {
            notification.style.animation = 'fadeInOut 1.5s ease-in-out';
        }, 10);
        
        // Hide after animation
        setTimeout(() => {
            notification.style.display = 'none';
        }, 1500);
        
        // Update weapon UI
        this.updateWeaponUI();
    }
    
    updateScoreboard() {
        const playerList = document.getElementById('player-list');
        playerList.innerHTML = '';
        
        // Sort by kills
        const sortedPlayers = [...this.players].sort((a, b) => b.kills - a.kills);
        
        sortedPlayers.forEach(player => {
            if (!player.isAlive) return;
            
            const entry = document.createElement('div');
            entry.className = 'player-entry' + (player.isLocal ? ' local' : '');
            
            entry.innerHTML = `
                <span class="player-name">${player.name}</span>
                <span class="player-health">${Math.ceil(player.health)}HP</span>
                <span class="player-kills">⚔️${player.kills}</span>
            `;
            
            playerList.appendChild(entry);
        });
    }
    
    // ==========================================
    // GAME LOGIC
    // ==========================================
    
    startGame() {
        this.hideStartScreen();
        this.isPlaying = true;
        
        // Hide cursor during gameplay
        document.body.classList.add('playing');
        
        // Create local player with chosen name
        this.localPlayer = new Player(this.scene, 0, 0, true, this.playerName);
        this.players.push(this.localPlayer);
        
        // Spawn teammates based on selected mode
        const teammateCount = this.teamMode === 'duo' ? 1 : this.teamMode === 'squad' ? 3 : 0;
        for (let i = 0; i < teammateCount; i++) {
            const teammate = this.createTeammateBot(i, teammateCount);
            this.teammates.push(teammate);
            this.players.push(teammate);
        }
        
        // Create AI enemies
        this.enemies = []; // Clear enemies array
        for (let i = 0; i < CONFIG.NUM_ENEMIES; i++) {
            const angle = (i / CONFIG.NUM_ENEMIES) * Math.PI * 2;
            const radius = 30;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            
            const enemy = new Player(this.scene, x, z, false, `Bot ${i + 1}`);
            this.players.push(enemy);
            this.enemies.push(enemy);
            
            // Add AI behavior to enemy
            this.addEnemyAI(enemy);
        }
        
        // Request pointer lock
        this.requestPointerLock();
        
        // Start game loop
        this.animate();
    }
    
    createTeammateBot(index, teammateCount) {
        // Spawn teammates in a circle around the player
        const angle = (Math.PI * 2 * index) / teammateCount;
        const distance = 7; // Spawn 7 units away from player
        const x = this.localPlayer.group.position.x + Math.cos(angle) * distance;
        const z = this.localPlayer.group.position.z + Math.sin(angle) * distance;
        
        const teammate = new Player(this.scene, x, z, false, `Teammate ${index + 1}`);
        teammate.isTeammate = true;
        teammate.teamId = 'player_team';
        teammate.isLocalPlayer = false; // Make sure teammates are not treated as local player
        
        // Change teammate color to bright green to distinguish from enemies
        teammate.group.traverse((child) => {
            if (child.isMesh && child.material) {
                if (child.material.color && child.material.color.equals(new THREE.Color(0xff4444))) {
                    // Change red (enemy) color to bright green (teammate)
                    child.material.color.setHex(0x00ff00);
                    // Add emissive glow for better visibility
                    child.material.emissive = new THREE.Color(0x00ff00);
                    child.material.emissiveIntensity = 0.5;
                }
            }
        });
        
        // Add green glow sphere around teammate for maximum visibility
        const glowGeometry = new THREE.SphereGeometry(1.5, 16, 16);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            transparent: true,
            opacity: 0.15,
            side: THREE.BackSide
        });
        const glowSphere = new THREE.Mesh(glowGeometry, glowMaterial);
        glowSphere.position.y = 1;
        teammate.group.add(glowSphere);
        
        // Create name label above teammate
        teammate.createNameLabel();
        
        // Add teammate AI behavior
        this.addTeammateAI(teammate);
        
        return teammate;
    }
    
    addTeammateAI(teammate) {
        // Initialize teammate AI state
        teammate.ai = {
            state: 'follow', // 'follow' | 'combat'
            currentTarget: null,
            followDistance: 5 + Math.random() * 3, // Stay 5-8 units from player
            nextShotTime: 0
        };
        
        const thinkHz = 150; // ms
        teammate.aiThinkInterval = setInterval(() => {
            if (!teammate.isAlive || !this.localPlayer.isAlive) return;

            const now = performance.now();
            const tPos = teammate.getPosition();
            const pPos = this.localPlayer.getPosition();
            
            // Find nearest enemy target
            let nearestEnemy = null;
            let nearestDist = Infinity;
            
            this.enemies.forEach(e => {
                if (!e.isAlive) return;
                const ePos = e.getPosition();
                const dist = tPos.distanceTo(ePos);
                if (dist < 40) { // Within awareness range
                    const from = tPos.clone(); from.y += CONFIG.CAMERA_HEIGHT * 0.8;
                    const to = ePos.clone(); to.y += CONFIG.CAMERA_HEIGHT * 0.7;
                    const hasLOS = this.hasLineOfSight(from, to);
                    if (hasLOS && dist < nearestDist) {
                        nearestEnemy = e;
                        nearestDist = dist;
                    }
                }
            });
            
            // Combat behavior: shoot at enemies
            if (nearestEnemy) {
                teammate.ai.currentTarget = nearestEnemy;
                teammate.ai.state = 'combat';
                
                const targetPos = nearestEnemy.getPosition();
                targetPos.y += CONFIG.CAMERA_HEIGHT * 0.7;
                
                // Look at target
                const dir = new THREE.Vector3().subVectors(targetPos, tPos);
                const angle = Math.atan2(dir.x, dir.z);
                teammate.group.rotation.y = angle;
                
                // Shoot if in range and cooldown ready
                if (nearestDist < 35 && now > teammate.ai.nextShotTime) {
                    teammate.shoot();
                    teammate.ai.nextShotTime = now + CONFIG.BULLET_COOLDOWN + Math.random() * 100;
                }
                
                // Move to maintain good distance (15-25 units)
                if (nearestDist > 25) {
                    // Too far, move closer
                    const moveDir = dir.clone().normalize();
                    teammate.group.position.x += moveDir.x * CONFIG.PLAYER_SPEED * 0.8;
                    teammate.group.position.z += moveDir.z * CONFIG.PLAYER_SPEED * 0.8;
                } else if (nearestDist < 15) {
                    // Too close, back up
                    const moveDir = dir.clone().normalize();
                    teammate.group.position.x -= moveDir.x * CONFIG.PLAYER_SPEED * 0.5;
                    teammate.group.position.z -= moveDir.z * CONFIG.PLAYER_SPEED * 0.5;
                }
            } else {
                // Follow player when no enemies nearby
                teammate.ai.state = 'follow';
                teammate.ai.currentTarget = null;
                
                const distToPlayer = tPos.distanceTo(pPos);
                
                if (distToPlayer > teammate.ai.followDistance) {
                    // Move towards player
                    const dir = new THREE.Vector3().subVectors(pPos, tPos);
                    const angle = Math.atan2(dir.x, dir.z);
                    teammate.group.rotation.y = angle;
                    
                    const moveDir = dir.normalize();
                    const speed = distToPlayer > 15 ? CONFIG.PLAYER_RUN_SPEED : CONFIG.PLAYER_SPEED;
                    teammate.group.position.x += moveDir.x * speed * 0.7;
                    teammate.group.position.z += moveDir.z * speed * 0.7;
                }
            }
            
            // Check collision with obstacles
            const teammateBox = new THREE.Box3().setFromObject(teammate.group);
            for (const obs of this.obstacles) {
                const obsBox = new THREE.Box3().setFromObject(obs);
                if (teammateBox.intersectsBox(obsBox)) {
                    // Simple push away from obstacle
                    const obsPos = new THREE.Vector3();
                    obsBox.getCenter(obsPos);
                    const pushDir = new THREE.Vector3().subVectors(tPos, obsPos).normalize();
                    teammate.group.position.x += pushDir.x * 0.3;
                    teammate.group.position.z += pushDir.z * 0.3;
                }
            }
            
        }, thinkHz);
    }
    
    addEnemyAI(enemy) {
        // Initialize AI state
        enemy.ai = {
            state: 'engage', // 'engage' | 'chase' | 'retreat' | 'flank'
            lastSeenTime: 0,
            nextShotTime: 0,
            burstRemaining: 0,
            preferredDistance: 18 + Math.random() * 8, // 18-26 units
            flankDir: Math.random() > 0.5 ? 1 : -1,
            reactionMs: 200 + Math.random() * 300,
            currentTarget: null // Track current target (can be player or other enemy)
        };
        
        const thinkHz = 150; // ms
        enemy.aiThinkInterval = setInterval(() => {
            if (!enemy.isAlive) return;

            const now = performance.now();
            const ePos = enemy.getPosition();

            // Find nearest visible target (player or other enemies)
            let nearestTarget = null;
            let nearestDist = Infinity;
            
            // Check all alive players/enemies (but not teammates)
            this.players.forEach(p => {
                if (p === enemy || !p.isAlive || p.isTeammate) return; // Don't target self, dead, or teammates
                const pPos = p.getPosition();
                const dist = ePos.distanceTo(pPos);
                if (dist < 45) { // Within awareness range
                    const from = ePos.clone(); from.y += CONFIG.CAMERA_HEIGHT * 0.8;
                    const to = pPos.clone(); to.y += CONFIG.CAMERA_HEIGHT * 0.7;
                    const hasLOS = this.hasLineOfSight(from, to);
                    if (hasLOS && dist < nearestDist) {
                        nearestTarget = p;
                        nearestDist = dist;
                    }
                }
            });

            enemy.ai.currentTarget = nearestTarget;
            if (!nearestTarget) return; // No target, idle

            const targetPos = nearestTarget.getPosition();
            const toTarget = targetPos.clone().sub(ePos);
            const distance = toTarget.length();

            // Face the target smoothly
            const desiredYaw = Math.atan2(toTarget.x, toTarget.z);
            const yawDiff = desiredYaw - enemy.rotation.y;
            enemy.rotation.y += Math.sign(yawDiff) * Math.min(Math.abs(yawDiff), 0.06);
            enemy.group.rotation.y = enemy.rotation.y;

            const from = ePos.clone(); from.y += CONFIG.CAMERA_HEIGHT * 0.8;
            const to = targetPos.clone(); to.y += CONFIG.CAMERA_HEIGHT * 0.7;
            const hasLOS = this.hasLineOfSight(from, to);
            if (hasLOS) enemy.ai.lastSeenTime = now;

            // State transitions
            if (!hasLOS) {
                enemy.ai.state = 'chase';
            } else if (distance < 8) {
                enemy.ai.state = 'retreat';
            } else if (distance > 32) {
                enemy.ai.state = 'chase';
            } else if (Math.random() < 0.02) {
                enemy.ai.state = 'flank';
                enemy.ai.flankDir = Math.random() > 0.5 ? 1 : -1;
            } else {
                enemy.ai.state = 'engage';
            }

            // Movement directives per state
            const move = new THREE.Vector3();
            const dirToTarget = toTarget.clone().normalize();
            const right = new THREE.Vector3(dirToTarget.z, 0, -dirToTarget.x).normalize();
            
            switch (enemy.ai.state) {
                case 'chase': {
                    // Move toward target when far or no LOS
                    const speed = 0.09;
                    move.add(dirToTarget.multiplyScalar(speed));
                    // occasional strafe while closing distance
                    if (Math.random() < 0.5) move.add(right.multiplyScalar((Math.random() - 0.5) * 0.08));
                    // Enemies always stand (no stance changes for demo)
                    break;
                }
                case 'retreat': {
                    // Back away (no crouch for demo)
                    const speed = 0.1;
                    move.sub(dirToTarget.multiplyScalar(speed));
                    move.add(right.multiplyScalar((Math.random() > 0.5 ? 1 : -1) * 0.08));
                    // Enemies always stand
                    break;
                }
                case 'flank': {
                    // Orbit around target at preferred distance
                    const speed = 0.09;
                    const radial = distance - enemy.ai.preferredDistance;
                    move.add(right.clone().multiplyScalar(enemy.ai.flankDir * 0.09));
                    move.add(dirToTarget.clone().multiplyScalar(Math.sign(-radial) * 0.06));
                    // Enemies always stand
                    break;
                }
                case 'engage':
                default: {
                    // Maintain distance band and strafe
                    const radial = distance - enemy.ai.preferredDistance;
                    move.add(right.clone().multiplyScalar((Math.random() > 0.5 ? 1 : -1) * 0.08));
                    move.add(dirToTarget.clone().multiplyScalar(Math.sign(-radial) * 0.05));
                    // Enemies always stand (no stance changes for demo)
                    break;
                }
            }

            // Apply movement impulse
            enemy.velocity.x += move.x;
            enemy.velocity.z += move.z;

            // Shooting logic with reaction time, bursts, LOS, and predictive aim
            if (hasLOS && distance > 6 && distance < 42) {
                if (now >= enemy.ai.nextShotTime) {
                    if (enemy.ai.burstRemaining <= 0) {
                        // Start a new burst
                        enemy.ai.burstRemaining = 2 + Math.floor(Math.random() * 3); // 2-4 shots
                    }
                    // Compute aim with prediction and noise (target the current target)
                    const aimDir = this.computeAimDirection(enemy, nearestTarget);
                    const bullet = enemy.shoot(this.scene, this.bullets, aimDir);
                    if (bullet && socket.connected) {
                        socket.emit('player_shoot', {
                            position: { x: bullet.mesh.position.x, y: bullet.mesh.position.y, z: bullet.mesh.position.z },
                            direction: { x: bullet.velocity.x / CONFIG.BULLET_SPEED, y: bullet.velocity.y / CONFIG.BULLET_SPEED, z: bullet.velocity.z / CONFIG.BULLET_SPEED }
                        });
                    }
                    enemy.ai.burstRemaining--;
                    // Set next shot time within burst or cooldown between bursts
                    if (enemy.ai.burstRemaining > 0) {
                        enemy.ai.nextShotTime = now + (180 + Math.random() * 180); // 180-360ms between shots in burst (REDUCED FIRE RATE)
                    } else {
                        enemy.ai.nextShotTime = now + (900 + Math.random() * 900); // 0.9-1.8s between bursts (REDUCED FIRE RATE)
                    }
                }
            }
        }, thinkHz);
    }
    
    restartGame() {
        // Exit pointer lock if active
        if (document.pointerLockElement) {
            document.exitPointerLock();
        }
        this.isPointerLocked = false;
        
        // Clean up AI intervals for enemies
        this.enemies.forEach(enemy => {
            if (enemy.aiThinkInterval) clearInterval(enemy.aiThinkInterval);
            if (enemy.aiShootInterval) clearInterval(enemy.aiShootInterval);
        });
        
        // Clean up AI intervals for teammates
        this.teammates.forEach(teammate => {
            if (teammate.aiThinkInterval) clearInterval(teammate.aiThinkInterval);
        });
        
        // Clean up players
        this.players.forEach(player => {
            if (player.group.parent) {
                this.scene.remove(player.group);
            }
        });
        
        this.bullets.forEach(bullet => bullet.destroy());
        
        this.players = [];
        this.bullets = [];
        this.enemies = [];
        this.teammates = [];
        this.localPlayer = null;
        
        // Restart - go back to team selection
        document.getElementById('game-over').style.display = 'none';
        this.showTeamSelectionScreen();
    }
    
    // ==========================================
    // GAME LOOP
    // ==========================================
    
    animate() {
        if (!this.isPlaying) return;
        
        requestAnimationFrame(() => this.animate());
        
        // Update players
        this.players.forEach(player => {
            if (player.isLocal) {
                player.update(this.keys, 1);
            } else {
                player.update(null, 1);
            }
        });
        
        // Update bullets
        this.bullets = this.bullets.filter(bullet => {
            const stillActive = bullet.update(this.players);
            
            // Check if bullet hit someone (bullet became inactive after hitting)
            if (!stillActive && bullet.hitPlayer) {
                // Emit hit to server if we own this bullet
                if (bullet.owner === this.localPlayer) {
                    socket.emit('player_hit', {
                        targetId: bullet.hitPlayer.id || bullet.hitPlayer.name,
                        damage: CONFIG.BULLET_DAMAGE
                    });
                }
            }
            
            return stillActive;
        });
        
        // Update camera (third-person follow if enabled)
        if (this.localPlayer && this.localPlayer.isAlive) {
            const playerPos = this.localPlayer.getPosition();

            if (this.useThirdPerson) {
                // Third-person offset behind player
                const followDistance = 4.5;
                const followHeight = 2.0; // Keep above player
                const forward = new THREE.Vector3(0, 0, -1).applyEuler(this.localPlayer.rotation).normalize();
                const desiredPos = playerPos.clone()
                    .sub(forward.multiplyScalar(followDistance))
                    .add(new THREE.Vector3(0, followHeight, 0));

                // Obstacle avoidance: ray from player to desired camera pos
                if (this.obstacles && this.obstacles.length) {
                    const rayDir = desiredPos.clone().sub(playerPos).normalize();
                    const rayDist = desiredPos.distanceTo(playerPos);
                    const rc = new THREE.Raycaster(playerPos.clone().add(new THREE.Vector3(0, 1.2, 0)), rayDir, 0.1, rayDist);
                    const hits = rc.intersectObjects(this.obstacles, false);
                    if (hits.length) {
                        // Place camera just before obstacle
                        desiredPos.copy(hits[0].point).addScaledVector(rayDir, -0.3);
                    }
                }

                // No smoothing to avoid lag
                this.camera.position.copy(desiredPos);
                // Look at player's upper body
                const lookAtPos = playerPos.clone();
                lookAtPos.y += 1.2;
                this.camera.lookAt(lookAtPos);
            } else {
                // First-person fallback (not default)
                const camPos = playerPos.clone();
                camPos.y += CONFIG.CAMERA_HEIGHT;
                this.camera.position.copy(camPos);
                this.camera.rotation.copy(this.localPlayer.rotation);
            }
        }
        
        // Check if local player died
        if (this.localPlayer && !this.localPlayer.isAlive) {
            setTimeout(() => {
                this.isPlaying = false;
                this.showGameOver(false); // Defeat
            }, 1000);
        }
        
        // Check for victory condition - all enemies are dead
        if (this.localPlayer && this.localPlayer.isAlive && this.enemies.length > 0) {
            const allEnemiesDead = this.enemies.every(enemy => !enemy.isAlive);
            if (allEnemiesDead) {
                setTimeout(() => {
                    this.isPlaying = false;
                    this.showGameOver(true); // Victory!
                }, 1000);
            }
        }
        
        // Update UI
        this.updateHealthUI();
        this.updateStanceUI();
        this.updateWeaponUI();
        this.updateScoreboard();
        this.updateAutoAimCrosshair(); // Update crosshair based on auto-aim
        this.minimap.update(this.players);
        
        // Render
        this.renderer.render(this.scene, this.camera);
    }
}

// ==========================================
// START GAME
// ==========================================

// Wait for DOM and Three.js to load
window.addEventListener('load', () => {
    if (typeof THREE === 'undefined') {
        alert('Three.js failed to load. Please check your internet connection.');
        return;
    }
    
    // Create game instance
    const game = new Game();
    console.log('3D Battleground initialized!');
});
