import React, { useState, useMemo } from 'react';
import { Truck, CheckCircle2, History, Camera, MapPin, ChevronLeft, Save, AlertCircle, Barcode } from 'lucide-react';
import { processBatchTransaction } from '../api';
import { getCoordinates } from '../utils/locationUtils';
import { formatItemName } from '../utils/logisticsUtils';
import { reconcileTransactions } from '../utils/logisticsCore';

interface FulfillmentFormProps {
  job: any;
  operatorName: string;
  onSuccess: () => void;
  onBack: () => void;
  items?: any[];
}

const FulfillmentForm: React.FC<FulfillmentFormProps> = ({ job, operatorName, onSuccess, onBack, items = [] }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photos, setPhotos] = useState<File[]>([]);

  const [deliveryStatus, setDeliveryStatus] = useState<Record<string, boolean>>({});
  const [pickupData, setPickupData] = useState<Record<string, { condition: string; reason: string; serialNumber?: string }>>({});

  // 🔥 ใช้ Core Logic ในการดึงรายการที่ยัง "ค้างอยู่"
  const { pendingItems } = useMemo(() => reconcileTransactions(job.items || []), [job.items]);

  const { deliveryItems, pickupItems } = useMemo(() => {
    return {
      deliveryItems: pendingItems.filter(p => p.category === 'SEND'),
      pickupItems: pendingItems.filter(p => p.category === 'RETURN')
    };
  }, [pendingItems]);



  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setPhotos(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const expandedDeliveryItems = useMemo(() => {
    return deliveryItems.flatMap(p => {
      const it = p.plan?.item || p.plan;
      const type = String(it.ประเภท || it.item_type || it.category || '').toLowerCase();
      const name = String(it.รายการ || it.item_name || '').toLowerCase();
      
      // Precise Freezer Detection: 
      // Must contain "ตู้" but NOT be an accessory like "กุญแจ" (Key) or "ตะกร้า" (Basket)
      const isAccessory = name.includes('กุญแจ') || name.includes('ตะกร้า') || name.includes('อะไหล่') || type.includes('อะไหล่') || type.includes('อุปกรณ์');
      const isFreezer = (type.includes('ตู้') || name.includes('ตู้')) && !isAccessory;
      
      if (isFreezer && p.remainingQty > 1) {
        // Freezers: expand into individual rows (1 per unit) for serial number tracking
        return Array.from({ length: p.remainingQty }).map((_, i) => ({
          ...p,
          remainingQty: 1,
          uid: `${p.plan._internalId}_DEL_${i}`,
          displayIdx: i + 1
        }));
      }
      // Non-freezers: keep as single row with full quantity
      return [{ ...p, uid: `${p.plan._internalId}_DEL_AGG`, displayIdx: 1 }];
    });
  }, [deliveryItems]);

  const expandedPickupItems = useMemo(() => {
    return pickupItems.flatMap(p => {
      const it = p.plan?.item || p.plan;
      const type = String(it.ประเภท || it.item_type || it.category || '').toLowerCase();
      const name = String(it.รายการ || it.item_name || '').toLowerCase();
      
      const isAccessory = name.includes('กุญแจ') || name.includes('ตะกร้า') || name.includes('อะไหล่') || type.includes('อะไหล่') || type.includes('อุปกรณ์');
      const isFreezer = (type.includes('ตู้') || name.includes('ตู้')) && !isAccessory;
      
      if (isFreezer && p.remainingQty > 1) {
        return Array.from({ length: p.remainingQty }).map((_, i) => ({
          ...p,
          remainingQty: 1,
          uid: `${p.plan._internalId}_PICK_${i}`,
          displayIdx: i + 1
        }));
      }
      return [{ ...p, uid: `${p.plan._internalId}_PICK_AGG`, displayIdx: 1 }];
    });
  }, [pickupItems]);

  const isComplete = useMemo(() => {
    // ต้องกดยืนยันทุกเครื่องที่โชว์บนหน้าจอ
    const allDeliveryConfirmed = expandedDeliveryItems.every(p => !!deliveryStatus[p.uid]);
    const allPickupConditionsSelected = expandedPickupItems.every(p => !!pickupData[p.uid]?.condition);
    
    // ต้องมีอย่างน้อย 1 รายการ หรือถ้ามีรายการต้องทำให้ครบ
    const hasItems = expandedDeliveryItems.length > 0 || expandedPickupItems.length > 0;
    
    return hasItems && allDeliveryConfirmed && allPickupConditionsSelected;
  }, [expandedDeliveryItems, expandedPickupItems, deliveryStatus, pickupData]);

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    try {
      const coords = await getCoordinates();

      // สร้าง Payload ตาม TransactionResult interface โดยแยก 1 ชิ้นต่อ 1 record
      const batchItems = [
        ...expandedDeliveryItems.map(p => ({
          ...p.plan,
          item: p.plan.item || p.plan,
          quantity: p.remainingQty, // ส่งจำนวนตามจริง (ตู้แช่=1, อุปกรณ์=จำนวนรวม)
          จำนวน: p.remainingQty,
          status: deliveryStatus[p.uid] === 'ส่งมอบเรียบร้อย' ? 'ส่งมอบเรียบร้อย' : 'อยู่ระหว่างดำเนินการ',
          cabinetCondition: 'ปกติ' // Default conditioning for delivery
        })),
        ...expandedPickupItems.map(p => ({
          ...p.plan,
          item: p.plan.item || p.plan,
          quantity: p.remainingQty,
          จำนวน: p.remainingQty,
          status: 'รอตรวจ',
          cabinetCondition: pickupData[p.uid]?.condition || 'ปกติ',
          returnReason: pickupData[p.uid]?.reason || '',
          serialNumber: pickupData[p.uid]?.serialNumber || ''
        }))

      ];

      const res = await processBatchTransaction({
        action: 'fulfill',
        jobId: job.jobId,
        items: batchItems,
        lat: coords?.lat?.toString(),
        lng: coords?.lng?.toString(),
        operator: operatorName,
        status: pickupItems.length > 0 ? 'รับคืนจากร้าน - กำลังเดินทางกลับ' : 'ส่งมอบงานสำเร็จเรียบร้อย'
      });
      
      if (res.status === 'success') {
        onSuccess();
      } else {
        setError(res.message || 'บันทึกไม่สำเร็จ');
        setLoading(false);
      }
    } catch (err: any) {
      console.error("Save error:", err);
      setError(err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-24 animate-in fade-in duration-500 font-sans">
      {/* 🔮 Soft UI Glass Header */}
      <div className="sticky top-0 z-50 bg-white/60 backdrop-blur-2xl border-b border-white px-6 py-6 flex items-center justify-between shadow-sm">
        <button onClick={onBack} className="w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 active:scale-90 transition-all">
          <ChevronLeft size={20} />
        </button>
        <div className="text-center flex-1">
          <h2 className="text-[17px] font-black text-slate-900 leading-none">ยืนยันการดำเนินงาน</h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1.5 bg-slate-100 px-2 py-0.5 rounded-full inline-block">#{job.jobId}</p>
        </div>
        <div className="w-10 h-10" />
      </div>

      <div className="p-6 space-y-6">
        {/* 🏢 Customer Quick Card (Glass) */}
        <div className="bg-white/40 backdrop-blur-xl border border-white rounded-[2.5rem] p-6 shadow-xl shadow-slate-200/40 relative overflow-hidden group">
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-slate-200">
              <MapPin size={24} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-black text-slate-900 leading-tight uppercase truncate">{job.customerName || job.cv}</h3>
              <p className="text-[11px] font-bold text-slate-400 mt-1 line-clamp-1 italic">{job.address || 'ไม่มีข้อมูลที่อยู่'}</p>
            </div>
          </div>
        </div>

        {/* 🚚 Section 1: Delivery Confirmation */}
        {expandedDeliveryItems.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 px-2">
              <Truck size={18} className="text-indigo-600" />
              <h4 className="text-[12px] font-black text-slate-400 uppercase tracking-[0.2em]">รายการส่งมอบ (Delivery)</h4>
            </div>
            <div className="space-y-4">
              {expandedDeliveryItems.map(p => {
                const it = p.plan;
                const _id = p.uid;
                const fullItem = items.find(m => Number(m.id) === Number(it.rowIndex || it.item_id));
                const displayItem = fullItem ? { ...fullItem, ...it } : it;
                const { main, meta } = formatItemName(displayItem);

                return (
                  <div key={_id} className="bg-white/80 backdrop-blur-md border border-white rounded-3xl p-5 flex items-center justify-between shadow-sm group active:bg-slate-50 transition-all">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-300 font-black text-xs border border-slate-100 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                          {p.remainingQty > 1 ? p.remainingQty : p.displayIdx}
                        </div>
                        <div>
                          <h4 className="text-[14px] font-bold text-slate-800 leading-none">{formatItemName(displayItem).main}</h4>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">{meta}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setDeliveryStatus(prev => ({ ...prev, [_id]: !prev[_id] }))}
                      className={`h-11 px-4 rounded-xl flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-widest transition-all ${deliveryStatus[_id]
                          ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200'
                          : 'bg-white text-slate-400 border border-slate-100 shadow-sm'
                        }`}
                    >
                      {deliveryStatus[_id] ? <CheckCircle2 size={16} /> : null}
                      <span>{deliveryStatus[_id] ? 'ส่งแล้ว' : 'ยืนยัน'}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ↩️ Section 2: Pickup/Return Control */}
        {expandedPickupItems.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 px-2">
              <History size={18} className="text-purple-600" />
              <h4 className="text-[12px] font-black text-slate-400 uppercase tracking-[0.2em]">รายการรับคืน (Pickup)</h4>
            </div>
            <div className="space-y-4">
              {expandedPickupItems.map((p, itemIdx) => {
                const it = p.plan;
                const _id = p.uid;
                const fullItem = items.find(m => Number(m.id) === Number(it.rowIndex || it.item_id));
                const displayItem = fullItem ? { ...fullItem, ...it } : it;
                const { main, meta } = formatItemName(displayItem);

                return (
                  <div key={_id} className="bg-white/80 backdrop-blur-md border border-white rounded-[2.5rem] p-6 shadow-sm space-y-5">
                  <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
                      <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 font-black text-lg">
                        {p.remainingQty > 1 ? p.remainingQty : p.displayIdx}
                      </div>
                      <div className="min-w-0 pr-4">
                        <p className="text-[15px] font-black text-slate-900 leading-tight uppercase truncate">{main} {(p.remainingQty === 1 && p.displayIdx) ? `(#${p.displayIdx})` : ''}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{meta}</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 px-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                          <span className="text-[11px] font-bold text-slate-500">
                            ร่องรอยการคืน: <span className="text-indigo-600 font-extrabold">{pickupData[_id]?.condition || 'ยังไม่ได้ระบุ'}</span>
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { id: 'ปกติ', label: 'ปกติ', color: 'emerald' },
                            { id: 'ส่งซ่อม', label: 'ส่งซ่อม', color: 'indigo' },
                            { id: 'เสียหายหนัก', label: 'เสียหายหนัก', color: 'slate' },
                            { id: 'สูญหาย', label: 'สูญหาย', color: 'rose' }
                          ].map(cond => (
                            <button
                               key={cond.id}
                               onClick={() => setPickupData(prev => ({ ...prev, [_id]: { ...(prev[_id] || { reason: '', serialNumber: '' }), condition: cond.id } }))}
                               className={`py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest border transition-all ${pickupData[_id]?.condition === cond.id
                                   ? 'bg-slate-900 text-white border-slate-900 shadow-lg'
                                   : 'bg-white text-slate-400 border-slate-100 hover:bg-slate-50'
                                 }`}
                            >
                               {cond.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {(displayItem.รายการ?.includes('ตู้แช่') || displayItem.ประเภท?.includes('ตู้แช่')) && (
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">หมายเลขซีเรียล (Serial Number) - เฉพาะตู้แช่</label>
                          <div className="relative flex items-center">
                            <input
                              type="text"
                              className="w-full h-11 bg-white border border-slate-200 rounded-full pl-5 pr-12 text-[13px] font-bold text-slate-700 outline-none focus:border-indigo-200 transition-all shadow-sm"
                              placeholder="ระบุ S/N (ถ้ามี)..."
                              value={pickupData[_id]?.serialNumber || ''}
                              onChange={(e) => setPickupData(prev => ({
                                ...prev,
                                [_id]: {
                                  condition: 'ปกติ',
                                  reason: '',
                                  ...(prev[_id] || {}),
                                  serialNumber: e.target.value
                                }
                              }))}
                            />
                            <button
                              className="absolute right-1 w-9 h-9 bg-slate-900 rounded-full flex items-center justify-center text-white hover:bg-slate-800 active:scale-90 transition-all shadow-sm"
                              onClick={() => {
                                const mockScan = prompt('สแกนหมายเลขซีเรียล (Barcode/QR):');
                                if (mockScan) {
                                  setPickupData(prev => ({
                                    ...prev,
                                    [_id]: {
                                      condition: 'ปกติ',
                                      reason: '',
                                      ...(prev[_id] || {}),
                                      serialNumber: mockScan
                                    }
                                  }));
                                }
                              }}
                            >
                              <Barcode size={16} />
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">รายละเอียดเพิ่มเติม (Optional)</label>
                        <textarea
                          className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-[13px] font-bold text-slate-700 outline-none focus:bg-white focus:border-indigo-200 transition-all resize-none shadow-inner"
                          placeholder="ระบุเพิ่มเติม..."
                          rows={2}
                          value={pickupData[_id]?.reason || ''}
                          onChange={(e) => setPickupData(prev => ({
                            ...prev,
                            [_id]: {
                              condition: 'ปกติ',
                              serialNumber: '',
                              ...(prev[_id] || {}),
                              reason: e.target.value
                            }
                          }))}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 📸 Evidence Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-2">
            <Camera size={18} className="text-slate-400" />
            <h4 className="text-[12px] font-black text-slate-400 uppercase tracking-[0.2em]">หลักฐานการดำเนินงาน</h4>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {photos.map((p, i) => (
              <div key={i} className="aspect-square bg-slate-100 rounded-2xl overflow-hidden border border-slate-200">
                <img src={URL.createObjectURL(p)} alt="proof" className="w-full h-full object-cover" />
              </div>
            ))}
            <label className="aspect-square bg-white border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-300 hover:text-indigo-500 hover:border-indigo-500 hover:bg-indigo-50 cursor-pointer transition-all active:scale-95">
              <Camera size={24} className="mb-1" />
              <span className="text-[9px] font-black uppercase tracking-widest">เพิ่มรูป</span>
              <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} />
            </label>
          </div>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-100 p-4 rounded-3xl flex items-start gap-3 animate-shake">
            <AlertCircle className="text-rose-500 shrink-0" size={20} />
            <p className="text-[12px] font-bold text-rose-600 leading-snug">{error}</p>
          </div>
        )}
      </div>

      {/* 🔘 Float Bottom Action */}
      <div className="fixed bottom-8 left-6 right-6 z-50">
        <button
          onClick={handleSave}
          disabled={loading || !isComplete}
          className={`w-full h-16 bg-slate-900 text-white rounded-[2.2rem] flex items-center justify-center gap-3 font-black text-[15px] uppercase tracking-[0.2em] shadow-2xl transition-all active:scale-95 ${loading || !isComplete ? 'opacity-30 grayscale cursor-not-allowed' : 'shadow-slate-300'}`}
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          ) : (
            <Save size={20} />
          )}
          <span>{loading ? 'กำลังบันทึก...' : 'บันทึกและปิดงาน'}</span>
        </button>
      </div>
    </div>
  );
};

export default FulfillmentForm;
