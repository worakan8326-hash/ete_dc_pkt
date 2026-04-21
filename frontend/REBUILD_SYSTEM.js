import fs from 'fs';

// --- PHASE 1: Patch api.ts ---
const apiPath = 'src/api.ts';
let apiContent = fs.readFileSync(apiPath, 'utf8').replace(/\r\n/g, '\n');
const saveMasterItemsCode = `
export const saveMasterItems = async (items: any[]): Promise<any> => {
  if (!API_URL) throw new Error("API URL is not configured. Please deploy the Apps Script first.");
  
  const payload = {
    action: 'saveMasterItems',
    items
  };

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify(payload)
  });
  
  if (!res.ok) throw new Error("Batch save failed");
  const data = await res.json();
  if (data.status === "error") throw new Error(data.message);
  return data;
};
`;

if (!apiContent.includes('export const saveMasterItems')) {
    apiContent += saveMasterItemsCode;
    fs.writeFileSync(apiPath, apiContent, 'utf8');
    console.log("Success: api.ts patched.");
}

// --- PHASE 2: Patch Settings.tsx ---
const settingsPath = 'src/components/Settings.tsx';
let settingsContent = fs.readFileSync(settingsPath, 'utf8').replace(/\r\n/g, '\n');

// 2.1 Add Imports
if (!settingsContent.includes("import * as XLSX from 'xlsx'")) {
    settingsContent = settingsContent.replace("import { useState, useEffect, useMemo } from 'react';", "import { useState, useEffect, useMemo, useRef } from 'react';\nimport * as XLSX from 'xlsx';");
    settingsContent = settingsContent.replace("saveMasterItem, deleteMasterItem,", "saveMasterItem, saveMasterItems, deleteMasterItem,");
}

// 2.2 Add state/functions
const functionsCode = `
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportExcel = () => {
    try {
      setLoading(true);
      const dataToExport = masterItems.map(it => ({
        'ประเภท': it.ประเภท,
        'ยี่ห้อหรือรูปแบบ': it['ยี่ห้อหรือรูปแบบ'],
        'รายการ': it.รายการ,
        'สภาพ': it.สภาพ,
        'รายละเอียด': it.รายละเอียด,
        'ขนาด': it.ขนาด,
        'จำนวน': it.จำนวน,
        'RowIndex': it.rowIndex
      }));
      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory");
      XLSX.writeFile(workbook, "Inventory_Master.xlsx");
      showSuccess('Export Excel สำเร็จ');
    } catch (err: any) {
      setError('Export ล้มเหลว: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws) as any[];
        
        const items = data.map(row => ({
          ประเภท: row['ประเภท'] || '',
          'ยี่ห้อหรือรูปแบบ': row['ยี่ห้อหรือรูปแบบ'] || '',
          รายการ: row['รายการ'] || '',
          สภาพ: row['สภาพ'] || '',
          รายละเอียด: row['รายละเอียด'] || '',
          ขนาด: row['ขนาด'] || '',
          จำนวน: Number(row['จำนวน']) || 0,
          rowIndex: row['RowIndex'] || undefined
        }));

        await saveMasterItems(items);
        showSuccess('นำเข้าข้อมูลสำเร็จ');
        loadData();
      } catch (err: any) {
        setError('นำเข้าล้มเหลว: ' + err.message);
      } finally {
        setLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };
`;

if (!settingsContent.includes('const handleExportExcel')) {
   // Use useMemo dependency array as insertion point
   const splitMarker = '}, [masterItems, filterType, filterBrand, searchTerm]);';
   if (settingsContent.includes(splitMarker)) {
       settingsContent = settingsContent.replace(splitMarker, splitMarker + functionsCode);
   }
}

// 2.3 Add UI (Pill Design)
const headerMarker = 'รีโหลด\n                  </button>\n                </div>\n              </div>';
const uiCode = `
              <div className="flex flex-wrap gap-3 w-full md:w-auto px-1">
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
                  className="flex-1 md:flex-none h-12 px-8 rounded-full font-bold text-secondary bg-white border border-secondary/5 shadow-xl shadow-secondary/5 hover:bg-slate-50 hover:shadow-secondary/10 active:scale-95 transition-all flex items-center justify-center gap-3 text-[13px]"
                >
                  <span className="material-symbols-outlined text-[20px] text-orange-500">upload_file</span>
                  <span className="opacity-80">Import Excel</span>
                </button>
                <button 
                  onClick={handleExportExcel}
                  className="flex-1 md:flex-none h-12 px-8 rounded-full font-bold text-secondary bg-white border border-secondary/5 shadow-xl shadow-secondary/5 hover:bg-slate-50 hover:shadow-secondary/10 active:scale-95 transition-all flex items-center justify-center gap-3 text-[13px]"
                >
                  <span className="material-symbols-outlined text-[20px] text-blue-500">download</span>
                  <span className="opacity-80">Export Excel</span>
                </button>
                <button 
                  onClick={() => { setEditItem({ ประเภท: '', 'ยี่ห้อหรือรูปแบบ': '', รายการ: '', สภาพ: '', รายละเอียด: '', ขนาด: '', จำนวน: 0 }); setShowItemForm(true); }}
                  className="flex-1 md:flex-none h-12 px-8 rounded-full font-bold text-white bg-primary shadow-xl shadow-primary/20 hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-3 text-[13px]"
                >
                  <span className="material-symbols-outlined text-[20px]">add_box</span>
                  เพิ่มพัสดุใหม่
                </button>
              </div>`;

if (settingsContent.includes(headerMarker)) {
    // Find the end of the div containing the title
    const markerIdx = settingsContent.indexOf(headerMarker);
    const afterMarker = settingsContent.substring(markerIdx + headerMarker.length);
    // Find next </div> which should be the end of the flex-row container
    const nextDivIdx = afterMarker.indexOf('</div>');
    
    if (nextDivIdx !== -1) {
        settingsContent = settingsContent.substring(0, markerIdx + headerMarker.length + nextDivIdx + 6) 
                          + uiCode 
                          + afterMarker.substring(nextDivIdx + 6);
        fs.writeFileSync(settingsPath, settingsContent, 'utf8');
        console.log("Success: Settings.tsx UI patched.");
    }
}
