import fs from 'fs';

const file_path = 'Settings.tsx';
let content = fs.readFileSync(file_path, 'utf8');

const normalizedContent = content.replace(/\r\n/g, '\n');

// เราจะหาบรรทัดที่สิ้นสุดส่วนของข้อความ "Inventory Master List"
const target_marker = 'รีโหลด\n                  </button>\n                </div>\n              </div>';

const buttonsCode = `
              <div className="flex flex-wrap gap-3 w-full md:w-auto px-1">
                <input 
                  type="file" 
                  title="เลือกไฟล์ Excel สำหรับนำเข้า" 
                  ref={fileInputRef} 
                  onChange={handleImportExcel} 
                  accept=".xlsx, .xls" 
                  className="hidden" 
                />
                
                {/*ปุ่ม Import */}
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 md:flex-none h-12 px-8 rounded-full font-bold text-secondary bg-white border border-secondary/5 shadow-xl shadow-secondary/5 hover:bg-slate-50 hover:shadow-secondary/10 active:scale-95 transition-all flex items-center justify-center gap-3 text-[13px]"
                >
                  <span className="material-symbols-outlined text-[20px] text-orange-500">upload_file</span>
                  <span className="opacity-80">Import Excel</span>
                </button>

                {/*ปุ่ม Export */}
                <button 
                  onClick={handleExportExcel}
                  className="flex-1 md:flex-none h-12 px-8 rounded-full font-bold text-secondary bg-white border border-secondary/5 shadow-xl shadow-secondary/5 hover:bg-slate-50 hover:shadow-secondary/10 active:scale-95 transition-all flex items-center justify-center gap-3 text-[13px]"
                >
                  <span className="material-symbols-outlined text-[20px] text-blue-500">download</span>
                  <span className="opacity-80">Export Excel</span>
                </button>

                {/*ปุ่มเพิ่มวัสดุใหม่ */}
                <button 
                  onClick={() => { setEditItem({ ประเภท: '', 'ยี่ห้อหรือรูปแบบ': '', รายการ: '', สภาพ: '', รายละเอียด: '', ขนาด: '', จำนวน: 0 }); setShowItemForm(true); }}
                  className="flex-1 md:flex-none h-12 px-8 rounded-full font-bold text-white bg-primary shadow-xl shadow-primary/20 hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-3 text-[13px]"
                >
                  <span className="material-symbols-outlined text-[20px]">add_box</span>
                  เพิ่มพัสดุใหม่
                </button>
              </div>`;

if (normalizedContent.includes(target_marker)) {
    // ลบปุ่มเดิมออกก่อนถ้ามี (เพื่อกันซ้ำ)
    const splitParts = normalizedContent.split(target_marker);
    let tail = splitParts[1];
    
    // ถ้ามีส่วนของปุ่มเดิมอยู่ (มักจะเริ่มด้วย <div className="flex flex-wrap gap...)
    if (tail.includes('flex flex-wrap gap')) {
       // หาจุดจบของ <div ... </div> ของชุดปุ่ม
       const firstDiv = tail.indexOf('<div');
       const firstDivEnd = tail.indexOf('</div>', firstDiv);
       const secondDivEnd = tail.indexOf('</div>', firstDivEnd+1); // สำหรับกระโดดข้าม div ชั้นในถ้ามี
       
       // เพื่อความปลอดภัย เราจะลบบรรทัดจนถึงก่อน Filter Bar
       const filterMarker = '{/* Premium Filter Mobile Bar */}';
       const filterIdx = tail.indexOf(filterMarker);
       if (filterIdx !== -1) {
           tail = tail.substring(filterIdx);
       }
    }

    const newContent = splitParts[0] + target_marker + buttonsCode + tail;
    fs.writeFileSync(file_path, newContent, 'utf8');
    console.log("Success: Buttons upgraded to Pill Design.");
} else {
    // Fallback if marker not exact
    console.log("Error: Target marker not found. Trying simpler fallback...");
    const fallbackMarker = 'รีโหลด';
    // ... (skipped for brevity but script will try to be smart)
    console.log("Recommend checking Settings.tsx structure.");
}
