/**
 * TextureFactory - Handles creation of all textures for POLIMAXX bags
 */
import * as THREE from 'three';

export class TextureFactory {
    /**
     * Creates the main POLIMAXX top texture with branding
     */
    static createTopTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 2048;
        canvas.height = 2048;
        const ctx = canvas.getContext('2d');
        
        // White background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const centerX = canvas.width / 2;
        ctx.textAlign = 'center';

        // Main POLIMAXX text
        ctx.fillStyle = '#0e3a66';
        ctx.font = 'bold 220px sans-serif';
        ctx.fillText('POLIMAXX', centerX, 400);

        // Orange circle accent
        ctx.strokeStyle = '#f37021';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(centerX - 416, 336, 30, 0, Math.PI * 2);
        ctx.stroke();

        // Large PP text
        ctx.fillStyle = '#f37021';
        ctx.font = 'bold 360px sans-serif';
        ctx.fillText('PP', centerX, 840);

        // Polyethylene text
        ctx.fillStyle = '#0e3a66';
        ctx.font = 'bold 150px sans-serif';
        ctx.fillText('POLYETHYLENE', centerX, 1040);

        // Side decorative circles
        ctx.strokeStyle = '#f37021';
        ctx.lineWidth = 30;
        ctx.beginPath();
        ctx.arc(1760, 400, 120, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.lineWidth = 20;
        ctx.beginPath();
        ctx.arc(1840, 640, 60, 0, Math.PI * 2);
        ctx.stroke();

        // Bottom indicators (red circles)
        for (let i = 0; i < 4; i++) {
            const x = 400 + i * 170;
            const y = 1360;
            
            // Main red circle
            ctx.fillStyle = '#ff0000';
            ctx.beginPath();
            ctx.arc(x, y, 64, 0, Math.PI * 2);
            ctx.fill();
            
            // Black outline
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.arc(x, y, 64, 0, Math.PI * 2);
            ctx.stroke();
            
            // Highlight
            ctx.fillStyle = '#ff6666';
            ctx.beginPath();
            ctx.arc(x - 10, y - 10, 16, 0, Math.PI * 2);
            ctx.fill();
        }

        // Weight text
        ctx.textAlign = 'left';
        ctx.fillStyle = '#111';
        ctx.font = 'bold 120px sans-serif';
        ctx.fillText('NET WEIGHT 25 KG', 360, 1760);

        const tex = new THREE.CanvasTexture(canvas);
        tex.anisotropy = 16;
        tex.center.set(0.5, 0.5);
        tex.rotation = Math.PI;
        tex.needsUpdate = true;
        return tex;
    }

    /**
     * Creates the front side texture with product information
     */
    static createFrontTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 4096;
        canvas.height = 1024;
        const ctx = canvas.getContext('2d');
        
        // White background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#000000';
        ctx.textBaseline = 'middle';
        const midY = 512;
        let currentX = 650;

        // Product code
        ctx.textAlign = 'left';
        ctx.font = 'bold 130px sans-serif';
        ctx.fillText('1126NK 0260204008', currentX, midY);
        currentX += 1380;

        // Standard symbol (diamond shape)
        const symbolX = currentX;
        const symbolY = midY;
        ctx.lineWidth = 14;
        ctx.strokeStyle = '#000';
        ctx.beginPath();
        ctx.moveTo(symbolX, symbolY - 75);
        ctx.lineTo(symbolX + 75, symbolY);
        ctx.lineTo(symbolX, symbolY + 75);
        ctx.lineTo(symbolX - 75, symbolY);
        ctx.closePath();
        ctx.stroke();
        
        // Cross lines in diamond
        ctx.beginPath(); 
        ctx.moveTo(symbolX, symbolY - 75); 
        ctx.lineTo(symbolX, symbolY + 75); 
        ctx.stroke();
        ctx.beginPath(); 
        ctx.moveTo(symbolX - 35, symbolY); 
        ctx.lineTo(symbolX + 35, symbolY); 
        ctx.stroke();

        // Standard text
        ctx.font = 'bold 60px sans-serif';
        ctx.fillText('TIS.1306-2566', symbolX + 110, midY - 38);
        ctx.fillText('PP-01-1-5-F', symbolX + 110, midY + 38);
        currentX += 540;

        // QR Code placeholder
        const qrX = currentX;
        const qrY = midY - 85;
        ctx.fillStyle = '#000';
        ctx.fillRect(qrX, qrY, 170, 170);
        ctx.fillStyle = '#fff';
        
        // Simple QR pattern
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                if ((i + j) % 2 === 0) {
                    ctx.fillRect(qrX + 18 + i * 48, qrY + 18 + j * 48, 40, 40);
                }
            }
        }
        ctx.fillStyle = '#000';
        currentX += 280;

        // Product type and batch
        ctx.font = 'bold 75px sans-serif';
        ctx.fillText('PP HOMO', currentX, midY - 38);
        ctx.fillText('B  06:28', currentX, midY + 38);
        currentX += 460;

        // RoHS compliance
        ctx.font = 'italic bold 85px sans-serif';
        ctx.fillText('(RoHS)', currentX, midY);

        return new THREE.CanvasTexture(canvas);
    }

    /**
     * Creates index texture with number overlay
     */
    static createIndexTexture(index) {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        // Completely transparent background (no visible edges)
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Small circular background for number only
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = 80; // Smaller radius for minimal background
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fill();
        
        // White number
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 100px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(index.toString(), centerX, centerY);
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        return texture;
    }

    /**
     * Creates blank white texture
     */
    static createBlankTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        // Solid white background to prevent bleeding
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Add subtle border to isolate texture
        ctx.fillStyle = '#f8f8f8';
        ctx.fillRect(0, 0, canvas.width, 10);
        ctx.fillRect(0, 0, 10, canvas.height);
        ctx.fillRect(canvas.width-10, 0, 10, canvas.height);
        ctx.fillRect(0, canvas.height-10, canvas.width, 10);
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        return texture;
    }
}