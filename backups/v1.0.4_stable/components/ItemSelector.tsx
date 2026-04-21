import React, { useState, useMemo } from 'react';
import type { MaterialItem } from '../types';

interface ItemSelectorProps {
  items: MaterialItem[];
  cart: any[];
  tempSubItems: any[];
  action: 'receive' | 'issue';
  onAddToCart: (item: MaterialItem, quantity: number, displayString: string) => void;
  onAddSubItem: (item: MaterialItem, quantity: number, type: 'accessory' | 'sticker') => void;
  onRemoveSubItem: (idx: number) => void;
  setError: (msg: string) => void;
}

const ItemSelector: React.FC<ItemSelectorProps> = ({
  items, cart, tempSubItems, action, onAddToCart, onAddSubItem, onRemoveSubItem, setError
}) => {
  const [type, setType] = useState('');
  const [brand, setBrand] = useState('');
  const [itemName, setItemName] = useState('');
  const [condition, setCondition] = useState('');
  const [detail, setDetail] = useState('');
  const [size, setSize] = useState('');
  const [quantity, setQuantity] = useState(1);

  const [selectedSubType, setSelectedSubType] = useState<'accessory' | 'sticker' | ''>('');
  const [selectedSubIndex, setSelectedSubIndex] = useState<string>('');
  const [selectedSubQty, setSelectedSubQty] = useState(1);

  const virtualItems = useMemo(() => {
    if (action !== 'issue') return items;
    const v = items.map(i => ({ ...i }));
    cart.forEach(c => {
      const main = v.find(vi => vi.rowIndex === c.item.rowIndex);
      if (main) main.จำนวน -= c.quantity;
      (c.subItems || []).forEach((s: any) => {
        const sub = v.find(vi => vi.rowIndex === s.item.rowIndex);
        if (sub) sub.จำนวน -= s.quantity;
      });
    });
    tempSubItems.forEach(si => {
      const target = v.find(vi => vi.rowIndex === si.item.rowIndex);
      if (target) target.จำนวน -= si.quantity;
    });
    return v;
  }, [items, cart, tempSubItems, action]);

  const allTypes = useMemo(() => {
    const uniques = Array.from(new Set(virtualItems.map(i => i.ประเภท).filter(Boolean)));
    return uniques.map(name => ({
      name,
      stock: virtualItems.filter(i => i.ประเภท === name).reduce((sum, i) => sum + (Number(i.จำนวน) || 0), 0)
    }));
  }, [virtualItems]);

  const filteredByType = useMemo(() => virtualItems.filter(i => i.ประเภท === type), [virtualItems, type]);
  const brandOptions = useMemo(() => {
    const uniques = Array.from(new Set(filteredByType.map(i => i.ยี่ห้อหรือรูปแบบ).filter(Boolean)));
    return uniques.map(name => ({ name, stock: filteredByType.filter(i => i.ยี่ห้อหรือรูปแบบ === name).reduce((sum, i) => sum + (Number(i.จำนวน) || 0), 0) }));
  }, [filteredByType]);
  const filteredByBrand = useMemo(() => filteredByType.filter(i => !brand || i.ยี่ห้อหรือรูปแบบ === brand), [filteredByType, brand]);
  const conditionOptions = useMemo(() => {
    const uniques = Array.from(new Set(filteredByBrand.map(i => i.สภาพ).filter(Boolean)));
    return uniques.map(name => ({ name, stock: filteredByBrand.filter(i => i.สภาพ === name).reduce((sum, i) => sum + (Number(i.จำนวน) || 0), 0) }));
  }, [filteredByBrand]);
  const filteredByCondition = useMemo(() => filteredByBrand.filter(i => !condition || i.สภาพ === condition), [filteredByBrand, condition]);
  const sizeOptions = useMemo(() => {
    const uniques = Array.from(new Set(filteredByCondition.map(i => i.ขนาด).filter(Boolean)));
    return uniques.map(name => ({ name, stock: filteredByCondition.filter(i => i.ขนาด === name).reduce((sum, i) => sum + (Number(i.จำนวน) || 0), 0) }));
  }, [filteredByCondition]);
  const filteredBySize = useMemo(() => filteredByCondition.filter(i => !size || i.ขนาด === size), [filteredByCondition, size]);
  const detailOptions = useMemo(() => {
    const uniques = Array.from(new Set(filteredBySize.map(i => i.รายละเอียด).filter(Boolean)));
    return uniques.map(name => ({ name, stock: filteredBySize.filter(i => i.รายละเอียด === name).reduce((sum, i) => sum + (Number(i.จำนวน) || 0), 0) }));
  }, [filteredBySize]);
  const filteredByDetail = useMemo(() => filteredBySize.filter(i => !detail || i.รายละเอียด === detail), [filteredBySize, detail]);
  const itemNameOptions = useMemo(() => {
    const uniques = Array.from(new Set(filteredByDetail.map(i => i.รายการ).filter(Boolean)));
    return uniques.map(name => ({ name, stock: filteredByDetail.filter(i => i.รายการ === name).reduce((sum, i) => sum + (Number(i.จำนวน) || 0), 0) }));
  }, [filteredByDetail]);
  const filteredByItemName = useMemo(() => filteredByDetail.filter(i => !itemName || i.รายการ === itemName), [filteredByDetail, itemName]);
  const totalStock = useMemo(() => filteredByItemName.reduce((sum, item) => sum + (Number(item.จำนวน) || 0), 0), [filteredByItemName]);

  const accOptions = useMemo(() => virtualItems.filter(i => {
    const p = i.ประเภท || '';
    return p.includes('อุปกรณ์') || p.includes('อะไหล่') || p.includes('ส่วนประกอบ');
  }), [virtualItems]);
  const stkOptions = useMemo(() => virtualItems.filter(i => {
    const p = i.ประเภท || '';
    return p.includes('สติกเกอร์') || p.includes('สติ๊กเกอร์') || p.includes('Sticker');
  }), [virtualItems]);

  const handleFinalAdd = () => {
    if (!type) { setError('กรุณาเลือกประเภทพัสดุ'); return; }
    const finalItem = filteredByItemName.length > 0 ? filteredByItemName[0] : null;
    if (!finalItem) { setError('ไม่พบข้อมูลพัสดุ'); return; }
    if (action === 'issue' && quantity > totalStock && type !== 'ตู้แช่') { setError(`สต็อกไม่พอ (คงเหลือ ${totalStock} ชิ้น)`); return; }

    const display = [type, brand, condition, size, itemName, detail].filter(v => v && v !== '-').join(' ');
    onAddToCart(finalItem, quantity, display);
    setType(''); setBrand(''); setItemName(''); setCondition(''); setSize(''); setDetail(''); setQuantity(1);
    setSelectedSubType(''); setSelectedSubIndex(''); setSelectedSubQty(1);
  };

  const handleAddAddon = () => {
    if (!selectedSubIndex) return;
    const currentOptions = selectedSubType === 'accessory' ? accOptions : stkOptions;
    const item = currentOptions[parseInt(selectedSubIndex)];
    if (!item) return;
    if (action === 'issue' && item.จำนวน < selectedSubQty) { setError(`สต็อก (${item.รายการ}) ไม่พอ`); return; }
    onAddSubItem(item, selectedSubQty, selectedSubType as any);
    setSelectedSubIndex(''); setSelectedSubQty(1);
  };

  const selectGroupClass = "space-y-1 mb-4";
  const labelClass = "text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1";
  const selectInputClass = "w-full h-11 bg-slate-50 border border-slate-200 rounded-lg px-3 text-[13px] font-bold text-slate-900 outline-none focus:border-slate-300 transition-colors cursor-pointer appearance-none";

  return (
    <div className="p-6 space-y-4">
      <div className={selectGroupClass}>
        <label className={labelClass}>ประเภทพัสดุ</label>
        <div className="relative">
          <select title="Type" className={selectInputClass} value={type} onChange={e => { setType(e.target.value); setBrand(''); setCondition(''); setSize(''); setDetail(''); setItemName(''); setError(''); }}>
            <option value="">-- เลือกประเภท --</option>
            {allTypes.map(t => <option key={t.name} value={t.name}>{t.name} (คงเหลือ: {t.stock.toLocaleString()})</option>)}
          </select>
          <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none">expand_more</span>
        </div>
      </div>

      {type && (
        <div className="space-y-4 animate-fade-in">
          {brandOptions.length > 0 && (
            <div className={selectGroupClass}>
              <label className={labelClass}>ยี่ห้อ / รูปแบบ</label>
              <div className="relative">
                <select title="Brand" className={selectInputClass} value={brand} onChange={e => { setBrand(e.target.value); setCondition(''); setSize(''); setDetail(''); setItemName(''); }}>
                  <option value="">-- เลือกยี่ห้อ --</option>
                  {brandOptions.map(b => <option key={b.name} value={b.name}>{b.name}</option>)}
                </select>
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none">expand_more</span>
              </div>
            </div>
          )}

          {conditionOptions.length > 0 && (
            <div className={selectGroupClass}>
              <label className={labelClass}>สภาพ</label>
              <div className="relative">
                <select title="Condition" className={selectInputClass} value={condition} onChange={e => { setCondition(e.target.value); setSize(''); setDetail(''); setItemName(''); }}>
                  <option value="">-- เลือกสภาพ --</option>
                  {conditionOptions.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none">expand_more</span>
              </div>
            </div>
          )}

          {sizeOptions.length > 0 && (
            <div className={selectGroupClass}>
              <label className={labelClass}>ขนาด</label>
              <div className="relative">
                <select title="Size" className={selectInputClass} value={size} onChange={e => { setSize(e.target.value); setDetail(''); setItemName(''); }}>
                  <option value="">-- เลือกขนาด --</option>
                  {sizeOptions.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                </select>
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none">expand_more</span>
              </div>
            </div>
          )}

          {action === 'issue' && type === 'ตู้แช่' && size && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ส่วนประกอบตู้เบิกเพิ่มเติม</p>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setSelectedSubType('accessory')} className={`h-9 rounded-lg text-[11px] font-bold border transition-all ${selectedSubType === 'accessory' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'}`}>อุปกรณ์</button>
                <button onClick={() => setSelectedSubType('sticker')} className={`h-9 rounded-lg text-[11px] font-bold border transition-all ${selectedSubType === 'sticker' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'}`}>สติกเกอร์</button>
              </div>

              {selectedSubType && (
                <div className="space-y-3 pt-3 border-t border-slate-200/50">
                  <select title="SubItem" className={selectInputClass} value={selectedSubIndex} onChange={e => setSelectedSubIndex(e.target.value)}>
                    <option value="">-- เลือกรายการ --</option>
                    {(selectedSubType === 'accessory' ? accOptions : stkOptions).map((it, idx) => (
                      <option key={idx} value={(selectedSubType === 'accessory' ? accOptions : stkOptions).indexOf(it)}>{it.รายการ} ({it.จำนวน})</option>
                    ))}
                  </select>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 flex-1 h-11 bg-white border border-slate-200 rounded-lg px-2">
                      <button onClick={() => setSelectedSubQty(q => Math.max(1, q - 1))} className="w-8 h-8 flex items-center justify-center text-slate-400 font-bold">-</button>
                      <input type="number" title="SubQty" className="flex-1 bg-transparent border-none text-center font-bold text-sm outline-none" value={selectedSubQty} onChange={e => setSelectedSubQty(parseInt(e.target.value) || 1)} />
                      <button onClick={() => setSelectedSubQty(q => q + 1)} className="w-8 h-8 flex items-center justify-center text-slate-400 font-bold">+</button>
                    </div>
                    <button onClick={handleAddAddon} className="h-11 px-4 bg-emerald-600 text-white rounded-lg text-[12px] font-bold active:scale-95 transition-all">เพิ่ม</button>
                  </div>
                </div>
              )}

              {tempSubItems.length > 0 && (
                <div className="space-y-1.5 pt-2">
                  {tempSubItems.map((si, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-slate-200">
                      <span className="text-[12px] font-bold text-slate-700 truncate flex-1">{si.displayString}</span>
                      <div className="flex items-center gap-2">
                         <span className="text-[12px] font-bold text-emerald-600">x{si.quantity}</span>
                         <button onClick={() => onRemoveSubItem(idx)} className="text-slate-300 hover:text-rose-500 transition-colors"><span className="material-symbols-outlined text-[16px]">close</span></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="py-4 space-y-4">
             <div className="flex flex-col items-center gap-4">
                <p className={labelClass}>จำนวน</p>
                <div className="flex items-center gap-10">
                   <button onClick={() => setQuantity(q => Math.max(action === 'issue' && type === 'ตู้แช่' ? 0 : 1, q - 1))} className="w-12 h-12 rounded-full border border-slate-200 flex items-center justify-center font-bold text-2xl text-slate-400 active:scale-90 transition-all">-</button>
                   <input type="number" title="Qty" className="w-20 bg-transparent border-none text-center font-black text-4xl text-slate-900 outline-none" value={quantity} onChange={e => setQuantity(parseInt(e.target.value) || 0)} />
                   <button onClick={() => setQuantity(q => q + 1)} className="w-12 h-12 rounded-full border border-slate-200 flex items-center justify-center font-bold text-2xl text-slate-400 active:scale-90 transition-all">+</button>
                </div>
                <p className="text-[11px] font-bold text-slate-300 uppercase tracking-[0.1em]">คงเหลือในสต็อก: {totalStock.toLocaleString()}</p>
             </div>

             <button 
               onClick={handleFinalAdd} 
               className="w-full h-14 bg-slate-900 text-white rounded-xl font-bold uppercase tracking-widest text-[13px] active:scale-[0.98] transition-all"
             >
               เพิ่มลงตะกร้า
             </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(ItemSelector);
