import { useState, useMemo } from 'react';
import type { MaterialItem } from '../types';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
// Import the font asset URL using Vite's ?url suffix
import sarabunRegularUrl from '../fonts/Sarabun-Regular.ttf?url';
import sarabunBoldUrl from '../fonts/Sarabun-Bold.ttf?url';

interface DashboardProps {
  items: MaterialItem[];
}

export default function Dashboard({ items }: DashboardProps) {
  const [filterType, setFilterType] = useState<string>('ทั้งหมด');
  const [filterBrand, setFilterBrand] = useState<string>('ทั้งหมด');
  const [filterName, setFilterName] = useState<string>('ทั้งหมด');
  const [filterCondition, setFilterCondition] = useState<string>('ทั้งหมด');
  const [filterDetail, setFilterDetail] = useState<string>('ทั้งหมด');
  const [qtyLimit, setQtyLimit] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const types = useMemo(() => {
    const list = Array.from(new Set(items.map(i => i.ประเภท).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'th'));
    return ['ทั้งหมด', ...list];
  }, [items]);

  const brands = useMemo(() => {
    const list = items
      .filter(i => (filterType === 'ทั้งหมด' || i.ประเภท === filterType))
      .map(i => i.ยี่ห้อหรือรูปแบบ)
      .filter(Boolean);
    const uniques = Array.from(new Set(list)).sort((a, b) => a.localeCompare(b, 'th'));
    return ['ทั้งหมด', ...uniques];
  }, [items, filterType]);

  const names = useMemo(() => {
    const list = items
      .filter(i => (filterType === 'ทั้งหมด' || i.ประเภท === filterType) && 
                   (filterBrand === 'ทั้งหมด' || i.ยี่ห้อหรือรูปแบบ === filterBrand))
      .map(i => i.รายการ)
      .filter(Boolean);
    const uniques = Array.from(new Set(list)).sort((a, b) => a.localeCompare(b, 'th'));
    return ['ทั้งหมด', ...uniques];
  }, [items, filterType, filterBrand]);

  const conditions = useMemo(() => {
     const list = items
      .filter(i => (filterType === 'ทั้งหมด' || i.ประเภท === filterType) && 
                   (filterBrand === 'ทั้งหมด' || i.ยี่ห้อหรือรูปแบบ === filterBrand) &&
                   (filterName === 'ทั้งหมด' || i.รายการ === filterName))
      .map(i => i.สภาพ)
      .filter(Boolean);
    const uniques = Array.from(new Set(list)).sort((a, b) => a.localeCompare(b, 'th'));
    return ['ทั้งหมด', ...uniques];
  }, [items, filterType, filterBrand, filterName]);

  const detailList = useMemo(() => {
    const list = items
      .filter(i => (filterType === 'ทั้งหมด' || i.ประเภท === filterType) && 
                   (filterBrand === 'ทั้งหมด' || i.ยี่ห้อหรือรูปแบบ === filterBrand) &&
                   (filterName === 'ทั้งหมด' || i.รายการ === filterName) &&
                   (filterCondition === 'ทั้งหมด' || i.สภาพ === filterCondition))
      .map(i => i.รายละเอียด)
      .filter(Boolean);
    const uniques = Array.from(new Set(list)).sort((a, b) => a.localeCompare(b, 'th'));
    return ['ทั้งหมด', ...uniques];
  }, [items, filterType, filterBrand, filterName, filterCondition]);

  const resetFilters = () => {
    setFilterType('ทั้งหมด');
    setFilterBrand('ทั้งหมด');
    setFilterName('ทั้งหมด');
    setFilterCondition('ทั้งหมด');
    setFilterDetail('ทั้งหมด');
    setQtyLimit('');
    setSearchTerm('');
  };

  const filteredItems = useMemo(() => {
    return items.filter(i => {
      const matchType = filterType === 'ทั้งหมด' || i.ประเภท === filterType;
      const matchBrand = filterBrand === 'ทั้งหมด' || i.ยี่ห้อหรือรูปแบบ === filterBrand;
      const matchName = filterName === 'ทั้งหมด' || i.รายการ === filterName;
      const matchCond = filterCondition === 'ทั้งหมด' || i.สภาพ === filterCondition;
      const matchDet = filterDetail === 'ทั้งหมด' || i.รายละเอียด === filterDetail;
      const matchQty = !qtyLimit || i.จำนวน <= parseInt(qtyLimit);
      
      const term = searchTerm.toLowerCase();
      const matchSearch = !term || (
        (i.ประเภท || '').toLowerCase().includes(term) ||
        (i.ยี่ห้อหรือรูปแบบ || '').toLowerCase().includes(term) ||
        (i.รายการ || '').toLowerCase().includes(term) ||
        (i.สภาพ || '').toLowerCase().includes(term) ||
        (i.รายละเอียด || '').toLowerCase().includes(term)
      );
      
      return matchType && matchBrand && matchName && matchCond && matchDet && matchQty && matchSearch;
    });
  }, [items, filterType, filterBrand, filterName, filterCondition, filterDetail, qtyLimit, searchTerm]);

  // Robust ArrayBuffer to Base64
  const bufferToBase64 = (buffer: ArrayBuffer) => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  // THE ULTIMATE PDF GENERATOR USING LOCAL FONTS
  const exportToPDF = async () => {
    setIsExporting(true);
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      
      // Load Regular Font
      const regRes = await fetch(sarabunRegularUrl);
      const regBuf = await regRes.arrayBuffer();
      const regBase64 = bufferToBase64(regBuf);
      
      // Load Bold Font
      const boldRes = await fetch(sarabunBoldUrl);
      const boldBuf = await boldRes.arrayBuffer();
      const boldBase64 = bufferToBase64(boldBuf);

      doc.addFileToVFS('Sarabun-Regular.ttf', regBase64);
      doc.addFont('Sarabun-Regular.ttf', 'Sarabun', 'normal');
      doc.addFileToVFS('Sarabun-Bold.ttf', boldBase64);
      doc.addFont('Sarabun-Bold.ttf', 'Sarabun', 'bold');
      
      doc.setFont('Sarabun', 'normal');
      doc.setFontSize(22);
      doc.text('รายงานสรุปยอดพัสดุคงเหลือ', 105, 15, { align: 'center' });
      
      doc.setFontSize(10);
      doc.text(`จัดทำโดย: ระบบจัดการพัสดุ | วันที่: ${new Date().toLocaleString('th-TH')}`, 105, 22, { align: 'center' });
      doc.text(`ประเภท: ${filterType} | ยี่ห้อ: ${filterBrand} | รายการ: ${filterName}`, 105, 27, { align: 'center' });

      const tableData = filteredItems.map((item, index) => [
        index + 1,
        item.ประเภท,
        item.ยี่ห้อหรือรูปแบบ,
        item.รายการ,
        item.สภาพ,
        item.รายละเอียด,
        item.ขนาด,
        item.จำนวน
      ]);

      autoTable(doc, {
        startY: 32,
        head: [['ลำดับ', 'ประเภท', 'ยี่ห้อ/รูปแบบ', 'รายการพัสดุ', 'สภาพ', 'รายละเอียด', 'ขนาด', 'ยอดคงเหลือ']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [30, 41, 59], textColor: 255, halign: 'center', font: 'Sarabun', fontStyle: 'bold' },
        styles: { font: 'Sarabun', fontSize: 10, cellPadding: 2, overflow: 'linebreak' },
        columnStyles: {
          0: { halign: 'center', cellWidth: 10 },
          7: { halign: 'right', fontStyle: 'bold', cellWidth: 20 }
        },
        margin: { top: 32 }
      });

      doc.save(`Stock_Report_${new Date().getTime()}.pdf`);
    } catch (e) {
      console.error(e);
      alert("เกิดข้อผิดพลาดในการดึงฟอนต์หรือสร้าง PDF");
    } finally {
      setIsExporting(false);
    }
  };

  const exportToExcel = () => {
    const tableData = filteredItems.map((item, index) => ({
      'ลำดับ': index + 1,
      'ประเภท': item.ประเภท,
      'ยี่ห้อ/รูปแบบ': item.ยี่ห้อหรือรูปแบบ,
      'รายการพัสดุ': item.รายการ,
      'สภาพ': item.สภาพ,
      'รายละเอียด': item.รายละเอียด,
      'ขนาด': item.ขนาด,
      'ยอดคงเหลือ': item.จำนวน
    }));

    const worksheet = XLSX.utils.json_to_sheet(tableData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory Stock");
    const fileName = `Stock_Report_${new Date().getTime()}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const selectLayout = "w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-[14px] font-bold text-secondary outline-none appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22currentColor%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22m19%209-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.2em_1.2em] bg-[right_0.6rem_center] bg-no-repeat h-11";
  const labelLayout = "text-[11px] font-black text-secondary/40 uppercase tracking-[0.1em] ml-1 leading-none";

  return (
    <div className="pb-20 space-y-4 px-2 md:px-0">
      <div className="flex justify-between items-end px-1 pt-2">
        <div className="flex flex-col">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">คลังพัสดุ</h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Inventory Stock</p>
        </div>
        <div className="bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
           <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{items.length} รายการ</span>
        </div>
      </div>

      <div className="bg-white border-y border-slate-100 -mx-4 md:mx-0 md:rounded-2xl md:border p-4 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            ['หมวดหมู่', filterType, setFilterType, types],
            ['ยี่ห้อ', filterBrand, setFilterBrand, brands],
            ['ชื่อรายการ', filterName, setFilterName, names],
            ['สภาพ', filterCondition, setFilterCondition, conditions],
            ['รายละเอียด', filterDetail, setFilterDetail, detailList]
          ].map(([label, value, setter, options], i) => (
            <div key={i} className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{label as string}</label>
              <select title={label as string} value={value as string} onChange={e => (setter as any)(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 h-10 text-[13px] font-medium outline-none">
                {(options as any[]).map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          ))}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">จำนวน ≤</label>
            <input 
                type="number" 
                placeholder="0" 
                value={qtyLimit}
                onChange={e => setQtyLimit(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 h-10 text-[13px] font-medium outline-none text-center"
              />
          </div>
        </div>

        <div className="flex gap-2 pt-2">
            <div className="flex-1 relative">
              <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-300 text-[18px]">search</span>
              <input 
                type="text" 
                placeholder="ค้นหาพัสดุ..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-4 h-10 text-[13px] font-medium outline-none"
              />
            </div>
            <button onClick={resetFilters} className="px-4 h-10 bg-slate-100 text-slate-500 rounded-lg text-[11px] font-bold uppercase active:scale-95">รีเซ็ต</button>
        </div>
      </div>

      <div className="space-y-0.5 -mx-4 md:mx-0">
        {filteredItems.map((item, idx) => {
          const isCritical = item.จำนวน <= 5;
          return (
            <div key={idx} className="bg-white px-4 py-4 border-b border-slate-50 flex items-center justify-between gap-4 active:bg-slate-50 transition-colors">
               <div className="flex flex-col min-w-0 flex-1 gap-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-primary uppercase tracking-widest leading-none bg-primary/5 px-1.5 py-0.5 rounded">
                      {item.ประเภท}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                      {item.ยี่ห้อหรือรูปแบบ}
                    </span>
                  </div>
                  <h4 className="text-[15px] font-bold text-slate-900 leading-tight truncate">
                    {item.รายการ}
                  </h4>
                  <div className="flex gap-2 text-[11px] text-slate-400 font-medium">
                    {item.สภาพ && <span>{item.สภาพ}</span>}
                    {item.รายละเอียด && <span>• {item.รายละเอียด}</span>}
                    {item.ขนาด && <span>• {item.ขนาด}</span>}
                  </div>
               </div>
               
               <div className={`flex flex-col items-end shrink-0`}>
                  <p className={`text-[18px] font-bold tracking-tight ${isCritical ? 'text-rose-500' : 'text-slate-900'}`}>
                    {item.จำนวน.toLocaleString()}
                  </p>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-[-2px]">คงเหลือ</span>
               </div>
            </div>
          );
        })}
        {filteredItems.length === 0 && (
          <div className="py-20 text-center">
             <p className="text-slate-300 font-bold uppercase tracking-[0.2em] text-[10px]">ไม่พบข้อมูล</p>
          </div>
        )}
      </div>

      {/* Export Section - Simple Flat Buttons */}
      <div className="flex gap-2 px-1 pt-4">
        <button onClick={exportToExcel} className="flex-1 h-12 bg-emerald-600 text-white rounded-xl text-[12px] font-bold uppercase flex items-center justify-center gap-2 active:scale-95 transition-all">
          <span className="material-symbols-outlined text-[20px]">download</span>
          Excel Report
        </button>
        <button onClick={exportToPDF} disabled={isExporting} className="flex-1 h-12 bg-rose-600 text-white rounded-xl text-[12px] font-bold uppercase flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50">
          <span className="material-symbols-outlined text-[20px]">{isExporting ? 'hourglass_top' : 'download'}</span>
          PDF Report
        </button>
      </div>
    </div>
  );
}
