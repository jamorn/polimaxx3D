import * as THREE from 'three';

import { DEFAULT_SIDE_LABEL } from './polimaxx_config.js';

export class PolimaxxTextureFactory {
    static createTopTexture(backgroundColor = '#ffffff') {
        const canvas = document.createElement('canvas');
        canvas.width = 2048;
        canvas.height = 2048;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const centerX = canvas.width / 2;
        ctx.textAlign = 'center';

        ctx.fillStyle = '#0e3a66';
        ctx.font = 'bold 220px sans-serif';
        ctx.fillText('POLIMAXX', centerX, 400);

        ctx.strokeStyle = '#f37021';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(centerX - 416, 336, 30, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#f37021';
        ctx.font = 'bold 360px sans-serif';
        ctx.fillText('PP', centerX, 840);

        ctx.fillStyle = '#0e3a66';
        ctx.font = 'bold 150px sans-serif';
        ctx.fillText('POLYETHYLENE', centerX, 1040);

        ctx.strokeStyle = '#f37021';
        ctx.lineWidth = 30;
        ctx.beginPath();
        ctx.arc(1760, 400, 120, 0, Math.PI * 2);
        ctx.stroke();

        ctx.lineWidth = 20;
        ctx.beginPath();
        ctx.arc(1840, 640, 60, 0, Math.PI * 2);
        ctx.stroke();

        for (let index = 0; index < 4; index += 1) {
            const x = 400 + index * 170;
            const y = 1360;

            ctx.fillStyle = '#ff0000';
            ctx.beginPath();
            ctx.arc(x, y, 64, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = '#333';
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.arc(x, y, 64, 0, Math.PI * 2);
            ctx.stroke();

            ctx.fillStyle = '#ff6666';
            ctx.beginPath();
            ctx.arc(x - 10, y - 10, 16, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.textAlign = 'left';
        ctx.fillStyle = '#111';
        ctx.font = 'bold 120px sans-serif';
        ctx.fillText('NET WEIGHT 25 KG', 360, 1760);

        const texture = new THREE.CanvasTexture(canvas);
        texture.anisotropy = 16;
        texture.center.set(0.5, 0.5);
        texture.rotation = Math.PI;
        texture.needsUpdate = true;
        return texture;
    }

    static createFrontTexture(sideLabel = DEFAULT_SIDE_LABEL) {
        const resolved = { ...DEFAULT_SIDE_LABEL, ...sideLabel };
        const canvas = document.createElement('canvas');
        canvas.width = 4096;
        canvas.height = 1024;
        const ctx = canvas.getContext('2d');

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#000000';
        ctx.textBaseline = 'middle';

        const midY = 512;
        let currentX = 650;

        ctx.textAlign = 'left';
        ctx.font = 'bold 130px sans-serif';
        ctx.fillText(resolved.serial, currentX, midY);
        currentX += 1380;

        const symbolX = currentX;
        const symbolY = midY;

        if (resolved.showDiamond) {
            ctx.lineWidth = 14;
            ctx.strokeStyle = '#000';
            ctx.beginPath();
            ctx.moveTo(symbolX, symbolY - 75);
            ctx.lineTo(symbolX + 75, symbolY);
            ctx.lineTo(symbolX, symbolY + 75);
            ctx.lineTo(symbolX - 75, symbolY);
            ctx.closePath();
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(symbolX, symbolY - 75);
            ctx.lineTo(symbolX, symbolY + 75);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(symbolX - 35, symbolY);
            ctx.lineTo(symbolX + 35, symbolY);
            ctx.stroke();
        }

        ctx.font = 'bold 60px sans-serif';
        ctx.fillText(resolved.standard, symbolX + 110, midY - 38);
        ctx.fillText(resolved.grade, symbolX + 110, midY + 38);
        currentX += 540;

        if (resolved.showQr) {
            const qrX = currentX;
            const qrY = midY - 85;
            ctx.fillStyle = '#000';
            ctx.fillRect(qrX, qrY, 170, 170);
            ctx.fillStyle = '#fff';

            for (let x = 0; x < 3; x += 1) {
                for (let y = 0; y < 3; y += 1) {
                    if ((x + y) % 2 === 0) {
                        ctx.fillRect(qrX + 18 + x * 48, qrY + 18 + y * 48, 40, 40);
                    }
                }
            }

            ctx.fillStyle = '#000';
        }

        currentX += 280;
        ctx.font = 'bold 75px sans-serif';
        ctx.fillText(resolved.material, currentX, midY - 38);
        ctx.fillText(resolved.time, currentX, midY + 38);
        currentX += 460;

        ctx.font = 'italic bold 85px sans-serif';
        ctx.fillText(resolved.rohs, currentX, midY);

        const texture = new THREE.CanvasTexture(canvas);
        texture.anisotropy = 16;
        texture.generateMipmaps = false;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.needsUpdate = true;
        return texture;
    }

    static createIndexTexture(index) {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 200px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(index.toString(), canvas.width / 2, canvas.height / 2);

        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        return texture;
    }

    static createBlankTexture(backgroundColor = '#ffffff') {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        return texture;
    }
}