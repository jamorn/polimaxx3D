export const CONFIG = {
  PALLET: {
    WIDTH: 1.2,
    DEPTH: 1.0,
    HEIGHT: 0.15,
  },
  BAG: {
    WIDTH: 0.3281,
    LENGTH: 0.2007,
    HEIGHT: 0.0993,
  },
  COLORS: {
    FRAME: 0xf37021,
    PALLET: 0x8b5a2b,
    WALL: 0xfc182f,
  },
};

export const BASE_BAG = { ...CONFIG.BAG };

export const MANUAL_PRESET_BAG = Object.freeze({
  WIDTH: 0.337,
  LENGTH: 0.233,
  HEIGHT: 0.14,
});

export const SHAPE_REFERENCE = Object.freeze({
  WIDTH: 0.525,
  LENGTH: 0.3211,
  HEIGHT: 0.1589,
  FRONT_BULGE_Z: 0.12,
  SIDE_BULGE_X: 0.22,
});

export const DEFAULT_GAPS = Object.freeze({
  rows: 0.0,
  front: 0.295,
  rear: 0.39,
});

export const DEFAULT_Z_OFFSETS_MM = Object.freeze({
  front: 0,
  rear: -28,
});

export const TOTAL_LAYERS = 8;

export const DEFAULT_SIDE_LABEL = Object.freeze({
  serial: "1126NK 0260204008",
  standard: "TIS.1306-2566",
  grade: "PP-01-1-5-F",
  material: "PP HOMO",
  time: "A  06:28",
  rohs: "(RoHS)",
  bagStartNo: 1,
  bagsPerTon: 40,
  palletNo: "001",
  showBagNo: true,
  qrText: "https://appdb.tisi.go.th/Q/i.php?d=3828891212",
  showQr: true,
  showQr2: true,
  showDiamond: true,
});

export const FRONT_ROW_MARGIN = 0.0;
export const ROW_WALL_GAP = 0.03;

export function createInitialState() {
  return {
    activeBag: 5,
    gapRows: DEFAULT_GAPS.rows,
    gapFront: DEFAULT_GAPS.front,
    gapMiddle: DEFAULT_GAPS.rear,
    bagWidth: MANUAL_PRESET_BAG.WIDTH,
    bagLength: MANUAL_PRESET_BAG.LENGTH,
    bagHeight: MANUAL_PRESET_BAG.HEIGHT,
    bagColor: "#ffffff",
    frontRowOffsetMm: DEFAULT_Z_OFFSETS_MM.front,
    rearRowOffsetMm: DEFAULT_Z_OFFSETS_MM.rear,
    showWalls: false,
    showPallet: true,
    showGrid: true,
    showLabels: false,
    showRecallControls: false,
    visibleLayerCount: TOTAL_LAYERS,
    wallOpacity: 0.4,
    wallColor: "#fc182f",
    palletOpacity: 0.6,
    palletColor: "#8B5A2B",
  };
}
