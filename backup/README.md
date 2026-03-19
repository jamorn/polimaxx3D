# POLIMAXX - 5 Bags Controller

โปรเจ็กต์ POLIMAXX แบบ Modular OOP สำหรับจัดการถุง 5 ใบพร้อมการควบคุมระยะห่างและการหมุน

## โครงสร้างไฟล์

```
E:\Project2026\Polimaxx\
├── index.html              # หน้าหลัก (HTML structure เท่านั้น)
├── css/
│   └── styles.css          # CSS ทั้งหมดแยกออกมา
└── js/
    ├── app.js              # Main application entry point
    ├── TextureFactory.js   # จัดการการสร้าง textures
    ├── POLIMAXBag.js      # Class สำหรับ bag geometry และ materials
    ├── SceneManager.js     # จัดการ Three.js scene และ rendering
    ├── BagManager.js       # จัดการคลังของ bags
    └── UIController.js     # จัดการ UI controls และ interactions
```

## คุณสมบัติ

### การควบคุมถุง
- เลือกถุงแต่ละใบ (1-5)
- ปรับตำแหน่ง X ด้วย slider
- หมุน Y 90° ทีละครั้ง (CW/CCW)
- รีเซ็ตถุงเดี่ยวหรือทั้งหมด

### Gap Controls (ใหม่)
- **Gap Rows**: แยกแถวหน้า (ถุง 4,5) กับแถวหลัง (ถุง 1,2,3)
- **Gap Middle**: แยกถุง 1&3 ออกจากถุง 2 แบบสมมาตร

### Default Values System
- ล็อกค่าปัจจุบันเป็น default
- ใช้ค่าที่ล็อกไว้
- แสดงค่าที่บันทึกแล้ว

### ค่าเริ่มต้น
- ถุง 5: X=-0.78, 0° ✨ (อัปเดตจาก 180°)
- ถุง 4: X=0.60, 0°
- ถุง 3: X=-0.82, 270°
- ถุง 2: X=0.00, 90°
- ถุง 1: X=0.82, 90°

## วิธีใช้งาน

1. เปิด `index.html` ในเบราว์เซอร์
2. เลือกถุงที่ต้องการแก้ไข
3. ปรับตำแหน่งและมุมหมุน
4. ใช้ Gap sliders เพื่อจัดระยะห่าง
5. ล็อกค่าเป็น default เมื่อพอใจ

## การ Debug

เปิด Console และใช้:
```javascript
exportConfig()  // ส่งออกการตั้งค่าปัจจุบัน
getStats()      // ดูสถิติแอปพลิเคชัน
```

## การพัฒนา

### เพิ่ม Texture ใหม่
แก้ไขใน `TextureFactory.js` → เพิ่ม method ใหม่

### เพิ่ม UI Control
แก้ไขใน `UIController.js` → เพิ่ม event listener ใหม่

### เพิ่มฟีเจอร์ Scene
แก้ไขใน `SceneManager.js` → เพิ่ม lighting/environment

### เพิ่มการจัดการ Bag
แก้ไขใน `BagManager.js` → เพิ่มฟังก์ชันจัดการใหม่

## เทคโนโลยี

- **Three.js 0.160.0** - 3D rendering
- **ES6 Modules** - Modular architecture  
- **Vanilla JavaScript** - No additional frameworks
- **CSS3** - Modern styling with backdrop-filter