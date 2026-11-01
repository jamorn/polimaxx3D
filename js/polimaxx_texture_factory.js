import * as THREE from "three";
import QRCode from "qrcode";

import { DEFAULT_SIDE_LABEL } from "./polimaxx_config.js";

export class PolimaxxTextureFactory {
  // แคช QR (สร้างครั้งเดียวจาก string) — เก็บเป็น matrix ของโมดูล
  static qrCache = new Map();

  // แคชโลโก้ MFG (SVG) — โหลดครั้งเดียว แล้วใช้ซ้ำทุกถุง
  static mfgLogo = null;
  static mfgLogoListeners = new Set();

  static mfgLogoUrl = new URL("../images/mfg.svg", import.meta.url).href;

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
    const canvas = document.createElement("canvas");
    canvas.width = 2048;
    canvas.height = 2048;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const centerX = canvas.width / 2;
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
    texture.anisotropy = 16;
    texture.center.set(0.5, 0.5);
    texture.rotation = Math.PI;
    texture.needsUpdate = true;
    return texture;
  }

  static createFrontTexture(
    sideLabel = DEFAULT_SIDE_LABEL,
    bagNo = DEFAULT_SIDE_LABEL.bagStartNo,
  ) {
    const resolved = { ...DEFAULT_SIDE_LABEL, ...sideLabel };

    // เริ่มโหลดโลโก้ MFG (ครั้งเดียว) ถ้ายังไม่มี
    PolimaxxTextureFactory.loadMfgLogo();

    const canvas = document.createElement("canvas");
    canvas.width = 4096;
    canvas.height = 1024;
    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#000000";
    ctx.textBaseline = "middle";

    const midY = 512;
    const serialStartX = 470;
    let currentX = serialStartX;

    // QR อันที่ 2 (ก่อน serial) — สร้างจาก string: 1311|grade|lot|xx|xxx
    // โดยแยก grade และ lot จาก serial ด้วยช่องว่าง (space)
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
        // fallback: กล่องดำแบบเดิม ถ้าสร้าง QR ไม่ได้
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

    ctx.textAlign = "left";
    ctx.font = "bold 130px sans-serif";
    ctx.fillText(resolved.serial, currentX, midY);
    currentX += 1380;

    const symbolX = currentX;
    const symbolY = midY;

    if (resolved.showDiamond) {
      const logo = PolimaxxTextureFactory.mfgLogo;

      if (logo) {
        // โลโก้ MFG จาก SVG — วาดให้สูง ~150px, คงสัดส่วนตามรูป
        const logoHeight = 150;
        const ratio = logo.width / logo.height || 1;
        const logoWidth = logoHeight * ratio;
        const logoX = symbolX - logoWidth / 2;
        const logoY = symbolY - logoHeight / 2;
        ctx.drawImage(logo, logoX, logoY, logoWidth, logoHeight);
      } else {
        // fallback: สัญลักษณ์ข้าวหลามตัดเดิม จนกว่าโลโก้จะโหลดเสร็จ
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
        // fallback: กล่องดำแบบเดิม ถ้าสร้าง QR ไม่ได้
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

    if (resolved.showBagNo) {
      const bagCode = `${String(bagNo).padStart(2, "0")}${resolved.palletNo}`;
      ctx.font = "bold 90px sans-serif";
      ctx.fillText(bagCode, currentX, midY);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.anisotropy = 16;
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
