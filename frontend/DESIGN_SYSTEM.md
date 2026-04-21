# ETE DC Premium Design System (Modern Soft-UI & Glassmorphism)

ระบบดีไซน์นี้ถูกออกแบบมาเพื่อยกระดับ UI ของแอปพลิเคชันให้มีความพรีเมียม ทันสมัย และให้ประสบการณ์การใช้งาน (UX) ที่สมูทที่สุด คล้ายคลึงกับแอปพลิเคชันมือถือระดับ High-end

## 1. Core Concepts (แนวคิดหลัก)
*   **Soft-UI & Glassmorphism:** เน้นพื้นหลังแบบกึ่งโปร่งใส (Background blur), การใช้เงาแบบนุ่มนวล (Soft shadows) และเส้นขอบจางๆ (Subtle borders)
*   **Card-in-Card Floating:** การซ้อน Card เล็กๆ ไว้ใน Card ใหญ่ เพื่อสร้างมิติของข้อมูล
*   **Color Psychology:** ใช้สีเพื่อสื่อสารสถานะอย่างชัดเจน ช่วยป้องกันความผิดพลาด (Error prevention)

## 2. Color Palette & Status
การจับคู่สี (Color Coding) สำหรับระบบประมวลผลหรือสถานะเฉพาะเจาะจง:
*   **🟣 งานปกติ / ระบบหลัก:** 
    *   *Background:* `bg-purple-50` ถึง `bg-purple-600`
    *   *Text:* `text-purple-600` ถึง `text-purple-900`
*   **🟢 อนุมัติ / ซ่อมเสร็จ / รับเข้า:** 
    *   *Background:* `bg-emerald-50` ถึง `bg-emerald-600`
    *   *Shadow:* `shadow-emerald-100` หรือ `shadow-emerald-200`
*   **🟠 รอจำหน่ายซาก / ระวัง / เบิกออก:** 
    *   *Background:* `bg-amber-50` ถึง `bg-amber-600`
*   **🔴 สูญหาย / ยกเลิก / อันตราย:** 
    *   *Background:* `bg-rose-50` ถึง `bg-rose-600`

## 3. Tailwind Class Patterns (แพทเทิร์นโค้ดที่ใช้ประจำ)

### 3.1 Main Container / Card
กล่องข้อมูลหลักที่ต้องการความโดดเด่นและดูมีมิติ
```html
<div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col hover:shadow-xl transition-all duration-300">
```

### 3.2 Premium Button (ปุ่มกดทำงาน)
ปุ่มจะมีลักษณะเด้งได้ตอนกด (`active:scale-95`) ไอคอนและตัวอักษรหนา จัดกึ่งกลางสวยงาม
```html
<button className="flex-1 bg-emerald-600 text-white h-11 rounded-xl flex items-center justify-center gap-2 text-[11px] font-black uppercase active:scale-95 transition-all shadow-lg shadow-emerald-100 disabled:opacity-50">
    <Icon className="size-4" />
    <span>ข้อความปุ่ม</span>
</button>
```

### 3.3 Badges (ป้ายกำกับสถานะ)
ป้ายสถานะตัวหนังสือเล็กๆ แต่หนา (Bold/Black) ขอบมนรอบด้าน
```html
<span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border bg-purple-50 text-purple-600 border-purple-100">
    สถานะ
</span>
```

### 3.4 Custom Confirmation Modal (ป๊อปอัพยืนยันแบบพรีเมียม)
ใช้แทนที่ `window.confirm` เดิมทั้งหมด เพื่อป้องกันปัญหา Browser Block และเพิ่มความสวยงาม
```html
<div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
  <div className="bg-white rounded-[2rem] shadow-2xl p-6 md:p-8 w-full max-w-sm animate-scale-in flex flex-col items-center text-center">
    <!-- Icon Circle -->
    <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 bg-emerald-100 text-emerald-600">
      <Icon size={32} />
    </div>
    
    <h3 className="text-xl font-black text-slate-900 mb-2">หัวข้อ</h3>
    <p className="text-slate-500 font-medium text-sm whitespace-pre-wrap">คำอธิบาย</p>
    
    <!-- Action Buttons -->
    <div className="flex gap-3 w-full mt-8">
      <button className="flex-1 h-12 bg-slate-100 text-slate-600 font-bold rounded-xl active:scale-95 transition-all">ยกเลิก</button>
      <button className="flex-1 h-12 text-white bg-emerald-600 font-bold rounded-xl active:scale-95 shadow-lg shadow-emerald-200 transition-all">ยืนยัน</button>
    </div>
  </div>
</div>
```

## 4. Typography (การออกแบบตัวอักษร)
*   **Headline/Title:** ใช้ `font-black`, `tracking-tight` (บีบตัวอักษรนิดๆ เพื่อความทันสมัย)
*   **Sub-headline:** ใช้ `text-[10px]`, `font-bold`, `uppercase`, `tracking-widest` (ขยายช่องไฟเพื่อให้ดูโปร่งและแพง)
*   **Body/Details:** ใช้ `text-slate-500` หรือ `text-slate-900` ขึ้นอยู่กับลำดับความสำคัญ

## แผนการในอนาคต (Migration Plan)
เมื่อถึงเวลาเราจะนำโค้ดและแพทเทิร์นเหล่านี้ไปปรับปรุงหน้าจออื่นๆ เช่น:
- Dashboard (หน้ารวมสต๊อก)
- ReceiveForm / IssueForm / ReturnForm
- History (ลบหน้าต่าง confirm เก่าออกแล้วใช้ Custom Modal แทน)
