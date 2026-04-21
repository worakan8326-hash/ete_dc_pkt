import fs from 'fs';

const file_path = 'Settings.tsx';
let content = fs.readFileSync(file_path, 'utf8');

const target_marker = '</button>\n                </div>\n              </div>';
const normalizedContent = content.replace(/\r\n/g, '\n');

const buttonsCode = `
              <div className="flex flex-wrap gap-3 w-full md:w-auto">
                <input 
                  type="file" 
                  title="เลือกไฟล์ Excel สำหรับนำเข้า" 
                  ref={fileInputRef} 
                  onChange={handleImportExcel} 
                  accept=".xlsx, .xls" 
                  className="hidden" 
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 md:flex-none h-14 px-7 rounded-[1.2rem] font-black text-white bg-gradient-to-br from-orange-400 to-rose-500 shadow-xl shadow-orange-200 hover:shadow-orange-300 hover:-translate-y-0.5 active:scale-95 transition-all flex items-center justify-center gap-3 text-[14px] border-b-4 border-orange-600/20"
                >
                  <div className="bg-white/20 p-1.5 rounded-lg">
                    <span className="material-symbols-outlined text-[20px]">upload_file</span>
                  </div>
                  Import Excel
                </button>
                <button 
                  onClick={handleExportExcel}
                  className="flex-1 md:flex-none h-14 px-7 rounded-[1.2rem] font-black text-white bg-gradient-to-br from-blue-500 to-indigo-600 shadow-xl shadow-blue-200 hover:shadow-blue-300 hover:-translate-y-0.5 active:scale-95 transition-all flex items-center justify-center gap-3 text-[14px] border-b-4 border-blue-700/20"
                >
                  <div className="bg-white/20 p-1.5 rounded-lg">
                    <span className="material-symbols-outlined text-[20px]">download</span>
                  </div>
                  Export Excel
                </button>
                <button 
                  onClick={() => { setEditItem({ ประเภท: '', 'ยี่ห้อหรือรูปแบบ': '', รายการ: '', สภาพ: '', รายละเอียด: '', ขนาด: '', จำนวน: 0 }); setShowItemForm(true); }}
                  className="flex-1 md:flex-none h-14 px-7 rounded-[1.2rem] font-black text-white bg-gradient-to-br from-emerald-400 to-teal-600 shadow-xl shadow-emerald-200 hover:shadow-emerald-300 hover:-translate-y-0.5 active:scale-95 transition-all flex items-center justify-center gap-3 text-[14px] border-b-4 border-emerald-700/20"
                >
                  <div className="bg-white/20 p-1.5 rounded-lg">
                    <span className="material-symbols-outlined text-[22px]">add_box</span>
                  </div>
                  เพิ่มพัสดุใหม่
                </button>
              </div>`;

if (normalizedContent.includes(target_marker)) {
    const newContent = normalizedContent.replace(target_marker, target_marker + buttonsCode);
    fs.writeFileSync(file_path, newContent, 'utf8');
    console.log("Success: Buttons upgraded to Premium Design.");
} else {
    // Fallback: look for just the div end
    const fallbackMarker = 'ฐานข้อมูลพัสดุหลัก\n                </h2>';
    if (normalizedContent.includes(fallbackMarker)) {
        const parts = normalizedContent.split(fallbackMarker);
        // Find the next </div>
        const tail = parts[1];
        const nextDivEnd = tail.indexOf('</div>');
        const nextNextDivEnd = tail.indexOf('</div>', nextDivEnd + 1);
        
        const insertionPoint = parts[0] + fallbackMarker + tail.substring(0, nextNextDivEnd + 6);
        const finalContent = insertionPoint + buttonsCode + tail.substring(nextNextDivEnd + 6);
        fs.writeFileSync(file_path, finalContent, 'utf8');
        console.log("Success: Buttons upgraded via fallback.");
    } else {
        console.log("Error: Could not find insertion point.");
    }
}
