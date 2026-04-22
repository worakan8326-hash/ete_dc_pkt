import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Search, RotateCcw } from 'lucide-react';

// Add Sarabun font for PDF export (Standard for Thai)

interface DashboardProps {
  items: any[];
  warehouses?: any[];
  onRefresh?: () => void;
  loading?: boolean;
  onNavigate?: (tabId: string) => void;
}


const Dashboard: React.FC<DashboardProps> = ({ items, warehouses = [], onRefresh, loading, onNavigate }) => {

  const [searchTerm, setSearchTerm] = useState('');
  const [qtyLimit, setQtyLimit] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [expandedItem, setExpandedItem] = useState<number | null>(null);


  // Filters State
  const [filterType, setFilterType] = useState('ทั้งหมด');
  const [filterBrand, setFilterBrand] = useState('ทั้งหมด');
  const [filterName, setFilterName] = useState('ทั้งหมด');
  const [filterCondition, setFilterCondition] = useState('ทั้งหมด');
  const [filterDetail, setFilterDetail] = useState('ทั้งหมด');
  const [filterWarehouse, setFilterWarehouse] = useState('ทั้งหมด');

  // Unique options for filters
  // Smart Dynamic Filtering Options
  const types = useMemo(() => {
    const subset = items.filter(it => 
      (filterCondition === 'ทั้งหมด' || it.สภาพ === filterCondition) &&
      (filterDetail === 'ทั้งหมด' || it.รายละเอียด === filterDetail) &&
      (filterWarehouse === 'ทั้งหมด' || (it.warehouse_stocks && it.warehouse_stocks.some((ws: any) => {
        const wh = warehouses.find(w => w.id === ws.warehouseId);
        return wh && String(wh.name) === filterWarehouse;
      })))
    );
    const options = Array.from(new Set(subset.map(i => i.ประเภท).filter(Boolean))).sort();
    return ['ทั้งหมด', ...options];
  }, [items, filterBrand, filterName, filterCondition, filterDetail, filterWarehouse]);

  const brands = useMemo(() => {
    const subset = items.filter(it => 
      (filterType === 'ทั้งหมด' || it.ประเภท === filterType) &&
      (filterName === 'ทั้งหมด' || it.รายการ === filterName) &&
      (filterCondition === 'ทั้งหมด' || it.สภาพ === filterCondition) &&
      (filterDetail === 'ทั้งหมด' || it.รายละเอียด === filterDetail) &&
      (filterWarehouse === 'ทั้งหมด' || (it.warehouse_stocks && it.warehouse_stocks.some((ws: any) => {
        const wh = warehouses.find(w => w.id === ws.warehouseId);
        return wh && String(wh.name) === filterWarehouse;
      })))
    );
    const options = Array.from(new Set(subset.map(i => i.ยี่ห้อหรือรูปแบบ).filter(Boolean))).sort();
    return ['ทั้งหมด', ...options];
  }, [items, filterType, filterName, filterCondition, filterDetail, filterWarehouse]);

  const names = useMemo(() => {
    const subset = items.filter(it => 
      (filterType === 'ทั้งหมด' || it.ประเภท === filterType) &&
      (filterBrand === 'ทั้งหมด' || it.ยี่ห้อหรือรูปแบบ === filterBrand) &&
      (filterCondition === 'ทั้งหมด' || it.สภาพ === filterCondition) &&
      (filterDetail === 'ทั้งหมด' || it.รายละเอียด === filterDetail) &&
      (filterWarehouse === 'ทั้งหมด' || (it.warehouse_stocks && it.warehouse_stocks.some((ws: any) => {
        const wh = warehouses.find(w => w.id === ws.warehouseId);
        return wh && String(wh.name) === filterWarehouse;
      })))
    );
    const options = Array.from(new Set(subset.map(i => i.รายการ).filter(Boolean))).sort();
    return ['ทั้งหมด', ...options];
  }, [items, filterType, filterBrand, filterCondition, filterDetail, filterWarehouse]);

  const conditions = useMemo(() => {
    const subset = items.filter(it => 
      (filterType === 'ทั้งหมด' || it.ประเภท === filterType) &&
      (filterBrand === 'ทั้งหมด' || it.ยี่ห้อหรือรูปแบบ === filterBrand) &&
      (filterName === 'ทั้งหมด' || it.รายการ === filterName) &&
      (filterDetail === 'ทั้งหมด' || it.รายละเอียด === filterDetail) &&
      (filterWarehouse === 'ทั้งหมด' || (it.warehouse_stocks && it.warehouse_stocks.some((ws: any) => {
        const wh = warehouses.find(w => w.id === ws.warehouseId);
        return wh && String(wh.name) === filterWarehouse;
      })))
    );
    const options = Array.from(new Set(subset.map(i => i.สภาพ).filter(Boolean))).sort();
    return ['ทั้งหมด', ...options];
  }, [items, filterType, filterBrand, filterName, filterDetail, filterWarehouse]);

  const detailList = useMemo(() => {
    const subset = items.filter(it => 
      (filterType === 'ทั้งหมด' || it.ประเภท === filterType) &&
      (filterBrand === 'ทั้งหมด' || it.ยี่ห้อหรือรูปแบบ === filterBrand) &&
      (filterName === 'ทั้งหมด' || it.รายการ === filterName) &&
      (filterCondition === 'ทั้งหมด' || it.สภาพ === filterCondition) &&
      (filterWarehouse === 'ทั้งหมด' || (it.warehouse_stocks && it.warehouse_stocks.some((ws: any) => {
        const wh = warehouses.find(w => w.id === ws.warehouseId);
        return wh && String(wh.name) === filterWarehouse;
      })))
    );
    const options = Array.from(new Set(subset.map(i => i.รายละเอียด).filter(Boolean))).sort();
    return ['ทั้งหมด', ...options];
  }, [items, filterType, filterBrand, filterName, filterCondition, filterWarehouse]);

  const filteredItems = useMemo(() => {
    const targetWhId = filterWarehouse !== 'ทั้งหมด' ? warehouses.find(w => String(w.name || w.ศูนย์) === filterWarehouse)?.id : null;

    return items
      .filter(item => {
        const matchSearch = item.รายการ?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            item.รายละเอียด?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            item.ยี่ห้อหรือรูปแบบ?.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchType = filterType === 'ทั้งหมด' || item.ประเภท === filterType;
        const matchBrand = filterBrand === 'ทั้งหมด' || item.ยี่ห้อหรือรูปแบบ === filterBrand;
        const matchName = filterName === 'ทั้งหมด' || item.รายการ === filterName;
        const matchCond = filterCondition === 'ทั้งหมด' || item.สภาพ === filterCondition;
        const matchDetail = filterDetail === 'ทั้งหมด' || item.รายละเอียด === filterDetail;
        
        // Warehouse matching
        let matchWh = filterWarehouse === 'ทั้งหมด';
        if (!matchWh && item.warehouse_stocks) {
          matchWh = item.warehouse_stocks.some((ws: any) => ws.warehouseId === targetWhId);
        }
        
        return matchSearch && matchType && matchBrand && matchName && matchCond && matchDetail && matchWh;
      })
      .map(item => {
        // Dynamic quantity calculation based on filter
        if (targetWhId) {
          const ws = item.warehouse_stocks?.find((s: any) => s.warehouseId === targetWhId);
          return {
            ...item,
            จำนวน: ws ? ws.stock : 0,
            repair_qty: ws ? ws.repair : 0,
            scrap_qty: ws ? ws.scrap : 0,
            lost_qty: ws ? ws.lost : 0,
            quarantine_qty: ws ? ws.quarantine : 0,
          };
        }
        return item;
      })
      .filter(item => {
        const qty = parseFloat(item.จำนวน) || 0;
        const matchQty = !qtyLimit || qty <= parseFloat(qtyLimit);
        
        // If filtering by warehouse, usually hide 0 items 
        if (targetWhId && !searchTerm) return item.จำนวน > 0 && matchQty;
        
        return matchQty;
      });
  }, [items, searchTerm, filterType, filterBrand, filterName, filterCondition, filterDetail, filterWarehouse, warehouses, qtyLimit]);

  const resetFilters = () => {
    setFilterType('ทั้งหมด');
    setFilterBrand('ทั้งหมด');
    setFilterName('ทั้งหมด');
    setFilterCondition('ทั้งหมด');
    setFilterDetail('ทั้งหมด');
    setFilterWarehouse('ทั้งหมด');
    setSearchTerm('');
    setQtyLimit('');
  };


  const exportToPDF = async () => {
    setIsExporting(true);
    try {
      const doc = new jsPDF('l', 'mm', 'a4');
      
      // Setup Thai font (Note: In real app, you'd need to add font file to jsPDF)
      doc.setFont("Sarabun");
      
      doc.setFontSize(18);
      doc.text('ETE DC PHUKET - Inventory Stock Report', 14, 15);
      doc.setFontSize(10);
      doc.text(`Generated on: ${new Date().toLocaleString('th-TH')}`, 14, 22);
      doc.text(`Total Items: ${filteredItems.length}`, 14, 27);

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
    } catch (e: any) {
      console.error("PDF Export Error:", e);
      alert(`ไม่สามารถสร้าง PDF ได้: ${e.message || 'เกิดข้อผิดพลาดในการดึงฟอนต์หรือสร้าง PDF'}`);
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

  const warehouseOptions = useMemo(() => {
    return ['ทั้งหมด', ...warehouses.map(w => String(w.name || w.ศูนย์ || ''))];
  }, [warehouses]);

  return (
    <div className="pb-20 space-y-4 px-2 md:px-0">
      <div className="flex justify-between items-end px-1 pt-2">
        <div className="flex flex-col">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">คลังพัสดุ</h1>
          <p className="text-[11.5px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">สถานะคลังพัสดุ</p>
        </div>
        <div className="flex items-center gap-1.5">
             <button 
                onClick={exportToExcel}
                className="bg-emerald-500/10 flex items-center justify-center w-8 h-[28px] rounded-full border border-emerald-500/20 text-emerald-600"
                title="ดาวน์โหลด Excel"
             >
                <span className="material-symbols-outlined text-[16px]">table_view</span>
             </button>
             <button 
                onClick={exportToPDF}
                disabled={isExporting}
                className="bg-rose-500/10 flex items-center justify-center w-8 h-[28px] rounded-full border border-rose-500/20 text-rose-600 disabled:opacity-50"
                title="ดาวน์โหลด PDF"
             >
                <span className="material-symbols-outlined text-[16px] text-rose-600">{isExporting ? 'hourglass_top' : 'picture_as_pdf'}</span>
             </button>
             <button 
                onClick={() => {
                  resetFilters();
                  onRefresh?.();
                }}
                disabled={loading}
                className={`bg-slate-100 flex items-center justify-center w-8 h-[28px] rounded-full border border-slate-200 text-slate-500 ${loading ? 'animate-spin opacity-50' : ''}`}
                title="ล้างตัวกรองและรีเฟรช"
             >
                <span className="material-symbols-outlined text-[16px]">restart_alt</span>
             </button>

             {onNavigate && (
               <button 
                  onClick={() => onNavigate('transfer')}
                  className="bg-sky-500 flex items-center justify-center gap-1.5 px-3 h-[28px] rounded-full text-white shadow-lg shadow-sky-500/20 active:scale-95 transition-all"
                  title="ย้ายพัสดุระหว่างคลัง"
               >
                  <span className="material-symbols-outlined text-[14px]">swap_horiz</span>
                  <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">ย้ายพัสดุ</span>
               </button>
             )}

           <div className="bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100 h-[28px] flex items-center">
              <span className="text-[11px] font-black text-indigo-600 uppercase tracking-widest">{filteredItems.length} รายการ</span>
           </div>
        </div>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 -mx-2 md:mx-0">
         <div className="bg-indigo-600 rounded-[1.5rem] p-5 relative overflow-hidden group shadow-lg shadow-indigo-500/20">
            <div className="absolute -right-4 -top-4 w-20 h-20 bg-white/10 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
            <div className="relative z-10">
               <p className="text-[10px] font-black tracking-widest uppercase text-indigo-200">รวมพัสดุ (ที่กรอง)</p>
               <p className="text-3xl font-black text-white mt-1 leading-none">{filteredItems.reduce((sum, item) => sum + (parseFloat(item.จำนวน) || 0), 0).toLocaleString()}</p>
               <div className="flex items-center gap-1.5 mt-2 opacity-80">
                  <span className="material-symbols-outlined text-[14px] text-white">inventory_2</span>
                  <p className="text-[10px] font-bold text-white">{filteredItems.length} รายการ (SKU)</p>
               </div>
            </div>
         </div>
         
         <div className="bg-white border border-rose-100 rounded-[1.5rem] p-5 relative overflow-hidden group shadow-[0_4px_20px_-10px_rgba(244,63,94,0.15)] hover:border-rose-300 transition-all group-hover:-translate-y-0.5">
            <div className="absolute right-0 bottom-0 p-3 opacity-[0.03] group-hover:opacity-10 group-hover:scale-110 transition-all">
               <span className="material-symbols-outlined text-[70px] text-rose-500">warning</span>
            </div>
            <div className="relative z-10">
               <p className="text-[10px] font-black tracking-widest uppercase text-rose-400">สต็อกใกล้หมด (≤ 10)</p>
               <p className="text-3xl font-black text-slate-800 mt-1 leading-none">{filteredItems.filter(item => (parseFloat(item.จำนวน) || 0) <= 10 && (parseFloat(item.จำนวน) || 0) > 0).length}</p>
               <div className="flex items-center gap-1.5 mt-2">
                  <div className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse"></div>
                  <p className="text-[10px] font-bold text-slate-400">รายการที่ต้องสั่งเพิ่มด่วน</p>
               </div>
            </div>
         </div>

         <div className="bg-white border border-slate-100 rounded-[1.5rem] p-5 relative overflow-hidden group shadow-sm hover:border-slate-300 transition-all col-span-2 md:col-span-1 border-b-amber-300 border-b-[3px]">
            <div className="absolute right-0 bottom-0 p-3 opacity-[0.03] group-hover:opacity-10 group-hover:scale-110 transition-all">
               <span className="material-symbols-outlined text-[70px] text-slate-500">outbox</span>
            </div>
            <div className="relative z-10">
               <p className="text-[10px] font-black tracking-widest uppercase text-slate-400">ของหมด (Out of Stock)</p>
               <p className="text-3xl font-black text-slate-800 mt-1 leading-none">{filteredItems.filter(item => (parseFloat(item.จำนวน) || 0) === 0).length}</p>
               <div className="flex items-center gap-1.5 mt-2">
                  <div className="w-1.5 h-1.5 bg-amber-500 rounded-full"></div>
                  <p className="text-[10px] font-bold text-slate-400">พัสดุไม่มีในคลัง</p>
               </div>
            </div>
         </div>
      </div>

      <div className="bg-white border-y border-slate-100 -mx-4 md:mx-0 md:rounded-[2rem] md:border p-5 space-y-5 shadow-sm shadow-slate-100">
        <div className="grid grid-cols-2 gap-3">
          {[
            ['จังหวัด (Sub DC)', filterWarehouse, setFilterWarehouse, warehouseOptions],
            ['หมวดหมู่', filterType, setFilterType, types],
            ['ยี่ห้อ', filterBrand, setFilterBrand, brands],
            ['ชื่อรายการ', filterName, setFilterName, names],
            ['สภาพ', filterCondition, setFilterCondition, conditions],
            ['รายละเอียด', filterDetail, setFilterDetail, detailList]
          ].map(([label, value, setter, options], i) => (
            <div key={i} className="space-y-1">
              <label className="text-[12px] font-black text-slate-300 uppercase tracking-widest ml-1">{label as string}</label>
              <select 
                title={label as string} 
                value={value as string} 
                onChange={e => {
                  if (label === 'หมวดหมู่') {
                    const newVal = e.target.value;
                    resetFilters();
                    setFilterType(newVal);
                  } else {
                    (setter as any)(e.target.value);
                  }
                }} 
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 h-11 text-[13px] font-bold outline-none focus:bg-white focus:border-primary/20"
              >
                {(options as any[]).map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          ))}
          <div className="space-y-1">
            <label className="text-[12px] font-black text-slate-300 uppercase tracking-widest ml-1">จำนวน ≤</label>
            <input 
                type="number" 
                placeholder="0" 
                value={qtyLimit}
                onChange={e => setQtyLimit(e.target.value)}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 h-11 text-[13px] font-black outline-none focus:bg-white focus:border-primary/20 text-center"
              />
          </div>
        </div>

         <div className="flex items-center gap-2 pt-2">
             <div className="relative flex-1 group">
               <Search size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors" />
               <input 
                 type="text" 
                 placeholder="ค้นหาพัสดุหรือเลขที่งาน..." 
                 value={searchTerm}
                 onChange={e => setSearchTerm(e.target.value)}
                 className="w-full h-14 bg-white border border-slate-200 rounded-full pl-16 pr-6 font-bold text-slate-700 shadow-sm outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/20 transition-all placeholder:text-slate-300"
               />
             </div>
             <button className="h-14 px-8 bg-indigo-600 text-white rounded-full flex items-center justify-center gap-2 font-black text-[13px] uppercase shadow-xl shadow-indigo-100/50 active:scale-95 transition-all shrink-0">
                <Search size={18} />
                <span>ค้นหา</span>
             </button>
             <button onClick={resetFilters} className="h-14 w-14 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center active:scale-95 transition-all shadow-sm shrink-0" title="รีเซ็ต">
                <RotateCcw size={18} />
             </button>
         </div>
      </div>


      <div className="space-y-0.5 md:space-y-3 -mx-4 md:mx-0">
        {filteredItems.map((item, idx) => {
          const isCritical = item.จำนวน <= 5 && item.จำนวน > 0;
          const isOut = item.จำนวน === 0;

          return (
            <div 
              key={idx} 
              onClick={() => setExpandedItem(expandedItem === idx ? null : idx)}
              className={`bg-white px-5 py-4 border-b border-slate-100 md:border md:rounded-[1.5rem] md:shadow-sm flex items-center justify-between gap-4 active:bg-slate-50 cursor-pointer transition-all hover:border-slate-300 relative overflow-hidden group ${expandedItem === idx ? 'bg-slate-50 border-slate-200 shadow-inner' : ''}`}
            >
               {isCritical && <div className="absolute top-0 left-0 w-1.5 h-full bg-rose-500"></div>}
               {isOut && <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500"></div>}
               {!isCritical && !isOut && <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>}
               
               <div className={`flex flex-col min-w-0 flex-1 ${(isCritical || isOut) ? 'pl-2' : 'group-hover:pl-2 transition-all'}`}>
                  <p className="text-[14px] font-black text-slate-900 leading-snug flex items-center gap-2 flex-wrap">
                    <span className="text-indigo-600 uppercase tracking-tight">{item.ประเภท}</span>
                    {item.ยี่ห้อหรือรูปแบบ && <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded uppercase tracking-widest text-slate-600 border border-slate-200 shadow-sm">{item.ยี่ห้อหรือรูปแบบ}</span>}
                    <span className="text-slate-800">{item.รายการ}</span>
                  </p>
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    {item.สภาพ && <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 uppercase tracking-widest">{item.สภาพ}</span>}
                    {item.ขนาด && <span className="text-[9px] font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-100 uppercase tracking-widest">{item.ขนาด}</span>}
                    {item.รายละเอียด && <span className="text-[10px] font-medium text-slate-400">{item.รายละเอียด}</span>}
                  </div>
               </div>
               
               <div className="flex flex-col items-end shrink-0">
                  <p className={`text-[22px] font-black tracking-tighter leading-none ${isOut ? 'text-amber-500' : isCritical ? 'text-rose-500' : 'text-slate-900'}`}>
                    {item.จำนวน.toLocaleString()}
                  </p>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">คงเหลือ</span>
               </div>
            </div>
          );
        })}
        {filteredItems.length === 0 && (
          <div className="py-24 text-center bg-white border border-dashed border-slate-200 rounded-[2rem] mx-4 md:mx-0">
             <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-[32px] text-slate-300">inventory_2</span>
             </div>
             <p className="text-slate-400 font-black uppercase tracking-[0.1em] text-[12px]">ไม่พบพัสดุตามเงื่อนไข (0 รายการ)</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
