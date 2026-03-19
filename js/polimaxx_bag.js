import * as THREE from 'three';

import { BASE_BAG, SHAPE_REFERENCE } from './polimaxx_config.js';
import { PolimaxxTextureFactory } from './polimaxx_texture_factory.js';

export class PolimaxxBag {
    constructor(state, width = BASE_BAG.WIDTH, length = BASE_BAG.LENGTH, height = BASE_BAG.HEIGHT) {
        this.state = state;
        this.dimensions = { width, length, height };
        this.geometry = this.createGeometry();
        this.textures = {
            top: PolimaxxTextureFactory.createTopTexture(this.state.bagColor),
            front: PolimaxxTextureFactory.createFrontTexture(),
            blank: PolimaxxTextureFactory.createBlankTexture(this.state.bagColor),
            index: []
        };

        for (let index = 0; index < 6; index += 1) {
            this.textures.index[index] = PolimaxxTextureFactory.createIndexTexture(index);
        }

        this.materials = this.createMaterials();
    }

    setDimensions(width, length, height) {
        this.dimensions = { width, length, height };
        this.geometry = this.createGeometry();
        return this.geometry;
    }

    createGeometry() {
        const { width, length, height } = this.dimensions;
        const sideBulge = SHAPE_REFERENCE.SIDE_BULGE_X * (width / SHAPE_REFERENCE.WIDTH);
        const frontBulge = SHAPE_REFERENCE.FRONT_BULGE_Z * (length / SHAPE_REFERENCE.LENGTH);
        const segments = 24;

        const geometry = new THREE.BoxGeometry(width, height, length, segments, segments, segments);
        const position = geometry.attributes.position;
        const uv = geometry.attributes.uv;
        const normal = geometry.attributes.normal;
        const vector = new THREE.Vector3();

        for (let index = 0; index < position.count; index += 1) {
            vector.fromBufferAttribute(position, index);

            const nx = vector.x / (width / 2);
            const ny = vector.y / (height / 2);
            const nz = vector.z / (length / 2);

            const endCurve = Math.pow(Math.abs(nz), 2.2);
            vector.y *= (1 - endCurve * 0.25);
            vector.x *= (1 - endCurve * 0.08);

            const sideConvex = sideBulge * (1 - nz * nz * 0.2) * (1 - ny * ny * 0.3);
            vector.x += (vector.x > 0 ? 1 : -1) * sideConvex;

            const frontConvex = frontBulge * (1 - nx * nx * 0.3) * (1 - ny * ny * 0.3);
            vector.z += (vector.z > 0 ? 1 : -1) * frontConvex;

            position.setXYZ(index, vector.x, vector.y, vector.z);
        }

        geometry.computeVertexNormals();

        for (let index = 0; index < position.count; index += 1) {
            vector.fromBufferAttribute(position, index);
            const normalX = normal.getX(index);
            const normalY = normal.getY(index);
            const normalZ = normal.getZ(index);

            if (Math.abs(normalY) > 0.5) {
                if (normalY > 0) {
                    uv.setXY(index, (vector.z / length) + 0.5, (vector.x / width) + 0.5);
                } else {
                    uv.setXY(index, (vector.x / width) + 0.5, (vector.z / length) + 0.5);
                }
            } else if (Math.abs(normalZ) > 0.5) {
                const u = (vector.x / width) + 0.5;
                const v = (vector.y / height) + 0.5;

                if (normalZ > 0) {
                    uv.setXY(index, u, v);
                } else {
                    uv.setXY(index, 1.0 - u, v);
                }
            } else if (Math.abs(normalX) > 0.5) {
                const u = (vector.z / length) + 0.5;
                const v = (vector.y / height) + 0.5;

                if (normalX > 0) {
                    uv.setXY(index, 1.0 - u, v);
                } else {
                    uv.setXY(index, u, v);
                }
            }
        }

        return geometry;
    }

    createMaterials() {
        return [
            new THREE.MeshStandardMaterial({ color: this.state.bagColor, roughness: 0.6, side: THREE.FrontSide }),
            new THREE.MeshStandardMaterial({ color: this.state.bagColor, roughness: 0.6, side: THREE.FrontSide }),
            new THREE.MeshStandardMaterial({ map: this.textures.top, color: 0xffffff, roughness: 0.45, metalness: 0.05, side: THREE.FrontSide }),
            new THREE.MeshStandardMaterial({ map: this.textures.blank, color: 0xffffff, roughness: 0.6, side: THREE.FrontSide }),
            new THREE.MeshStandardMaterial({ color: this.state.bagColor, roughness: 0.4, metalness: 0.05, side: THREE.FrontSide }),
            new THREE.MeshStandardMaterial({ color: this.state.bagColor, roughness: 0.6, side: THREE.FrontSide })
        ];
    }

    createInstance(posX, posY, posZ, rotationY = 0, label = 0) {
        const materials = this.materials.map((material) => material.clone());
        const mesh = new THREE.Mesh(this.geometry, materials);

        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.position.set(posX, posY, posZ);
        mesh.rotation.y = rotationY;
        mesh.userData.label = label;
        mesh.userData.initialPos = { x: posX, y: posY, z: posZ };
        mesh.userData.initialRot = rotationY;

        return mesh;
    }
}