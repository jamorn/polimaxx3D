// ใช้กับ x7. html for testing bag geometry and deformation
// BagModel.js
import * as THREE from 'three';
import { ArtworkFactory } from './ArtworkFactory.js';

export class BagModel {
    static BAG_LENGTH = 0.5667;
    static BAG_WIDTH = 0.925;
    static BAG_HEIGHT = 0.28;

    constructor() {
        this.geometry = this.createGeometry();
        this.baseMaterials = this.createBaseMaterials();
        
        // Settings
        this.highlightBag1 = true;
        this.showIndexNumbers = false;
        this.wireframe = false;
        
        // Store all bags for later updates
        this.allBags = [];
    }

    createGeometry() {
        const segments = 48;
        const geo = new THREE.BoxGeometry(
            BagModel.BAG_WIDTH,
            BagModel.BAG_HEIGHT,
            BagModel.BAG_LENGTH,
            segments, segments, segments
        );

        const pos = geo.attributes.position;
        const v3 = new THREE.Vector3();

        for (let i = 0; i < pos.count; i++) {
            v3.fromBufferAttribute(pos, i);

            const nx = v3.x / (BagModel.BAG_WIDTH / 2);
            const ny = v3.y / (BagModel.BAG_HEIGHT / 2);
            const nz = v3.z / (BagModel.BAG_LENGTH / 2);

            // โค้งที่หัวท้าย
            const endCurve = Math.pow(Math.abs(nz), 2.2);
            v3.y *= (1 - endCurve * 0.25);
            v3.x *= (1 - endCurve * 0.08);

            // โค้งด้านข้าง
            const sideConvex = 0.22 * (1 - nz * nz * 0.2) * (1 - ny * ny * 0.3);
            v3.x += (v3.x > 0 ? 1 : -1) * sideConvex;

            // โค้งด้านหน้า-หลัง
            const frontConvex = 0.12 * (1 - nx * nx * 0.3) * (1 - ny * ny * 0.3);
            v3.z += (v3.z > 0 ? 1 : -1) * frontConvex;

            pos.setXYZ(i, v3.x, v3.y, v3.z);
        }

        geo.computeVertexNormals();
        return geo;
    }

    createBaseMaterials() {
        const baseMatParams = {
            color: 0xffffff,
            roughness: 0.6,
            metalness: 0.02,
            side: THREE.DoubleSide
        };

        return [
            new THREE.MeshStandardMaterial(baseMatParams), // 0: ขวา
            new THREE.MeshStandardMaterial(baseMatParams), // 1: ซ้าย
            new THREE.MeshStandardMaterial(baseMatParams), // 2: บน
            new THREE.MeshStandardMaterial(baseMatParams), // 3: ล่าง
            new THREE.MeshStandardMaterial(baseMatParams), // 4: หน้า
            new THREE.MeshStandardMaterial(baseMatParams)  // 5: หลัง
        ];
    }

    // สร้าง index label (ตัวเลขเล็กๆ) สำหรับ debug
    createIndexLabel(index, position, rotation) {
        const size = 0.15;
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        
        // พื้นหลังโปร่งแสง
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fillRect(0, 0, 256, 256);
        
        // ขอบ
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 4;
        ctx.strokeRect(2, 2, 252, 252);
        
        // ตัวเลข
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 180px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(index), 128, 128);
        
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.MeshBasicMaterial({ 
            map: texture, 
            transparent: true,
            side: THREE.DoubleSide,
            depthTest: false,
            depthWrite: false
        });
        
        const geometry = new THREE.PlaneGeometry(size, size);
        const label = new THREE.Mesh(geometry, material);
        label.position.set(position.x, position.y, position.z);
        label.rotation.set(rotation.x, rotation.y, rotation.z);
        label.renderOrder = 1000;
        
        return label;
    }

    createBag(options = {}) {
        const {
            label,
            position = { x: 0, y: 0, z: 0 },
            rotation = { x: 0, y: 0, z: 0 },
            hasSideArtwork = true,
            hasTopArtwork = true,
            isFlipped = false,
            layerIndex = 0
        } = options;

        const materials = this.baseMaterials.map(m => m.clone());
        
        // ปรับสีถุงหมายเลข 1 ถ้าเปิดโหมด highlight
        if (this.highlightBag1 && label === 1) {
            materials.forEach(mat => {
                mat.color.setHex(0xffaa00);
                mat.emissive.setHex(0x442200);
            });
        }
        
        // ตั้งค่าว่าให้แสดง wireframe หรือไม่
        if (this.wireframe) {
            materials.forEach(mat => {
                mat.wireframe = true;
            });
        }
        
        // Side artwork (index 5 only)
        if (hasSideArtwork) {
            const sideTex = ArtworkFactory.createSideTexture();
            
            if (isFlipped) {
                sideTex.rotation = Math.PI;
                sideTex.center.set(0.5, 0.5);
            } else {
                sideTex.rotation = 0;
            }
            
            if (materials[5]) {
                materials[5].map = sideTex;
                materials[5].needsUpdate = true;
            }
            
            // Clear other faces
            if (materials[0]) materials[0].map = null;
            if (materials[1]) materials[1].map = null;
            if (materials[4]) materials[4].map = null;
        }

        // Top artwork (index 2)
        if (hasTopArtwork) {
            const topTex = ArtworkFactory.createTopTexture(label);
            
            if (isFlipped) {
                topTex.rotation = Math.PI;
                topTex.center.set(0.5, 0.5);
            } else {
                topTex.rotation = -Math.PI / 2;
                topTex.center.set(0.5, 0.5);
            }
            
            if (materials[2]) {
                materials[2].map = topTex;
                materials[2].needsUpdate = true;
            }
        }

        const mesh = new THREE.Mesh(this.geometry, materials);
        mesh.position.set(position.x, position.y, position.z);
        mesh.rotation.set(rotation.x, rotation.y, rotation.z);
        
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        // Store index labels group
        const indexLabels = new THREE.Group();
        
        // เพิ่ม index labels
        const w = BagModel.BAG_WIDTH;
        const h = BagModel.BAG_HEIGHT;
        const l = BagModel.BAG_LENGTH;
        const pad = 0.01;
        
        // ขวา (index 0)
        indexLabels.add(this.createIndexLabel(0, 
            { x: w/2 + pad, y: 0, z: 0 },
            { x: 0, y: -Math.PI/2, z: 0 }
        ));
        
        // ซ้าย (index 1)
        indexLabels.add(this.createIndexLabel(1,
            { x: -w/2 - pad, y: 0, z: 0 },
            { x: 0, y: Math.PI/2, z: 0 }
        ));
        
        // บน (index 2)
        indexLabels.add(this.createIndexLabel(2,
            { x: 0, y: h/2 + pad, z: 0 },
            { x: Math.PI/2, y: 0, z: 0 }
        ));
        
        // ล่าง (index 3)
        indexLabels.add(this.createIndexLabel(3,
            { x: 0, y: -h/2 - pad, z: 0 },
            { x: -Math.PI/2, y: 0, z: 0 }
        ));
        
        // หน้า (index 4)
        indexLabels.add(this.createIndexLabel(4,
            { x: 0, y: 0, z: l/2 + pad },
            { x: 0, y: 0, z: 0 }
        ));
        
        // หลัง (index 5)
        indexLabels.add(this.createIndexLabel(5,
            { x: 0, y: 0, z: -l/2 - pad },
            { x: 0, y: Math.PI, z: 0 }
        ));
        
        indexLabels.visible = this.showIndexNumbers;
        mesh.add(indexLabels);

        mesh.userData = {
            label,
            isFlipped,
            layerIndex,
            hasSideArtwork,
            hasTopArtwork,
            indexLabels
        };

        // เก็บ reference
        this.allBags.push(mesh);

        return mesh;
    }

    createBagForLayer(label, x, z, layerIndex, isFlipped = false) {
        const isEvenLayer = (layerIndex % 2 === 1); // layerIndex 0 = layer1, 1 = layer2, etc.
        
        return this.createBag({
            label,
            position: { x, y: 0, z },
            rotation: { 
                x: isFlipped ? Math.PI : 0,
                y: 0, // ไม่ต้องหมุนแยก เพราะ layer group จะหมุนให้
                z: 0 
            },
            hasSideArtwork: true,
            hasTopArtwork: true,
            isFlipped,
            layerIndex
        });
    }

    // ===== UI Control Methods =====
    
    setHighlightBag1(enable) {
        this.highlightBag1 = enable;
        
        // อัปเดตถุงทั้งหมด
        this.allBags.forEach(bag => {
            if (bag.userData.label === 1) {
                const materials = bag.material;
                if (Array.isArray(materials)) {
                    materials.forEach(mat => {
                        if (enable) {
                            mat.color.setHex(0xffaa00);
                            mat.emissive.setHex(0x442200);
                        } else {
                            mat.color.setHex(0xffffff);
                            mat.emissive.setHex(0x000000);
                        }
                        mat.needsUpdate = true;
                    });
                }
            }
        });
        
        console.log(`Highlight Bag #1: ${enable ? 'ON' : 'OFF'}`);
    }
    
    setShowIndexNumbers(enable) {
        this.showIndexNumbers = enable;
        
        this.allBags.forEach(bag => {
            if (bag.userData.indexLabels) {
                bag.userData.indexLabels.visible = enable;
            }
        });
        
        console.log(`Show index numbers: ${enable ? 'ON' : 'OFF'}`);
    }
    
    setWireframe(enable) {
        this.wireframe = enable;
        
        this.allBags.forEach(bag => {
            const materials = bag.material;
            if (Array.isArray(materials)) {
                materials.forEach(mat => {
                    mat.wireframe = enable;
                    mat.needsUpdate = true;
                });
            }
        });
        
        console.log(`Wireframe mode: ${enable ? 'ON' : 'OFF'}`);
    }
}

export default BagModel;