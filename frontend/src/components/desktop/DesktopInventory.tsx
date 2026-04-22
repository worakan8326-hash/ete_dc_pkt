import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  RefreshCw, 
  FileSpreadsheet, 
  FileText,
  ChevronDown,
  AlertCircle,
  MoreVertical,
  History
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface DesktopInventoryProps {
  items: any[];
  warehouses?: any[];
  onRefresh?: () => void;
  loading?: boolean;
  onNavigate?: (tabId: string) => void;
}

const DesktopInventory: React.FC<DesktopInventoryProps> = ({ items, warehouses = [], onRefresh, loading, onNavigate }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ทั้งหมด');
  const [filterBrand, setFilterBrand] = useState('ทั้งหมด');
  const [filterCondition, setFilterCondition] = useState('ทั้งหมด');
  const [filterWarehouse, setFilterWarehouse] = useState('ทั้งหมด');

  // Dynamic Options for Filters
  const types = useMemo(() => ['ทั้งหมด', ...Array.from(new Set(items.map(i => i.ประเภท).filter(Boolean))).sort()], [items]);
  const brands = useMemo(() => ['ทั้งหมด', ...Array.from(new Set(items.map(i => i.ยี่ห้อหรือรูปแบบ).filter(Boolean))).sort()], [items]);
  const conditions = useMemo(() => ['ทั้งหมด', ...Array.from(new Set(items.map(i => i.สภาพ).filter(Boolean))).sort()], [items]);

  const filteredItems = useMemo(() => {
    const targetWhId = filterWarehouse !== 'ทั้งหมด' ? warehouses.find(w => String(w.name || w.ศูนย์) === filterWarehouse)?.id : null;

    return items
      .map(item => {
        if (targetWhId) {
          const ws = item.warehouse_stocks?.find((s: any) => s.warehouse_id === targetWhId);
          return {
            ...item,
            จำนวน: ws ? ws.stock_qty : 0,
            repair_qty: ws ? ws.repair_qty : 0,
            scrap_qty: ws ? ws.scrap_qty : 0,
            lost_qty: ws ? ws.lost_qty : 0,
            quarantine_qty: ws ? ws.quarantine_qty : 0,
            transit_qty: ws ? ws.transit_qty : 0,
          };
        }
        return item;
      })
      .filter(item => {
        const matchSearch = (item.รายการ || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (item.รายละเอียด || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (item.ยี่ห้อหรือรูปแบบ || '').toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchType = filterType === 'ทั้งหมด' || item.ประเภท === filterType;
        const matchBrand = filterBrand === 'ทั้งหมด' || item.ยี่ห้อหรือรูปแบบ === filterBrand;
        const matchCond = filterCondition === 'ทั้งหมด' || item.สภาพ === filterCondition;
        
        if (!matchSearch || !matchType || !matchBrand || !matchCond) return false;

        // If focusing on a warehouse, only show relevant items
        if (targetWhId && !searchTerm) {
           return (Number(item.จำนวน) || 0) > 0 || 
                  (Number(item.transit_qty) || 0) > 0 || 
                  (Number(item.quarantine_qty) || 0) > 0;
        }
        return true;
      });
  }, [items, searchTerm, filterType, filterBrand, filterCondition, filterWarehouse, warehouses]);

  const resetFilters = () => {
    setSearchTerm('');
    setFilterType('ทั้งหมด');
    setFilterBrand('ทั้งหมด');
    setFilterCondition('ทั้งหมด');
    setFilterWarehouse('ทั้งหมด');
  };

  // Export Handlers
  const exportToExcel = () => {
    const data = filteredItems.map((item, idx) => ({
      'ลำดับ': idx + 1,
      'ประเภท': item.ประเภท,
      'ยี่ห้อ/รูปแบบ': item.ยี่ห้อหรือรูปแบบ,
      'รายการพัสดุ': item.รายการ,
      'สภาพ': item.สภาพ,
      'จำนวนคงเหลือ': item.จำนวน,
      'ระหว่างส่ง': item.transit_qty || 0,
      'รอตรวจ': item.quarantine_qty || 0,
      'รอซ่อม': item.repair_qty || 0,
      'ซาก': item.scrap_qty || 0
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventory");
    XLSX.writeFile(wb, `Inventory_Detailed_${new Date().getTime()}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    doc.setFont("Sarabun");
    doc.text('รายงานสรุปสต็อกพัสดุแบบละเอียด', 14, 15);
    
    const tableData = filteredItems.map((item, idx) => [
      idx + 1, item.ประเภท, item.ยี่ห้อหรือรูปแบบ, item.รายการ, item.จำนวน, item.transit_qty || 0, item.quarantine_qty || 0, item.repair_qty || 0, item.scrap_qty || 0
    ]);

    autoTable(doc, {
      startY: 20,
      head: [['#', 'ประเภท', 'ยี่ห้อ', 'รายการ', 'คลัง', 'ระหว่างส่ง', 'รอตรวจ', 'ซ่อม', 'ซาก']],
      body: tableData,
      theme: 'grid',
      styles: { font: 'Sarabun', fontSize: 8 },
      headStyles: { fillColor: [79, 70, 229] }
    });
    doc.save(`Detailed_Inventory_${new Date().getTime()}.pdf`);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* 🟢 Top Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
        <div className="flex-1 flex flex-col md:flex-row items-center gap-4">
           <div className="relative w-full md:w-[480px] group flex items-center gap-2">
              <div className="relative flex-1 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={18} />
                <input 
                  type="text" 
                  placeholder="ค้นหาชื่อพัสดุ, ยี่ห้อ หรือข้อมูลอื่นๆ..." 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-11 pr-4 h-14 bg-white border border-slate-200 rounded-full text-[15px] font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/20 transition-all placeholder:text-slate-300 shadow-sm"
                />
              </div>
              <button className="h-14 px-8 bg-indigo-600 text-white rounded-full flex items-center justify-center gap-2 font-black text-[13px] uppercase shadow-xl shadow-indigo-100/50 active:scale-95 transition-all shrink-0">
                 <Search size={18} />
                 <span>ค้นหา</span>
              </button>
           </div>
           <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
              <select 
                title="เลือกจังหวัด/ศูนย์"
                value={filterWarehouse}
                onChange={e => setFilterWarehouse(e.target.value)}
                className="px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-xl text-[13px] font-bold text-indigo-600 outline-none hover:bg-white transition-all cursor-pointer"
              >
                <option value="ทั้งหมด">ศูนย์ ทั้งหมด</option>
                {warehouses.map(w => <option key={w.id} value={w.name || w.ศูนย์}>{w.name || w.ศูนย์}</option>)}
              </select>
              <select 
                title="เลือกประเภท"
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
                className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[14px] font-semibold text-slate-600 outline-none hover:bg-white transition-all cursor-pointer"
              >
                {types.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <button 
                onClick={resetFilters} 
                className="px-4 py-2 text-[12px] font-bold text-slate-400 hover:text-rose-500 transition-colors whitespace-nowrap"
              >
                ล้างตัวกรอง
              </button>
           </div>
        </div>
        <div className="flex items-center gap-2">
           <button onClick={exportToExcel} className="p-2.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm" title="Excel">
              <FileSpreadsheet size={20} />
           </button>
           <button onClick={exportToPDF} className="p-2.5 bg-rose-50 text-rose-600 border border-rose-100 rounded-xl hover:bg-rose-600 hover:text-white transition-all shadow-sm" title="PDF">
              <FileText size={20} />
           </button>
           <div className="w-px h-8 bg-slate-100 mx-2"></div>
           <button 
             onClick={onRefresh} 
             disabled={loading}
             className={`p-2.5 bg-white border border-slate-200 text-slate-500 rounded-xl hover:bg-slate-50 transition-all shadow-sm ${loading ? 'animate-spin' : 'active:scale-90'}`}
           >
              <RefreshCw size={20} />
           </button>

           {onNavigate && (
              <button 
                onClick={() => onNavigate('transfer')}
                className="bg-sky-500 flex items-center justify-center gap-2 px-5 h-[40px] rounded-xl text-white shadow-lg shadow-sky-500/20 active:scale-95 transition-all ml-2"
                title="ย้ายพัสดุระหว่างคลัง"
              >
                <span className="material-symbols-outlined text-[18px]">swap_horiz</span>
                <span className="text-[12px] font-black uppercase tracking-widest whitespace-nowrap">ย้ายพัสดุ</span>
              </button>
           )}
        </div>
      </div>

      {/* 📊 Inventory Table */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden min-h-[500px]">
        <div className="overflow-x-auto custom-scrollbar">
           <table className="w-full text-left border-collapse">
              <thead>
                 <tr className="bg-slate-50/80 sticky top-0 z-10 backdrop-blur-md">
                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">พัสดุ</th>
                    <th className="px-4 py-5 text-[10px] font-black text-emerald-600 uppercase tracking-widest border-b border-slate-100 text-center">พร้อมใช้</th>
                    <th className="px-4 py-5 text-[10px] font-black text-blue-600 uppercase tracking-widest border-b border-slate-100 text-center">ระหว่างส่ง</th>
                    <th className="px-4 py-5 text-[10px] font-black text-purple-600 uppercase tracking-widest border-b border-slate-100 text-center">รอตรวจ</th>
                    <th className="px-4 py-5 text-[10px] font-black text-amber-600 uppercase tracking-widest border-b border-slate-100 text-center">รอซ่อม</th>
                    <th className="px-4 py-5 text-[10px] font-black text-rose-600 uppercase tracking-widest border-b border-slate-100 text-center">ซาก/หาย</th>
                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">รวมทั้งหมด</th>
                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-center">ประวัติ</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                 {filteredItems.map((item, idx) => {
                    const total = (Number(item.จำนวน) || 0) + (Number(item.transit_qty) || 0) + (Number(item.quarantine_qty) || 0) + (Number(item.repair_qty) || 0) + (Number(item.scrap_qty) || 0) + (Number(item.lost_qty) || 0);

                    return (
                       <tr key={`${item.id}-${idx}`} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-6 py-4">
                             <div className="flex flex-col">
                                <span className="text-[15px] font-black text-slate-900 leading-tight">{item.รายการ}</span>
                                <div className="flex items-center gap-2 mt-0.5">
                                   <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{item.ประเภท}</span>
                                   <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                   <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">{item.ยี่ห้อหรือรูปแบบ}</span>
                                </div>
                             </div>
                          </td>
                          <td className="px-4 py-4 text-center">
                             <span className={`text-[16px] font-black ${item.จำนวน > 0 ? 'text-emerald-600' : 'text-slate-200'}`}>
                                {item.จำนวน || '0'}
                             </span>
                          </td>
                          <td className="px-4 py-4 text-center">
                             <span className={`text-[16px] font-black ${item.transit_qty > 0 ? 'text-blue-600' : 'text-slate-200'}`}>
                                {item.transit_qty || '0'}
                             </span>
                          </td>
                          <td className="px-4 py-4 text-center">
                             <span className={`text-[16px] font-black ${item.quarantine_qty > 0 ? 'text-purple-600' : 'text-slate-200'}`}>
                                {item.quarantine_qty || '0'}
                             </span>
                          </td>
                          <td className="px-4 py-4 text-center">
                             <span className={`text-[16px] font-black ${item.repair_qty > 0 ? 'text-amber-600' : 'text-slate-200'}`}>
                                {item.repair_qty || '0'}
                             </span>
                          </td>
                          <td className="px-4 py-4 text-center">
                             <span className={`text-[16px] font-black ${(item.scrap_qty > 0 || item.lost_qty > 0) ? 'text-rose-600' : 'text-slate-200'}`}>
                                {(Number(item.scrap_qty || 0) + Number(item.lost_qty || 0)) || '0'}
                             </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                             <span className="text-[18px] font-black text-slate-900 tracking-tighter">
                                {total.toLocaleString()}
                             </span>
                          </td>
                          <td className="px-6 py-4">
                             <div className="flex items-center justify-center">
                                <button className="p-2 hover:bg-slate-100 text-slate-300 hover:text-indigo-600 rounded-lg transition-all" title="View Logs">
                                   <History size={18} />
                                </button>
                             </div>
                          </td>
                       </tr>
                    );
                 })}
              </tbody>
           </table>
           
           {filteredItems.length === 0 && (
              <div className="py-32 flex flex-col items-center justify-center text-center">
                 <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mb-4">
                    <Search size={32} />
                 </div>
                 <h3 className="text-slate-900 font-bold">ไม่พบข้อมูลพัสดุ</h3>
                 <p className="text-slate-400 text-sm mt-1">ลองเปลี่ยนคำค้นหาหรือตัวกรองใหม่</p>
                 <button onClick={resetFilters} className="mt-4 text-emerald-600 font-bold text-sm hover:underline">รีเซ็ตทั้งหมด</button>
              </div>
           )}
        </div>

        {/* 🟢 Footer Info */}
        <div className="px-8 py-5 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
            <p className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">
               แสดงผล {filteredItems.length} จากทั้งหมด {items.length} รายการ
            </p>
            <div className="flex items-center gap-4">
               <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase">ใกล้หมด (≤ 5)</span>
               </div>
               <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase">ปกติ</span>
               </div>
            </div>
        </div>
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default DesktopInventory;
