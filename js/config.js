// ==========================================
// GAME CONFIGURATION
// ==========================================

const CONFIG = {
    // World settings
    ARENA_SIZE: 100,           // Size of the battleground arena
    GROUND_SIZE: 200,          // Size of the ground plane
    
    // Player settings
    PLAYER_HEIGHT: 2,          // Height of player model (standing)
    PLAYER_CROUCH_HEIGHT: 1.3, // Height when crouching
    PLAYER_PRONE_HEIGHT: 0.6,  // Height when prone
    PLAYER_RADIUS: 0.5,        // Width of player
    PLAYER_SPEED: 0.08,        // Walking speed - reduced for better control
    PLAYER_RUN_SPEED: 0.13,    // Running speed (with Shift) - reduced for better control
    PLAYER_CROUCH_SPEED: 0.06, // Crouching speed - reduced
    PLAYER_PRONE_SPEED: 0.03,  // Prone speed - reduced
    PLAYER_JUMP_FORCE: 0.35,   // Jump velocity - increased for better jumps
    PLAYER_MAX_HEALTH: 500,    // Maximum health - increased for longer battles
    
    // Physics
    GRAVITY: 0.015,            // Gravity strength
    GROUND_Y: 0,               // Ground level
    
    // Bullet settings
    BULLET_SPEED: 3.5,         // Bullet velocity - increased for longer range
    BULLET_DAMAGE: 45,         // Enemy damage per hit
    PLAYER_BULLET_DAMAGE: 75,  // Player damage per hit - higher than enemies for advantage
    BULLET_LIFETIME: 5000,     // Bullet lifespan in milliseconds - increased for longer range
    BULLET_COOLDOWN: 80,       // Milliseconds between shots (12.5 bullets/sec) - faster fire rate
    
    // Camera settings
    CAMERA_HEIGHT: 1.6,        // Camera height (eye level)
    CAMERA_SMOOTHNESS: 1.0,    // No smoothing to avoid camera lag in third-person
    MOUSE_SENSITIVITY: 0.0012, // Mouse look sensitivity - reduced for better aim control
    
    // Colors
    COLORS: {
        sky: 0x87CEEB,         // Sky blue
        ground: 0x228B22,      // Forest green
        player: 0x4444FF,      // Blue
        enemy: 0xFF4444,       // Red
        bullet: 0xFFFF00,      // Yellow
        explosion: 0xFF6600    // Orange
    },
    
    // Number of AI enemies
    NUM_ENEMIES: 5
};
