import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { getCustomers, getZones, processBatchTransaction, getNextTxnNo } from '../api';
import { formatThaiDateTime } from '../utils/dateTimeUtils';
import type { MaterialItem } from '../types';
import { Button, Icon } from './CommonUI';

// Lazy load modular components
const ItemSelector = lazy(() => import('./ItemSelector'));
const LogisticsSummary = lazy(() => import('./LogisticsSummary'));
const CustomerQuickEdit = lazy(() => import('./CustomerQuickEdit'));

/** ตรวจสอบว่า cart item มี item object ที่ valid */
const isValidCartItem = (c: any): boolean =>
  c && c.item && typeof c.item === 'object' && !Array.isArray(c.item) && typeof c.item.ประเภท !== 'undefined';

interface TransferFormProps {
  items: MaterialItem[];
  onSuccess: () => void;
  operatorName: string;
  transactions?: any[];
  thaiAddressData?: any[];
  warehouses?: any[];
}

export default function TransferForm({ items, onSuccess, operatorName, transactions = [], thaiAddressData = [], warehouses = [] }: TransferFormProps) {

  const action = 'transfer';
  const CART_KEY = `ete-cart-${operatorName}-transfer`;
  const LOGISTICS_KEY = `ete-logistics-${operatorName}-transfer`;
  const TS_KEY = `ete-ts-${operatorName}-transfer`;

  const [step, setStep] = useState<'form' | 'success'>(() => {
    const saved = localStorage.getItem(`${LOGISTICS_KEY}-step`) as any;
    const savedCart = localStorage.getItem(CART_KEY);
    const hasCart = savedCart && savedCart !== '[]';
    if (saved === 'success' && !hasCart) return 'form';
    return saved || 'form';
  });

  const updateStep = (newStep: 'form' | 'success') => {
    setStep(newStep);
    localStorage.setItem(`${LOGISTICS_KEY}-step`, newStep);
  };

  const [cart, setCart] = useState<any[]>(() => {
    const saved = localStorage.getItem(CART_KEY);
    if (!saved) return [];
    try {
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed.filter(isValidCartItem) : [];
    } catch { return []; }
  });

  const now = new Date();
  const [deliveryBy, setDeliveryBy] = useState(() => localStorage.getItem(`${LOGISTICS_KEY}-deliveryBy`) || '');
  const [note, setNote] = useState(() => localStorage.getItem(`${LOGISTICS_KEY}-note`) || '');
  const [savedTxnNo, setSavedTxnNo] = useState(() => localStorage.getItem(`${LOGISTICS_KEY}-saved-txn`) || '');

  const [sourceWarehouseId, setSourceWarehouseId] = useState<number>(() => {
    const saved = localStorage.getItem(`${LOGISTICS_KEY}-sourceWh`);
    const parsed = saved ? parseInt(saved) : NaN;
    return !isNaN(parsed) ? parsed : (warehouses[0]?.id || 1);
  });

  const [destWarehouseId, setDestWarehouseId] = useState<number>(() => {
    const saved = localStorage.getItem(`${LOGISTICS_KEY}-destWh`);
    const parsed = saved ? parseInt(saved) : NaN;
    if (!isNaN(parsed)) return parsed;
    return warehouses.length > 1 ? warehouses[1].id : (warehouses[0]?.id || 1);
  });

  // Sync IDs when warehouses prop arrives/changes
  useEffect(() => {
    if (warehouses.length > 0) {
      const validSource = warehouses.some(w => w.id === sourceWarehouseId);
      const validDest = warehouses.some(w => w.id === destWarehouseId);

      if (!validSource) setSourceWarehouseId(warehouses[0].id);
      if (!validDest) {
        const fallbackDest = warehouses.length > 1 ? warehouses[1].id : warehouses[0].id;
        setDestWarehouseId(fallbackDest);
      }
    }
  }, [warehouses]);

  useEffect(() => {
    if (!isNaN(sourceWarehouseId)) localStorage.setItem(`${LOGISTICS_KEY}-sourceWh`, sourceWarehouseId.toString());
    if (!isNaN(destWarehouseId)) localStorage.setItem(`${LOGISTICS_KEY}-destWh`, destWarehouseId.toString());
  }, [sourceWarehouseId, destWarehouseId]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(Date.now());

  useEffect(() => {
    if (step === 'success') return;
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }, [cart, step]);

  const handleAddToCart = useCallback((item: MaterialItem, quantity: number, displayString: string, serialNumber?: string) => {
    setCart(prev => {
      if (!serialNumber) {
        const existingIdx = prev.findIndex(c => c.item.rowIndex === item.rowIndex && c.displayString === displayString && !c.serialNumber);
        if (existingIdx !== -1) {
          return prev.map((c, idx) => idx === existingIdx ? { ...c, quantity: c.quantity + quantity } : c);
        }
      }
      return [...prev, {
        id: Math.random().toString(36).substring(7),
        item, quantity, displayString, action,
        serialNumber
      }];
    });
  }, []);

  const removeFromCart = (id: string) => setCart(prev => prev.filter(c => c.id !== id));

  const resetAll = () => {
    setCart([]); setNote(''); updateStep('form');
    localStorage.removeItem(`${LOGISTICS_KEY}-step`);
    setResetKey(Date.now());
  };

  const handleFinalSubmit = async () => {
    if (cart.length === 0) { setError('ไม่พบรายการในตะกร้า'); return; }
    if (sourceWarehouseId === destWarehouseId) { setError('คลังต้นทางและปลายทางต้องไม่เป็นคลังเดียวกัน'); return; }
    if (!deliveryBy.trim()) { setError('กรุณาระบุชื่อพนักงานขนส่ง'); return; }

    setLoading(true); setError(null);
    try {
      const txnNo = await getNextTxnNo();
      setSavedTxnNo(txnNo);

      const batchItems = cart.filter(c => c && c.item).map(c => ({
        item: c.item,
        quantity: c.quantity,
        serialNumber: c.serialNumber
      }));

      await processBatchTransaction({
        action: 'transfer',
        items: batchItems,
        warehouseId: sourceWarehouseId,
        toWarehouseId: destWarehouseId,
        txnNo,
        operator: operatorName,
        note,
        deliveryBy
      });

      onSuccess();
      updateStep('success');
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  const captureScreenshot = async () => {
    const element = document.getElementById('transfer-receipt');
    if (!element) return;
    try {
      document.body.style.cursor = 'wait';
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(element, { scale: 3, useCORS: true, backgroundColor: '#ffffff' });
      canvas.toBlob((blob) => {
        if (!blob) throw new Error('Canvas to Blob failed');
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `ETE-TRANSFER-${savedTxnNo || Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 'image/png');
    } catch (err) {
      console.error('Screenshot failed:', err);
    } finally {
      document.body.style.cursor = 'default';
    }
  };

  if (step === 'success') return (
    <div className="max-w-xl mx-auto py-12 px-4 text-center space-y-8 animate-fade-in">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center border border-emerald-100">
          <span className="material-symbols-outlined text-[32px]">check_circle</span>
        </div>
        <h2 className="text-2xl font-bold text-slate-800">ย้ายพัสดุเรียบร้อย</h2>
      </div>

      <div id="transfer-receipt" className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-6 text-left">
        <div className="flex justify-between items-center border-b border-slate-100 pb-4">
          <p className="text-[12px] font-bold text-slate-400 uppercase tracking-wider">หมายเลขรายการ: #{savedTxnNo || 'TXN-NEW'}</p>
          <p className="text-[12px] text-slate-400">{formatThaiDateTime(new Date())}</p>
        </div>

        <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 flex items-center justify-between">
          <div className="text-center flex-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase">ต้นทาง</p>
            <p className="text-[15px] font-bold text-slate-700">{warehouses.find(w => w.id === sourceWarehouseId)?.name || 'N/A'}</p>
          </div>
          <span className="material-symbols-outlined text-slate-300">double_arrow</span>
          <div className="text-center flex-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase">ปลายทาง</p>
            <p className="text-[15px] font-bold text-slate-700">{warehouses.find(w => w.id === destWarehouseId)?.name || 'N/A'}</p>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-[11px] font-bold text-slate-400 uppercase">รายการที่ย้าย</p>
          {cart.map((c, i) => (
            <div key={i} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
              <p className="text-[14px] text-slate-700 truncate flex-1 pr-4">
                {[c.item?.ประเภท, c.item?.ยี่ห้อหรือรูปแบบ, c.item?.รายการ].filter(Boolean).join(' ')}
                <span className="block text-[11px] text-slate-400">
                  {c.item?.ขนาด && `ขนาด: ${c.item.ขนาด}`}
                  {c.item?.สภาพ && ` • สภาพ: ${c.item.สภาพ}`}
                </span>
                {c.serialNumber && <span className="block text-[11px] text-sky-500 font-bold">SN: {c.serialNumber}</span>}
              </p>
              <p className="font-bold text-slate-900">x{c.quantity}</p>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t border-slate-50 text-[12px] text-slate-500 space-y-1.5">
          <div className="flex justify-between">
            <span>ผู้ดำเนินการ:</span>
            <span className="font-bold text-slate-700">{operatorName}</span>
          </div>
          <div className="flex justify-between">
            <span>พนักงานขนส่ง:</span>
            <span className="font-bold text-sky-600">{deliveryBy || '-'}</span>
          </div>
          {note && (
            <div className="pt-1">
              <span>หมายเหตุ:</span> {note}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button onClick={captureScreenshot} className="h-12 bg-white text-slate-600 rounded-xl font-bold border border-slate-200 active:scale-95 transition-all">บันทึกรูป</button>
        <button onClick={resetAll} className="h-12 bg-sky-500 text-white rounded-xl font-bold shadow-lg shadow-sky-500/20 active:scale-95 transition-all">เสร็จสิ้น</button>
      </div>
    </div>
  );

  return (
    <div className="max-w-xl mx-auto py-6 px-4 space-y-6 animate-fade-in text-left">
      {loading && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-md z-[9999] flex flex-col items-center justify-center animate-fade-in">
          <div className="w-12 h-12 border-4 border-sky-100 border-t-sky-500 rounded-full animate-spin mb-4"></div>
          <p className="font-bold text-slate-600">กำลังประมวลผล...</p>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-sky-500 p-8 text-white flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">ย้ายพัสดุระหว่างคลัง</h2>
            <p className="text-sky-100 text-[11px] font-bold uppercase tracking-wider mt-1 opacity-80">Stock Transfer Interface</p>
          </div>
          <button onClick={resetAll} className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center hover:bg-white/20">
            <span className="material-symbols-outlined text-[20px]">refresh</span>
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 ml-1 uppercase">จากคลัง (From)</label>
              <select value={sourceWarehouseId} onChange={(e) => { setSourceWarehouseId(parseInt(e.target.value)); setCart([]); }} className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 font-bold outline-none focus:border-sky-500 transition-colors">
                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 ml-1 uppercase">ไปคลัง (To)</label>
              <select value={destWarehouseId} onChange={(e) => setDestWarehouseId(parseInt(e.target.value))} className={`w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 font-bold outline-none focus:border-sky-500 transition-colors ${sourceWarehouseId === destWarehouseId ? 'text-rose-500' : ''}`}>
                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
          </div>

          {sourceWarehouseId === destWarehouseId && (
            <div className="bg-rose-50 text-rose-600 px-4 py-3 rounded-xl border border-rose-100 text-[13px] font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">warning</span>
              คลังต้นทางและปลายทางต้องไม่ซ้ำกัน
            </div>
          )}

          <div className="border border-slate-100 rounded-2xl overflow-hidden">
            <Suspense fallback={<div className="p-10 text-center text-slate-300 font-bold">กำลังโหลดตัวเลือก...</div>}>
              <ItemSelector
                key={`transfer-picker-${resetKey}-${sourceWarehouseId}`}
                items={items} action={action} cart={cart} tempSubItems={[]}
                onAddToCart={handleAddToCart} onAddSubItem={() => { }} onRemoveSubItem={() => { }}
                onUpdateSubItemQty={() => { }}
                setError={setError} error={error}
                persistenceKey={LOGISTICS_KEY + "-picker"}
                warehouseId={sourceWarehouseId}
              />

              {cart.length > 0 && (
                <div className="p-6 bg-slate-50 border-t border-slate-100 space-y-6">
                  <div className="space-y-3">
                    <p className="text-[11px] font-bold text-slate-400 ml-1 uppercase">รายการที่จะย้าย ({cart.length})</p>
                    {cart.map(c => (
                      <div key={c.id} className="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-center shadow-sm">
                        <div className="flex-1 pr-4">
                          <p className="font-bold text-slate-800 text-[14px]">{[c.item?.ประเภท, c.item?.ยี่ห้อหรือรูปแบบ, c.item?.รายการ].filter(Boolean).join(' ')}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {c.item?.ขนาด && <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase font-bold">{c.item.ขนาด}</span>}
                            {c.item?.สภาพ && <span className="text-[10px] bg-sky-50 text-sky-600 px-1.5 py-0.5 rounded font-bold">{c.item.สภาพ}</span>}
                            {c.serialNumber && <span className="text-[10px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded font-bold border border-emerald-100">SN: {c.serialNumber}</span>}
                            <span className="text-[10px] font-bold text-slate-400 ml-auto flex items-center gap-1">จำนวน <span className="text-sky-500 underline">x{c.quantity}</span></span>
                          </div>
                        </div>
                        <button onClick={() => removeFromCart(c.id)} className="w-10 h-10 text-rose-300 hover:text-rose-500 transition-colors">
                          <span className="material-symbols-outlined text-[20px]">close</span>
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-400 ml-1 uppercase flex items-center gap-1">
                        พนักงานขนส่ง <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={deliveryBy}
                        onChange={(e) => setDeliveryBy(e.target.value)}
                        placeholder="ระบุชื่อผู้รับ/ผู้ส่ง..."
                        className={`w-full h-11 bg-white border ${!deliveryBy.trim() && error === 'กรุณาระบุชื่อพนักงานขนส่ง' ? 'border-rose-300 ring-2 ring-rose-100' : 'border-slate-200'} rounded-xl px-4 outline-none focus:border-sky-500 font-bold transition-all`}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-400 ml-1 uppercase">หมายเหตุ</label>
                      <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="ระบุเหตุผล..." className="w-full h-11 bg-white border border-slate-200 rounded-xl px-4 outline-none focus:border-sky-500 font-bold" />
                    </div>
                  </div>

                  {error && <p className="text-rose-600 text-[13px] font-bold text-center">{error}</p>}

                  <button onClick={handleFinalSubmit} disabled={loading || sourceWarehouseId === destWarehouseId} className="w-full h-14 bg-sky-500 text-white rounded-xl font-bold shadow-lg shadow-sky-500/20 hover:bg-sky-600 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3">
                    <span className="material-symbols-outlined">send</span>
                    ยืนยันการย้ายพัสดุ
                  </button>
                </div>
              )}
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
