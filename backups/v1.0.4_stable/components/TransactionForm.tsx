import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { getCustomers, getZones } from '../api';
import type { MaterialItem, Transaction, Zone } from '../types';

// Lazy load modular components
const ItemSelector = lazy(() => import('./ItemSelector'));
const LogisticsSummary = lazy(() => import('./LogisticsSummary'));
const CustomerQuickEdit = lazy(() => import('./CustomerQuickEdit'));

interface TransactionFormProps {
  items: MaterialItem[];
  transactions: Transaction[];
  onSuccess: () => void;
  initialAction: 'receive' | 'issue';
  operatorName: string;
  thaiAddressData: any[];
}

export default function TransactionForm({ items, transactions, onSuccess, initialAction, operatorName, thaiAddressData }: TransactionFormProps) {
   const action = initialAction;
   const CART_KEY = `ete-cart-${operatorName}-${initialAction}`;
   const LOGISTICS_KEY = `ete-logistics-${operatorName}-${initialAction}`;
   const TS_KEY = `ete-ts-${operatorName}-${initialAction}`;

   const isExpired = () => {
     const ts = localStorage.getItem(TS_KEY);
     if (!ts) return false;
     const diff = Date.now() - parseInt(ts);
     return diff > 30 * 60 * 1000; // 30 mins
   };

   const [step, setStep] = useState<'form' | 'summary' | 'success'>('form');
   const [cart, setCart] = useState<any[]>(() => {
      const saved = localStorage.getItem(CART_KEY);
      if (isExpired()) { 
        localStorage.removeItem(CART_KEY);
        return []; 
      }
      return saved ? JSON.parse(saved) : [];
   });
   
   const [customers, setCustomers] = useState<any[]>([]);
   const [zones, setZones] = useState<Zone[]>([]);
   const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
   const [loading, setLoading] = useState(false);
   const [error, setError] = useState<string | null>(null);
   const [tempSubItems, setTempSubItems] = useState<any[]>([]);

   const [cv, setCv] = useState(() => localStorage.getItem(`${LOGISTICS_KEY}-cv`) || '');
   const [deliveryBy, setDeliveryBy] = useState(() => localStorage.getItem(`${LOGISTICS_KEY}-deliveryBy`) || '');
   const [deliveryDate, setDeliveryDate] = useState(() => localStorage.getItem(`${LOGISTICS_KEY}-deliveryDate`) || '');
   const [deliveryTime, setDeliveryTime] = useState(() => localStorage.getItem(`${LOGISTICS_KEY}-deliveryTime`) || '00:00');
   const [workZone, setWorkZone] = useState(() => localStorage.getItem(`${LOGISTICS_KEY}-workzone`) || '');
   const [note, setNote] = useState(() => localStorage.getItem(`${LOGISTICS_KEY}-note`) || '');

   useEffect(() => {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
      localStorage.setItem(TS_KEY, Date.now().toString());
   }, [cart, CART_KEY, TS_KEY]);

   useEffect(() => {
      localStorage.setItem(`${LOGISTICS_KEY}-workzone`, workZone);
      localStorage.setItem(`${LOGISTICS_KEY}-cv`, cv);
      localStorage.setItem(`${LOGISTICS_KEY}-deliveryBy`, deliveryBy);
      localStorage.setItem(`${LOGISTICS_KEY}-deliveryDate`, deliveryDate);
      localStorage.setItem(`${LOGISTICS_KEY}-deliveryTime`, deliveryTime);
      localStorage.setItem(`${LOGISTICS_KEY}-note`, note);
   }, [workZone, cv, deliveryBy, deliveryDate, deliveryTime, note, LOGISTICS_KEY]);

   useEffect(() => {
      getCustomers().then(setCustomers).catch(console.error);
      getZones().then(setZones).catch(console.error);
   }, []);

   const handleAddToCart = useCallback((item: MaterialItem, quantity: number, displayString: string) => {
      const newCartItem = {
         id: Math.random().toString(36).substring(7),
         item,
         quantity,
         displayString,
         action,
         subItems: tempSubItems.length > 0 ? [...tempSubItems] : undefined
      };
      setCart(prev => [...prev, newCartItem]);
      setTempSubItems([]);
   }, [action, tempSubItems]);

   const handleAddSubItem = useCallback((item: MaterialItem, quantity: number, type: 'accessory' | 'sticker') => {
      let display = [item.ยี่ห้อหรือรูปแบบ, item.สภาพ, item.ขนาด, item.รายการ, item.รายละเอียด].filter(v => v && v !== '-').join(' ');
      display = display.replace(/อุปกรณ์ตู้|สติกเกอร์ตู้|สติ๊กเกอร์ตู้|อะไหล่ตู้/g, '').trim();
      setTempSubItems(prev => [...prev, { item, quantity, displayString: display, type }]);
   }, []);

   const handleRemoveSubItem = useCallback((idx: number) => {
      setTempSubItems(prev => prev.filter((_, i) => i !== idx));
   }, []);

   const removeFromCart = (id: string) => setCart(prev => prev.filter(c => c.id !== id));

   if (step === 'success') return (
     <div className="max-w-xl mx-auto py-20 text-center space-y-6">
        <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
          <span className="material-symbols-outlined text-[48px]">check_circle</span>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">บันทึกข้อมูลเรียบร้อย</h2>
          <p className="text-slate-400 text-sm mt-1">ข้อมูลถูกจัดเก็บลงในระบบเรียบร้อยแล้ว</p>
        </div>
        <button onClick={() => { setCart([]); setStep('form'); }} className="px-8 py-3 bg-slate-900 text-white rounded-lg font-bold text-sm active:scale-95 transition-all">ทำรายการใหม่</button>
     </div>
   );

   return (
     <div className="max-w-xl mx-auto py-4 pb-10 px-2">
        <div className="bg-white md:rounded-2xl md:border border-slate-100 overflow-hidden shadow-sm">
           <div className={`px-6 py-6 border-b border-slate-100 text-center`}>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                {action === 'receive' ? 'รับพัสดุเข้าคลัง' : 'เบิกพัสดุอุปกรณ์'}
              </h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Operator: {operatorName}</p>
           </div>

           <Suspense fallback={<div className="p-20 text-center text-slate-300 font-bold uppercase tracking-widest text-[10px]">Loading Form...</div>}>
              {step === 'form' ? (
                 <div className="animate-fade-in">
                    <ItemSelector 
                       items={items} 
                       action={action} 
                       cart={cart} 
                       tempSubItems={tempSubItems} 
                       onAddToCart={handleAddToCart} 
                       onAddSubItem={handleAddSubItem}
                       onRemoveSubItem={handleRemoveSubItem}
                       setError={setError} 
                    />
                    
                    {cart.length > 0 && (
                       <div className="p-6 bg-slate-50 border-t border-slate-100 space-y-4">
                          <h4 className="text-[11px] font-bold uppercase text-slate-400 tracking-widest px-1">ตะกร้าของคุณ ({cart.length} รายการ)</h4>
                          <div className="space-y-2">
                             {cart.map(c => (
                                <div key={c.id} className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between gap-4">
                                   <div className="flex-1 min-w-0">
                                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{c.item.ประเภท}</p>
                                      <p className="text-[14px] font-bold text-slate-900 truncate leading-tight">{c.displayString}</p>
                                      {c.subItems && (
                                         <div className="mt-2 pl-2 border-l-2 border-slate-100 space-y-1">
                                            {c.subItems.map((s:any, si:number) => (
                                               <div key={si} className="text-[12px] font-medium text-slate-500 flex justify-between">
                                                  <span className="truncate">{s.displayString}</span>
                                                  <span className="font-bold text-slate-900 ml-2">x{s.quantity}</span>
                                               </div>
                                            ))}
                                         </div>
                                      )}
                                   </div>
                                   <div className="flex items-center gap-3 shrink-0">
                                      <span className={`text-[16px] font-bold ${action === 'receive' ? 'text-emerald-600' : 'text-amber-600'}`}>x&nbsp;{c.quantity}</span>
                                      <button onClick={() => removeFromCart(c.id)} className="w-8 h-8 text-slate-300 hover:text-rose-500 transition-colors flex items-center justify-center">
                                        <span className="material-symbols-outlined text-[18px]">delete</span>
                                      </button>
                                   </div>
                                </div>
                             ))}
                          </div>
                          <button onClick={() => setStep('summary')} className={`w-full h-12 rounded-lg font-bold text-white transition-all active:scale-95 text-sm uppercase tracking-widest ${action === 'receive' ? 'bg-emerald-600 shadow-md shadow-emerald-100' : 'bg-slate-900 shadow-md shadow-slate-200'}`}>
                            {action === 'receive' ? 'บันทึกรายการ' : 'ระบุข้อมูลผู้รับ'}
                          </button>
                       </div>
                    )}
                 </div>
              ) : (
                 <LogisticsSummary 
                    cart={cart} action={action} cv={cv} setCv={setCv} 
                    deliveryBy={deliveryBy} setDeliveryBy={setDeliveryBy} 
                    deliveryDate={deliveryDate} setDeliveryDate={setDeliveryDate} deliveryTime={deliveryTime} setDeliveryTime={setDeliveryTime} 
                    workZone={workZone} setWorkZone={setWorkZone} note={note} setNote={setNote} 
                    onBack={() => setStep('form')} onSuccess={onSuccess} setStep={setStep} 
                    operatorName={operatorName} loading={loading} 
                    setLoading={setLoading} setError={setError} onEditCustomer={() => setIsCustomerModalOpen(true)}
                    customers={customers} zones={zones} transactions={transactions}
                 />
              )}
           </Suspense>
        </div>
        
        {error && <div className="mt-4 p-4 bg-rose-50 text-rose-600 font-bold rounded-xl border border-rose-100 flex items-center gap-2">
           <span className="material-symbols-outlined text-sm">error</span>
           <span className="text-sm">{error}</span>
        </div>}

        <Suspense fallback={null}>
           <CustomerQuickEdit 
              isOpen={isCustomerModalOpen} onClose={() => setIsCustomerModalOpen(false)} 
              customer={customers.find(c => {
                   const customerCv = String((c as any).cv || (c as any).CV || (c as any)["เลข CV"] || (c as any)["เลขCV"] || '');
                   return customerCv === String(cv);
              }) || { cv: cv, name: '', phone: '', address: '', subdistrict: '', district: '', province: '', zipcode: '', lat: '', lng: '' }} 
              onSave={async () => { const data = await getCustomers(); setCustomers(data); }} thaiAddressData={thaiAddressData} 
              customers={customers}
           />
        </Suspense>
     </div>
   );
}
