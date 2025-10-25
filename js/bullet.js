// ==========================================
// BULLET CLASS
// Handles projectiles and collision
// ==========================================

class Bullet {
    constructor(scene, position, direction, owner) {
        this.scene = scene;
        this.owner = owner;
        this.velocity = direction.clone().multiplyScalar(CONFIG.BULLET_SPEED);
        this.createdAt = Date.now();
        this.active = true;
        
        // Set damage based on who fired it (player does more damage than enemies)
        this.damage = owner.isLocalPlayer ? CONFIG.PLAYER_BULLET_DAMAGE : CONFIG.BULLET_DAMAGE;
        
        // Create bullet mesh
        const geometry = new THREE.SphereGeometry(0.1, 8, 8);
        const material = new THREE.MeshBasicMaterial({
            color: CONFIG.COLORS.bullet,
            emissive: CONFIG.COLORS.bullet,
            emissiveIntensity: 1
        });
        
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(position);
        this.mesh.castShadow = true;
        
        // Add trail effect
        const trailGeometry = new THREE.SphereGeometry(0.15, 8, 8);
        const trailMaterial = new THREE.MeshBasicMaterial({
            color: CONFIG.COLORS.bullet,
            transparent: true,
            opacity: 0.3
        });
        this.trail = new THREE.Mesh(trailGeometry, trailMaterial);
        this.trail.position.copy(position);
        
        scene.add(this.mesh);
        scene.add(this.trail);
        
        // Store reference
        this.mesh.userData.bullet = this;
    }
    
    // Update bullet position
    update(players) {
        if (!this.active) return false;
        
        // Check lifetime
        if (Date.now() - this.createdAt > CONFIG.BULLET_LIFETIME) {
            this.destroy();
            return false;
        }
        
        // Update position
        this.mesh.position.add(this.velocity);
        this.trail.position.lerp(this.mesh.position, 0.5);
        
        // Check ground collision
        if (this.mesh.position.y < CONFIG.GROUND_Y) {
            this.createImpact();
            this.destroy();
            return false;
        }
        
        // Check player collisions
        for (let player of players) {
            if (!player.isAlive || player === this.owner) continue;
            
            // Prevent friendly fire - check if both are on the same team
            if (this.owner.isLocalPlayer && player.isTeammate) continue; // Player can't shoot teammates
            if (this.owner.isTeammate && player.isLocalPlayer) continue; // Teammates can't shoot player
            if (this.owner.isTeammate && player.isTeammate) continue; // Teammates can't shoot each other
            
            const distance = this.mesh.position.distanceTo(player.group.position);
            if (distance < CONFIG.PLAYER_RADIUS + 0.5) {
                // Hit! Use the bullet's damage value (player bullets do more damage)
                this.hitPlayer = player; // Store who was hit
                player.takeDamage(this.damage, this.owner);
                this.createImpact();
                this.destroy();
                return false;
            }
        }
        
        // Check arena bounds
        const bound = CONFIG.ARENA_SIZE / 2;
        if (Math.abs(this.mesh.position.x) > bound ||
            Math.abs(this.mesh.position.z) > bound) {
            this.destroy();
            return false;
        }
        
        return true;
    }
    
    // Create impact effect (particles)
    createImpact() {
        // Create particle explosion
        const particleCount = 10;
        const particles = [];
        
        for (let i = 0; i < particleCount; i++) {
            const geometry = new THREE.SphereGeometry(0.05, 4, 4);
            const material = new THREE.MeshBasicMaterial({
                color: CONFIG.COLORS.explosion
            });
            const particle = new THREE.Mesh(geometry, material);
            
            particle.position.copy(this.mesh.position);
            
            // Random velocity
            particle.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 0.2,
                Math.random() * 0.2,
                (Math.random() - 0.5) * 0.2
            );
            
            particle.lifetime = 0;
            particles.push(particle);
            this.scene.add(particle);
        }
        
        // Animate particles
        const animateParticles = () => {
            particles.forEach((particle, index) => {
                particle.lifetime += 0.05;
                
                if (particle.lifetime > 1) {
                    this.scene.remove(particle);
                    particles.splice(index, 1);
                    return;
                }
                
                particle.position.add(particle.velocity);
                particle.velocity.y -= 0.01; // Gravity
                particle.material.opacity = 1 - particle.lifetime;
            });
            
            if (particles.length > 0) {
                requestAnimationFrame(animateParticles);
            }
        };
        
        animateParticles();
    }
    
    // Remove bullet
    destroy() {
        this.active = false;
        if (this.mesh.parent) {
            this.scene.remove(this.mesh);
        }
        if (this.trail.parent) {
            this.scene.remove(this.trail);
        }
    }
}
