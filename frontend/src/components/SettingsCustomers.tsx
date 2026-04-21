import React, { useState, useMemo } from 'react';
import { Search, RefreshCw, X, ZoomIn } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ImageLightbox } from './CommonUI';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { usePossession } from '../hooks/usePossession';
import { formatThaiDate } from '../utils/dateTimeUtils';

interface SettingsCustomersProps {
  customers: any[];
  transactions?: any[];
  logisticsJobs?: any[];
  onEditCustomer: (customer: any) => void;
  onDeleteCustomer: (customer: any) => void;
  onAddCustomer: () => void;
  onLoadCustomers: () => void;
  isLoadingCustomers: boolean;
}

/**
 * 📦 CustomerAssetBadge Component
 * Lightweight summary of units in possession
 */

const CustomerAssetBadge: React.FC<{ cv: string, transactions: any[], logisticsJobs: any[] }> = ({ cv, transactions, logisticsJobs }) => {
  const possession = usePossession(transactions, cv, logisticsJobs);
  
  if (!possession || possession.length === 0) return null;

  // Split: ตู้แช่ = individual detail cards, others = grouped
  const freezers = possession.filter(it => String(it.name || '').includes('ตู้'));
  const others = possession.filter(it => !String(it.name || '').includes('ตู้'));
  const othersTotalQty = others.reduce((sum, it) => sum + it.qty, 0);

  return (
    <div className="flex flex-col gap-2.5 mt-3">
      {/* ❄️ Freezers — each shown individually with full detail */}
      {freezers.map((item, idx) => {
        const nameParts = [item.name || 'ตู้แช่'];
        if (item.detail && item.detail !== '-') nameParts.push(item.detail);
        const mainLabel = nameParts.join(' ');

        const metaParts: string[] = [];
        if (item.size && item.size !== '-') metaParts.push(`ขนาด ${item.size}`);
        if (item.condition && item.condition !== '-') metaParts.push(`สภาพ ${item.condition}`);
        const metaLabel = metaParts.join(' • ');

        return (
          <div key={`f-${idx}`} className="flex items-center gap-3 bg-sky-50 border border-sky-200/60 px-4 py-3 rounded-2xl shadow-sm">
             <div className="w-10 h-10 bg-sky-100 rounded-xl flex items-center justify-center shrink-0">
               <span className="material-symbols-outlined text-[22px] text-sky-500">ac_unit</span>
             </div>
             <div className="flex flex-col leading-snug flex-1 min-w-0">
                <span className="text-[13px] font-black text-sky-800 uppercase tracking-tight">{mainLabel}</span>
                {metaLabel && (
                  <span className="text-[11px] font-bold text-sky-500 tracking-wide">{metaLabel}</span>
                )}
                {item.lastDate && (
                  <span className="text-[10px] font-bold text-sky-400 mt-0.5">
                    📅 รับเมื่อ {formatThaiDate(item.lastDate)}
                  </span>
                )}
             </div>
             <div className="bg-sky-100 px-3 py-1.5 rounded-xl shrink-0">
                <span className="text-[16px] font-black text-sky-700">×{item.qty}</span>
             </div>
          </div>
        );
      })}

      {/* 📦 Others — grouped into one compact line */}
      {othersTotalQty > 0 && (
        <div className="flex items-center gap-3 bg-slate-50 border border-slate-200/60 px-4 py-2.5 rounded-2xl shadow-sm">
           <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
             <span className="material-symbols-outlined text-[18px] text-slate-400">inventory_2</span>
           </div>
           <div className="flex flex-col leading-snug flex-1 min-w-0">
              <span className="text-[12px] font-black text-slate-600 uppercase tracking-tight">อุปกรณ์เสริมอื่นๆ</span>
              <span className="text-[10px] font-bold text-slate-400 truncate">
                {others.map(o => `${o.name}(${o.qty})`).join(', ')}
              </span>
           </div>
           <div className="bg-slate-100 px-3 py-1 rounded-xl shrink-0">
              <span className="text-[14px] font-black text-slate-500">×{othersTotalQty}</span>
           </div>
        </div>
      )}
    </div>
  );
};

const SettingsCustomers: React.FC<SettingsCustomersProps> = ({ 
  customers, transactions = [], logisticsJobs = [], onEditCustomer, onDeleteCustomer, onAddCustomer, onLoadCustomers, isLoadingCustomers 
}) => {
  const [customerSearch, setCustomerSearch] = useState('');
  const [visibleCount, setVisibleCount] = useState(100);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const filteredCustomers = useMemo(() => {
    let list = customers;
    if (customerSearch) {
      const term = customerSearch.toLowerCase();
      list = list.filter(c => 
        String(c.cv || '').toLowerCase().includes(term) ||
        String(c.name || '').toLowerCase().includes(term) ||
        String(c.phone || '').includes(term) ||
        String(c.address || '').toLowerCase().includes(term)
      );
    }
    return list;
  }, [customers, customerSearch]);

  const displayedCustomers = useMemo(() => {
    return filteredCustomers.slice(0, visibleCount);
  }, [filteredCustomers, visibleCount]);

  const exportToExcel = () => {
    const data = filteredCustomers.map(c => ({
      'CV': c.cv,
      'ชื่อลูกค้า': c.name,
      'เบอร์โทร': c.phone,
      'ที่อยู่': [c.address, c.subdistrict, c.district, c.province, c.zipcode].filter(Boolean).join(' '),
      'Latitude': c.lat,
      'Longitude': c.lng
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Customers");
    XLSX.writeFile(wb, "Customer_Database.xlsx");
  };

  const exportToPDF = () => {
    const doc = new jsPDF() as any;
    doc.addFont('https://fonts.gstatic.com/s/notosansthai/v32/6xKtdS_v8m69G29HjX1qf1m-PjD9_v1P.ttf', 'NotoSansThai', 'normal');
    doc.setFont('NotoSansThai');
    
    const tableData = filteredCustomers.map(c => [
      c.cv, 
      c.name, 
      c.phone, 
      [c.subdistrict, c.district].filter(Boolean).join(', ')
    ]);

    doc.autoTable({
      head: [['CV', 'Name', 'Phone', 'Area']],
      body: tableData,
      styles: { font: 'NotoSansThai' }
    });
    doc.save("Customer_Database.pdf");
  };

  return (
    <div className="p-4 md:p-8 space-y-6 text-left">
      {/* Premium Header Container */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-10 opacity-[0.03] pointer-events-none transform rotate-12">
            <span className="material-symbols-outlined text-[100px] text-emerald-500 font-black">groups</span>
        </div>
        
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shadow-inner font-black">
             <span className="material-symbols-outlined text-[26px]">contact_page</span>
          </div>
          <div>
            <h2 className="text-[18px] font-black text-slate-900 uppercase tracking-tight leading-none">ฐานข้อมูลลูกค้า</h2>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-[10px] text-emerald-600 font-black uppercase tracking-widest bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-100">Total: {customers.length}</span>
              <button onClick={onLoadCustomers} className="text-slate-300 text-[10px] font-black uppercase hover:text-emerald-600 transition-colors tracking-widest">
                • Reload
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto relative z-10">
           <div className="flex gap-2 mr-2">
              <button onClick={exportToExcel} className="w-11 h-11 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center border border-slate-100 hover:bg-emerald-500 hover:text-white transition-all shadow-sm active:scale-95" title="Export Excel">
                <span className="material-symbols-outlined text-[20px]">table_view</span>
              </button>
              <button onClick={exportToPDF} className="w-11 h-11 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center border border-slate-100 hover:bg-rose-500 hover:text-white transition-all shadow-sm active:scale-95" title="Export PDF">
                <span className="material-symbols-outlined text-[20px]">picture_as_pdf</span>
              </button>
           </div>
           
           <button 
             onClick={onAddCustomer} 
             className="flex-1 md:flex-none h-11 px-8 bg-primary text-white rounded-xl font-black flex items-center justify-center gap-2 shadow shadow-primary/20 hover:bg-primary active:scale-95 transition-all text-[12px] uppercase tracking-widest whitespace-nowrap"
           >
             <span className="material-symbols-outlined text-[20px]">person_add</span> เพิ่มลูกค้า
           </button>
        </div>
      </div>

      {/* Search Bar Block */}
      <form 
        onSubmit={(e) => {
          e.preventDefault();
          const term = (e.currentTarget.elements.namedItem('search') as HTMLInputElement).value;
          setCustomerSearch(term);
          setVisibleCount(100);
          if (customers.length === 0) onLoadCustomers();
        }}
        className="flex items-center gap-3 w-full"
      >
        <div className="relative flex-1 group">
          <Search size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors" />
          <input 
            name="search"
            type="text" 
            placeholder="ค้นหาตามชื่อร้าน, CV, หรือเบอร์โทรศัพท์..." 
            className="w-full h-14 bg-white border border-slate-200 rounded-full pl-16 pr-6 text-[14px] font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/20 transition-all placeholder:text-slate-300 shadow-sm"
          />
        </div>
        <button 
          type="submit"
          disabled={isLoadingCustomers}
          className="h-14 px-10 bg-indigo-600 text-white rounded-full font-black text-[13px] uppercase tracking-widest hover:bg-indigo-700 active:scale-95 transition-all shadow-xl shadow-indigo-100/50 flex items-center justify-center gap-2 shrink-0"
        >
          {isLoadingCustomers ? <RefreshCw className="animate-spin" size={18} /> : <Search size={18} />}
          <span>ค้นหา</span>
        </button>
      </form>

      {/* Main Content Grid */}
      {customers.length === 0 && !isLoadingCustomers && !customerSearch ? (
         <div className="py-32 flex flex-col items-center justify-center text-center space-y-6 bg-white rounded-[3rem] border border-slate-100 shadow-sm transition-none">
            <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-[2rem] flex items-center justify-center shadow-inner">
                <span className="material-symbols-outlined text-[40px]">database</span>
            </div>
            <div className="space-y-1.5">
                <h3 className="text-[18px] font-black text-slate-800 uppercase tracking-tight">ไม่พบข้อมูลลูกค้า</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest max-w-[200px] mx-auto">กรุณากดปุ่มโหลดข้อมูลเพื่อแสดงรายชื่อร้านค้าในระบบ</p>
            </div>
            <button 
                onClick={onLoadCustomers}
                className="h-14 px-10 bg-emerald-600 text-white rounded-2xl font-black text-[13px] uppercase tracking-widest shadow shadow-emerald-600/20 active:scale-95 transition-all flex items-center gap-3"
            >
                <span className="material-symbols-outlined text-[20px]">cloud_download</span> เริ่มโหลดข้อมูล
            </button>
         </div>
      ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
            <AnimatePresence mode="popLayout">
              {displayedCustomers.map((c, idx) => (
                <motion.div 
                  key={c.cv || idx}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3, delay: idx * 0.02 }}
                  className="bg-white border border-slate-100 rounded-[2.5rem] p-6 shadow-sm hover:border-emerald-200 hover:shadow-xl hover:shadow-emerald-500/5 transition-all group relative overflow-hidden flex flex-col justify-between"
                >
                   <div className="relative z-10 space-y-5">
                      <div className="flex items-start justify-between">
                         <span className="bg-emerald-50 px-3 py-1.5 rounded-xl text-emerald-600 text-[10px] font-black tracking-widest border border-emerald-100 uppercase">
                           CV: {c.cv}
                         </span>
                         <div className="flex gap-1.5">
                            <button onClick={() => onEditCustomer(c)} className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center border border-slate-100 hover:bg-amber-500 hover:text-white transition-all shadow-sm active:scale-90">
                               <span className="material-symbols-outlined text-[18px]">edit</span>
                            </button>
                            <button onClick={() => onDeleteCustomer(c)} className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center border border-slate-100 hover:bg-rose-500 hover:text-white transition-all active:scale-90">
                               <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                         </div>
                      </div>
                      
                      <div className="flex gap-4">
                         {c.image_url ? (
                           <div 
                             className="w-20 h-20 rounded-2xl bg-white overflow-hidden cursor-zoom-in group/img relative shrink-0 border border-slate-100 shadow-sm"
                             onClick={() => setPreviewImage(c.image_url)}
                           >
                              <img src={c.image_url} className="w-full h-full object-cover transition-transform group-hover/img:scale-110" alt="Shop" />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center transition-all">
                                 <span className="material-symbols-outlined text-white opacity-0 group-hover:opacity-100 scale-50 group-hover:scale-100 transition-all">zoom_in</span>
                              </div>
                           </div>
                         ) : (
                           <div className="w-20 h-20 rounded-2xl bg-slate-50 border border-dashed border-slate-200 flex flex-col items-center justify-center shrink-0">
                              <span className="material-symbols-outlined text-slate-300 text-[24px]">image</span>
                              <span className="text-[7px] font-black text-slate-300 uppercase tracking-tighter mt-1">No Survey</span>
                           </div>
                         )}
                         
                         <div className="flex-1 space-y-2">
                            <h3 className="text-[17px] font-black text-slate-900 leading-tight line-clamp-2 min-h-[42px]">
                              {c.name}
                            </h3>
                            {c.phone && (
                              <div className="text-[11px] text-emerald-600 font-black flex items-center gap-2 bg-emerald-50/50 w-fit px-2.5 py-1 rounded-lg">
                                <span className="material-symbols-outlined text-[14px]">call</span>
                                {c.phone}
                              </div>
                            )}
                         </div>
                      </div>
  
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 group-hover:bg-white transition-all">
                         <p className="text-[11px] text-slate-500 font-bold leading-relaxed line-clamp-2">
                           <span className="material-symbols-outlined text-[16px] align-middle mr-2 text-slate-300">location_on</span>
                           {[c.address, c.subdistrict, c.district, c.province].filter(Boolean).join(' ')}
                         </p>
                         <CustomerAssetBadge cv={c.cv} transactions={transactions} logisticsJobs={logisticsJobs} />
                      </div>
                   </div>
  
                   <div className="mt-6 flex flex-col gap-2 relative z-10">
                      {(c.lat && c.lng) ? (
                         <a title="Maps" href={`https://www.google.com/maps?q=${c.lat},${c.lng}`} target="_blank" rel="noopener noreferrer" className="w-full h-12 text-[10px] font-black text-blue-600 bg-blue-50/50 rounded-2xl hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center gap-3 border border-blue-100 uppercase tracking-widest">
                            <span className="material-symbols-outlined text-[20px]">map</span> แผนที่ Google Maps
                         </a>
                      ) : (
                         <div className="w-full h-12 text-[10px] font-black text-slate-300 bg-slate-50 rounded-2xl flex items-center justify-center gap-3 border border-slate-100 uppercase tracking-widest cursor-not-allowed">
                            <span className="material-symbols-outlined text-[20px]">location_off</span> ยังไม่มีพิกัดตำแหน่ง
                         </div>
                      )}
                   </div>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {/* Load More Button */}
            {visibleCount < filteredCustomers.length && (
               <div className="col-span-full pt-8 flex flex-col items-center gap-4">
                  <button 
                    onClick={() => setVisibleCount(prev => prev + 100)}
                    className="h-14 px-12 bg-white text-emerald-600 border-2 border-emerald-600 rounded-2xl font-black text-[13px] uppercase tracking-[0.2em] hover:bg-emerald-600 hover:text-white transition-all shadow-xl active:scale-95 flex items-center gap-3"
                  >
                     <span className="material-symbols-outlined animate-bounce">keyboard_double_arrow_down</span> 
                     โหลดเพิ่ม {filteredCustomers.length - visibleCount} รายการ
                  </button>
               </div>
            )}
         </div>
      )}
    {/* 🖼️ Standard Image Lightbox */}
    <ImageLightbox 
      isOpen={!!previewImage}
      imageUrl={previewImage || ''}
      onClose={() => setPreviewImage(null)}
    />
  </div>
);
};

export default React.memo(SettingsCustomers);
