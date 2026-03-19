/**
 * BagManager - Manages the collection of bags and their operations
 */
import { POLIMAXBag } from '../../js/POLIMAXBag.js';

export class BagManager {
    constructor(sceneManager) {
        this.sceneManager = sceneManager;
        this.bagClass = new POLIMAXBag();
        this.bags = [];
        this.bagByLabel = {};
        this.indexMesh = null;
        
        this.createBags();
    }

    /**
     * Create all 5 bags with specified default positions and rotations
     */
    createBags() {
        const h = POLIMAXBag.BAG_HEIGHT;
        const l = POLIMAXBag.BAG_LENGTH;
        const baseY = h / 2;

        // Create bags with updated default positions (bag 5 now has 0° rotation)
        const bagConfigs = [
            // ถุง 5: X=-0.78, 0° (updated from 180°)
            { x: -0.78, y: baseY, z: l/2 + 0.2, rot: 0, label: 5 },
            // ถุง 4: X=0.60, 0°
            { x: 0.60, y: baseY, z: l/2 + 0.2, rot: 0, label: 4 },
            // ถุง 3: X=-0.82, 270°
            { x: -0.82, y: baseY, z: -l/2 - 0.2, rot: 3 * Math.PI / 2, label: 3 },
            // ถุง 2: X=0.00, 90°
            { x: 0.00, y: baseY, z: -l/2 - 0.2, rot: Math.PI / 2, label: 2 },
            // ถุง 1: X=0.82, 90°
            { x: 0.82, y: baseY, z: -l/2 - 0.2, rot: Math.PI / 2, label: 1 }
        ];

        bagConfigs.forEach(config => {
            const bag = this.bagClass.createInstance(
                config.x, config.y, config.z, config.rot, config.label
            );
            
            this.bags.push(bag);
            this.bagByLabel[config.label] = bag;
            this.sceneManager.addToScene(bag);
        });

        // Create index overlay (initially hidden)
        this.indexMesh = this.bagClass.createIndexInstance(0, 0.5, 0, 0);
        this.indexMesh.visible = false;
        this.sceneManager.addToScene(this.indexMesh);
    }

    /**
     * Get bag by label number
     */
    getBagByLabel(label) {
        return this.bagByLabel[label];
    }

    /**
     * Get all bags array
     */
    getAllBags() {
        return this.bags;
    }

    /**
     * Reset all bags to their initial positions and rotations
     */
    resetAllBags() {
        this.bags.forEach(bag => {
            bag.position.x = bag.userData.initialPos.x;
            bag.position.y = bag.userData.initialPos.y;
            bag.position.z = bag.userData.initialPos.z;
            bag.rotation.y = bag.userData.initialRot;
        });
    }

    /**
     * Get current state of all bags
     */
    getAllBagStates() {
        return this.bags.map(bag => ({
            label: bag.userData.label,
            x: bag.position.x,
            y: bag.position.y,
            z: bag.position.z,
            rot: bag.rotation.y
        }));
    }

    /**
     * Apply bag states from saved configuration
     */
    applyBagStates(bagStates) {
        bagStates.forEach(state => {
            const bag = this.getBagByLabel(state.label);
            if (bag) {
                bag.position.x = state.x;
                bag.position.y = state.y;
                bag.position.z = state.z;
                bag.rotation.y = state.rot;
            }
        });
    }

    /**
     * Calculate initial gap middle value from bag positions
     */
    getInitialGapMiddle() {
        const bag1 = this.getBagByLabel(1);
        const bag2 = this.getBagByLabel(2);
        
        if (bag1 && bag2) {
            return Math.abs(bag1.position.x - bag2.position.x);
        }
        
        return 0.82; // fallback default
    }

    /**
     * Set visibility of index overlay
     */
    setIndexVisibility(visible) {
        if (this.indexMesh) {
            this.indexMesh.visible = visible;
        }
    }

    /**
     * Set opacity of index overlay  
     */
    setIndexOpacity(opacity) {
        if (this.indexMesh && this.indexMesh.material) {
            if (Array.isArray(this.indexMesh.material)) {
                // Update all materials if it's an array
                this.indexMesh.material.forEach(mat => {
                    mat.opacity = opacity;
                    mat.transparent = opacity < 1.0;
                    mat.needsUpdate = true;
                });
            } else {
                // Single material
                this.indexMesh.material.opacity = opacity;
                this.indexMesh.material.transparent = opacity < 1.0;
                this.indexMesh.material.needsUpdate = true;
            }
        }
    }

    /**
     * Set visibility of front details (1126NK, RoHS) on all bags
     */
    setFrontDetailsVisibility(visible) {
        this.bags.forEach(bag => {
            if (bag.material && Array.isArray(bag.material)) {
                // Front face is at index 4 (see POLIMAXBag materials array)
                const frontMaterial = bag.material[4];
                if (frontMaterial) {
                    if (visible) {
                        // Restore front texture
                        frontMaterial.map = this.bagClass.textures.front;
                        frontMaterial.color.setHex(0xffffff);
                    } else {
                        // Hide front texture, show only white color
                        frontMaterial.map = null;
                        frontMaterial.color.setHex(0xffffff);
                    }
                    frontMaterial.needsUpdate = true;
                }
            }
        });
    }

    /**
     * Set visibility of top artwork (POLIMAXX logo) on all bags
     */
    setTopArtworkVisibility(visible) {
        this.bags.forEach(bag => {
            if (bag.material && Array.isArray(bag.material)) {
                // Top face is at index 2 (see POLIMAXBag materials array)
                const topMaterial = bag.material[2];
                if (topMaterial) {
                    if (visible) {
                        // Restore top texture
                        topMaterial.map = this.bagClass.textures.top;
                        topMaterial.color.setHex(0xffffff);
                    } else {
                        // Hide top texture, show only white color
                        topMaterial.map = null;
                        topMaterial.color.setHex(0xffffff);
                    }
                    topMaterial.needsUpdate = true;
                }
            }
        });
    }

    /**
     * Get bag at specific position (for selection)
     */
    getBagAtPosition(x, z) {
        // Simple distance-based selection
        let closestBag = null;
        let minDistance = Infinity;

        this.bags.forEach(bag => {
            const dx = bag.position.x - x;
            const dz = bag.position.z - z;
            const distance = Math.sqrt(dx * dx + dz * dz);

            if (distance < minDistance) {
                minDistance = distance;
                closestBag = bag;
            }
        });

        return closestBag;
    }

    /**
     * Update all bag materials (if needed for runtime changes)
     */
    updateBagMaterials() {
        this.bags.forEach(bag => {
            // Force material updates if needed
            if (bag.material && Array.isArray(bag.material)) {
                bag.material.forEach(mat => {
                    mat.needsUpdate = true;
                });
            }
        });
    }

    /**
     * Set wireframe mode for debugging
     */
    setWireframeMode(enabled) {
        this.bags.forEach(bag => {
            if (bag.material && Array.isArray(bag.material)) {
                bag.material.forEach(mat => {
                    mat.wireframe = enabled;
                    mat.needsUpdate = true;
                });
            }
        });
        
        if (this.indexMesh && this.indexMesh.material) {
            if (Array.isArray(this.indexMesh.material)) {
                this.indexMesh.material.forEach(mat => {
                    mat.wireframe = enabled;
                    mat.needsUpdate = true;
                });
            }
        }
    }
    
    /**
     * Set Z offset for index overlay to prevent Z-fighting 
     */
    setIndexZOffset(offset) {
        if (this.indexMesh) {
            this.indexMesh.position.y = 0.5 + offset;
        }
    }

    /**
     * Get statistics about current bag layout
     */
    getLayoutStats() {
        const positions = this.bags.map(bag => ({
            label: bag.userData.label,
            x: bag.position.x,
            z: bag.position.z,
            rotation: bag.rotation.y * 180 / Math.PI
        }));

        const minX = Math.min(...positions.map(p => p.x));
        const maxX = Math.max(...positions.map(p => p.x));
        const minZ = Math.min(...positions.map(p => p.z));
        const maxZ = Math.max(...positions.map(p => p.z));

        return {
            positions,
            bounds: { minX, maxX, minZ, maxZ },
            width: maxX - minX,
            depth: maxZ - minZ
        };
    }
}