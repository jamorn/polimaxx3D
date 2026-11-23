import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

/**
 * PolimaxxPallet — พาเลทพลาสติก N4-1210
 *
 * หมายเหตุการแก้ z-fighting / กระพริบตอนหมุนกล้อง:
 *   1) รวม geometry ของพลาสติกทั้งหมดเป็น mesh เดียว (mergeGeometries)
 *      และรวมยางเป็นอีก mesh เดียว -> ไม่มี transparent cross-sorting
 *   2) วัสดุยางคง opaque เสมอ (ไม่รับ opacity) -> เรนเดอร์ใน opaque pass
 *   3) บังคับให้ชิ้นส่วนที่เคย coplanar กันซ้อนเหลื่อมกันด้วย EPS (~2mm)
 *      -> ไม่มี face ระนาบเดียวกันเหลืออยู่ จึงไม่เกิด z-fighting ที่ต้นเหตุ
 *         (ไม่ต้องพึ่ง polygonOffset หรือ logarithmicDepthBuffer)
 */
export class PolimaxxPallet extends THREE.Group {
  static sharedResources = null;

  constructor(options = {}) {
    super();

    this.width = options.width || 1.2;
    this.depth = options.depth || 1.0;
    this.height = options.height || 0.15;
    this.color = options.color || 0x005ce6;

    const key = `${this.width}_${this.depth}_${this.height}`;
    if (
      !PolimaxxPallet.sharedResources ||
      PolimaxxPallet.sharedResources.key !== key
    ) {
      PolimaxxPallet.initResources(this.width, this.depth, this.height);
      PolimaxxPallet.sharedResources.key = key;
    }

    // วัสดุพลาสติก: เป็น mesh เดียวหลัง merge -> transparent ได้โดยไม่กระพริบ
    // (เปิด depthWrite เพื่อ occlude ตัวเองกับยางได้ถูกต้อง)
    this.material = new THREE.MeshStandardMaterial({
      color: this.color,
      roughness: 0.4,
      metalness: 0.12,
      depthWrite: true,
    });

    // วัสดุยางกันลื่น: คงเป็น opaque เสมอ (ไม่รับ opacity จากผู้ใช้)
    // -> เรนเดอร์ใน opaque pass ก่อน transparent จึงไม่สลับลำดับตอนหมุนกล้อง
    this.rubberMaterial = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.9,
      metalness: 0.05,
      transparent: false,
      depthWrite: true,
    });

    this.buildSymmetrical();
  }

  static initResources(w, d, h) {
    const topH = 0.035;
    const botH = 0.025;
    const legH = h - topH - botH;

    const grommetRadius = 0.014;
    const grommetHeight = 0.008;

    PolimaxxPallet.sharedResources = {
      key: null,
      dims: { w, d, h, topH, botH, legH, grommetHeight },
      topDeckGeo: new THREE.BoxGeometry(w, topH, d),
      longRunnerGeo: new THREE.BoxGeometry(w, botH, 0.235),
      grommetGeo: new THREE.CylinderGeometry(
        grommetRadius,
        grommetRadius,
        grommetHeight,
        20,
      ),
      // NOTE: legGeo / sideRunnerGeo ถูกสร้างใน buildSymmetrical()
      //       เพราะต้องยืด/หดด้วย EPS เพื่อ overlap
    };
  }

  buildSymmetrical() {
    const { dims, topDeckGeo, longRunnerGeo, grommetGeo } =
      PolimaxxPallet.sharedResources;

    // รวม geometry ตาม material เพื่อให้ transparent เรียงลำดับถูก
    // (ถ้าแยกหลาย mesh จะเกิดการกระพริบตอนหมุนกล้อง)
    const plasticGeometries = [];
    const rubberGeometries = [];

    // ── EPS: ระยะ overlap ระหว่างชิ้นส่วน (2mm พอสำหรับพาเลทขนาดนี้) ──
    // หลักการ: face ของสองชิ้นที่เคยชนกันพอดี ให้ "เลยซ้อนเข้าไป" ด้วย EPS
    //          -> จะไม่มี face ระนาบเดียวกันอีก จึงไม่มี z-fighting
    const EPS = 0.002;

    // leg: ยืดขึ้น-ลง EPS แล้วคง center เดิม
    //   top    -> ฝังเข้า top deck
    //   bottom -> ฝังเข้า long runner
    const legGeo = new THREE.BoxGeometry(0.145, dims.legH + 2 * EPS, 0.235);

    // side runner: หด Y ไม่ให้ top/bottom ตรงกับ long runner
    //   spans y ∈ [EPS, botH - 2·EPS]
    const sideRunnerGeo = new THREE.BoxGeometry(
      0.145,
      dims.botH - 3 * EPS,
      dims.d,
    );
    const sideRunnerY = (dims.botH - EPS) / 2; // center ใหม่

    const pushPart = (geometry, x, y, z, isRubber = false) => {
      const clone = geometry.clone();
      clone.translate(x, y, z);
      (isRubber ? rubberGeometries : plasticGeometries).push(clone);
    };

    // 1. แผ่นพื้นบน (Top Deck)
    pushPart(topDeckGeo, 0, dims.h - dims.topH / 2, 0);

    // เส้นขอบเบาๆ ให้เห็นมิติของแผ่นบน
    // NOTE: ใช้ depthTest = true ปกติ แต่ visibility ปิดไว้เป็น default
    //       ถ้าเปิดใช้และยัง flicker ให้พิจารณา polygonOffset บนวัสดุหลัก
    const edges = new THREE.EdgesGeometry(topDeckGeo);
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x3b82f6,
      transparent: true,
      opacity: 0.4,
    });
    const wireframe = new THREE.LineSegments(edges, lineMat);
    wireframe.visible = false;
    wireframe.position.set(0, dims.h - dims.topH / 2, 0);
    this.add(wireframe);
    this.topDeckWireframe = wireframe;

    const legY = dims.botH + dims.legH / 2;
    const cornerX = dims.w / 2 - 0.145 / 2;
    const cornerZ = dims.d / 2 - 0.235 / 2;

    // grommet: ยกขึ้นให้พ้นผิว deck มากขึ้น (เดิม 2mm → 3mm)
    const grommetLift = 0.003;
    const grommetY = dims.h - dims.grommetHeight / 2 + grommetLift;
    const grommetX = dims.w / 2 - 0.18;
    const grommetZ = dims.d / 2 - 0.16;

    const quadrants = [
      [1, 1],
      [-1, 1],
      [1, -1],
      [-1, -1],
    ];

    quadrants.forEach(([sx, sz]) => {
      pushPart(legGeo, cornerX * sx, legY, cornerZ * sz);
      pushPart(grommetGeo, grommetX * sx, grommetY, grommetZ * sz, true);
    });

    const runnerY = dims.botH / 2;

    pushPart(legGeo, 0, legY, 0);
    pushPart(longRunnerGeo, 0, runnerY, 0);
    pushPart(grommetGeo, 0, grommetY, 0, true);

    [-1, 1].forEach((sx) => {
      pushPart(legGeo, cornerX * sx, legY, 0);
      pushPart(sideRunnerGeo, cornerX * sx, sideRunnerY, 0);
      pushPart(grommetGeo, grommetX * sx, grommetY, 0, true);
    });

    [-1, 1].forEach((sz) => {
      pushPart(legGeo, 0, legY, cornerZ * sz);
      pushPart(longRunnerGeo, 0, runnerY, cornerZ * sz);
      pushPart(grommetGeo, 0, grommetY, grommetZ * sz, true);
    });

    // คืน memory ของ template geometry ที่สร้างในเมธอดนี้
    legGeo.dispose();
    sideRunnerGeo.dispose();
    edges.dispose();

    const plasticMerged = mergeGeometries(plasticGeometries, false);
    const rubberMerged = mergeGeometries(rubberGeometries, false);
    plasticGeometries.forEach((g) => g.dispose());
    rubberGeometries.forEach((g) => g.dispose());

    if (plasticMerged) {
      this.plasticMesh = new THREE.Mesh(plasticMerged, this.material);
      this.plasticMesh.castShadow = true;
      this.plasticMesh.receiveShadow = true;
      this.add(this.plasticMesh);
    }

    if (rubberMerged) {
      this.rubberMesh = new THREE.Mesh(rubberMerged, this.rubberMaterial);
      this.rubberMesh.castShadow = true;
      this.rubberMesh.receiveShadow = true;
      this.add(this.rubberMesh);
    }
  }

  setWireframe(enabled) {
    this.material.wireframe = enabled;
    this.rubberMaterial.wireframe = enabled;
    if (this.topDeckWireframe) this.topDeckWireframe.visible = enabled;
  }
}
