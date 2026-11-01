import * as THREE from "three";
import { CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";

import {
  BASE_BAG,
  CONFIG,
  DEFAULT_GAPS,
  DEFAULT_SIDE_LABEL,
  DEFAULT_Z_OFFSETS_MM,
  FRONT_ROW_MARGIN,
  MANUAL_PRESET_BAG,
  ROW_WALL_GAP,
  SHAPE_REFERENCE,
  TOTAL_LAYERS,
} from "./polimaxx_config.js";
import { PolimaxxBag } from "./polimaxx_bag.js";
import { PolimaxxTextureFactory } from "./polimaxx_texture_factory.js";

export function createPolimaxxStack(sceneManager, state) {
  const scene = sceneManager.getScene();
  const gridHelper = sceneManager.getGridHelper();
  const palletW = CONFIG.PALLET.WIDTH;
  const palletD = CONFIG.PALLET.DEPTH;
  const SIDE_DECAL_KEY = "sideDecal";

  function getScaledFrontBulgeZ() {
    return (
      SHAPE_REFERENCE.FRONT_BULGE_Z * (state.bagLength / SHAPE_REFERENCE.LENGTH)
    );
  }

  function getScaledSideBulgeX() {
    return (
      SHAPE_REFERENCE.SIDE_BULGE_X * (state.bagWidth / SHAPE_REFERENCE.WIDTH)
    );
  }

  function getBagCenterY() {
    return state.bagHeight / 2;
  }

  function getBagHalfSpanX(rotationY = 0) {
    const localHalfX = state.bagWidth / 2 + getScaledSideBulgeX();
    const localHalfZ = state.bagLength / 2 + getScaledFrontBulgeZ();
    const cosY = Math.abs(Math.cos(rotationY));
    const sinY = Math.abs(Math.sin(rotationY));
    return localHalfX * cosY + localHalfZ * sinY;
  }

  function getBagHalfSpanZ(rotationY = 0) {
    const localHalfX = state.bagWidth / 2 + getScaledSideBulgeX();
    const localHalfZ = state.bagLength / 2 + getScaledFrontBulgeZ();
    const cosY = Math.abs(Math.cos(rotationY));
    const sinY = Math.abs(Math.sin(rotationY));
    return localHalfZ * cosY + localHalfX * sinY;
  }

  function getFrontRowHalfDepth() {
    return state.bagLength / 2 + getScaledFrontBulgeZ();
  }

  function getRearRowHalfDepth() {
    return state.bagWidth / 2 + getScaledSideBulgeX();
  }

  function getRowGapBounds() {
    return {
      min: 0,
      max: Math.max(
        0,
        palletD / 2 - (rowAnchors.backZ + getRearRowHalfDepth()),
      ),
    };
  }

  function normalizeRowGap(value) {
    const { min, max } = getRowGapBounds();
    return min > max ? min : THREE.MathUtils.clamp(value, min, max);
  }

  const rowAnchors = {
    frontZ: -palletD / 2 + getFrontRowHalfDepth() + FRONT_ROW_MARGIN,
    dividerZ:
      -palletD / 2 +
      getFrontRowHalfDepth() +
      FRONT_ROW_MARGIN +
      getFrontRowHalfDepth() +
      ROW_WALL_GAP / 2,
    backZ:
      -palletD / 2 +
      getFrontRowHalfDepth() +
      FRONT_ROW_MARGIN +
      getFrontRowHalfDepth() +
      ROW_WALL_GAP +
      getRearRowHalfDepth(),
  };

  const frontXGap = DEFAULT_GAPS.front;
  const backXGap = DEFAULT_GAPS.rear;
  const bagPositions = [
    {
      label: 5,
      x: -frontXGap,
      z: rowAnchors.frontZ,
      rot: Math.PI,
      desc: "ถุง 5 (หน้าซ้าย)",
    },
    {
      label: 4,
      x: frontXGap,
      z: rowAnchors.frontZ,
      rot: Math.PI,
      desc: "ถุง 4 (หน้าขวา)",
    },
    {
      label: 3,
      x: -backXGap,
      z: rowAnchors.backZ,
      rot: THREE.MathUtils.degToRad(270),
      desc: "ถุง 3 (หลังซ้าย)",
    },
    {
      label: 2,
      x: 0,
      z: rowAnchors.backZ,
      rot: Math.PI / 2,
      desc: "ถุง 2 (หลังกลาง)",
    },
    {
      label: 1,
      x: backXGap,
      z: rowAnchors.backZ,
      rot: Math.PI / 2,
      desc: "ถุง 1 (หลังขวา)",
    },
  ];

  const bag = new PolimaxxBag(
    state,
    state.bagWidth,
    state.bagLength,
    state.bagHeight,
  );
  const bags = bagPositions.map((position) =>
    bag.createInstance(
      position.x,
      getBagCenterY(),
      position.z,
      position.rot,
      position.label,
    ),
  );
  const bagByLabel = {};
  const stackedLayerBags = [];
  const walls = [];
  const bagLabels = [];

  bags.forEach((mesh, index) => {
    mesh.userData.layer = 1;
    mesh.userData.layerIndex = index;
    mesh.userData.sourceLabel = mesh.userData.label;
    scene.add(mesh);
    bagByLabel[mesh.userData.label] = mesh;
  });

  function createBagSideDecalMaterial(frontTexture = bag.textures.front) {
    return new THREE.MeshBasicMaterial({
      map: frontTexture,
      transparent: true,
      alphaTest: 0.08,
      side: THREE.FrontSide,
      depthWrite: false,
      toneMapped: false,
    });
  }

  const BAGS_PER_LAYER = 5;
  const frontTextureCache = new Map();

  function getBagFrontTexture(bagNo) {
    const key = String(bagNo);
    if (!frontTextureCache.has(key)) {
      frontTextureCache.set(
        key,
        PolimaxxTextureFactory.createFrontTexture(DEFAULT_SIDE_LABEL, bagNo),
      );
    }
    return frontTextureCache.get(key);
  }

  function getBagRunningNo(bagMesh) {
    const layer = bagMesh.userData.layer || 1;
    const indexInLayer = bagMesh.userData.layerIndex ?? 0;
    const startNo = DEFAULT_SIDE_LABEL.bagStartNo ?? 1;
    return startNo + (layer - 1) * BAGS_PER_LAYER + indexInLayer;
  }

  function ensureBagFrontTexture(bagMesh) {
    bagMesh.userData.bagNo = getBagRunningNo(bagMesh);
    bagMesh.userData.frontTexture = getBagFrontTexture(bagMesh.userData.bagNo);
    return bagMesh.userData.frontTexture;
  }

  function syncBagSideDecal(bagMesh) {
    if (!bagMesh) return;

    const frontTexture = ensureBagFrontTexture(bagMesh);

    let sideDecal = bagMesh.userData[SIDE_DECAL_KEY];
    if (!sideDecal) {
      sideDecal = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1),
        createBagSideDecalMaterial(frontTexture),
      );
      sideDecal.renderOrder = 10;
      sideDecal.userData.isSideDecal = true;
      bagMesh.add(sideDecal);
      bagMesh.userData[SIDE_DECAL_KEY] = sideDecal;
    }

    const previousGeometry = sideDecal.geometry;
    sideDecal.geometry = new THREE.PlaneGeometry(
      state.bagWidth * 0.84,
      state.bagHeight * 0.36,
    );
    if (previousGeometry) previousGeometry.dispose();

    sideDecal.position.set(
      0,
      state.bagHeight * 0.05,
      state.bagLength / 2 + getScaledFrontBulgeZ() + 0.003,
    );

    if (sideDecal.material?.map !== frontTexture) {
      sideDecal.material.map = frontTexture;
    }
    sideDecal.material.needsUpdate = true;
  }

  function getAllBags() {
    return bags.concat(stackedLayerBags);
  }

  bags.forEach((mesh) => syncBagSideDecal(mesh));

  function normalizeRotationY(angle) {
    return THREE.MathUtils.euclideanModulo(angle, Math.PI * 2);
  }

  function getLayerCenterY(layerIndex) {
    return getBagCenterY() + (layerIndex - 1) * state.bagHeight;
  }

  function getLayer2FrontGroupBaseZ() {
    return -(rowAnchors.backZ + state.gapRows);
  }

  function getLayer2RearGroupBaseZ() {
    return -rowAnchors.frontZ;
  }

  function getLayer2FrontGroupCenterZ() {
    return getLayer2FrontGroupBaseZ() - state.rearRowOffsetMm / 1000;
  }

  function getLayer2RearGroupCenterZ() {
    return getLayer2RearGroupBaseZ() - state.frontRowOffsetMm / 1000;
  }

  function getOddLayerLayout() {
    return [
      {
        sourceLabel: 5,
        x: bagByLabel[5]?.position.x ?? -state.gapFront,
        z: bagByLabel[5]?.position.z ?? rowAnchors.frontZ,
        rot: bagByLabel[5]?.rotation.y ?? Math.PI,
      },
      {
        sourceLabel: 4,
        x: bagByLabel[4]?.position.x ?? state.gapFront,
        z: bagByLabel[4]?.position.z ?? rowAnchors.frontZ,
        rot: bagByLabel[4]?.rotation.y ?? Math.PI,
      },
      {
        sourceLabel: 3,
        x: bagByLabel[3]?.position.x ?? -state.gapMiddle,
        z: bagByLabel[3]?.position.z ?? rowAnchors.backZ + state.gapRows,
        rot: bagByLabel[3]?.rotation.y ?? THREE.MathUtils.degToRad(270),
      },
      {
        sourceLabel: 2,
        x: bagByLabel[2]?.position.x ?? 0,
        z: bagByLabel[2]?.position.z ?? rowAnchors.backZ + state.gapRows,
        rot: bagByLabel[2]?.rotation.y ?? Math.PI / 2,
      },
      {
        sourceLabel: 1,
        x: bagByLabel[1]?.position.x ?? state.gapMiddle,
        z: bagByLabel[1]?.position.z ?? rowAnchors.backZ + state.gapRows,
        rot: bagByLabel[1]?.rotation.y ?? Math.PI / 2,
      },
    ];
  }

  function getLayer2PreviewLayout() {
    const frontThreeZ = getLayer2FrontGroupCenterZ();
    const backTwoZ = getLayer2RearGroupCenterZ();

    return [
      {
        sourceLabel: 3,
        x: bagByLabel[3]?.position.x ?? -state.gapMiddle,
        z: frontThreeZ,
        rot: bagByLabel[3]?.rotation.y ?? THREE.MathUtils.degToRad(270),
      },
      {
        sourceLabel: 2,
        x: bagByLabel[2]?.position.x ?? 0,
        z: frontThreeZ,
        rot: bagByLabel[2]?.rotation.y ?? Math.PI / 2,
      },
      {
        sourceLabel: 1,
        x: bagByLabel[1]?.position.x ?? state.gapMiddle,
        z: frontThreeZ,
        rot: bagByLabel[1]?.rotation.y ?? Math.PI / 2,
      },
      {
        sourceLabel: 5,
        x: bagByLabel[5]?.position.x ?? -state.gapFront,
        z: backTwoZ,
        rot: normalizeRotationY(
          (bagByLabel[5]?.rotation.y ?? Math.PI) + Math.PI,
        ),
      },
      {
        sourceLabel: 4,
        x: bagByLabel[4]?.position.x ?? state.gapFront,
        z: backTwoZ,
        rot: normalizeRotationY(
          (bagByLabel[4]?.rotation.y ?? Math.PI) + Math.PI,
        ),
      },
    ];
  }

  function getLayerLayout(layerIndex) {
    return layerIndex % 2 === 1
      ? getOddLayerLayout()
      : getLayer2PreviewLayout();
  }

  function createStackedLayers() {
    for (let layerIndex = 2; layerIndex <= TOTAL_LAYERS; layerIndex += 1) {
      const layout = getLayerLayout(layerIndex);
      layout.forEach((item, localIndex) => {
        const mesh = bag.createInstance(
          item.x,
          getLayerCenterY(layerIndex),
          item.z,
          item.rot,
          item.sourceLabel,
        );
        mesh.userData.layer = layerIndex;
        mesh.userData.layerIndex = localIndex;
        mesh.userData.sourceLabel = item.sourceLabel;
        syncBagSideDecal(mesh);
        scene.add(mesh);
        stackedLayerBags.push(mesh);
      });
    }
  }

  function syncStackedLayers() {
    if (!stackedLayerBags.length) return;

    let bagOffset = 0;
    for (let layerIndex = 2; layerIndex <= TOTAL_LAYERS; layerIndex += 1) {
      const layout = getLayerLayout(layerIndex);
      layout.forEach((item, localIndex) => {
        const mesh = stackedLayerBags[bagOffset + localIndex];
        if (!mesh) return;
        mesh.position.set(item.x, getLayerCenterY(layerIndex), item.z);
        mesh.rotation.y = item.rot;
        mesh.userData.layer = layerIndex;
        mesh.userData.layerIndex = localIndex;
        mesh.userData.sourceLabel = item.sourceLabel;
        syncBagSideDecal(mesh);
      });
      bagOffset += layout.length;
    }
  }

  createStackedLayers();

  function replaceBagTextures(nextTextures) {
    const previousTextures = {
      top: bag.textures.top,
      front: bag.textures.front,
      blank: bag.textures.blank,
    };

    bag.textures.top = nextTextures.top ?? bag.textures.top;
    bag.textures.front = nextTextures.front ?? bag.textures.front;
    bag.textures.blank = nextTextures.blank ?? bag.textures.blank;

    const updateMaterialSet = (materials) => {
      if (!materials?.length) return;

      if (materials[0]?.color) materials[0].color.set(state.bagColor);
      if (materials[1]?.color) materials[1].color.set(state.bagColor);

      if (materials[2]) {
        materials[2].color.set(0xffffff);
        materials[2].map = bag.textures.top;
        materials[2].needsUpdate = true;
      }

      if (materials[3]) {
        materials[3].color.set(0xffffff);
        materials[3].map = bag.textures.blank;
        materials[3].needsUpdate = true;
      }

      if (materials[4]) {
        materials[4].color.set(state.bagColor);
        materials[4].map = null;
        materials[4].needsUpdate = true;
      }

      if (materials[5]?.color) materials[5].color.set(state.bagColor);
    };

    updateMaterialSet(bag.materials);

    getAllBags().forEach((mesh) => {
      const materials = Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material];
      updateMaterialSet(materials);
      syncBagSideDecal(mesh);
    });

    if (previousTextures.top && previousTextures.top !== bag.textures.top)
      previousTextures.top.dispose();
    if (previousTextures.front && previousTextures.front !== bag.textures.front)
      previousTextures.front.dispose();
    if (previousTextures.blank && previousTextures.blank !== bag.textures.blank)
      previousTextures.blank.dispose();
  }

  function applyBagBodyColor() {
    replaceBagTextures({
      top: PolimaxxTextureFactory.createTopTexture(state.bagColor),
      blank: PolimaxxTextureFactory.createBlankTexture(state.bagColor),
    });
  }

  const palletGeo = new THREE.BoxGeometry(
    CONFIG.PALLET.WIDTH,
    CONFIG.PALLET.HEIGHT,
    CONFIG.PALLET.DEPTH,
  );
  const palletMat = new THREE.MeshStandardMaterial({
    color: CONFIG.COLORS.PALLET,
    transparent: true,
    opacity: state.palletOpacity,
    wireframe: false,
  });
  const pallet = new THREE.Mesh(palletGeo, palletMat);
  pallet.position.set(0, -CONFIG.PALLET.HEIGHT / 2, 0);
  pallet.receiveShadow = true;
  pallet.castShadow = true;
  scene.add(pallet);

  const edgeMaterial = new THREE.LineBasicMaterial({ color: 0xffaa00 });
  const edges = new THREE.EdgesGeometry(palletGeo);
  const wireframe = new THREE.LineSegments(edges, edgeMaterial);
  wireframe.position.copy(pallet.position);
  scene.add(wireframe);

  function setPalletVisible(visible) {
    state.showPallet = visible;
    pallet.visible = visible;
  }

  function setPalletOpacity(opacity) {
    state.palletOpacity = opacity;
    pallet.material.opacity = opacity;
  }

  function setPalletColor(color) {
    state.palletColor = color;
    pallet.material.color.set(color);
  }

  function setWireframeVisible(visible) {
    wireframe.visible = visible;
  }

  const wallHeight = BASE_BAG.HEIGHT;
  const wallThick = 0.001;
  const yCenter = wallHeight / 2;

  function getWidthSpanFactor() {
    return 1 + (2 * SHAPE_REFERENCE.SIDE_BULGE_X) / SHAPE_REFERENCE.WIDTH;
  }

  function getLengthSpanFactor() {
    return 1 + (2 * SHAPE_REFERENCE.FRONT_BULGE_Z) / SHAPE_REFERENCE.LENGTH;
  }

  function getIdealFrontGap() {
    return (palletW + wallThick) / 4;
  }

  function getIdealRearGap() {
    return (palletW + wallThick) / 3;
  }

  function getPackedBagDimensions(clearance = 0.005) {
    let frontSpan = (palletW - wallThick) / 2 - clearance;
    let rearSpan = (palletW - 2 * wallThick) / 3 - clearance;
    const depthBudget = palletD - ROW_WALL_GAP - clearance;

    if (frontSpan + rearSpan > depthBudget) {
      const overflow = frontSpan + rearSpan - depthBudget;
      const totalSpan = frontSpan + rearSpan;
      frontSpan -= overflow * (frontSpan / totalSpan);
      rearSpan -= overflow * (rearSpan / totalSpan);
    }

    const width = frontSpan / getWidthSpanFactor();
    const length = rearSpan / getLengthSpanFactor();
    const widthScale = width / BASE_BAG.WIDTH;
    const lengthScale = length / BASE_BAG.LENGTH;
    const height = BASE_BAG.HEIGHT * Math.sqrt(widthScale * lengthScale);
    return { width, length, height };
  }

  function getFrontPartitionDepth() {
    return getFrontRowHalfDepth() * 2;
  }

  function getRearPartitionDepth() {
    return getRearRowHalfDepth() * 2;
  }

  function getDividerWidth() {
    return Math.max(0.2, palletW - 0.02);
  }

  function refreshWallGeometries() {
    if (!walls.length) return;

    const nextGeometries = [
      new THREE.BoxGeometry(wallThick, wallHeight, getFrontPartitionDepth()),
      new THREE.BoxGeometry(wallThick, wallHeight, getRearPartitionDepth()),
      new THREE.BoxGeometry(wallThick, wallHeight, getRearPartitionDepth()),
      new THREE.BoxGeometry(getDividerWidth(), wallHeight, wallThick),
    ];

    walls.forEach((wallMesh, index) => {
      const previousGeometry = wallMesh.geometry;
      wallMesh.geometry = nextGeometries[index];
      if (previousGeometry) previousGeometry.dispose();
    });
  }

  const wallMaterial = new THREE.MeshStandardMaterial({
    color: state.wallColor,
    transparent: true,
    opacity: state.wallOpacity,
    side: THREE.DoubleSide,
    emissive: 0x222222,
  });

  let wall = new THREE.Mesh(
    new THREE.BoxGeometry(wallThick, wallHeight, getFrontPartitionDepth()),
    wallMaterial.clone(),
  );
  wall.position.set(0, yCenter, rowAnchors.frontZ);
  walls.push(wall);
  scene.add(wall);

  wall = new THREE.Mesh(
    new THREE.BoxGeometry(wallThick, wallHeight, getRearPartitionDepth()),
    wallMaterial.clone(),
  );
  wall.position.set(-backXGap / 2, yCenter, rowAnchors.backZ);
  walls.push(wall);
  scene.add(wall);

  wall = new THREE.Mesh(
    new THREE.BoxGeometry(wallThick, wallHeight, getRearPartitionDepth()),
    wallMaterial.clone(),
  );
  wall.position.set(backXGap / 2, yCenter, rowAnchors.backZ);
  walls.push(wall);
  scene.add(wall);

  wall = new THREE.Mesh(
    new THREE.BoxGeometry(getDividerWidth(), wallHeight, wallThick),
    wallMaterial.clone(),
  );
  wall.position.set(0, yCenter, rowAnchors.dividerZ);
  walls.push(wall);
  scene.add(wall);

  function setWallsVisible(visible) {
    state.showWalls = visible;
    walls.forEach((wallMesh) => {
      wallMesh.visible = visible;
    });
  }

  function toggleWalls() {
    setWallsVisible(!state.showWalls);
  }

  function setWallOpacity(opacity) {
    state.wallOpacity = opacity;
    walls.forEach((wallMesh) => {
      wallMesh.material.opacity = opacity;
    });
  }

  function setWallColor(color) {
    state.wallColor = color;
    walls.forEach((wallMesh) => {
      wallMesh.material.color.set(color);
    });
  }

  function syncBaseRowAnchors() {
    rowAnchors.frontZ =
      -palletD / 2 + getFrontRowHalfDepth() + FRONT_ROW_MARGIN;
    rowAnchors.dividerZ =
      rowAnchors.frontZ + getFrontRowHalfDepth() + ROW_WALL_GAP / 2;
    rowAnchors.backZ =
      rowAnchors.frontZ +
      getFrontRowHalfDepth() +
      ROW_WALL_GAP +
      getRearRowHalfDepth();

    if (walls[3]) {
      walls[3].position.z = rowAnchors.dividerZ;
    }

    [5, 4].forEach((label) => {
      const initial = bagPositions.find((position) => position.label === label);
      if (initial) initial.z = rowAnchors.frontZ;
    });

    [3, 2, 1].forEach((label) => {
      const initial = bagPositions.find((position) => position.label === label);
      if (initial) initial.z = rowAnchors.backZ;
    });
  }

  function attachBagLabel(bagMesh, text) {
    const labelElement = document.createElement("div");
    labelElement.className = "bag-label";
    labelElement.textContent = text;

    const label = new CSS2DObject(labelElement);
    label.userData.parentBag = bagMesh;
    bagMesh.add(label);
    bagLabels.push(label);
  }

  function getBagLabelText(bagMesh) {
    return bagMesh.userData.layer > 1
      ? `${bagMesh.userData.layer}-${bagMesh.userData.sourceLabel}`
      : String(bagMesh.userData.label);
  }

  getAllBags().forEach((bagMesh) => {
    attachBagLabel(bagMesh, getBagLabelText(bagMesh));
  });

  function getDimensionParams() {
    return {
      width_mm: Math.round(state.bagWidth * 1000),
      length_mm: Math.round(state.bagLength * 1000),
      height_mm: Math.round(state.bagHeight * 1000),
    };
  }

  function getFrontGroupCenterX() {
    if (walls[0]) return walls[0].position.x;
    const frontLeftX = bagByLabel[5]?.position.x;
    const frontRightX = bagByLabel[4]?.position.x;
    if (frontLeftX != null && frontRightX != null) {
      return (frontLeftX + frontRightX) / 2;
    }
    return 0;
  }

  function getRearGroupCenterX() {
    if (bagByLabel[2]) return bagByLabel[2].position.x;
    const leftRearWallX = walls[1]?.position.x;
    const rightRearWallX = walls[2]?.position.x;
    if (leftRearWallX != null && rightRearWallX != null) {
      return (leftRearWallX + rightRearWallX) / 2;
    }
    return 0;
  }

  function getFrontGroupOffsetsFromCenter() {
    const centerX = getFrontGroupCenterX();
    return {
      left: centerX - (bagByLabel[5]?.position.x ?? centerX),
      right: (bagByLabel[4]?.position.x ?? centerX) - centerX,
    };
  }

  function getRearGroupOffsetsFromCenter() {
    const centerX = getRearGroupCenterX();
    return {
      left: centerX - (bagByLabel[3]?.position.x ?? centerX),
      right: (bagByLabel[1]?.position.x ?? centerX) - centerX,
    };
  }

  function getRelativeCenterBounds(targets, centerX = 0) {
    const offsets = targets
      .map((target) => target?.position?.x)
      .filter((positionX) => positionX != null)
      .map((positionX) => positionX - centerX);

    if (!offsets.length) {
      return { min: -palletW / 2, max: palletW / 2 };
    }

    return {
      min: Math.max(...offsets.map((offsetX) => -palletW / 2 - offsetX)),
      max: Math.min(...offsets.map((offsetX) => palletW / 2 - offsetX)),
    };
  }

  function getFrontGroupBounds() {
    const offsets = getFrontGroupOffsetsFromCenter();
    const leftHalfSpan = getBagHalfSpanX(bagByLabel[5]?.rotation.y ?? Math.PI);
    const rightHalfSpan = getBagHalfSpanX(bagByLabel[4]?.rotation.y ?? Math.PI);

    const strictBounds = {
      min: -palletW / 2 + leftHalfSpan + offsets.left,
      max: palletW / 2 - rightHalfSpan - offsets.right,
    };

    if (strictBounds.min <= strictBounds.max) {
      return strictBounds;
    }

    return getRelativeCenterBounds(
      [bagByLabel[5], bagByLabel[4], walls[0]],
      getFrontGroupCenterX(),
    );
  }

  function normalizeFrontGroupCenter(value) {
    const { min, max } = getFrontGroupBounds();
    return min > max ? (min + max) / 2 : THREE.MathUtils.clamp(value, min, max);
  }

  function getRearGroupBounds() {
    const offsets = getRearGroupOffsetsFromCenter();
    const leftHalfSpan = getBagHalfSpanX(
      bagByLabel[3]?.rotation.y ?? THREE.MathUtils.degToRad(270),
    );
    const centerHalfSpan = getBagHalfSpanX(
      bagByLabel[2]?.rotation.y ?? Math.PI / 2,
    );
    const rightHalfSpan = getBagHalfSpanX(
      bagByLabel[1]?.rotation.y ?? Math.PI / 2,
    );

    const strictBounds = {
      min: Math.max(
        -palletW / 2 + leftHalfSpan + offsets.left,
        -palletW / 2 + centerHalfSpan,
      ),
      max: Math.min(
        palletW / 2 - rightHalfSpan - offsets.right,
        palletW / 2 - centerHalfSpan,
      ),
    };

    if (strictBounds.min <= strictBounds.max) {
      return strictBounds;
    }

    return getRelativeCenterBounds(
      [bagByLabel[3], bagByLabel[2], bagByLabel[1], walls[1], walls[2]],
      getRearGroupCenterX(),
    );
  }

  function normalizeRearGroupCenter(value) {
    const { min, max } = getRearGroupBounds();
    return min > max ? (min + max) / 2 : THREE.MathUtils.clamp(value, min, max);
  }

  function getBagXBounds(label, rotationY = 0) {
    const halfBagX = getBagHalfSpanX(rotationY);
    const minEdge = -palletW / 2 + halfBagX;
    const maxEdge = palletW / 2 - halfBagX;
    const frontWallX = walls[0]?.position.x ?? 0;
    const leftRearWallX = walls[1].position.x;
    const rightRearWallX = walls[2].position.x;

    switch (label) {
      case 5:
        return { min: minEdge, max: frontWallX - wallThick / 2 - halfBagX };
      case 4:
        return { min: frontWallX + wallThick / 2 + halfBagX, max: maxEdge };
      case 3:
        return { min: minEdge, max: leftRearWallX - wallThick / 2 - halfBagX };
      case 2:
        return {
          min: leftRearWallX + wallThick / 2 + halfBagX,
          max: rightRearWallX - wallThick / 2 - halfBagX,
        };
      case 1:
        return { min: rightRearWallX + wallThick / 2 + halfBagX, max: maxEdge };
      default:
        return { min: minEdge, max: maxEdge };
    }
  }

  function clampBagXPosition(label, value, rotationY = 0) {
    const { min, max } = getBagXBounds(label, rotationY);
    return min > max ? (min + max) / 2 : THREE.MathUtils.clamp(value, min, max);
  }

  function getFrontGapBounds() {
    const frontCenterX = getFrontGroupCenterX();
    const leftHalfSpan = getBagHalfSpanX(bagByLabel[5]?.rotation.y ?? Math.PI);
    const rightHalfSpan = getBagHalfSpanX(bagByLabel[4]?.rotation.y ?? Math.PI);
    const minFrontGap = wallThick / 2 + Math.max(leftHalfSpan, rightHalfSpan);
    return {
      min: minFrontGap,
      max: Math.min(
        frontCenterX - (-palletW / 2 + leftHalfSpan),
        palletW / 2 - rightHalfSpan - frontCenterX,
      ),
    };
  }

  function normalizeFrontGap(value) {
    const { min, max } = getFrontGapBounds();
    return min > max ? (min + max) / 2 : THREE.MathUtils.clamp(value, min, max);
  }

  function getRearGapBounds() {
    const rearCenterX = getRearGroupCenterX();
    const leftHalfSpan = getBagHalfSpanX(
      bagByLabel[3]?.rotation.y ?? THREE.MathUtils.degToRad(270),
    );
    const centerHalfSpan = getBagHalfSpanX(
      bagByLabel[2]?.rotation.y ?? Math.PI / 2,
    );
    const rightHalfSpan = getBagHalfSpanX(
      bagByLabel[1]?.rotation.y ?? Math.PI / 2,
    );
    const minRearGap =
      wallThick + 2 * Math.max(leftHalfSpan, centerHalfSpan, rightHalfSpan);
    return {
      min: minRearGap,
      max: Math.min(
        rearCenterX - (-palletW / 2 + leftHalfSpan),
        palletW / 2 - rightHalfSpan - rearCenterX,
      ),
    };
  }

  function normalizeRearGap(value) {
    const { min, max } = getRearGapBounds();
    return min > max ? (min + max) / 2 : THREE.MathUtils.clamp(value, min, max);
  }

  function getFrontGroupCenterZ() {
    if (walls[0]) return walls[0].position.z;
    return (
      bagByLabel[4]?.position.z ??
      bagByLabel[5]?.position.z ??
      rowAnchors.frontZ
    );
  }

  function getRearGroupCenterZ() {
    if (bagByLabel[2]) return bagByLabel[2].position.z;
    return (
      bagByLabel[1]?.position.z ?? bagByLabel[3]?.position.z ?? rowAnchors.backZ
    );
  }

  function getFrontGroupBaseZ() {
    return rowAnchors.frontZ;
  }

  function getRearGroupBaseZ() {
    return rowAnchors.backZ + state.gapRows;
  }

  function getFrontGroupOffsetZMm() {
    return Math.round((getFrontGroupCenterZ() - getFrontGroupBaseZ()) * 1000);
  }

  function getRearGroupOffsetZMm() {
    return Math.round((getRearGroupCenterZ() - getRearGroupBaseZ()) * 1000);
  }

  function syncRowOffsetState() {
    state.frontRowOffsetMm = getFrontGroupOffsetZMm();
    state.rearRowOffsetMm = getRearGroupOffsetZMm();
  }

  function intersectBounds(primaryBounds, secondaryBounds) {
    return {
      min: Math.max(primaryBounds.min, secondaryBounds.min),
      max: Math.min(primaryBounds.max, secondaryBounds.max),
    };
  }

  function normalizeOffsetMm(value, bounds) {
    return bounds.min > bounds.max
      ? Math.round((bounds.min + bounds.max) / 2)
      : THREE.MathUtils.clamp(value, bounds.min, bounds.max);
  }

  function toOffsetBoundsMm(bounds, baseZ) {
    return {
      min: Math.round((bounds.min - baseZ) * 1000),
      max: Math.round((bounds.max - baseZ) * 1000),
    };
  }

  function toMirroredOffsetBoundsMm(bounds, baseZ) {
    return {
      min: Math.round((baseZ - bounds.max) * 1000),
      max: Math.round((baseZ - bounds.min) * 1000),
    };
  }

  function getFrontGroupHalfSpanZ() {
    return Math.max(
      getBagHalfSpanZ(bagByLabel[4]?.rotation.y ?? Math.PI),
      getBagHalfSpanZ(bagByLabel[5]?.rotation.y ?? Math.PI),
    );
  }

  function getRearGroupHalfSpanZ() {
    return Math.max(
      getBagHalfSpanZ(bagByLabel[1]?.rotation.y ?? Math.PI / 2),
      getBagHalfSpanZ(bagByLabel[2]?.rotation.y ?? Math.PI / 2),
      getBagHalfSpanZ(
        bagByLabel[3]?.rotation.y ?? THREE.MathUtils.degToRad(270),
      ),
    );
  }

  function syncDividerWallZ() {
    if (!walls[3]) return;
    const frontLimitZ = getFrontGroupCenterZ() + getFrontGroupHalfSpanZ();
    const rearLimitZ = getRearGroupCenterZ() - getRearGroupHalfSpanZ();
    walls[3].position.z = (frontLimitZ + rearLimitZ) / 2;
  }

  function getFrontGroupZBounds() {
    const frontHalfSpanZ = getFrontGroupHalfSpanZ();
    const rearHalfSpanZ = getRearGroupHalfSpanZ();
    const rearCenterZ = getRearGroupCenterZ();
    return {
      min: -palletD / 2 + frontHalfSpanZ,
      max: Math.min(
        palletD / 2 - frontHalfSpanZ,
        rearCenterZ - rearHalfSpanZ - ROW_WALL_GAP - frontHalfSpanZ,
      ),
    };
  }

  function normalizeFrontGroupCenterZ(value) {
    const { min, max } = getFrontGroupZBounds();
    return min > max ? (min + max) / 2 : THREE.MathUtils.clamp(value, min, max);
  }

  function getRearGroupZBounds() {
    const frontHalfSpanZ = getFrontGroupHalfSpanZ();
    const rearHalfSpanZ = getRearGroupHalfSpanZ();
    const frontCenterZ = getFrontGroupCenterZ();
    return {
      min: Math.max(
        -palletD / 2 + rearHalfSpanZ,
        frontCenterZ + frontHalfSpanZ + ROW_WALL_GAP + rearHalfSpanZ,
      ),
      max: palletD / 2 - rearHalfSpanZ,
    };
  }

  function normalizeRearGroupCenterZ(value) {
    const { min, max } = getRearGroupZBounds();
    return min > max ? (min + max) / 2 : THREE.MathUtils.clamp(value, min, max);
  }

  function getLayer2FrontGroupZBounds() {
    const frontHalfSpanZ = getRearGroupHalfSpanZ();
    const rearHalfSpanZ = getFrontGroupHalfSpanZ();
    const rearCenterZ = getLayer2RearGroupCenterZ();
    return {
      min: -palletD / 2 + frontHalfSpanZ,
      max: Math.min(
        palletD / 2 - frontHalfSpanZ,
        rearCenterZ - rearHalfSpanZ - ROW_WALL_GAP - frontHalfSpanZ,
      ),
    };
  }

  function getLayer2RearGroupZBounds() {
    const frontHalfSpanZ = getRearGroupHalfSpanZ();
    const rearHalfSpanZ = getFrontGroupHalfSpanZ();
    const frontCenterZ = getLayer2FrontGroupCenterZ();
    return {
      min: Math.max(
        -palletD / 2 + rearHalfSpanZ,
        frontCenterZ + frontHalfSpanZ + ROW_WALL_GAP + rearHalfSpanZ,
      ),
      max: palletD / 2 - rearHalfSpanZ,
    };
  }

  function getSharedFrontGroupOffsetBoundsMm() {
    return intersectBounds(
      toOffsetBoundsMm(getFrontGroupZBounds(), getFrontGroupBaseZ()),
      toMirroredOffsetBoundsMm(
        getLayer2RearGroupZBounds(),
        getLayer2RearGroupBaseZ(),
      ),
    );
  }

  function getSharedRearGroupOffsetBoundsMm() {
    return intersectBounds(
      toOffsetBoundsMm(getRearGroupZBounds(), getRearGroupBaseZ()),
      toMirroredOffsetBoundsMm(
        getLayer2FrontGroupZBounds(),
        getLayer2FrontGroupBaseZ(),
      ),
    );
  }

  function moveFrontGroupZ(value) {
    const nextCenterZ = normalizeFrontGroupCenterZ(value);
    const currentCenterZ = getFrontGroupCenterZ();
    const deltaZ = nextCenterZ - currentCenterZ;
    if (Math.abs(deltaZ) < 1e-6) return;

    if (walls[0]) walls[0].position.z += deltaZ;
    [5, 4].forEach((label) => {
      const bagMesh = bagByLabel[label];
      if (!bagMesh) return;
      bagMesh.position.z += deltaZ;
    });

    syncRowOffsetState();
    syncDividerWallZ();
    updateActiveBagDisplay();
  }

  function moveRearGroupZ(value) {
    const nextCenterZ = normalizeRearGroupCenterZ(value);
    const currentCenterZ = getRearGroupCenterZ();
    const deltaZ = nextCenterZ - currentCenterZ;
    if (Math.abs(deltaZ) < 1e-6) return;

    if (walls[1]) walls[1].position.z += deltaZ;
    if (walls[2]) walls[2].position.z += deltaZ;
    [3, 2, 1].forEach((label) => {
      const bagMesh = bagByLabel[label];
      if (!bagMesh) return;
      bagMesh.position.z += deltaZ;
    });

    syncRowOffsetState();
    syncDividerWallZ();
    updateActiveBagDisplay();
  }

  function moveFrontGroupZByOffsetMm(offsetMm) {
    const nextOffsetMm = normalizeOffsetMm(
      offsetMm,
      getSharedFrontGroupOffsetBoundsMm(),
    );
    moveFrontGroupZ(getFrontGroupBaseZ() + nextOffsetMm / 1000);
  }

  function moveRearGroupZByOffsetMm(offsetMm) {
    const nextOffsetMm = normalizeOffsetMm(
      offsetMm,
      getSharedRearGroupOffsetBoundsMm(),
    );
    moveRearGroupZ(getRearGroupBaseZ() + nextOffsetMm / 1000);
  }

  function updateFrontGap(value) {
    state.gapFront = normalizeFrontGap(value);
    const centerX = getFrontGroupCenterX();

    if (walls[0]) {
      walls[0].position.x = centerX;
    }

    if (bagByLabel[5]) {
      bagByLabel[5].position.x = clampBagXPosition(
        5,
        centerX - state.gapFront,
        bagByLabel[5].rotation.y,
      );
    }

    if (bagByLabel[4]) {
      bagByLabel[4].position.x = clampBagXPosition(
        4,
        centerX + state.gapFront,
        bagByLabel[4].rotation.y,
      );
    }

    updateActiveBagDisplay();
  }

  function updateGapMiddle(value) {
    state.gapMiddle = normalizeRearGap(value);
    const centerX = getRearGroupCenterX();
    walls[1].position.x = centerX - state.gapMiddle / 2;
    walls[2].position.x = centerX + state.gapMiddle / 2;

    if (bagByLabel[2])
      bagByLabel[2].position.x = clampBagXPosition(
        2,
        centerX,
        bagByLabel[2].rotation.y,
      );
    if (bagByLabel[1])
      bagByLabel[1].position.x = clampBagXPosition(
        1,
        centerX + state.gapMiddle,
        bagByLabel[1].rotation.y,
      );
    if (bagByLabel[3])
      bagByLabel[3].position.x = clampBagXPosition(
        3,
        centerX - state.gapMiddle,
        bagByLabel[3].rotation.y,
      );

    updateActiveBagDisplay();
  }

  function updateGapRows(value) {
    const frontOffsetMm = state.frontRowOffsetMm;
    const rearOffsetMm = state.rearRowOffsetMm;
    state.gapRows = normalizeRowGap(value);

    [5, 4].forEach((label) => {
      const bagMesh = bagByLabel[label];
      if (!bagMesh) return;
      const initialZ = bagPositions.find(
        (position) => position.label === label,
      )?.z;
      if (initialZ != null) bagMesh.position.z = initialZ;
    });

    [3, 2, 1].forEach((label) => {
      const bagMesh = bagByLabel[label];
      if (!bagMesh) return;
      const initialZ = bagPositions.find(
        (position) => position.label === label,
      )?.z;
      if (initialZ != null) bagMesh.position.z = initialZ + state.gapRows;
    });

    walls[0].position.z = rowAnchors.frontZ;
    walls[1].position.z = rowAnchors.backZ + state.gapRows;
    walls[2].position.z = rowAnchors.backZ + state.gapRows;
    syncDividerWallZ();
    moveFrontGroupZByOffsetMm(frontOffsetMm);
    moveRearGroupZByOffsetMm(rearOffsetMm);
    updateActiveBagDisplay();
  }

  function updateActiveBagDisplay() {
    syncStackedLayers();
    updateLabelPositions();
  }

  function applyBagDimensions() {
    const previousGeometry = bag.geometry;
    const nextGeometry = bag.setDimensions(
      state.bagWidth,
      state.bagLength,
      state.bagHeight,
    );

    syncBaseRowAnchors();
    refreshWallGeometries();
    getAllBags().forEach((bagMesh) => {
      bagMesh.geometry = nextGeometry;
      bagMesh.position.y = getLayerCenterY(bagMesh.userData.layer || 1);
      syncBagSideDecal(bagMesh);
    });

    walls.forEach((wallMesh) => {
      wallMesh.scale.y = state.bagHeight / BASE_BAG.HEIGHT;
      wallMesh.position.y = getBagCenterY();
    });

    updateFrontGap(state.gapFront);
    updateGapMiddle(state.gapMiddle);
    updateGapRows(state.gapRows);

    if (previousGeometry && previousGeometry !== nextGeometry) {
      previousGeometry.dispose();
    }
  }

  function getTopVisibleLayer() {
    return getAllBags().reduce((topLayer, bagMesh) => {
      if (!bagMesh.visible) return topLayer;
      return Math.max(topLayer, bagMesh.userData.layer || 1);
    }, 0);
  }

  function updateLabelPositions() {
    const topVisibleLayer = getTopVisibleLayer();
    bagLabels.forEach((label) => {
      const parentBag = label.userData.parentBag;
      label.position.set(0, state.bagHeight * 0.72, 0);
      label.visible = Boolean(
        state.showLabels &&
        parentBag &&
        parentBag.visible &&
        (parentBag.userData.layer || 1) === topVisibleLayer,
      );
    });
  }

  function updateLayerVisibility() {
    getAllBags().forEach((bagMesh) => {
      bagMesh.visible =
        (bagMesh.userData.layer || 1) <= state.visibleLayerCount;
    });
    updateLabelPositions();
  }

  function setVisibleLayerCount(value) {
    state.visibleLayerCount = THREE.MathUtils.clamp(
      Math.round(value),
      1,
      TOTAL_LAYERS,
    );
    updateLayerVisibility();
  }

  function setLabelsVisible(visible) {
    state.showLabels = visible;
    updateLabelPositions();
  }

  function setGridVisible(visible) {
    state.showGrid = visible;
    gridHelper.visible = visible;
  }

  function setGroupCenters(frontCenterX = 0, rearCenterX = 0) {
    if (walls[0]) walls[0].position.x = frontCenterX;
    if (bagByLabel[2]) bagByLabel[2].position.x = rearCenterX;
    if (walls[1]) walls[1].position.x = rearCenterX - state.gapMiddle / 2;
    if (walls[2]) walls[2].position.x = rearCenterX + state.gapMiddle / 2;
  }

  function applyPackedFootprint() {
    const packed = getPackedBagDimensions();
    state.bagWidth = packed.width;
    state.bagLength = packed.length;
    state.bagHeight = packed.height;
    state.gapRows = 0;
    state.gapFront = getIdealFrontGap();
    state.gapMiddle = getIdealRearGap();

    const frontLeft = bagPositions.find((position) => position.label === 5);
    const frontRight = bagPositions.find((position) => position.label === 4);
    const rearLeft = bagPositions.find((position) => position.label === 3);
    const rearCenter = bagPositions.find((position) => position.label === 2);
    const rearRight = bagPositions.find((position) => position.label === 1);

    if (frontLeft) frontLeft.x = -state.gapFront;
    if (frontRight) frontRight.x = state.gapFront;
    if (rearLeft) rearLeft.x = -state.gapMiddle;
    if (rearCenter) rearCenter.x = 0;
    if (rearRight) rearRight.x = state.gapMiddle;

    setGroupCenters(0, 0);
    applyBagDimensions();
    state.frontRowOffsetMm = DEFAULT_Z_OFFSETS_MM.front;
    state.rearRowOffsetMm = DEFAULT_Z_OFFSETS_MM.rear;
    moveFrontGroupZByOffsetMm(state.frontRowOffsetMm);
    moveRearGroupZByOffsetMm(state.rearRowOffsetMm);
    updateLayerVisibility();
  }

  function applyManualPreset() {
    state.bagWidth = MANUAL_PRESET_BAG.WIDTH;
    state.bagLength = MANUAL_PRESET_BAG.LENGTH;
    state.bagHeight = MANUAL_PRESET_BAG.HEIGHT;
    state.gapRows = DEFAULT_GAPS.rows;
    state.gapFront = DEFAULT_GAPS.front;
    state.gapMiddle = DEFAULT_GAPS.rear;

    const frontLeft = bagPositions.find((position) => position.label === 5);
    const frontRight = bagPositions.find((position) => position.label === 4);
    const rearLeft = bagPositions.find((position) => position.label === 3);
    const rearCenter = bagPositions.find((position) => position.label === 2);
    const rearRight = bagPositions.find((position) => position.label === 1);

    if (frontLeft) frontLeft.x = -DEFAULT_GAPS.front;
    if (frontRight) frontRight.x = DEFAULT_GAPS.front;
    if (rearLeft) rearLeft.x = -DEFAULT_GAPS.rear;
    if (rearCenter) rearCenter.x = 0;
    if (rearRight) rearRight.x = DEFAULT_GAPS.rear;

    setGroupCenters(0, 0);
    applyBagDimensions();
    state.frontRowOffsetMm = DEFAULT_Z_OFFSETS_MM.front;
    state.rearRowOffsetMm = DEFAULT_Z_OFFSETS_MM.rear;
    moveFrontGroupZByOffsetMm(state.frontRowOffsetMm);
    moveRearGroupZByOffsetMm(state.rearRowOffsetMm);
    updateLayerVisibility();
  }

  function getFrontOffsetBoundsMm() {
    return getSharedFrontGroupOffsetBoundsMm();
  }

  function getRearOffsetBoundsMm() {
    return getSharedRearGroupOffsetBoundsMm();
  }

  function getBagByLabel(label) {
    return bagByLabel[label] ?? null;
  }

  setPalletVisible(state.showPallet);
  setWallsVisible(state.showWalls);
  setGridVisible(state.showGrid);
  updateLayerVisibility();
  applyManualPreset();
  applyBagBodyColor();

  return {
    state,
    bag,
    pallet,
    wireframe,
    walls,
    getAllBags,
    getBagByLabel,
    getDimensionParams,
    getFrontOffsetBoundsMm,
    getRearOffsetBoundsMm,
    applyBagBodyColor,
    applyBagDimensions,
    applyManualPreset,
    applyPackedFootprint,
    moveFrontGroupZByOffsetMm,
    moveRearGroupZByOffsetMm,
    getTotalLayers: () => TOTAL_LAYERS,
    updateLayerVisibility,
    setVisibleLayerCount,
    setLabelsVisible,
    setGridVisible,
    setPalletVisible,
    setPalletOpacity,
    setPalletColor,
    setWireframeVisible,
    setWallsVisible,
    toggleWalls,
    setWallOpacity,
    setWallColor,
  };
}
