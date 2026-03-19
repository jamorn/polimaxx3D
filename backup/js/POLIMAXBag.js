/**
 * POLIMAXBag - Handles bag geometry, materials and mesh creation
 */
import * as THREE from 'three';
import { TextureFactory } from '../../js/TextureFactory.js';

export class POLIMAXBag {
    // Bag physical dimensions (in meters)
    static BAG_LENGTH = 0.5667;
    static BAG_WIDTH = 0.925;
    static BAG_HEIGHT = 0.28;

    constructor() {
        this.geometry = this.createGeometry();
        this.textures = this.createTextures();
        this.materials = this.createMaterials();
        this.indexMaterials = this.createIndexMaterials();
    }

    /**
     * Creates the bag geometry with realistic deformation
     */
    createGeometry() {
        const segments = 12; // balanced segments to match index.html deformation
        const geo = new THREE.BoxGeometry(
            POLIMAXBag.BAG_WIDTH,
            POLIMAXBag.BAG_HEIGHT,
            POLIMAXBag.BAG_LENGTH,
            segments, segments, segments
        );

        const pos = geo.attributes.position;
        const v3 = new THREE.Vector3();

        // Deform geometry to look like a filled bag (original behavior)
        for (let i = 0; i < pos.count; i++) {
            v3.fromBufferAttribute(pos, i);
            const nx = v3.x / (POLIMAXBag.BAG_WIDTH / 2);
            const ny = v3.y / (POLIMAXBag.BAG_HEIGHT / 2);
            const nz = v3.z / (POLIMAXBag.BAG_LENGTH / 2);

            // End tapering effect
            const endCurve = Math.pow(Math.abs(nz), 2.2);
            v3.y *= (1 - endCurve * 0.25);
            v3.x *= (1 - endCurve * 0.08);

            // Side bulging
            const sideConvex = 0.22 * (1 - nz * nz * 0.2) * (1 - ny * ny * 0.3);
            v3.x += (v3.x > 0 ? 1 : -1) * sideConvex;

            // Front/back bulging
            const frontConvex = 0.12 * (1 - nx * nx * 0.3) * (1 - ny * ny * 0.3);
            v3.z += (v3.z > 0 ? 1 : -1) * frontConvex;

            pos.setXYZ(i, v3.x, v3.y, v3.z);
        }

        // Smooth normals for better shading
        geo.computeVertexNormals();
        return geo;
    }

    /**
     * Sets up UV mapping for proper texture application
     */
    setupUVMapping(geo) {
        const pos = geo.attributes.position;
        const uv = geo.attributes.uv;
        const normal = geo.attributes.normal;
        const v3 = new THREE.Vector3();
        
        for (let i = 0; i < pos.count; i++) {
            v3.fromBufferAttribute(pos, i);
            const normalX = normal.getX(i);
            const normalY = normal.getY(i);
            const normalZ = normal.getZ(i);

            if (Math.abs(normalY) > 0.5) {
                // Top/bottom faces
                if (normalY > 0) {
                    // Top face - normal mapping
                    uv.setXY(i, (v3.z / POLIMAXBag.BAG_LENGTH) + 0.5, (v3.x / POLIMAXBag.BAG_WIDTH) + 0.5);
                } else {
                    // Bottom face - isolated mapping to prevent bleeding
                    uv.setXY(i, 0.01, 0.01);
                }
            } else if (Math.abs(normalZ) > 0.5) {
                // Front/back faces
                const u = (v3.x / POLIMAXBag.BAG_WIDTH) + 0.5;
                const v = (v3.y / POLIMAXBag.BAG_HEIGHT) + 0.5;
                if (normalZ > 0) {
                    uv.setXY(i, u, v);
                } else {
                    uv.setXY(i, 1.0 - u, v);
                }
            } else if (Math.abs(normalX) > 0.5) {
                // Left/right faces
                const u = (v3.z / POLIMAXBag.BAG_LENGTH) + 0.5;
                const v = (v3.y / POLIMAXBag.BAG_HEIGHT) + 0.5;
                if (normalX > 0) {
                    uv.setXY(i, 1.0 - u, v);
                } else {
                    uv.setXY(i, u, v);
                }
            }
        }
    }

    /**
     * Creates all required textures
     */
    createTextures() {
        const textures = {
            top: TextureFactory.createTopTexture(),
            front: TextureFactory.createFrontTexture(),
            blank: TextureFactory.createBlankTexture(),
            index: []
        };
        
        // Create index textures for numbers 0-5
        for (let i = 0; i < 6; i++) {
            textures.index[i] = TextureFactory.createIndexTexture(i);
        }
        
        return textures;
    }

    /**
     * Creates materials for each face of the bag
     */
    createMaterials() {
        return [
            // Right face
            new THREE.MeshStandardMaterial({ 
                color: 0xffffff, 
                roughness: 0.6, 
                side: THREE.DoubleSide 
            }),
            // Left face  
            new THREE.MeshStandardMaterial({ 
                color: 0xffffff, 
                roughness: 0.6, 
                side: THREE.DoubleSide 
            }),
            // Top face
            new THREE.MeshStandardMaterial({ 
                map: this.textures.top, 
                roughness: 0.45, 
                metalness: 0.05, 
                side: THREE.DoubleSide 
            }),
            // Bottom face
            new THREE.MeshStandardMaterial({ 
                map: this.textures.blank, 
                color: 0xffffff, 
                roughness: 0.6, 
                side: THREE.FrontSide,
                transparent: false,
                opacity: 1.0
            }),
            // Front face
            new THREE.MeshStandardMaterial({ 
                map: this.textures.front, 
                roughness: 0.4, 
                metalness: 0.05, 
                side: THREE.DoubleSide 
            }),
            // Back face
            new THREE.MeshStandardMaterial({ 
                color: 0xffffff, 
                roughness: 0.6, 
                side: THREE.DoubleSide 
            })
        ];
    }

    /**
     * Creates materials for index overlays
     */
    createIndexMaterials() {
        return this.textures.index.map(tex => 
            new THREE.MeshStandardMaterial({ 
                map: tex, 
                side: THREE.DoubleSide, 
                transparent: true, 
                opacity: 0.9 
            })
        );
    }

    /**
     * Creates a bag instance at specified position and rotation
     */
    createInstance(posX, posY, posZ, rotationY = 0, label = 0) {
        // Clone materials to avoid shared references
        const clonedMats = this.materials.map(mat => mat.clone());
        const mesh = new THREE.Mesh(this.geometry, clonedMats);
        
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.position.set(posX, posY, posZ);
        mesh.rotation.y = rotationY;
        
        // Store metadata
        mesh.userData.label = label;
        mesh.userData.initialPos = { x: posX, y: posY, z: posZ };
        mesh.userData.initialRot = rotationY;
        
        return mesh;
    }

    /**
     * Creates an index overlay instance
     */
    createIndexInstance(posX, posY, posZ, rotationY = 0) {
        const clonedMats = this.indexMaterials.map(mat => mat.clone());
        const mesh = new THREE.Mesh(this.geometry, clonedMats);
        
        mesh.position.set(posX, posY, posZ);
        mesh.rotation.y = rotationY;
        
        return mesh;
    }
}