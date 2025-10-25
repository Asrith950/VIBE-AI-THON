// ==========================================
// PLAYER CLASS
// Handles player creation, movement, and actions
// ==========================================

class Player {
    constructor(scene, x, z, isLocal = false, name = 'Player') {
        this.scene = scene;
        this.isLocal = isLocal;
        this.isLocalPlayer = isLocal; // Flag to identify the local player
        this.name = name;
        
        // Player stats
        this.health = CONFIG.PLAYER_MAX_HEALTH;
        this.maxHealth = CONFIG.PLAYER_MAX_HEALTH;
        this.kills = 0;
        this.isAlive = true;
        
        // Physics
        this.velocity = new THREE.Vector3();
        this.isOnGround = true;
        this.isJumping = false;
        
        // Stance system
        this.stance = 'standing'; // 'standing', 'crouching', 'prone'
        this.targetHeight = CONFIG.PLAYER_HEIGHT;
        this.currentHeight = CONFIG.PLAYER_HEIGHT;
        
        // Camera rotation (for local player)
        this.rotation = new THREE.Euler(0, 0, 0, 'YXZ');
        
        // Weapon system - dual weapon slots
        this.weapons = {
            primary: {
                name: 'Assault Rifle',
                damage: CONFIG.PLAYER_BULLET_DAMAGE,
                cooldown: CONFIG.BULLET_COOLDOWN,
                lastShotTime: 0
            },
            secondary: {
                name: 'Sniper Rifle',
                damage: CONFIG.PLAYER_BULLET_DAMAGE * 1.5, // 50% more damage
                cooldown: CONFIG.BULLET_COOLDOWN * 2.5, // Slower fire rate
                lastShotTime: 0
            }
        };
        this.currentWeapon = 'primary'; // Active weapon slot
        
        // Shooting (legacy support)
        this.lastShotTime = 0;
        
        // Create 3D model
        this.createModel(x, z);
        
        // Create health bar
        if (!isLocal) {
            this.createHealthBar();
        }
    }
    
    // Create player 3D model (realistic tactical soldier)
    createModel(x, z) {
        this.group = new THREE.Group();
        
        const playerColor = this.isLocal ? CONFIG.COLORS.player : CONFIG.COLORS.enemy;
        
        // Torso (tactical vest)
        const torsoGeometry = new THREE.BoxGeometry(0.9, 1.0, 0.5);
        const torsoMaterial = new THREE.MeshLambertMaterial({ color: playerColor });
        this.body = new THREE.Mesh(torsoGeometry, torsoMaterial);
        this.body.position.y = 0.65;
        this.body.castShadow = true;
        this.body.receiveShadow = true;
        this.group.add(this.body);
        
        // Chest plate detail
        const chestGeometry = new THREE.BoxGeometry(0.85, 0.6, 0.48);
        const chestMaterial = new THREE.MeshLambertMaterial({ color: 0x2a2a2a });
        const chest = new THREE.Mesh(chestGeometry, chestMaterial);
        chest.position.set(0, 0.8, -0.02);
        chest.castShadow = true;
        this.group.add(chest);
        
        // Neck
        const neckGeometry = new THREE.CylinderGeometry(0.12, 0.15, 0.2, 8);
        const skinMaterial = new THREE.MeshLambertMaterial({ color: 0xFFDDAA });
        const neck = new THREE.Mesh(neckGeometry, skinMaterial);
        neck.position.y = 1.25;
        neck.castShadow = true;
        this.group.add(neck);
        
        // Head (more detailed)
        const headGeometry = new THREE.BoxGeometry(0.35, 0.4, 0.35);
        this.head = new THREE.Mesh(headGeometry, skinMaterial);
        this.head.position.y = 1.55;
        this.head.castShadow = true;
        this.group.add(this.head);
        
        // Tactical helmet
        const helmetGeometry = new THREE.BoxGeometry(0.38, 0.3, 0.38);
        const helmetMaterial = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
        const helmet = new THREE.Mesh(helmetGeometry, helmetMaterial);
        helmet.position.y = 1.65;
        helmet.castShadow = true;
        this.group.add(helmet);
        
        // Shoulders
        const shoulderGeometry = new THREE.BoxGeometry(0.3, 0.25, 0.3);
        const shoulderMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
        
        const leftShoulder = new THREE.Mesh(shoulderGeometry, shoulderMaterial);
        leftShoulder.position.set(-0.6, 1.0, 0);
        leftShoulder.castShadow = true;
        this.group.add(leftShoulder);
        
        const rightShoulder = new THREE.Mesh(shoulderGeometry, shoulderMaterial);
        rightShoulder.position.set(0.6, 1.0, 0);
        rightShoulder.castShadow = true;
        this.group.add(rightShoulder);
        
        // Upper arms
        const upperArmGeometry = new THREE.CylinderGeometry(0.1, 0.12, 0.5, 8);
        const armMaterial = new THREE.MeshLambertMaterial({ color: playerColor });
        
        this.leftUpperArm = new THREE.Mesh(upperArmGeometry, armMaterial);
        this.leftUpperArm.position.set(-0.6, 0.65, 0);
        this.leftUpperArm.castShadow = true;
        this.group.add(this.leftUpperArm);
        
        this.rightUpperArm = new THREE.Mesh(upperArmGeometry, armMaterial);
        this.rightUpperArm.position.set(0.6, 0.65, 0);
        this.rightUpperArm.castShadow = true;
        this.group.add(this.rightUpperArm);
        
        // Lower arms (forearms)
        const lowerArmGeometry = new THREE.CylinderGeometry(0.09, 0.1, 0.45, 8);
        
        this.leftArm = new THREE.Mesh(lowerArmGeometry, skinMaterial);
        this.leftArm.position.set(-0.6, 0.2, 0);
        this.leftArm.castShadow = true;
        this.group.add(this.leftArm);
        
        this.rightArm = new THREE.Mesh(lowerArmGeometry, skinMaterial);
        this.rightArm.position.set(0.6, 0.2, 0);
        this.rightArm.castShadow = true;
        this.group.add(this.rightArm);
        
        // Hands
        const handGeometry = new THREE.BoxGeometry(0.12, 0.12, 0.18);
        
        const leftHand = new THREE.Mesh(handGeometry, skinMaterial);
        leftHand.position.set(-0.6, -0.05, 0);
        leftHand.castShadow = true;
        this.group.add(leftHand);
        
        const rightHand = new THREE.Mesh(handGeometry, skinMaterial);
        rightHand.position.set(0.6, -0.05, 0);
        rightHand.castShadow = true;
        this.group.add(rightHand);
        
        // Thighs
        const thighGeometry = new THREE.CylinderGeometry(0.13, 0.15, 0.5, 8);
        const legMaterial = new THREE.MeshLambertMaterial({ color: 0x3a3a3a });
        
        const leftThigh = new THREE.Mesh(thighGeometry, legMaterial);
        leftThigh.position.set(-0.2, -0.05, 0);
        leftThigh.castShadow = true;
        this.group.add(leftThigh);
        
        const rightThigh = new THREE.Mesh(thighGeometry, legMaterial);
        rightThigh.position.set(0.2, -0.05, 0);
        rightThigh.castShadow = true;
        this.group.add(rightThigh);
        
        // Lower legs
        const lowerLegGeometry = new THREE.CylinderGeometry(0.11, 0.12, 0.5, 8);
        
        this.leftLeg = new THREE.Mesh(lowerLegGeometry, legMaterial);
        this.leftLeg.position.set(-0.2, -0.55, 0);
        this.leftLeg.castShadow = true;
        this.group.add(this.leftLeg);
        
        this.rightLeg = new THREE.Mesh(lowerLegGeometry, legMaterial);
        this.rightLeg.position.set(0.2, -0.55, 0);
        this.rightLeg.castShadow = true;
        this.group.add(this.rightLeg);
        
        // Boots
        const bootGeometry = new THREE.BoxGeometry(0.18, 0.15, 0.28);
        const bootMaterial = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
        
        const leftBoot = new THREE.Mesh(bootGeometry, bootMaterial);
        leftBoot.position.set(-0.2, -0.82, 0.05);
        leftBoot.castShadow = true;
        this.group.add(leftBoot);
        
        const rightBoot = new THREE.Mesh(bootGeometry, bootMaterial);
        rightBoot.position.set(0.2, -0.82, 0.05);
        rightBoot.castShadow = true;
        this.group.add(rightBoot);
        
        // Tactical belt
        const beltGeometry = new THREE.CylinderGeometry(0.48, 0.5, 0.12, 12);
        const beltMaterial = new THREE.MeshLambertMaterial({ color: 0x2a2a2a });
        const belt = new THREE.Mesh(beltGeometry, beltMaterial);
        belt.position.y = 0.05;
        belt.castShadow = true;
        this.group.add(belt);
        
        // Realistic rifle (assault rifle style)
        const rifleGroup = new THREE.Group();
        
        // Rifle body
        const rifleBodyGeometry = new THREE.BoxGeometry(0.12, 0.15, 0.7);
        const rifleMaterial = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
        const rifleBody = new THREE.Mesh(rifleBodyGeometry, rifleMaterial);
        rifleBody.castShadow = true;
        rifleGroup.add(rifleBody);
        
        // Rifle barrel
        const barrelGeometry = new THREE.CylinderGeometry(0.025, 0.025, 0.5, 8);
        const barrel = new THREE.Mesh(barrelGeometry, rifleMaterial);
        barrel.rotation.x = Math.PI / 2;
        barrel.position.set(0, 0.05, -0.6);
        barrel.castShadow = true;
        rifleGroup.add(barrel);
        
        // Rifle stock
        const stockGeometry = new THREE.BoxGeometry(0.1, 0.15, 0.25);
        const stock = new THREE.Mesh(stockGeometry, rifleMaterial);
        stock.position.set(0, 0, 0.45);
        stock.castShadow = true;
        rifleGroup.add(stock);
        
        // Magazine
        const magGeometry = new THREE.BoxGeometry(0.08, 0.25, 0.12);
        const magMaterial = new THREE.MeshLambertMaterial({ color: 0x2a2a2a });
        const magazine = new THREE.Mesh(magGeometry, magMaterial);
        magazine.position.set(0, -0.18, 0.05);
        magazine.castShadow = true;
        rifleGroup.add(magazine);
        
        // Scope
        const scopeGeometry = new THREE.CylinderGeometry(0.04, 0.04, 0.15, 8);
        const scopeMaterial = new THREE.MeshLambertMaterial({ color: 0x0a0a0a });
        const scope = new THREE.Mesh(scopeGeometry, scopeMaterial);
        scope.rotation.z = Math.PI / 2;
        scope.position.set(0, 0.12, -0.1);
        rifleGroup.add(scope);
        
        rifleGroup.position.set(0.35, 0.5, -0.4);
        rifleGroup.rotation.set(0, 0, 0.1);
        this.gun = rifleGroup;
        this.group.add(rifleGroup);
        
        // Position in world
        this.group.position.set(x, CONFIG.PLAYER_HEIGHT / 2, z);
        this.scene.add(this.group);
        
        // Store reference for collision
        this.group.userData.player = this;
    }
    
    // Create name label above player (for teammates)
    createNameLabel() {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');
        
        // Draw background
        ctx.fillStyle = 'rgba(0, 200, 0, 0.8)';
        ctx.fillRect(0, 0, 128, 32);
        
        // Draw border
        ctx.strokeStyle = '#0f0';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, 128, 32);
        
        // Draw name text
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.name.toUpperCase(), 64, 16);
        
        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
        this.nameSprite = new THREE.Sprite(spriteMaterial);
        this.nameSprite.scale.set(3, 0.75, 1);
        this.nameSprite.position.y = 3.3;
        this.group.add(this.nameSprite);
    }
    
    // Create health bar above player
    createHealthBar() {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 16;
        const ctx = canvas.getContext('2d');
        
        // Draw background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, 64, 16);
        
        // Draw border
        ctx.strokeStyle = '#fff';
        ctx.strokeRect(0, 0, 64, 16);
        
        // Draw health
        ctx.fillStyle = '#4caf50';
        ctx.fillRect(2, 2, 60, 12);
        
        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
        this.healthSprite = new THREE.Sprite(spriteMaterial);
        this.healthSprite.scale.set(2, 0.5, 1);
        this.healthSprite.position.y = 2.5;
        this.group.add(this.healthSprite);
        
        this.healthCanvas = canvas;
        this.healthContext = ctx;
    }
    
    // Update health bar
    updateHealthBar() {
        if (!this.healthSprite) return;
        
        const ctx = this.healthContext;
        ctx.clearRect(0, 0, 64, 16);
        
        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, 64, 16);
        
        // Border
        ctx.strokeStyle = '#fff';
        ctx.strokeRect(0, 0, 64, 16);
        
        // Health bar
        const healthPercent = this.health / this.maxHealth;
        const barWidth = 60 * healthPercent;
        
        // Color based on health
        if (healthPercent > 0.5) {
            ctx.fillStyle = '#4caf50';
        } else if (healthPercent > 0.25) {
            ctx.fillStyle = '#ff9800';
        } else {
            ctx.fillStyle = '#ff4444';
        }
        
        ctx.fillRect(2, 2, barWidth, 12);
        
        this.healthSprite.material.map.needsUpdate = true;
    }
    
    // Take damage
    takeDamage(damage, attacker) {
        if (!this.isAlive) return;
        
        this.health -= damage;
        this.updateHealthBar();
        
        // Flash red when hit
        this.body.material.emissive.setHex(0xFF0000);
        setTimeout(() => {
            if (this.body && this.body.material) {
                this.body.material.emissive.setHex(0x000000);
            }
        }, 100);
        
        if (this.health <= 0) {
            this.die(attacker);
        }
    }
    
    // Player death
    die(killer) {
        if (!this.isAlive) return; // Already dead, don't count again
        
        this.isAlive = false;
        this.health = 0;
        
        if (killer && killer.isAlive) {
            killer.kills++;
            console.log(`${killer.name} killed ${this.name}. Kills: ${killer.kills}`);
        }
        
        // Update health bar
        this.updateHealthBar();
        
        // Fade out and remove
        this.group.scale.set(0.1, 0.1, 0.1);
        
        setTimeout(() => {
            if (this.group && this.group.parent) {
                this.scene.remove(this.group);
            }
        }, 500);
    }
    
    // Change stance (standing, crouching, prone)
    changeStance(newStance) {
        if (this.stance === newStance) return;
        
        this.stance = newStance;
        
        // Set target height based on stance
        switch (newStance) {
            case 'standing':
                this.targetHeight = CONFIG.PLAYER_HEIGHT;
                break;
            case 'crouching':
                this.targetHeight = CONFIG.PLAYER_CROUCH_HEIGHT;
                break;
            case 'prone':
                this.targetHeight = CONFIG.PLAYER_PRONE_HEIGHT;
                break;
        }
    }
    
    // Update stance animation (smooth transition)
    updateStance() {
        // Smoothly interpolate to target height
        const lerpSpeed = 0.15;
        this.currentHeight += (this.targetHeight - this.currentHeight) * lerpSpeed;
        
        // Update player model scale and position based on height
        const heightRatio = this.currentHeight / CONFIG.PLAYER_HEIGHT;
        
        // Scale body parts vertically
        this.body.scale.y = heightRatio;
        this.body.position.y = 0.6 * heightRatio;
        
        this.head.position.y = 1.5 * heightRatio;
        this.head.scale.set(1, heightRatio, 1);
        
        this.leftArm.position.y = 0.6 * heightRatio;
        this.rightArm.position.y = 0.6 * heightRatio;
        
        this.leftLeg.position.y = -0.4 * heightRatio;
        this.rightLeg.position.y = -0.4 * heightRatio;
        this.leftLeg.scale.y = heightRatio;
        this.rightLeg.scale.y = heightRatio;
        
        this.gun.position.y = 0.6 * heightRatio;
        
        // Adjust group position for stance
        this.group.position.y = CONFIG.GROUND_Y + this.currentHeight / 2;
        
        // Prone position - rotate body
        if (this.stance === 'prone') {
            this.body.rotation.x = Math.PI / 2;
            this.head.rotation.x = -Math.PI / 4;
        } else {
            this.body.rotation.x = 0;
            this.head.rotation.x = 0;
        }
    }
    
    // Movement update
    update(keys, deltaTime) {
        if (!this.isAlive) return;
        
        // Update stance animation
        this.updateStance();
        
        // Apply gravity
        if (this.group.position.y > CONFIG.GROUND_Y + this.currentHeight / 2) {
            this.velocity.y -= CONFIG.GRAVITY;
            this.isOnGround = false;
        } else {
            this.group.position.y = CONFIG.GROUND_Y + this.currentHeight / 2;
            this.velocity.y = 0;
            this.isOnGround = true;
            this.isJumping = false;
        }
        
        // Only local player handles keyboard input
        if (this.isLocal && keys) {
            // Handle stance changes
            if (keys.c && this.isOnGround) {
                // Toggle crouch
                if (this.stance === 'standing') {
                    this.changeStance('crouching');
                } else if (this.stance === 'crouching') {
                    this.changeStance('standing');
                }
            }
            
            if (keys.x && this.isOnGround) {
                // Toggle prone
                if (this.stance === 'standing' || this.stance === 'crouching') {
                    this.changeStance('prone');
                } else if (this.stance === 'prone') {
                    this.changeStance('standing');
                }
            }
            
            // Determine speed based on stance
            let speed = CONFIG.PLAYER_SPEED;
            let isRunning = false;
            
            if (this.stance === 'crouching') {
                speed = CONFIG.PLAYER_CROUCH_SPEED;
            } else if (this.stance === 'prone') {
                speed = CONFIG.PLAYER_PRONE_SPEED;
            } else if (keys.shift && this.isOnGround) {
                speed = CONFIG.PLAYER_RUN_SPEED;
                isRunning = true;
            }
            
            // Movement direction based on camera rotation
            const forward = new THREE.Vector3(0, 0, -1);
            forward.applyEuler(this.rotation);
            forward.y = 0;
            forward.normalize();
            
            const right = new THREE.Vector3(1, 0, 0);
            right.applyEuler(this.rotation);
            right.y = 0;
            right.normalize();
            
            let isMoving = false;
            
            // WASD movement
            if (keys.w) {
                this.velocity.x += forward.x * speed;
                this.velocity.z += forward.z * speed;
                isMoving = true;
            }
            if (keys.s) {
                this.velocity.x -= forward.x * speed;
                this.velocity.z -= forward.z * speed;
                isMoving = true;
            }
            if (keys.a) {
                this.velocity.x -= right.x * speed;
                this.velocity.z -= right.z * speed;
                isMoving = true;
            }
            if (keys.d) {
                this.velocity.x += right.x * speed;
                this.velocity.z += right.z * speed;
                isMoving = true;
            }
            
            // Animate walking/running (only when standing or crouching)
            if (isMoving && this.isOnGround && this.stance !== 'prone') {
                this.animateWalk(isRunning);
            }
            
            // Jump - only when standing
            if (keys.space && this.isOnGround && !this.isJumping && this.stance === 'standing') {
                this.velocity.y = CONFIG.PLAYER_JUMP_FORCE;
                this.isJumping = true;
                this.isOnGround = false;
            }
            
            // Rotate player to face movement direction
            if (this.velocity.x !== 0 || this.velocity.z !== 0) {
                this.group.rotation.y = this.rotation.y;
            }
        }
        
        // Apply velocity
        this.group.position.add(this.velocity);
        
        // Friction
        this.velocity.x *= 0.8;
        this.velocity.z *= 0.8;
        
        // Keep in bounds
        const bound = CONFIG.ARENA_SIZE / 2 - 2;
        this.group.position.x = Math.max(-bound, Math.min(bound, this.group.position.x));
        this.group.position.z = Math.max(-bound, Math.min(bound, this.group.position.z));
    }
    
    // Simple walk/run animation
    animateWalk(isRunning = false) {
        const speed = isRunning ? 0.015 : 0.01; // Faster animation when running
        const time = Date.now() * speed;
        
        // More pronounced animation when running
        const armSwing = isRunning ? 0.7 : 0.5;
        const legSwing = isRunning ? 0.5 : 0.3;
        const bodyBob = isRunning ? 0.08 : 0.05;
        
        // Arm swing
        this.leftArm.rotation.x = Math.sin(time) * armSwing;
        this.rightArm.rotation.x = -Math.sin(time) * armSwing;
        
        // Leg swing
        this.leftLeg.rotation.x = -Math.sin(time) * legSwing;
        this.rightLeg.rotation.x = Math.sin(time) * legSwing;
        
        // Body bobbing
        this.body.position.y = 0.6 + Math.abs(Math.sin(time * 2)) * bodyBob;
        
        // Head bobbing
        this.head.position.y = 1.5 + Math.abs(Math.sin(time * 2)) * bodyBob;
        
        // Slight forward lean when running
        if (isRunning) {
            this.body.rotation.x = 0.1;
        } else {
            this.body.rotation.x = 0;
        }
    }
    
    // Shoot bullet (optionally with custom direction)
    shoot(scene, bullets, customDirection = null) {
        const now = Date.now();
        
        // Use current weapon's cooldown and damage
        const weapon = this.weapons ? this.weapons[this.currentWeapon] : null;
        const cooldown = weapon ? weapon.cooldown : CONFIG.BULLET_COOLDOWN;
        const lastShot = weapon ? weapon.lastShotTime : this.lastShotTime;
        
        if (now - lastShot < cooldown) {
            return null;
        }
        
        // Update last shot time
        if (weapon) {
            weapon.lastShotTime = now;
        } else {
            this.lastShotTime = now;
        }
        
        // No gun recoil animation (removed per user request)
        
        // Calculate shoot direction
        let direction;
        if (customDirection && customDirection.isVector3) {
            direction = customDirection.clone().normalize();
        } else {
            direction = new THREE.Vector3(0, 0, -1);
            direction.applyEuler(this.rotation);
            direction.normalize();
        }
        
        // Spawn position (from gun)
        const spawnPos = this.group.position.clone();
        spawnPos.y += CONFIG.CAMERA_HEIGHT;
        spawnPos.add(direction.clone().multiplyScalar(1));
        
        // Create muzzle flash effect
        this.createMuzzleFlash(scene, spawnPos, direction);
        
        // Create bullet with weapon-specific damage
        const bullet = new Bullet(scene, spawnPos, direction, this);
        if (weapon && weapon.damage) {
            bullet.damage = weapon.damage; // Override damage based on weapon
        }
        bullets.push(bullet);
        
        return bullet;
    }
    
    // Switch between weapons
    switchWeapon() {
        if (!this.weapons) return;
        
        this.currentWeapon = this.currentWeapon === 'primary' ? 'secondary' : 'primary';
        return this.weapons[this.currentWeapon].name;
    }
    
    // Create muzzle flash effect
    createMuzzleFlash(scene, position, direction) {
        // Create flash light
        const flashLight = new THREE.PointLight(0xffaa00, 3, 10);
        flashLight.position.copy(position);
        scene.add(flashLight);
        
        // Create flash sprite
        const flashGeometry = new THREE.SphereGeometry(0.3, 8, 8);
        const flashMaterial = new THREE.MeshBasicMaterial({
            color: 0xffaa00,
            transparent: true,
            opacity: 1
        });
        const flash = new THREE.Mesh(flashGeometry, flashMaterial);
        flash.position.copy(position);
        scene.add(flash);
        
        // Animate and remove
        let opacity = 1;
        const fadeOut = setInterval(() => {
            opacity -= 0.2;
            flashMaterial.opacity = opacity;
            flashLight.intensity = opacity * 3;
            
            if (opacity <= 0) {
                scene.remove(flash);
                scene.remove(flashLight);
                clearInterval(fadeOut);
            }
        }, 30);
    }
    
    // Get position
    getPosition() {
        return this.group.position.clone();
    }
}
