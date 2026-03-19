// ใช้กับ x7. html for testing bag geometry and deformation
// this file is used with x7.html for testing bag geometry and deformation
// LayerStack.js
import * as THREE from 'three';
import { BagModel } from './BagModel.js';

export class LayerStack {
    constructor(bagModel) {
        this.bagModel = bagModel;
        this.stackGroup = new THREE.Group();
        this.layers = [];
        this.bagHeight = BagModel.BAG_HEIGHT;
        this.layerSpacing = 0.02;
    }

    // Pattern A: ชั้นคี่ (1,3,5,7) - แถวบน [5,4], แถวล่าง [3,2,1]
    createPatternA() {
        return {
            topRow: [    // แถวบน [5,4]
                { label: 5, x: -0.3, z: 0.7, flip: false },
                { label: 4, x: 0.3, z: 0.7, flip: false }
            ],
            bottomRow: [ // แถวล่าง [3,2,1]
                { label: 3, x: 0.5, z: 0.2, flip: false },
                { label: 2, x: 0, z: -0.2, flip: false },
                { label: 1, x: -0.5, z: 0.2, flip: true }
            ]
        };
    }

    // Pattern B: ชั้นคู่ (2,4,6,8) - แถวบน [3,2,1], แถวล่าง [5,4]
    createPatternB() {
        return {
            topRow: [    // แถวบน [3,2,1] 
                { label: 3, x: 0.5, z: 0.2, flip: false },
                { label: 2, x: 0, z: -0.2, flip: false },
                { label: 1, x: -0.5, z: 0.2, flip: true }
            ],
            bottomRow: [ // แถวล่าง [5,4]
                { label: 5, x: -0.3, z: 0.7, flip: false },
                { label: 4, x: 0.3, z: 0.7, flip: false }
            ]
        };
    }

    createLayer(layerIndex) {
        const isOdd = (layerIndex % 2 === 0); // layerIndex 0 = ชั้น1 (odd)
        const pattern = isOdd ? this.createPatternA() : this.createPatternB();
        
        const layerGroup = new THREE.Group();
        const bags = [];

        console.log(`Layer ${layerIndex + 1} (${isOdd ? 'Pattern A' : 'Pattern B'})`);

        // เพิ่มถุงแถวบน
        pattern.topRow.forEach(pos => {
            const bag = this.bagModel.createBagForLayer(
                pos.label, 
                pos.x, 
                pos.z, 
                layerIndex, 
                pos.flip
            );
            bags.push(bag);
            layerGroup.add(bag);
        });

        // เพิ่มถุงแถวล่าง
        pattern.bottomRow.forEach(pos => {
            const bag = this.bagModel.createBagForLayer(
                pos.label, 
                pos.x, 
                pos.z, 
                layerIndex, 
                pos.flip
            );
            bags.push(bag);
            layerGroup.add(bag);
        });

        // ชั้นคู่หมุน 180° ทั้ง group
        if (!isOdd) {
            layerGroup.rotation.y = Math.PI;
            console.log(`  ↳ Layer ${layerIndex + 1} rotated 180°`);
        }

        return { layerGroup, bags };
    }

    buildStack(numLayers = 8) {
        for (let i = 0; i < numLayers; i++) {
            const { layerGroup, bags } = this.createLayer(i);
            
            const yOffset = i * (this.bagHeight + this.layerSpacing);
            layerGroup.position.y = yOffset;
            
            this.layers.push({
                index: i,
                group: layerGroup,
                bags: bags,
                pattern: (i % 2 === 0) ? 'A' : 'B'
            });
            
            this.stackGroup.add(layerGroup);
        }
        
        console.log(`✅ Stack built with ${numLayers} layers`);
        console.log(`   Layers 1,3,5,7: Pattern A (top:[5,4], bottom:[3,2,1])`);
        console.log(`   Layers 2,4,6,8: Pattern B (top:[3,2,1], bottom:[5,4]) + 180° rotation`);
    }

    rotateStack(angle) {
        this.stackGroup.rotation.y = angle;
    }

    getStack() {
        return this.stackGroup;
    }
    
    // สำหรับ debug
    logLayerInfo() {
        this.layers.forEach(layer => {
            const pattern = (layer.index % 2 === 0) ? 'A' : 'B';
            console.log(`Layer ${layer.index + 1}: Pattern ${pattern} | rotation: ${pattern === 'A' ? '0°' : '180°'}`);
        });
    }
}