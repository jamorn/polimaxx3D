
// this file is used with x7.html for testing bag geometry and deformation
// ArtworkFactory.js
import * as THREE from 'three';

export class ArtworkFactory {
    static createSideCanvas(opts = {}){
        const baseW = opts.baseW || 4096;
        const baseH = opts.baseH || 1024;
        const dpr = opts.dpr || Math.max(1, (window.devicePixelRatio || 1));

        const canvas = document.createElement('canvas');
        canvas.width = Math.round(baseW * dpr);
        canvas.height = Math.round(baseH * dpr);
        canvas.style.width = baseW + 'px';
        canvas.style.height = baseH + 'px';

        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
        ctx.imageSmoothingEnabled = true;

        ctx.fillStyle = '#ffffff'; 
        ctx.fillRect(0, 0, baseW, baseH);

        const midY = baseH / 2;
        let currentX = 650;

        // 1. product code
        ctx.textAlign = 'left';
        ctx.fillStyle = '#000';
        ctx.font = 'bold 130px sans-serif';
        ctx.fillText('1126NK 0260204008', currentX, midY);
        currentX += 1380;

        // 2. TIS symbol
        const symbolX = currentX;
        const symbolY = midY;
        ctx.save();
        ctx.translate(symbolX, symbolY);
        ctx.rotate(Math.PI / 4);
        const outer = 150;
        const gapOuter = 16;
        const centerSize = 48;
        ctx.fillStyle = '#000';
        ctx.fillRect(-outer/2, -outer/2, outer, outer);
        ctx.fillStyle = '#fff';
        ctx.fillRect(-outer/2 + gapOuter, -outer/2 + gapOuter, outer - gapOuter*2, outer - gapOuter*2);
        ctx.fillStyle = '#000';
        ctx.fillRect(-centerSize/2, -centerSize/2, centerSize, centerSize);
        ctx.restore();

        // 3. TIS details
        ctx.font = 'bold 60px sans-serif';
        ctx.fillStyle = '#000';
        ctx.fillText('TIS.1306-2566', symbolX + 110, midY - 38);
        ctx.fillText('PP-01-1-5-F', symbolX + 110, midY + 38);
        currentX += 540;

        // 4. QR placeholder
        const qrSize = 140;
        const qrX = symbolX + 260;
        const qrY = midY - qrSize/2;
        ctx.fillStyle = '#000'; 
        ctx.fillRect(qrX, qrY, qrSize, qrSize);
        const gap = 18;
        ctx.fillStyle = '#fff'; 
        ctx.fillRect(qrX + gap, qrY + gap, qrSize - gap*2, qrSize - gap*2);
        const center = 44; 
        ctx.fillStyle = '#000'; 
        ctx.fillRect(qrX + (qrSize - center)/2, qrY + (qrSize - center)/2, center, center);
        currentX = qrX + qrSize + 40;

        // 5. PP HOMO
        ctx.font = 'bold 75px sans-serif';
        ctx.fillText('PP HOMO', currentX, midY - 38);
        ctx.fillText('B  06:28', currentX, midY + 38);
        currentX += 460;

        // 6. RoHS
        ctx.font = 'italic bold 85px sans-serif';
        ctx.fillText('(RoHS)', currentX, midY);

        return canvas;
    }

    static createSideTexture(opts = {}){
        const canvas = this.createSideCanvas(opts);
        const tex = new THREE.CanvasTexture(canvas);
        tex.anisotropy = 1;
        tex.generateMipmaps = true;
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.encoding = THREE.sRGBEncoding;
        tex.needsUpdate = true;
        return tex;
    }

    static createTopCanvas(label, opts = {}) {
        const size = opts.size || 2048;
        const dpr = opts.dpr || Math.max(1, (window.devicePixelRatio || 1));
        
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(size * dpr);
        canvas.height = Math.round(size * dpr);
        canvas.style.width = size + 'px';
        canvas.style.height = size + 'px';

        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
        ctx.fillStyle = '#ffffff'; 
        ctx.fillRect(0, 0, size, size);

        ctx.strokeStyle = '#cccccc';
        ctx.lineWidth = 10;
        ctx.strokeRect(20, 20, size - 40, size - 40);

        ctx.save();
        ctx.translate(size/2, size/2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillStyle = '#333333';
        ctx.font = `bold ${size * 0.3}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(label), 0, 0);
        ctx.restore();

        ctx.font = `bold ${size * 0.08}px Arial`;
        ctx.fillStyle = '#666666';
        ctx.fillText('POLIMAX', 50, 100);
        
        ctx.font = `${size * 0.06}px Arial`;
        ctx.fillStyle = '#999999';
        ctx.fillText('MFG: 2026-02-15', 50, size - 100);

        return canvas;
    }

    static createTopTexture(label, opts = {}) {
        const canvas = this.createTopCanvas(label, opts);
        const tex = new THREE.CanvasTexture(canvas);
        tex.anisotropy = 1;
        tex.generateMipmaps = true;
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.encoding = THREE.sRGBEncoding;
        tex.needsUpdate = true;
        return tex;
    }
}

export default ArtworkFactory;