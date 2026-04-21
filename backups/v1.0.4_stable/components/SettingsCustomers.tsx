import React, { useState, useMemo } from 'react';

interface SettingsCustomersProps {
  customers: any[];
  onEditCustomer: (customer: any) => void;
  onDeleteCustomer: (customer: any) => void;
  onAddCustomer: () => void;
  onRefresh: () => void;
}

const SettingsCustomers: React.FC<SettingsCustomersProps> = ({ 
  customers, onEditCustomer, onDeleteCustomer, onAddCustomer, onRefresh 
}) => {
  const [customerSearch, setCustomerSearch] = useState('');

  const filteredCustomers = useMemo(() => {
    let list = customers;
    if (customerSearch) {
      const term = customerSearch.toLowerCase();
      list = list.filter(c => 
        String(c.cv || '').toLowerCase().includes(term) ||
        String(c.name || '').toLowerCase().includes(term) ||
        String(c.phone || '').includes(term) ||
        String(c.address || '').toLowerCase().includes(term) ||
        String(c.district || '').toLowerCase().includes(term)
      );
    }
    return list;
  }, [customers, customerSearch]);

  return (
    <div className="p-3 md:p-6 font-bold animate-fade-in space-y-5">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-[0.02] pointer-events-none transform rotate-12">
            <span className="material-symbols-outlined text-[80px] text-emerald-500">person_search</span>
        </div>
        <div className="space-y-1 relative z-10">
          <h2 className="text-[18px] font-black text-secondary flex items-center gap-2 uppercase tracking-tight">
             <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                <span className="material-symbols-outlined text-[22px]">person_pin_circle</span>
             </div>
             จัดการข้อมูลลูกค้า
          </h2>
          <div className="flex items-center gap-3 ml-1">
            <p className="text-[10px] text-secondary/30 font-bold uppercase tracking-widest leading-none">Customer Database</p>
            <button title="รีโหลด" onClick={onRefresh} className="text-emerald-600 text-[9px] font-black uppercase hover:underline flex items-center gap-1">
              <span className="material-symbols-outlined text-[12px]">refresh</span> รีโหลด
            </button>
          </div>
        </div>
        <button 
          onClick={onAddCustomer} 
          className="w-full md:w-auto h-11 px-8 bg-emerald-500 text-white rounded-xl font-black flex items-center justify-center gap-2 shadow-lg shadow-emerald-100 active:scale-95 transition-all text-[12px] uppercase tracking-widest relative z-10"
        >
          <span className="material-symbols-outlined text-[20px]">person_add</span>
          เพิ่มข้อมูลลูกค้า
        </button>
      </div>

      <div className="relative">
        <input 
          type="text" 
          value={customerSearch} 
          onChange={e => setCustomerSearch(e.target.value)} 
          placeholder="ค้นหา CV, ชื่อ, หรือเบอร์โทร..." 
          className="w-full bg-slate-50 border border-slate-100 h-12 rounded-2xl pl-12 pr-4 text-[14px] font-bold outline-none focus:bg-white shadow-sm transition-all"
        />
        <span className="material-symbols-outlined absolute left-4 top-3 text-[22px] text-secondary/20">search</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredCustomers.map((c, idx) => (
          <div key={idx} className="bg-white border border-slate-100 rounded-[1.8rem] p-4 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
             <div className="flex flex-col h-full space-y-3 relative z-10">
                <div className="flex items-start justify-between gap-3">
                   <div className="bg-emerald-50 px-2.5 py-1 rounded-lg text-emerald-600 text-[10px] font-black tracking-tight border border-emerald-100">CV: {c.cv}</div>
                   <div className="flex gap-1.5">
                      <button onClick={() => onEditCustomer(c)} className="w-7 h-7 rounded-lg bg-orange-50 text-orange-500 flex items-center justify-center border border-orange-100 hover:bg-orange-500 hover:text-white transition-all shadow-sm">
                         <span className="material-symbols-outlined text-[16px]">edit</span>
                      </button>
                      <button onClick={() => onDeleteCustomer(c)} className="w-7 h-7 rounded-lg bg-red-50 text-red-100 flex items-center justify-center border border-red-50 hover:bg-red-500 hover:text-white transition-all">
                         <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                   </div>
                </div>
                
                <div className="flex-1 space-y-2">
                  <div>
                    <h3 className="text-[14px] font-black text-secondary leading-snug line-clamp-1">{c.name}</h3>
                    {c.phone && <div className="text-[11px] text-emerald-600 font-black mt-0.5 flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">call</span>{c.phone}</div>}
                  </div>
                  
                  <div className="bg-slate-50/50 p-2.5 rounded-xl border border-slate-100/50">
                    <p className="text-[11px] text-secondary/50 font-bold leading-relaxed">
                      <span className="material-symbols-outlined text-[14px] align-middle mr-1 text-secondary/20">location_on</span>
                      {[c.address, c.subdistrict, c.district, c.province, c.zipcode].filter(Boolean).join(' ')}
                    </p>
                  </div>
                </div>

                {(c.lat && c.lng) && (
                   <a href={`https://www.google.com/maps?q=${c.lat},${c.lng}`} target="_blank" rel="noopener noreferrer" className="w-full py-1.5 text-[11px] font-black text-center text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center gap-2 border border-blue-100 mt-1">
                      <span className="material-symbols-outlined text-[16px]">map</span> Google Maps
                   </a>
                )}
             </div>
          </div>
        ))}
        {filteredCustomers.length === 0 && <div className="py-20 text-center col-span-full text-secondary/10 font-black uppercase tracking-[0.3em] italic text-[10px]">ไม่พบข้อมูล</div>}
      </div>
    </div>
  );
};

export default React.memo(SettingsCustomers);
