import * as THREE from "three";
import QRCode from "qrcode";

import { DEFAULT_SIDE_LABEL } from "./polimaxx_config.js";

// จำกัด anisotropy ตามอุปกรณ์ — บน iPad/iPhone ค่า 16 กิน GPU memory/bandwidth
// มาก ทำให้ WebKit ฆ่า tab (หน้า reload เอง) จึงลดเพดานลงบน touch device
function getSafeAnisotropy() {
  if (typeof navigator === "undefined") return 16;
  const ua = navigator.userAgent || "";
  const isIPadOS =
    navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  const isIOS = /iPad|iPhone|iPod/.test(ua) || isIPadOS;
  const isTouch =
    (window.matchMedia &&
      window.matchMedia("(hover: none) and (pointer: coarse)").matches) ||
    navigator.maxTouchPoints > 0;

  if (isIOS) return 4;
  if (isTouch) return 8;
  return 16;
}

// คืนระดับสเกลของ canvas texture ตามอุปกรณ์
// 1 = เต็ม (desktop), ต่ำกว่า 1 = canvas เล็กลง เพื่อลด RAM/VRAM บนมือถือ
// ปัญหาหลักที่ทำให้ iPad reload: texture 4096x1024 จำนวน 40 ใบ (1 ต่อ bag)
// กิน RAM มหาศาลจน WebKit ตัด WebGL context
function getTextureScale() {
  if (typeof navigator === "undefined") return 1;
  const ua = navigator.userAgent || "";
  const isIPadOS =
    navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  const isIOS = /iPad|iPhone|iPod/.test(ua) || isIPadOS;
  const isTouch =
    (window.matchMedia &&
      window.matchMedia("(hover: none) and (pointer: coarse)").matches) ||
    navigator.maxTouchPoints > 0;

  if (isIOS) return 0.25; // 4096x1024 -> 1024x256, 2048x2048 -> 512x512
  if (isTouch) return 0.5; // 4096x1024 -> 2048x512
  return 1;
}

export class PolimaxxTextureFactory {
  // แคช QR (สร้างครั้งเดียวจาก string) — เก็บเป็น matrix ของโมดูล
  static qrCache = new Map();

  // แคชโลโก้ MFG (SVG) — โหลดครั้งเดียว แล้วใช้ซ้ำทุกถุง
  static mfgLogo = null;
  static mfgLogoListeners = new Set();

  static mfgLogoUrl = new URL("../images/mfg.svg", import.meta.url).href;

  // แคช texture หน้า label ที่เป็น static (ไม่รวม QR2 + running number)
  // ใช้ร่วมกันทุกถุง จึงสร้างเพียงใบเดียว
  static staticFrontTexture = null;
  static staticFrontSignature = null;

  static loadMfgLogo(url = PolimaxxTextureFactory.mfgLogoUrl) {
    if (PolimaxxTextureFactory.mfgLogo) return;
    const image = new Image();
    image.onload = () => {
      PolimaxxTextureFactory.mfgLogo = image;
      PolimaxxTextureFactory.mfgLogoListeners.forEach((callback) =>
        callback(image),
      );
      PolimaxxTextureFactory.mfgLogoListeners.clear();
    };
    image.onerror = () => {
      PolimaxxTextureFactory.mfgLogoListeners.forEach((callback) =>
        callback(null),
      );
      PolimaxxTextureFactory.mfgLogoListeners.clear();
    };
    image.src = url;
  }

  static onMfgLogoReady(callback) {
    if (PolimaxxTextureFactory.mfgLogo) {
      callback(PolimaxxTextureFactory.mfgLogo);
      return () => {};
    }
    PolimaxxTextureFactory.mfgLogoListeners.add(callback);
    return () => PolimaxxTextureFactory.mfgLogoListeners.delete(callback);
  }

  static getQrModules(text) {
    const key = String(text ?? "");
    if (!PolimaxxTextureFactory.qrCache.has(key)) {
      // สร้าง matrix QR แบบ synchronous (ไม่ต้องรอ async)
      const qr = QRCode.create(key, { errorCorrectionLevel: "M" });
      PolimaxxTextureFactory.qrCache.set(key, {
        size: qr.modules.size,
        data: qr.modules.data,
      });
    }
    return PolimaxxTextureFactory.qrCache.get(key);
  }

  static drawQrToContext(ctx, text, x, y, size) {
    if (!text) return false;
    const { size: n, data } = PolimaxxTextureFactory.getQrModules(text);
    if (!n || !data) return false;

    const cell = size / n;

    // ไม่วาดพื้นหลังสีขาว (โปร่งใส) — วาดเฉพาะ module สีดำ
    ctx.fillStyle = "#000";
    for (let row = 0; row < n; row += 1) {
      for (let col = 0; col < n; col += 1) {
        if (data[row * n + col]) {
          const px = x + Math.floor(col * cell);
          const py = y + Math.floor(row * cell);
          const pw = Math.ceil(x + (col + 1) * cell) - px;
          const ph = Math.ceil(y + (row + 1) * cell) - py;
          ctx.fillRect(px, py, pw, ph);
        }
      }
    }

    return true;
  }

  static createTopTexture(backgroundColor = "#ffffff") {
    // พิกัดวาดทั้งหมดอ้างอิง canvas เชิงตรรกะ 2048x2048
    const logicalSize = 2048;
    const scale = getTextureScale();
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(logicalSize * scale);
    canvas.height = Math.round(logicalSize * scale);
    const ctx = canvas.getContext("2d");

    // สเกล context ให้พิกัดเดิม (0..2048) ยังใช้ได้ แต่ canvas จริงเล็กลง
    ctx.scale(canvas.width / logicalSize, canvas.height / logicalSize);

    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, logicalSize, logicalSize);

    const centerX = logicalSize / 2;
    ctx.textAlign = "center";

    ctx.fillStyle = "#0e3a66";
    ctx.font = "bold 220px sans-serif";
    ctx.fillText("POLIMAXX", centerX, 400);

    ctx.strokeStyle = "#f37021";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(centerX - 416, 336, 30, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = "#f37021";
    ctx.font = "bold 360px sans-serif";
    ctx.fillText("PP", centerX, 840);

    ctx.fillStyle = "#0e3a66";
    ctx.font = "bold 150px sans-serif";
    ctx.fillText("POLYETHYLENE", centerX, 1040);

    ctx.strokeStyle = "#f37021";
    ctx.lineWidth = 30;
    ctx.beginPath();
    ctx.arc(1760, 400, 120, 0, Math.PI * 2);
    ctx.stroke();

    ctx.lineWidth = 20;
    ctx.beginPath();
    ctx.arc(1840, 640, 60, 0, Math.PI * 2);
    ctx.stroke();

    for (let index = 0; index < 4; index += 1) {
      const x = 400 + index * 170;
      const y = 1360;

      ctx.fillStyle = "#ff0000";
      ctx.beginPath();
      ctx.arc(x, y, 64, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "#333";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(x, y, 64, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = "#ff6666";
      ctx.beginPath();
      ctx.arc(x - 10, y - 10, 16, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.textAlign = "left";
    ctx.fillStyle = "#111";
    ctx.font = "bold 120px sans-serif";
    ctx.fillText("NET WEIGHT 25 KG", 360, 1760);

    const texture = new THREE.CanvasTexture(canvas);
    texture.anisotropy = getSafeAnisotropy();
    texture.center.set(0.5, 0.5);
    texture.rotation = Math.PI;
    texture.needsUpdate = true;
    return texture;
  }

  static getFrontLogicalSize() {
    return { logicalW: 4096, logicalH: 1024 };
  }

  static drawFrontStatic(ctx, resolved) {
    const { logicalW, logicalH } = PolimaxxTextureFactory.getFrontLogicalSize();

    ctx.clearRect(0, 0, logicalW, logicalH);
    ctx.fillStyle = "#000000";
    ctx.textBaseline = "middle";

    const midY = 512;
    const serialStartX = 470;
    let currentX = serialStartX;

    ctx.textAlign = "left";
    ctx.font = "bold 130px sans-serif";
    ctx.fillText(resolved.serial, currentX, midY);
    currentX += 1380;

    const symbolX = currentX;
    const symbolY = midY;

    if (resolved.showDiamond) {
      const logo = PolimaxxTextureFactory.mfgLogo;

      if (logo) {
        const logoHeight = 150;
        const ratio = logo.width / logo.height || 1;
        const logoWidth = logoHeight * ratio;
        const logoX = symbolX - logoWidth / 2;
        const logoY = symbolY - logoHeight / 2;
        ctx.drawImage(logo, logoX, logoY, logoWidth, logoHeight);
      } else {
        ctx.lineWidth = 14;
        ctx.strokeStyle = "#000";
        ctx.beginPath();
        ctx.moveTo(symbolX, symbolY - 75);
        ctx.lineTo(symbolX + 75, symbolY);
        ctx.lineTo(symbolX, symbolY + 75);
        ctx.lineTo(symbolX - 75, symbolY);
        ctx.closePath();
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(symbolX, symbolY - 75);
        ctx.lineTo(symbolX, symbolY + 75);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(symbolX - 35, symbolY);
        ctx.lineTo(symbolX + 35, symbolY);
        ctx.stroke();
      }
    }

    ctx.font = "bold 60px sans-serif";
    ctx.fillText(resolved.standard, symbolX + 110, midY - 38);
    ctx.fillText(resolved.grade, symbolX + 110, midY + 38);
    currentX += 540;

    if (resolved.showQr) {
      const qrX = currentX;
      const qrY = midY - 85;
      const drawn = PolimaxxTextureFactory.drawQrToContext(
        ctx,
        resolved.qrText,
        qrX,
        qrY,
        170,
      );

      if (!drawn) {
        ctx.fillStyle = "#000";
        ctx.fillRect(qrX, qrY, 170, 170);
        ctx.fillStyle = "#fff";

        for (let x = 0; x < 3; x += 1) {
          for (let y = 0; y < 3; y += 1) {
            if ((x + y) % 2 === 0) {
              ctx.fillRect(qrX + 18 + x * 48, qrY + 18 + y * 48, 40, 40);
            }
          }
        }
      }

      ctx.fillStyle = "#000";
    }

    currentX += 280;
    ctx.font = "bold 75px sans-serif";
    ctx.fillText(resolved.material, currentX, midY - 38);
    ctx.fillText(resolved.time, currentX, midY + 38);
    currentX += 460;

    ctx.font = "italic bold 85px sans-serif";
    ctx.fillText(resolved.rohs, currentX, midY);
    currentX += ctx.measureText(resolved.rohs).width + 90;

    return currentX;
  }

  static drawFrontDynamic(ctx, resolved, bagNo) {
    const serialStartX = 470;
    const midY = 512;

    ctx.fillStyle = "#000000";
    ctx.textBaseline = "middle";

    if (resolved.showQr2) {
      const qr2Size = 170;
      const qr2X = 220;
      const qr2Y = midY - qr2Size / 2;

      const [gradePart = "", lotPart = ""] = String(
        resolved.serial ?? "",
      ).split(" ");
      const bagCode2 = String(bagNo).padStart(2, "0");
      const qr2Text = `1311|${gradePart}|${lotPart}|${bagCode2}|${resolved.palletNo}`;

      const drawn2 = PolimaxxTextureFactory.drawQrToContext(
        ctx,
        qr2Text,
        qr2X,
        qr2Y,
        qr2Size,
      );

      if (!drawn2) {
        ctx.fillStyle = "#000";
        const module = 10;
        const gridN = 13;
        const pattern = [
          [1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 0, 1, 0],
          [1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 1, 0, 1],
          [1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 0],
          [1, 0, 1, 1, 1, 0, 1, 1, 0, 0, 1, 0, 1],
          [1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0],
          [1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 1, 0, 1],
          [1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 0],
          [0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 1],
          [1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1],
          [0, 1, 0, 1, 1, 0, 0, 1, 0, 0, 1, 0, 0],
          [1, 1, 0, 0, 1, 1, 1, 0, 1, 0, 1, 1, 0],
          [0, 1, 1, 0, 0, 1, 0, 1, 0, 1, 0, 0, 1],
          [1, 0, 1, 1, 0, 0, 1, 0, 1, 1, 1, 0, 1],
        ];
        const qr2Pad = (qr2Size - module * gridN) / 2;

        for (let row = 0; row < gridN; row += 1) {
          for (let col = 0; col < gridN; col += 1) {
            if (pattern[row][col]) {
              ctx.fillRect(
                qr2X + qr2Pad + col * module,
                qr2Y + qr2Pad + row * module,
                module,
                module,
              );
            }
          }
        }
      }

      ctx.fillStyle = "#000000";
    }

    const serialStartXLocal = serialStartX;
    ctx.font = "italic bold 85px sans-serif";
    const rohsWidth = ctx.measureText(resolved.rohs).width;
    const numberBaseX =
      serialStartXLocal + 1380 + 540 + 280 + 460 + rohsWidth + 90;

    if (resolved.showBagNo) {
      ctx.textAlign = "left";
      const bagCode = `${String(bagNo).padStart(2, "0")}${resolved.palletNo}`;
      ctx.font = "bold 90px sans-serif";
      ctx.fillText(bagCode, numberBaseX, midY);
    }
  }

  static createStaticFrontTexture(sideLabel = DEFAULT_SIDE_LABEL) {
    const resolved = { ...DEFAULT_SIDE_LABEL, ...sideLabel };

    PolimaxxTextureFactory.loadMfgLogo();

    const { logicalW, logicalH } = PolimaxxTextureFactory.getFrontLogicalSize();
    const scale = getTextureScale();
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(logicalW * scale);
    canvas.height = Math.round(logicalH * scale);
    const ctx = canvas.getContext("2d");

    ctx.scale(canvas.width / logicalW, canvas.height / logicalH);

    PolimaxxTextureFactory.drawFrontStatic(ctx, resolved);

    const texture = new THREE.CanvasTexture(canvas);
    texture.anisotropy = getSafeAnisotropy();
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
    return texture;
  }

  static getStaticFrontTexture(sideLabel = DEFAULT_SIDE_LABEL) {
    const resolved = { ...DEFAULT_SIDE_LABEL, ...sideLabel };
    const signature = JSON.stringify(resolved);
    const hasLogo = Boolean(PolimaxxTextureFactory.mfgLogo);

    if (
      PolimaxxTextureFactory.staticFrontTexture &&
      PolimaxxTextureFactory.staticFrontSignature === `${signature}|${hasLogo}`
    ) {
      return PolimaxxTextureFactory.staticFrontTexture;
    }

    if (PolimaxxTextureFactory.staticFrontTexture) {
      PolimaxxTextureFactory.staticFrontTexture.dispose();
    }

    const texture = PolimaxxTextureFactory.createStaticFrontTexture(resolved);
    PolimaxxTextureFactory.staticFrontTexture = texture;
    PolimaxxTextureFactory.staticFrontSignature = `${signature}|${hasLogo}`;
    return texture;
  }

  static createBagOverlayTexture(
    bagNo = DEFAULT_SIDE_LABEL.bagStartNo,
    sideLabel = DEFAULT_SIDE_LABEL,
  ) {
    const resolved = { ...DEFAULT_SIDE_LABEL, ...sideLabel };

    const { logicalW, logicalH } = PolimaxxTextureFactory.getFrontLogicalSize();
    const scale = getTextureScale();
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(logicalW * scale);
    canvas.height = Math.round(logicalH * scale);
    const ctx = canvas.getContext("2d");

    ctx.scale(canvas.width / logicalW, canvas.height / logicalH);

    ctx.clearRect(0, 0, logicalW, logicalH);

    PolimaxxTextureFactory.drawFrontDynamic(ctx, resolved, bagNo);

    const texture = new THREE.CanvasTexture(canvas);
    texture.anisotropy = getSafeAnisotropy();
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
    return texture;
  }

  static createFrontTexture(
    sideLabel = DEFAULT_SIDE_LABEL,
    bagNo = DEFAULT_SIDE_LABEL.bagStartNo,
  ) {
    const resolved = { ...DEFAULT_SIDE_LABEL, ...sideLabel };

    PolimaxxTextureFactory.loadMfgLogo();

    const { logicalW, logicalH } = PolimaxxTextureFactory.getFrontLogicalSize();
    const scale = getTextureScale();
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(logicalW * scale);
    canvas.height = Math.round(logicalH * scale);
    const ctx = canvas.getContext("2d");

    ctx.scale(canvas.width / logicalW, canvas.height / logicalH);

    PolimaxxTextureFactory.drawFrontStatic(ctx, resolved);
    PolimaxxTextureFactory.drawFrontDynamic(ctx, resolved, bagNo);

    const texture = new THREE.CanvasTexture(canvas);
    texture.anisotropy = getSafeAnisotropy();
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
    return texture;
  }

  static createIndexTexture(index) {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 200px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(index.toString(), canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  static createBlankTexture(backgroundColor = "#ffffff") {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }
}
