import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Search, 
  ShoppingCart, 
  Trash2, 
  Plus, 
  Minus, 
  Save, 
  Truck, 
  Clock, 
  User, 
  FileText, 
  Package, 
  CheckCircle2,
  ChevronRight,
  Info,
  MapPin,
  Calendar,
  Layers,
  Camera,
  RefreshCw,
  X
} from 'lucide-react';
import { 
  getCustomers, 
  getZones, 
  processBatchTransaction, 
  getNextTxnNo 
} from '../../api';

interface WorkstationProps {
  mode: 'receive' | 'issue' | 'return';
  items: any[];
  operatorName: string;
  onSuccess: () => void;
  transactions?: any[];
  customers: any[];
}

const DesktopTransactionWorkstation: React.FC<WorkstationProps> = ({ 
  mode, 
  items, 
  operatorName, 
  onSuccess, 
  transactions = [],
  customers: propCustomers
}) => {
  // 1. Core States
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successTxn, setSuccessTxn] = useState<string | null>(null);

  // 2. Logistics States
  const [cv, setCv] = useState('');
  const [deliveryBy, setDeliveryBy] = useState('');
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split('T')[0]);
  const [deliveryTime, setDeliveryTime] = useState(new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false }));
  const [note, setNote] = useState('');
  const [workZone, setWorkZone] = useState('');
  const [notifier, setNotifier] = useState('');
  const [returnReason, setReturnReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [cabinetCondition, setCabinetCondition] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);

  const REASON_OPTIONS = [
    'อะไหล่ผิดสเปค / ผิดรุ่น',
    'จบโครงการ / ปิดไซด์งาน',
    'วัสดุชำรุดจากการขนส่ง',
    'วัสดุชำรุดจากการใช้งาน',
    'ยกเลิกการสั่งซื้อ',
    'อื่นๆ (ระบุ)'
  ];

  // 3. Customer Info Lookup
  const selectedCustomer = useMemo(() => {
    return propCustomers.find(c => String(c.cv || c.CV || '') === cv);
  }, [propCustomers, cv]);

  // 4. Filtering items for selection
  const filteredItems = useMemo(() => {
    if (!searchTerm) return items.slice(0, 50); // Show first 50 by default
    const s = searchTerm.toLowerCase();
    return items.filter(it => 
      `${it.ประเภท} ${it.รายการ} ${it['ยี่ห้อหรือรูปแบบ']} ${it.ขนาด}`.toLowerCase().includes(s)
    );
  }, [items, searchTerm]);

  // 5. Cart Logic
  const addToCart = (item: any) => {
    setCart(prev => {
      const existing = prev.find(c => c.rowIndex === item.rowIndex);
      if (existing) {
        return prev.map(c => c.rowIndex === item.rowIndex ? { ...c, qty: c.qty + 1 } : c);
      }
      return [...prev, { ...item, qty: 1 }];
    });
  };

  const removeFromCart = (rowIndex: number) => {
    setCart(prev => prev.filter(c => c.rowIndex !== rowIndex));
  };

  const updateQty = (rowIndex: number, delta: number) => {
    setCart(prev => prev.map(c => {
      if (c.rowIndex === rowIndex) {
        const newQty = Math.max(1, c.qty + delta);
        return { ...c, qty: newQty };
      }
      return c;
    }));
  };

  // 6. Submit Logic
  const handleSubmit = async () => {
    if (cart.length === 0) return setError('กรุณาเลือกรายการพัสดุล่วงหน้า');
    if (!cv && mode !== 'receive') return setError('กรุณาระบุรหัสลูกค้า (CV)');
    if (mode === 'return' && (!notifier || !returnReason)) return setError('กรุณาระบุข้อมูลผู้แจ้งคืนและสาเหตุการคืน');

    setLoading(true);
    setError(null);
    try {
      const txnNo = await getNextTxnNo();
      const batchItems = cart.flatMap(c => [
        { item: c, quantity: c.qty, isSub: false, subType: '' }
      ]);

      await processBatchTransaction({
        action: mode,
        items: batchItems,
        cv,
        deliveryBy,
        deliveryDate: `${deliveryDate}T${deliveryTime}`,
        txnNo,
        operator: operatorName,
        note,
        workZone,
        notifier,
        notificationDate: new Date().toLocaleDateString('th-TH'),
        returnReason: returnReason === 'อื่นๆ (ระบุ)' ? customReason : returnReason,
        cabinetCondition,
        photos
      });

      setSuccessTxn(txnNo);
      setCart([]);
      onSuccess();
    } catch (e: any) {
      setError(e.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotos(prev => [...prev, reader.result as string].slice(0, 6));
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const getTheme = () => {
    if (mode === 'receive') return { color: 'emerald', label: 'รับพัสดุเข้าคลัง', bg: 'bg-emerald-500', icon: <ArrowDownCircle size={24} /> };
    if (mode === 'issue') return { color: 'amber', label: 'การเบิกออกพัสดุ', bg: 'bg-amber-500', icon: <ArrowUpCircle size={24} /> };
    return { color: 'purple', label: 'การรับคืนพัสดุ', bg: 'bg-purple-500', icon: <RotateCcw size={24} /> };
  };

  const theme = getTheme();

  if (successTxn) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-center">
        <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-8">
           <CheckCircle2 size={48} />
        </div>
        <h2 className="text-4xl font-bold text-slate-800 tracking-tight">ทำรายการสำเร็จ!</h2>
        <p className="text-slate-400 font-bold uppercase tracking-widest mt-2">{successTxn}</p>
        <button 
          onClick={() => setSuccessTxn(null)}
          className="mt-10 px-10 py-4 bg-slate-900 text-white rounded-2xl font-black text-[13px] uppercase tracking-widest shadow-xl"
        >
          ตกลง
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full gap-8 overflow-hidden">
      
      {/* 🟢 LEFT: Product Selection Grid */}
      <div className="flex-1 flex flex-col bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        
        {/* Search Header */}
        <div className={`p-8 border-b border-slate-50 flex items-center justify-between ${theme.bg} text-white`}>
           <div className="flex items-center gap-6">
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                 <Package size={28} />
              </div>
              <div>
                 <h2 className="text-3xl font-bold tracking-tight">{theme.label}</h2>
                 <p className="text-[13px] font-semibold uppercase tracking-[0.2em] opacity-70">Desktop Workstation Mode</p>
              </div>
           </div>
           <div className="relative w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50" size={18} />
              <input 
                 type="text"
                 placeholder="ค้นหารหัส หรือชื่อพัสดุ..."
                 className="w-full pl-12 pr-6 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 font-semibold outline-none focus:bg-white/20 transition-all font-sans"
                 value={searchTerm}
                 onChange={e => setSearchTerm(e.target.value)}
              />
           </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-8 grid grid-cols-2 lg:grid-cols-3 gap-4 content-start bg-slate-50/30">
           {filteredItems.map((item, idx) => (
             <button
                key={idx}
                onClick={() => addToCart(item)}
                className="group p-5 bg-white border border-slate-100 rounded-3xl text-left shadow-sm hover:border-emerald-200 hover:shadow-md flex flex-col justify-between h-[160px]"
             >
                <div>
                   <span className="text-[11px] font-bold text-slate-300 uppercase tracking-widest">{item.ประเภท}</span>
                   <h4 className="text-[16px] font-bold text-slate-800 leading-tight mt-1 line-clamp-2">{item.รายการ}</h4>
                   <p className="text-[12px] font-semibold text-slate-400 mt-2">{item['ยี่ห้อหรือรูปแบบ']} • {item.ขนาด || '-'}</p>
                </div>
                <div className="flex justify-between items-end mt-4">
                   <div className="flex flex-col">
                      <span className="text-[11px] font-bold text-slate-300 uppercase leading-none">สต็อก</span>
                      <span className={`text-[20px] font-bold ${item.จำนวน <= 5 ? 'text-rose-500' : 'text-emerald-600'}`}>{item.จำนวน}</span>
                   </div>
                   <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-300 group-hover:bg-emerald-500 group-hover:text-white">
                      <Plus size={20} strokeWidth={3} />
                   </div>
                </div>
             </button>
           ))}
        </div>
      </div>

      {/* 🚀 RIGHT: Cart & Logistics Panel */}
      <div className="w-[480px] flex flex-col gap-6 h-full">
        
        {/* Cart items */}
        <div className="flex-1 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
           <div className="p-6 border-b border-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                 <ShoppingCart size={20} className="text-slate-400" />
                 <h3 className="text-[17px] font-bold text-slate-800">รายการในตะกร้า ({cart.length})</h3>
              </div>
              <button onClick={() => setCart([])} className="text-[12px] font-bold text-rose-500 uppercase tracking-widest hover:underline">ล้างทั้งหมด</button>
           </div>
           
           <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
              {cart.map((c, i) => (
                <div key={i} className="flex items-center gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-50">
                   <div className="flex-1 min-w-0">
                      <h4 className="text-[15px] font-bold text-slate-800 truncate leading-tight">{c.รายการ}</h4>
                      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-tighter mt-1">{c.ประเภท}</p>
                   </div>
                   <div className="flex items-center gap-2 bg-white rounded-xl p-1 border border-slate-100">
                      <button onClick={() => updateQty(c.rowIndex, -1)} className="p-1 hover:bg-slate-50 rounded-lg text-slate-400"><Minus size={14} /></button>
                      <span className="w-8 text-center text-[15px] font-bold text-slate-800">{c.qty}</span>
                      <button onClick={() => updateQty(c.rowIndex, 1)} className="p-1 hover:bg-slate-50 rounded-lg text-slate-400"><Plus size={14} /></button>
                   </div>
                   <button onClick={() => removeFromCart(c.rowIndex)} className="text-rose-200 hover:text-rose-500 transition-colors p-1"><Trash2 size={16} /></button>
                </div>
              ))}
              {cart.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center opacity-20 py-20">
                   <ShoppingCart size={48} className="mb-4" />
                   <p className="text-[12px] font-black uppercase tracking-widest">ยังไม่มีรายการ</p>
                </div>
              )}
           </div>
        </div>

        {/* Logistics Info Section */}
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8 space-y-6">
           <h3 className="text-[12px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Truck size={16} /> ข้อมูลการขนส่งและปลายทาง
           </h3>

           <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 focus-within:ring-2 focus-within:ring-indigo-100 rounded-2xl transition-all">
                 <label className="text-[12px] font-semibold text-slate-300 uppercase ml-2 tracking-widest">รหัสลูกค้า / CV</label>
                 <div className="relative">
                    <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                    <input 
                       className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-2xl font-bold text-slate-700 outline-none"
                       placeholder="ระบุ CV..."
                       value={cv}
                       onChange={e => setCv(e.target.value.toUpperCase())}
                    />
                 </div>
              </div>
              <div className="space-y-1.5">
                 <label className="text-[12px] font-semibold text-slate-300 uppercase ml-2 tracking-widest">ผู้รับ / ผู้ส่งพัสดุ</label>
                 <div className="relative">
                    <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                    <input 
                       className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-2xl font-bold text-slate-700 outline-none"
                       placeholder="ชื่อเจ้าหน้าที่..."
                       value={deliveryBy}
                       onChange={e => setDeliveryBy(e.target.value)}
                    />
                 </div>
              </div>
           </div>

           {selectedCustomer && (
             <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl animate-in slide-in-from-right-4">
                <p className="text-[15px] font-bold text-indigo-600">{selectedCustomer.name}</p>
                <p className="text-[13px] font-semibold text-indigo-400 mt-1">{selectedCustomer.address}</p>
             </div>
           )}

           <div className="space-y-1.5 cursor-not-allowed opacity-60">
              <label className="text-[10px] font-black text-slate-300 uppercase ml-2 tracking-widest">ผู้บันทึก (Operator)</label>
              <div className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-black text-slate-400 text-[14px]">
                 {operatorName}
              </div>
           </div>

           {/* 🛡️ Return Metadata Section */}
           {mode === 'return' && (
             <div className="space-y-6 pt-4 border-t border-slate-50 animate-in slide-in-from-top-4">
                <div className="flex items-center gap-2 text-purple-600">
                   <Info size={18} />
                   <h4 className="text-[13px] font-bold uppercase tracking-widest">ข้อมูลการรับคืนพัสดุ</h4>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1.5 focus-within:ring-2 focus-within:ring-purple-100 rounded-2xl transition-all">
                      <label className="text-[12px] font-semibold text-slate-300 uppercase ml-2 tracking-widest">ชื่อผู้แจ้งคืน</label>
                      <input 
                         className="w-full px-6 py-3 bg-slate-50 border-none rounded-2xl font-bold text-slate-700 outline-none"
                         placeholder="ระบุผู้แจ้ง..."
                         value={notifier}
                         onChange={e => setNotifier(e.target.value)}
                      />
                   </div>
                   <div className="space-y-1.5 focus-within:ring-2 focus-within:ring-purple-100 rounded-2xl transition-all">
                      <label className="text-[12px] font-semibold text-slate-300 uppercase ml-2 tracking-widest">สาเหตุการคืน</label>
                      <select 
                         className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl font-bold text-slate-700 outline-none appearance-none"
                         value={returnReason}
                         onChange={e => setReturnReason(e.target.value)}
                      >
                         <option value="">เลือกสาเหตุ...</option>
                         {REASON_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                   </div>
                </div>

                {returnReason === 'อื่นๆ (ระบุ)' && (
                   <input 
                      className="w-full px-6 py-3 bg-purple-50 border-none rounded-2xl font-bold text-slate-700 outline-none animate-in fade-in"
                      placeholder="โปรดระบุสาเหตุอื่นๆ..."
                      value={customReason}
                      onChange={e => setCustomReason(e.target.value)}
                   />
                )}

                <div className="space-y-1.5 focus-within:ring-2 focus-within:ring-purple-100 rounded-2xl transition-all">
                   <label className="text-[12px] font-semibold text-slate-300 uppercase ml-2 tracking-widest">สภาพตู้พัสดุ (Cabinet Condition)</label>
                   <input 
                      className="w-full px-6 py-3 bg-slate-50 border-none rounded-2xl font-bold text-slate-700 outline-none"
                      placeholder="เช่น สมบูรณ์, มีรอยขีดข่วน, ล็อคเสีย..."
                      value={cabinetCondition}
                      onChange={e => setCabinetCondition(e.target.value)}
                   />
                </div>
             </div>
           )}

           {/* 📸 Evidence Photos Section */}
           <div className="space-y-3 pt-4 border-t border-slate-50">
              <div className="flex items-center justify-between">
                 <label className="text-[12px] font-semibold text-slate-300 uppercase ml-2 tracking-widest">รูปภาพหลักฐาน (Max 6)</label>
                 <label className="cursor-pointer text-indigo-500 hover:text-indigo-700 transition-colors flex items-center gap-1 text-[11px] font-bold">
                    <Camera size={16} />
                    <span>เพิ่มรูปภาพ</span>
                    <input type="file" multiple accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                 </label>
              </div>
              
              <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                 {photos.map((src, idx) => (
                    <div key={idx} className="relative w-20 h-20 flex-shrink-0 bg-slate-100 rounded-xl overflow-hidden border border-slate-200 group">
                       <img src={src} className="w-full h-full object-cover" alt="evidence" />
                       <button 
                         onClick={() => removePhoto(idx)}
                         className="absolute top-1 right-1 bg-rose-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-lg"
                       >
                          <X size={12} />
                       </button>
                    </div>
                 ))}
                 {photos.length === 0 && (
                    <div className="w-full py-4 border-2 border-dashed border-slate-100 rounded-2xl flex flex-col items-center justify-center text-slate-200">
                       <Camera size={24} className="mb-1" />
                       <span className="text-[10px] font-bold uppercase tracking-widest">No photos attached</span>
                    </div>
                 )}
              </div>
           </div>

           {error && (
             <div className="bg-rose-50 text-rose-500 p-4 rounded-2xl text-[13px] font-bold animate-shake">
                ⚠️ {error}
             </div>
           )}

           <div className="pt-4 grid grid-cols-2 gap-4">
              <button 
                onClick={() => setCart([])}
                className="py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-[12px] uppercase tracking-widest active:scale-95 transition-all"
              >
                 ยกเลิก
              </button>
              <button 
                onClick={handleSubmit}
                disabled={loading || cart.length === 0}
                className={`py-4 ${theme.bg} text-white rounded-2xl font-bold text-[16px] uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 ${loading ? 'opacity-50' : ''}`}
              >
                 {loading ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
                 ยืนยันรายการ
              </button>
           </div>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
        @keyframes zoom-in { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .animate-zoom-in { animation: zoom-in 0.3s ease-out; }
      `}</style>
    </div>
  );
};

// Internal icons helper
const ArrowDownCircle = ({ size, className }: any) => <FileText size={size} className={className} />;
const ArrowUpCircle = ({ size, className }: any) => <Package size={size} className={className} />;
const RotateCcw = ({ size, className }: any) => <FileText size={size} className={className} />;

export default DesktopTransactionWorkstation;
