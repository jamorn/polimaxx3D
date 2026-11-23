import * as THREE from "three";

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

    this.material = new THREE.MeshStandardMaterial({
      color: this.color,
      roughness: 0.4,
      metalness: 0.12,
    });

    this.rubberMaterial = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.9,
      metalness: 0.05,
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
      legGeo: new THREE.BoxGeometry(0.145, legH, 0.235),
      longRunnerGeo: new THREE.BoxGeometry(w, botH, 0.235),
      sideRunnerGeo: new THREE.BoxGeometry(0.145, botH, d),
      grommetGeo: new THREE.CylinderGeometry(
        grommetRadius,
        grommetRadius,
        grommetHeight,
        20,
      ),
    };
  }

  buildSymmetrical() {
    const {
      dims,
      topDeckGeo,
      legGeo,
      longRunnerGeo,
      sideRunnerGeo,
      grommetGeo,
    } = PolimaxxPallet.sharedResources;

    const topDeck = this.createPart(topDeckGeo, 0, dims.h - dims.topH / 2, 0);
    this.add(topDeck);

    const edges = new THREE.EdgesGeometry(topDeckGeo);
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x3b82f6,
      transparent: true,
      opacity: 0.4,
    });
    const wireframe = new THREE.LineSegments(edges, lineMat);
    wireframe.visible = false;
    topDeck.add(wireframe);
    this.topDeckWireframe = wireframe;

    const legY = dims.botH + dims.legH / 2;
    const cornerX = dims.w / 2 - 0.145 / 2;
    const cornerZ = dims.d / 2 - 0.235 / 2;

    const grommetY = dims.h - dims.grommetHeight / 2 + 0.002;
    const grommetX = dims.w / 2 - 0.18;
    const grommetZ = dims.d / 2 - 0.16;

    const quadrants = [
      [1, 1],
      [-1, 1],
      [1, -1],
      [-1, -1],
    ];

    quadrants.forEach(([sx, sz]) => {
      this.add(this.createPart(legGeo, cornerX * sx, legY, cornerZ * sz));
      this.add(
        this.createPart(
          grommetGeo,
          grommetX * sx,
          grommetY,
          grommetZ * sz,
          this.rubberMaterial,
        ),
      );
    });

    const runnerY = dims.botH / 2;

    this.add(this.createPart(legGeo, 0, legY, 0));
    this.add(this.createPart(longRunnerGeo, 0, runnerY, 0));
    this.add(this.createPart(grommetGeo, 0, grommetY, 0, this.rubberMaterial));

    [-1, 1].forEach((sx) => {
      this.add(this.createPart(legGeo, cornerX * sx, legY, 0));
      this.add(this.createPart(sideRunnerGeo, cornerX * sx, runnerY, 0));
      this.add(
        this.createPart(
          grommetGeo,
          grommetX * sx,
          grommetY,
          0,
          this.rubberMaterial,
        ),
      );
    });

    [-1, 1].forEach((sz) => {
      this.add(this.createPart(legGeo, 0, legY, cornerZ * sz));
      this.add(this.createPart(longRunnerGeo, 0, runnerY, cornerZ * sz));
      this.add(
        this.createPart(
          grommetGeo,
          0,
          grommetY,
          grommetZ * sz,
          this.rubberMaterial,
        ),
      );
    });
  }

  createPart(geometry, x, y, z, customMaterial = this.material) {
    const mesh = new THREE.Mesh(geometry, customMaterial);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  setWireframe(enabled) {
    this.material.wireframe = enabled;
    this.rubberMaterial.wireframe = enabled;
    if (this.topDeckWireframe) this.topDeckWireframe.visible = enabled;
  }
}
