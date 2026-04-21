import React, { useState, useMemo, useEffect } from 'react';
import { processBatchTransaction, getNextTxnNo, getNextCustomerCv } from '../api';

interface LogisticsSummaryProps {
  cart: any[];
  action: 'receive' | 'issue';
  cv: string;
  setCv: (v: string) => void;
  deliveryBy: string;
  setDeliveryBy: (v: string) => void;
  deliveryDate: string;
  setDeliveryDate: (v: string) => void;
  deliveryTime: string;
  setDeliveryTime: (v: string) => void;
  workZone: string;
  setWorkZone: (v: string) => void;
  note: string;
  setNote: (v: string) => void;
  onBack: () => void;
  onSuccess: () => void;
  setStep: (v: any) => void;
  operatorName: string;
  loading: boolean;
  setLoading: (v: boolean) => void;
  setError: (v: string) => void;
  onEditCustomer: () => void;
  customers: any[];
  zones: any[];
  transactions: any[];
}

const LogisticsSummary: React.FC<LogisticsSummaryProps> = ({
  cart, action, cv, setCv, deliveryBy, setDeliveryBy, deliveryDate, setDeliveryDate,
  deliveryTime, setDeliveryTime, workZone, setWorkZone, note, setNote,
  onBack, onSuccess, setStep, operatorName, loading, setLoading, setError, onEditCustomer,
  customers, zones, transactions
}) => {
  const [isRiderDropdownOpen, setIsRiderDropdownOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const riderDropdown = document.querySelector('.searchable-rider-dropdown');
      if (riderDropdown && !riderDropdown.contains(event.target as Node)) {
         setIsRiderDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const matchedCustomer = useMemo(() => customers.find(c => {
    const customerCv = String(c.cv || c.CV || c["เลข CV"] || c["เลขCV"] || '');
    return customerCv === String(cv);
  }), [customers, cv]);

  useEffect(() => {
    if (matchedCustomer?.province && !workZone && zones.length > 0) {
      const pName = String(matchedCustomer.province).trim();
      const matchedZone = zones.find(z => String(z.name).includes(pName));
      if (matchedZone) {
        setWorkZone(matchedZone.name);
      }
    }
  }, [matchedCustomer, zones, workZone, setWorkZone]);

  const filteredCustomers = useMemo(() => {
    if (!cv.trim() || matchedCustomer) return [];
    const search = String(cv).toLowerCase();
    return customers
      .filter(c => {
         const customerCv = String(c.cv || c.CV || '').toLowerCase();
         const customerName = String(c.name || '').toLowerCase();
         return customerCv.includes(search) || customerName.includes(search);
      })
      .slice(0, 50);
  }, [customers, cv, matchedCustomer]);

  const uniqueDeliveries = useMemo(() => Array.from(new Set(transactions.map(t => typeof t.จัดส่งโดย === 'string' ? t.จัดส่งโดย : String(t.จัดส่งโดย || '')).filter(Boolean))).slice(0, 5), [transactions]);

  const handleFinalSubmit = async () => {
    if (action === 'issue' && !cv.trim()) { setError('กรุณาระบุเลข CV'); return; }
    
    if (action === 'issue') {
      const now = new Date();
      const selected = new Date(`${deliveryDate}T${deliveryTime || '00:00'}`);
      if (selected <= now) {
         setError("❌ วันเวลาที่กำหนดส่ง ต้องเป็นเวลาในอนาคตเท่านั้น");
         return;
      }
    }

    setLoading(true); setError('');

    try {
      const txnNo = await getNextTxnNo();
      const combinedDeliveryDate = deliveryDate ? (deliveryTime ? `${deliveryDate}T${deliveryTime}` : deliveryDate) : '';
      const batchItems = cart.flatMap(c => [
        { item: c.item, quantity: c.quantity, isSub: false, subType: '' },
        ...(c.subItems || []).map((s: any) => ({ item: s.item, quantity: s.quantity, isSub: true, subType: s.type }))
      ]);

      await processBatchTransaction(action, batchItems, cv, deliveryBy, combinedDeliveryDate, txnNo, operatorName, note, workZone);
      if (onSuccess) onSuccess();
      setStep('success');
    } catch (err: any) {
      setError(err.message || 'Error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handlePlusClick = async () => {
    try {
      const nextCv = await getNextCustomerCv();
      setCv(nextCv);
      onEditCustomer();
    } catch (err) {
      onEditCustomer();
    }
  };

  const inputClass = "w-full h-11 bg-slate-50 border border-slate-200 rounded-lg px-3 text-[14px] font-bold text-slate-900 outline-none focus:border-slate-300 transition-colors";
  const labelClass = "text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1";

  return (
    <div className="p-6 space-y-6">
      {action === 'issue' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
             <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight">ปลายทางพัสดุ</h3>
             <button onClick={handlePlusClick} className="text-[10px] font-bold text-primary uppercase bg-primary/5 px-2 py-1 rounded">เพิ่มลูกค้า</button>
          </div>

          {!matchedCustomer ? (
            <div className="relative">
              <input 
                type="text" 
                className={inputClass + " pl-9"} 
                placeholder="ค้นหาชื่อ หรือ CV..." 
                value={cv} 
                onChange={e => setCv(e.target.value)}
                title="Customer Search"
              />
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-[18px]">search</span>
              
              {filteredCustomers.length > 0 && (
                <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                  {filteredCustomers.map((c, i) => (
                    <button key={i} onClick={() => setCv(String(c.cv || c.CV || ''))} className="w-full text-left p-3 hover:bg-slate-50 border-b border-slate-50 last:border-0 text-[13px] font-medium text-slate-700">
                      <div className="font-bold">{c.name}</div>
                      <div className="text-[10px] text-slate-400">CV: {c.cv || c.CV} • {c.province}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-900 text-white p-5 rounded-xl space-y-3 shadow-md relative overflow-hidden">
               <div className="flex justify-between items-center relative z-10">
                  <span className="text-[11px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-400/10 px-2 py-0.5 rounded">MATCHED</span>
                  <button onClick={() => setCv('')} className="text-[10px] text-white/50 hover:text-white uppercase font-bold underline">เปลี่ยน</button>
               </div>
               <div className="relative z-10">
                  <h4 className="text-lg font-bold leading-tight">{matchedCustomer.name}</h4>
                  <p className="text-[12px] opacity-60">CV: {matchedCustomer.cv || matchedCustomer.CV || 'N/A'}</p>
                  <p className="text-[11px] opacity-40 mt-2 leading-relaxed italic">{matchedCustomer.address} {matchedCustomer.subdistrict} {matchedCustomer.district} {matchedCustomer.province}</p>
               </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
             <div className="space-y-1">
                <label className={labelClass}>ขอบเขตงาน</label>
                <select className={inputClass} title="Zone" value={workZone} onChange={e => setWorkZone(e.target.value)}>
                   <option value="">-- เลือก --</option>
                   {zones.map(z => <option key={z.name} value={z.name}>{z.name}</option>)}
                </select>
             </div>
             <div className="space-y-1 searchable-rider-dropdown">
                <label className={labelClass}>จัดส่งโดย</label>
                <input type="text" title="Rider" className={inputClass} placeholder="ชื่อไรเดอร์..." value={deliveryBy} onFocus={() => setIsRiderDropdownOpen(true)} onChange={e => setDeliveryBy(e.target.value)} />
                {isRiderDropdownOpen && (
                   <div className="absolute z-50 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl w-[200px] max-h-40 overflow-y-auto">
                      {uniqueDeliveries.map((d, i) => (
                         <button key={i} onClick={() => { setDeliveryBy(d); setIsRiderDropdownOpen(false); }} className="w-full text-left p-2.5 hover:bg-slate-50 border-b border-slate-50 last:border-0 text-[12px] font-bold text-slate-700">{d}</button>
                      ))}
                   </div>
                )}
             </div>
          </div>

          <div className="space-y-1">
             <label className={labelClass}>กำหนดส่ง (วันที่ & เวลา)</label>
             <div className="flex gap-2">
                <input type="date" title="DeliveryDate" className={inputClass + " flex-1"} value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} />
                <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2">
                   <select title="Hour" className="bg-transparent border-none text-[13px] font-bold outline-none" value={deliveryTime.split(':')[0]} onChange={e => setDeliveryTime(`${e.target.value}:${deliveryTime.split(':')[1]}`)}>
                      {Array.from({length: 24}).map((_, i) => <option key={i} value={i.toString().padStart(2, '0')}>{i.toString().padStart(2, '0')}</option>)}
                   </select>
                   <span className="font-bold opacity-30">:</span>
                   <select title="Minute" className="bg-transparent border-none text-[13px] font-bold outline-none" value={deliveryTime.split(':')[1]} onChange={e => setDeliveryTime(`${deliveryTime.split(':')[0]}:${e.target.value}`)}>
                      {['00','15','30','45'].map(m => <option key={m} value={m}>{m}</option>)}
                   </select>
                </div>
             </div>
          </div>
        </div>
      )}

      <div className="space-y-1">
         <label className={labelClass}>หมายเหตุ</label>
         <textarea title="Note" rows={2} className={inputClass + " !h-auto py-3 text-[12px] resize-none"} placeholder="ระบุรายละเอียดเพิ่มเติม..." value={note} onChange={e => setNote(e.target.value)} />
      </div>

      <div className="flex flex-col gap-3 pt-4">
         <button 
           onClick={handleFinalSubmit} 
           disabled={loading} 
           className={`w-full h-14 rounded-xl flex items-center justify-center font-bold text-white uppercase tracking-widest text-sm transition-all active:scale-95 ${loading ? 'bg-slate-200' : (action === 'receive' ? 'bg-emerald-600' : 'bg-slate-900')}`}
         >
            {loading ? <span className="animate-pulse">PROCESSING...</span> : 'บันทึกข้อมูลเรียบร้อย'}
         </button>
         <button onClick={onBack} className="text-center text-[10px] font-bold text-slate-300 uppercase tracking-widest hover:text-slate-900 transition-colors">กลับไปแก้ไขรายการ</button>
      </div>
    </div>
  );
};

export default React.memo(LogisticsSummary);
