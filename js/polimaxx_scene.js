import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CSS2DRenderer } from "three/addons/renderers/CSS2DRenderer.js";

const CAMERA_PRESETS = Object.freeze({
  desktop: Object.freeze({
    position: Object.freeze({ x: 3.2, y: 2.15, z: 3.55 }),
    target: Object.freeze({ x: 0, y: 0.72, z: 0 }),
  }),
  tablet: Object.freeze({
    position: Object.freeze({ x: 2.55, y: 1.95, z: 2.85 }),
    target: Object.freeze({ x: 0, y: 0.68, z: 0 }),
  }),
  mobile: Object.freeze({
    position: Object.freeze({ x: 2.05, y: 1.7, z: 2.2 }),
    target: Object.freeze({ x: 0, y: 0.64, z: 0 }),
  }),
});

function isTouchCentricViewport() {
  return (
    window.matchMedia("(hover: none) and (pointer: coarse)").matches ||
    navigator.maxTouchPoints > 0
  );
}

// iPad / iPhone Safari (WebKit) มี memory budget ต่อ tab ต่ำมาก
// ถ้า render ที่ DPR เต็ม (2-3) พร้อม antialias + shadow map หนัก จะทำให้ WebKit
// ฆ่า tab แล้ว reload หน้าเอง (user เห็นเป็น "refresh ตัวเองตลอด")
function isIOSLikeDevice() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const isIPadOS =
    navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return /iPad|iPhone|iPod/.test(ua) || isIPadOS;
}

function getSafePixelRatio() {
  const dpr = window.devicePixelRatio || 1;
  const touch = isTouchCentricViewport();

  // จำกัดเพดาน pixel ratio เพื่อกัน memory ระเบิดบน tablet/มือถือ
  let cap = 2;
  if (isIOSLikeDevice()) cap = 1.5;
  else if (touch) cap = 1.75;

  return Math.min(dpr, cap);
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

  const nativeSetPointerCapture =
    typeof domElement.setPointerCapture === "function"
      ? domElement.setPointerCapture.bind(domElement)
      : null;
  const nativeReleasePointerCapture =
    typeof domElement.releasePointerCapture === "function"
      ? domElement.releasePointerCapture.bind(domElement)
      : null;
  const nativeHasPointerCapture =
    typeof domElement.hasPointerCapture === "function"
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

    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );
    this.camera.position.set(
      cameraPreset.position.x,
      cameraPreset.position.y,
      cameraPreset.position.z,
    );
    this.camera.lookAt(
      cameraPreset.target.x,
      cameraPreset.target.y,
      cameraPreset.target.z,
    );

    const iosLike = isIOSLikeDevice();

    // ปิด antialias บน iOS เพื่อลด memory (DPR สูง + antialias ทำ WebKit reload)
    this.renderer = new THREE.WebGLRenderer({
      antialias: !iosLike,
      powerPreference: "high-performance",
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = iosLike
      ? THREE.PCFShadowMap
      : THREE.PCFSoftShadowMap;
    this.renderer.setPixelRatio(getSafePixelRatio());
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.5;
    installSafePointerCapture(this.renderer.domElement);
    this.root.appendChild(this.renderer.domElement);

    this.labelRenderer = new CSS2DRenderer();
    this.labelRenderer.setSize(window.innerWidth, window.innerHeight);
    this.labelRenderer.domElement.className = "label-layer";
    this.root.appendChild(this.labelRenderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.12;
    // ให้ซูมตอบสนองไวกว่าเดิม (desktop รู้สึกหนืดเมื่อใช้ค่า default = 1)
    this.controls.zoomSpeed = 1.6;
    this.controls.rotateSpeed = 1.0;
    this.controls.minDistance = 0.6;
    this.controls.maxDistance = 12;
    this.controls.zoomToCursor = !isTouchCentricViewport();
    this.controls.target.set(
      cameraPreset.target.x,
      cameraPreset.target.y,
      cameraPreset.target.z,
    );
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
    // ลดความละเอียด shadow บน touch device (iPhone/iPad) เพื่อลด memory/GPU
    const shadowSize = isTouchCentricViewport() ? 512 : 1024;
    light1.shadow.mapSize.width = shadowSize;
    light1.shadow.mapSize.height = shadowSize;
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
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x3a3a4a,
      roughness: 0.7,
    });
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
    let lastWidth = 0;
    let lastHeight = 0;

    const applySize = () => {
      // ใช้ visualViewport ถ้ามี (แม่นกว่า innerWidth/innerHeight บน mobile)
      const viewport = window.visualViewport;
      const width = Math.round(viewport ? viewport.width : window.innerWidth);
      const height = Math.round(
        viewport ? viewport.height : window.innerHeight,
      );

      // ถ้าขนาดไม่เปลี่ยนจริง ให้ข้าม (กัน setSize ซ้ำตอน scroll บน iPad)
      if (width === lastWidth && height === lastHeight) return;
      lastWidth = width;
      lastHeight = height;

      const aspect = width / height;
      if (this.camera.aspect !== aspect) {
        this.camera.aspect = aspect;
        this.camera.updateProjectionMatrix();
      }

      // อัปเดต pixel ratio เผื่อ DPR เปลี่ยน (เช่น ย้ายจอ / zoom)
      this.renderer.setPixelRatio(getSafePixelRatio());
      this.renderer.setSize(width, height, false);
      this.labelRenderer.setSize(width, height);

      // ให้ canvas/label layer เต็ม viewport จริง
      this.renderer.domElement.style.width = "100%";
      this.renderer.domElement.style.height = "100%";
      this.labelRenderer.domElement.style.width = "100%";
      this.labelRenderer.domElement.style.height = "100%";
    };

    // throttle ให้ทำงานไม่เกิน ~1 ครั้งต่อ 150ms (กัน resize ถี่ตอน scroll)
    let resizeTimer = null;
    const scheduleResize = () => {
      if (resizeTimer) return;
      resizeTimer = setTimeout(() => {
        resizeTimer = null;
        applySize();
      }, 150);
    };

    // ขนาดจริงเปลี่ยน → ใช้ ResizeObserver (ไม่ trigger ตอน scroll)
    if (typeof ResizeObserver !== "undefined") {
      this._resizeObserver = new ResizeObserver(scheduleResize);
      this._resizeObserver.observe(document.documentElement);
    }

    window.addEventListener("resize", scheduleResize, { passive: true });
    window.addEventListener("orientationchange", scheduleResize, {
      passive: true,
    });
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", scheduleResize, {
        passive: true,
      });
    }

    applySize();
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
