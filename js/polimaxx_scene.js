import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';

const CAMERA_PRESETS = Object.freeze({
    desktop: Object.freeze({
        position: Object.freeze({ x: 3.2, y: 2.15, z: 3.55 }),
        target: Object.freeze({ x: 0, y: 0.72, z: 0 })
    }),
    tablet: Object.freeze({
        position: Object.freeze({ x: 2.55, y: 1.95, z: 2.85 }),
        target: Object.freeze({ x: 0, y: 0.68, z: 0 })
    }),
    mobile: Object.freeze({
        position: Object.freeze({ x: 2.05, y: 1.7, z: 2.2 }),
        target: Object.freeze({ x: 0, y: 0.64, z: 0 })
    })
});

function isTouchCentricViewport() {
    return window.matchMedia('(hover: none) and (pointer: coarse)').matches || navigator.maxTouchPoints > 0;
}

function getViewportCameraPreset() {
    const width = window.innerWidth;

    if (width <= 768) {
        return CAMERA_PRESETS.mobile;
    }

    if (width <= 1024) {
        return CAMERA_PRESETS.tablet;
    }

    return CAMERA_PRESETS.desktop;
}

function installSafePointerCapture(domElement) {
    if (!domElement) return;

    const nativeSetPointerCapture = typeof domElement.setPointerCapture === 'function'
        ? domElement.setPointerCapture.bind(domElement)
        : null;
    const nativeReleasePointerCapture = typeof domElement.releasePointerCapture === 'function'
        ? domElement.releasePointerCapture.bind(domElement)
        : null;
    const nativeHasPointerCapture = typeof domElement.hasPointerCapture === 'function'
        ? domElement.hasPointerCapture.bind(domElement)
        : null;

    if (nativeSetPointerCapture) {
        domElement.setPointerCapture = (pointerId) => {
            try {
                nativeSetPointerCapture(pointerId);
            } catch (error) {
                if (!(error instanceof DOMException)) {
                    throw error;
                }
            }
        };
    }

    if (nativeReleasePointerCapture) {
        domElement.releasePointerCapture = (pointerId) => {
            try {
                if (!nativeHasPointerCapture || nativeHasPointerCapture(pointerId)) {
                    nativeReleasePointerCapture(pointerId);
                }
            } catch (error) {
                if (!(error instanceof DOMException)) {
                    throw error;
                }
            }
        };
    }
}

export class PolimaxxSceneManager {
    constructor(root = document.body) {
        this.root = root;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.labelRenderer = null;
        this.controls = null;
        this.gridHelper = null;
        this.animationHandle = null;

        this.init();
    }

    init() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x2a2a3a);

        const cameraPreset = getViewportCameraPreset();

        this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(cameraPreset.position.x, cameraPreset.position.y, cameraPreset.position.z);
        this.camera.lookAt(cameraPreset.target.x, cameraPreset.target.y, cameraPreset.target.z);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.5;
        installSafePointerCapture(this.renderer.domElement);
        this.root.appendChild(this.renderer.domElement);

        this.labelRenderer = new CSS2DRenderer();
        this.labelRenderer.setSize(window.innerWidth, window.innerHeight);
        this.labelRenderer.domElement.className = 'label-layer';
        this.root.appendChild(this.labelRenderer.domElement);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.zoomToCursor = !isTouchCentricViewport();
        this.controls.target.set(cameraPreset.target.x, cameraPreset.target.y, cameraPreset.target.z);
        this.controls.update();
        this.controls.saveState();

        this.setupLighting();
        this.createEnvironment();
        this.attachResizeHandler();
    }

    setupLighting() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
        this.scene.add(ambientLight);

        const light1 = new THREE.DirectionalLight(0xffffff, 1.8);
        light1.position.set(3, 6, 4);
        light1.castShadow = true;
        light1.shadow.mapSize.width = 1024;
        light1.shadow.mapSize.height = 1024;
        this.scene.add(light1);

        const light2 = new THREE.DirectionalLight(0xffccaa, 1.2);
        light2.position.set(-3, 4, 3);
        this.scene.add(light2);

        const fillLight = new THREE.PointLight(0x88aacc, 0.8);
        fillLight.position.set(1, 2, 2);
        this.scene.add(fillLight);
    }

    createEnvironment() {
        const floorGeo = new THREE.PlaneGeometry(10, 10);
        const floorMat = new THREE.MeshStandardMaterial({ color: 0x3a3a4a, roughness: 0.7 });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -0.2;
        floor.receiveShadow = true;
        this.scene.add(floor);

        this.gridHelper = new THREE.GridHelper(10, 20, 0xaaaaaa, 0x666666);
        this.gridHelper.position.y = -0.19;
        this.scene.add(this.gridHelper);
    }

    attachResizeHandler() {
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.labelRenderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    add(object) {
        this.scene.add(object);
    }

    render() {
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
        this.labelRenderer.render(this.scene, this.camera);
    }

    startAnimation() {
        const animate = () => {
            this.animationHandle = requestAnimationFrame(animate);
            this.render();
        };

        animate();
    }

    getScene() {
        return this.scene;
    }

    getCamera() {
        return this.camera;
    }

    getControls() {
        return this.controls;
    }

    getRenderer() {
        return this.renderer;
    }

    getLabelRenderer() {
        return this.labelRenderer;
    }

    getGridHelper() {
        return this.gridHelper;
    }
}