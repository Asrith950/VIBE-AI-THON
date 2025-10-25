// ==========================================
// MINIMAP CLASS
// Shows top-down view of arena
// ==========================================

class Minimap {
    constructor() {
        this.canvas = document.getElementById('minimap-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.scale = this.canvas.width / CONFIG.ARENA_SIZE;
    }
    
    // Update minimap
    update(players) {
        const ctx = this.ctx;
        const scale = this.scale;
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        // Clear
        ctx.fillStyle = 'rgba(0, 20, 0, 0.5)';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw arena border
        ctx.strokeStyle = '#4caf50';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw grid
        ctx.strokeStyle = 'rgba(76, 175, 80, 0.2)';
        ctx.lineWidth = 1;
        const gridSize = 20;
        const gridScale = this.canvas.width / (CONFIG.ARENA_SIZE / gridSize);
        
        for (let i = 0; i <= gridSize; i++) {
            const pos = i * gridScale;
            // Vertical lines
            ctx.beginPath();
            ctx.moveTo(pos, 0);
            ctx.lineTo(pos, this.canvas.height);
            ctx.stroke();
            // Horizontal lines
            ctx.beginPath();
            ctx.moveTo(0, pos);
            ctx.lineTo(this.canvas.width, pos);
            ctx.stroke();
        }
        
        // Draw players
        players.forEach(player => {
            if (!player.isAlive) return;
            
            const pos = player.getPosition();
            const x = centerX + pos.x * scale;
            const y = centerY + pos.z * scale;
            
            // Player dot
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fillStyle = player.isLocal ? '#4444FF' : '#FF4444';
            ctx.fill();
            
            // Direction indicator
            if (player.isLocal) {
                const dirLength = 8;
                const angle = player.rotation.y;
                const endX = x + Math.sin(angle) * dirLength;
                const endY = y - Math.cos(angle) * dirLength;
                
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(endX, endY);
                ctx.strokeStyle = '#4444FF';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
            
            // Name label
            ctx.fillStyle = 'white';
            ctx.font = '8px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(player.name, x, y - 8);
        });
    }
}
