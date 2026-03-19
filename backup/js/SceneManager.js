/**
 * SceneManager - Handles Three.js scene setup, lighting, and rendering
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class SceneManager {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        
        this.init();
    }

    /**
     * Initialize the complete scene setup
     */
    init() {
        this.createScene();
        this.createCamera();
        this.createRenderer();
        this.createControls();
        this.setupLighting();
        this.createEnvironment();
        this.setupEventListeners();
    }

    /**
     * Create the main scene
     */
    createScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x2a2a3a);
    }

    /**
     * Create and position the camera
     */
    createCamera() {
        this.camera = new THREE.PerspectiveCamera(
            45, 
            window.innerWidth / window.innerHeight, 
            0.1, 
            1000
        );
        this.camera.position.set(3.5, 2.2, 4.5);
        this.camera.lookAt(0, 0.6, 0);
    }

    /**
     * Create the WebGL renderer
     */
    createRenderer() {
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true, 
            alpha: false 
        });
        
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.5;
        
        document.body.appendChild(this.renderer.domElement);
    }

    /**
     * Create orbit controls for camera interaction
     */
    createControls() {
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.target.set(0, 0.6, 0);
    }

    /**
     * Setup scene lighting for optimal visibility
     */
    setupLighting() {
        // Ambient light for overall brightness
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
        this.scene.add(ambientLight);
        
        // Main directional light with shadows
        const mainLight = new THREE.DirectionalLight(0xffffff, 1.8);
        mainLight.position.set(3, 6, 4);
        mainLight.castShadow = true;
        mainLight.shadow.mapSize.width = 1024;
        mainLight.shadow.mapSize.height = 1024;
        this.scene.add(mainLight);
        
        // Secondary directional light for fill
        const fillLight = new THREE.DirectionalLight(0xffccaa, 1.2);
        fillLight.position.set(-3, 4, 3);
        this.scene.add(fillLight);

        // Point light for additional illumination
        const pointLight = new THREE.PointLight(0x88aacc, 0.8);
        pointLight.position.set(1, 2, 2);
        this.scene.add(pointLight);
    }

    /**
     * Create floor and grid environment
     */
    createEnvironment() {
        // Floor plane
        const floorGeo = new THREE.PlaneGeometry(10, 10);
        const floorMat = new THREE.MeshStandardMaterial({ 
            color: 0x3a3a4a, 
            roughness: 0.7, 
            emissive: new THREE.Color(0x111122) 
        });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -0.2;
        floor.receiveShadow = true;
        this.scene.add(floor);

        // Grid helper for reference
        const gridHelper = new THREE.GridHelper(8, 20, 0xaaaaaa, 0x666666);
        gridHelper.position.y = -0.19;
        this.scene.add(gridHelper);
    }

    /**
     * Setup window resize handling
     */
    setupEventListeners() {
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    /**
     * Enable/disable shadows for debugging
     */
    setShadowsEnabled(enabled) {
        this.renderer.shadowMap.enabled = enabled;
        
        // Update all lights
        this.scene.traverse((object) => {
            if (object.isDirectionalLight || object.isPointLight || object.isSpotLight) {
                object.castShadow = enabled;
            }
        });
        
        // Update all meshes
        this.scene.traverse((object) => {
            if (object.isMesh) {
                object.castShadow = enabled;
                object.receiveShadow = enabled;
            }
        });
    }

    /**
     * Add object to the scene
     */
    addToScene(object) {
        this.scene.add(object);
    }

    /**
     * Remove object from the scene
     */
    removeFromScene(object) {
        this.scene.remove(object);
    }

    /**
     * Start the animation loop
     */
    startAnimation() {
        const animate = () => {
            requestAnimationFrame(animate);
            this.controls.update();
            this.renderer.render(this.scene, this.camera);
        };
        animate();
    }

    /**
     * Get camera controls for external manipulation
     */
    getCameraControls() {
        return this.controls;
    }

    /**
     * Get the scene object
     */
    getScene() {
        return this.scene;
    }

    /**
     * Get the camera object
     */
    getCamera() {
        return this.camera;
    }

    /**
     * Get the renderer object
     */
    getRenderer() {
        return this.renderer;
    }
}