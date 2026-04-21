import React, { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { saveMasterItems } from '../api';
import type { MaterialItem } from '../types';
import ConfirmationModal from './ConfirmationModal';

interface SettingsMasterProps {
  masterItems: MaterialItem[];
  onRefresh: () => void;
  onAddItem: () => void;
  onEditItem: (item: MaterialItem) => void;
  onDeleteItem: (rowIndex: number) => void;
  showSuccess: (msg: string) => void;
  setError: (msg: string) => void;
  setLoading: (loading: boolean) => void;
  loading: boolean;
}

const SettingsMaster: React.FC<SettingsMasterProps> = ({ 
  masterItems, onRefresh, onAddItem, onEditItem, onDeleteItem, 
  showSuccess, setError, setLoading, loading
}) => {
  const [filterType, setFilterType] = useState<string>('ทั้งหมด');
  const [filterBrand, setFilterBrand] = useState<string>('ทั้งหมด');
  const [filterName, setFilterName] = useState<string>('ทั้งหมด');
  const [filterCondition, setFilterCondition] = useState<string>('ทั้งหมด');
  const [filterDetail, setFilterDetail] = useState<string>('ทั้งหมด');
  const [qtyLimit, setQtyLimit] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [importData, setImportData] = useState<any[] | null>(null);
  const [isBatchEditing, setIsBatchEditing] = useState(false);
  const [batchItems, setBatchItems] = useState<MaterialItem[]>([]);

  useEffect(() => {
    if (isBatchEditing) {
      setBatchItems([...masterItems]);
    }
  }, [isBatchEditing, masterItems]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const types = useMemo(() => {
    const list = Array.from(new Set(masterItems.map(i => String(i.ประเภท || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'th'));
    return ['ทั้งหมด', ...list];
  }, [masterItems]);

  const brands = useMemo(() => {
    const list = masterItems
      .filter(i => (filterType === 'ทั้งหมด' || i.ประเภท === filterType))
      .map(i => String(i.ยี่ห้อหรือรูปแบบ || '').trim())
      .filter(Boolean);
    const uniques = Array.from(new Set(list)).sort((a, b) => a.localeCompare(b, 'th'));
    return ['ทั้งหมด', ...uniques];
  }, [masterItems, filterType]);

  const names = useMemo(() => {
    const list = masterItems
      .filter(i => (filterType === 'ทั้งหมด' || i.ประเภท === filterType) && 
                   (filterBrand === 'ทั้งหมด' || i.ยี่ห้อหรือรูปแบบ === filterBrand))
      .map(i => String(i.รายการ || '').trim())
      .filter(Boolean);
    const uniques = Array.from(new Set(list)).sort((a, b) => a.localeCompare(b, 'th'));
    return ['ทั้งหมด', ...uniques];
  }, [masterItems, filterType, filterBrand]);

  const conditions = useMemo(() => {
    const list = masterItems
      .filter(i => (filterType === 'ทั้งหมด' || i.ประเภท === filterType) && 
                   (filterBrand === 'ทั้งหมด' || i.ยี่ห้อหรือรูปแบบ === filterBrand) &&
                   (filterName === 'ทั้งหมด' || i.รายการ === filterName))
      .map(i => String(i.สภาพ || '').trim())
      .filter(Boolean);
    const uniques = Array.from(new Set(list)).sort((a, b) => a.localeCompare(b, 'th'));
    return ['ทั้งหมด', ...uniques];
  }, [masterItems, filterType, filterBrand, filterName]);

  const detailList = useMemo(() => {
    const list = masterItems
      .filter(i => (filterType === 'ทั้งหมด' || i.ประเภท === filterType) && 
                   (filterBrand === 'ทั้งหมด' || i.ยี่ห้อหรือรูปแบบ === filterBrand) &&
                   (filterName === 'ทั้งหมด' || i.รายการ === filterName) &&
                   (filterCondition === 'ทั้งหมด' || i.สภาพ === filterCondition))
      .map(i => String(i.รายละเอียด || '').trim())
      .filter(Boolean);
    const uniques = Array.from(new Set(list)).sort((a, b) => a.localeCompare(b, 'th'));
    return ['ทั้งหมด', ...uniques];
  }, [masterItems, filterType, filterBrand, filterName, filterCondition]);

  const handleBatchSave = async () => {
    setLoading(true);
    try {
      await saveMasterItems(batchItems);
      showSuccess('บันทึกการแก้ไขข้อมูลทั้งหมดเรียบร้อยแล้ว');
      setIsBatchEditing(false);
      onRefresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = useMemo(() => {
    return masterItems.filter(i => {
      const matchType = filterType === 'ทั้งหมด' || String(i.ประเภท || '').trim() === filterType.trim();
      const matchBrand = filterBrand === 'ทั้งหมด' || String(i.ยี่ห้อหรือรูปแบบ || '').trim() === filterBrand.trim();
      const matchName = filterName === 'ทั้งหมด' || String(i.รายการ || '').trim() === filterName.trim();
      const matchCond = filterCondition === 'ทั้งหมด' || String(i.สภาพ || '').trim() === filterCondition.trim();
      const matchDet = filterDetail === 'ทั้งหมด' || String(i.รายละเอียด || '').trim() === filterDetail.trim();
      const matchQty = !qtyLimit || i.จำนวน <= parseInt(qtyLimit);
      
      const term = searchTerm.toLowerCase();
      const matchSearch = !term || (
        (i.ประเภท || '').toLowerCase().includes(term) ||
        (i.ยี่ห้อหรือรูปแบบ || '').toLowerCase().includes(term) ||
        (i.รายการ || '').toLowerCase().includes(term) ||
        (i.สภาพ || '').toLowerCase().includes(term) ||
        (i.รายละเอียด || '').toLowerCase().includes(term)
      );
      
      return matchType && matchBrand && matchName && matchCond && matchDet && matchQty && matchSearch;
    });
  }, [masterItems, filterType, filterBrand, filterName, filterCondition, filterDetail, qtyLimit, searchTerm]);

  const handleBatchItemChange = (index: number, field: keyof MaterialItem, value: any) => {
    const updated = [...batchItems];
    const itemIdx = updated.findIndex(it => it.rowIndex === filteredItems[index].rowIndex);
    if (itemIdx !== -1) {
      (updated[itemIdx] as any)[field] = field === 'จำนวน' ? (parseInt(value) || 0) : value;
      setBatchItems(updated);
    }
  };

  const filteredDisplayItems = useMemo(() => {
    if (!isBatchEditing) return filteredItems;
    // Map batchItems back to the filtered list based on search/filters
    return filteredItems.map(fItem => {
       const bItem = batchItems.find(b => b.rowIndex === fItem.rowIndex);
       return bItem || fItem;
    });
  }, [isBatchEditing, filteredItems, batchItems]);

  const resetFilters = () => {
    setFilterType('ทั้งหมด');
    setFilterBrand('ทั้งหมด');
    setFilterName('ทั้งหมด');
    setFilterCondition('ทั้งหมด');
    setFilterDetail('ทั้งหมด');
    setQtyLimit('');
    setSearchTerm('');
  };

  const handleExportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(masterItems);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "MasterData");
    XLSX.writeFile(wb, `Inventory_Master_${new Date().toLocaleDateString()}.xlsx`);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        if (data.length > 0) {
           setImportData(data);
        } else {
           throw new Error("ไฟล์ของคุณไม่มีข้อมูลครับ");
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
        e.target.value = ""; // Reset
      }
    };
    reader.readAsBinaryString(file);
  };

  const confirmImport = async () => {
    if (!importData) return;
    setLoading(true);
    try {
      await saveMasterItems(importData);
      showSuccess('นำเข้าข้อมูลเรียบร้อยแล้ว');
      setImportData(null);
      onRefresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-1 md:p-6 font-bold bg-white min-h-screen lg:min-h-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-6">
        <div className="space-y-1">
          <h2 className="text-xl font-black text-secondary flex items-center gap-3">
             <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[22px]">inventory_2</span>
             </div>
             พัสดุหลัก
          </h2>
          <p className="text-[10px] text-secondary/30 font-bold uppercase tracking-[0.2em] ml-1">Master Inventory Management</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <button onClick={onAddItem} className="flex-1 md:flex-none h-10 px-5 bg-primary text-white rounded-xl font-black flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all text-[12px] uppercase">
            <span className="material-symbols-outlined text-[18px]">add_box</span> เพิ่มพัสดุ
          </button>
          <button onClick={handleExportExcel} className="h-9 px-4 bg-emerald-50 text-emerald-600 rounded-xl font-black flex items-center justify-center gap-2 hover:bg-emerald-600 hover:text-white transition-all text-[10px] border border-emerald-100 uppercase">
            <span className="material-symbols-outlined text-[18px]">download</span> Export
          </button>
          <label className="h-9 px-4 bg-blue-50 text-blue-600 rounded-xl font-black flex items-center justify-center gap-2 hover:bg-blue-600 hover:text-white transition-all text-[10px] border border-blue-100 cursor-pointer uppercase">
            <span className="material-symbols-outlined text-[18px]">upload</span> Import
            <input type="file" hidden accept=".xlsx, .xls" onChange={handleFileChange} title="Import Excel" />
          </label>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-xl shadow-secondary/5 border border-slate-100 space-y-4 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {[
            ['ประเภท', filterType, setFilterType, types],
            ['ยี่ห้อ', filterBrand, setFilterBrand, brands],
            ['รายการ', filterName, setFilterName, names],
            ['สภาพ', filterCondition, setFilterCondition, conditions],
            ['รายละเอียด', filterDetail, setFilterDetail, detailList]
          ].map(([label, value, setter, options], i) => (
            <div key={i} className="space-y-1">
              <label className="text-[10px] font-black text-secondary/40 uppercase tracking-[0.1em] ml-1 leading-none">{label as string}</label>
              <select 
                title={label as string} 
                value={value as string} 
                onChange={e => (setter as any)(e.target.value)} 
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-[13px] font-bold text-secondary outline-none appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22currentColor%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22m19%209-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1em_1em] bg-[right_0.6rem_center] bg-no-repeat h-10"
              >
                {(options as any[]).map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          ))}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-secondary/40 uppercase tracking-[0.1em] ml-1 leading-none">คงเหลือ ≤</label>
            <input 
              type="number" 
              placeholder="0" 
              value={qtyLimit}
              onChange={e => setQtyLimit(e.target.value)}
              className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 text-[13px] font-bold text-secondary outline-none focus:bg-white h-10 text-center"
            />
          </div>
        </div>

        <div className="flex gap-2 pt-4 border-t border-slate-50">
          <div className="flex-1 relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary/20 text-[18px]">search</span>
            <input 
              type="text" 
              placeholder="ค้นหา..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-9 pr-4 py-1.5 text-[14px] font-bold outline-none focus:bg-white h-10"
            />
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="text-[10px] font-black text-secondary/40 uppercase tracking-tighter leading-none">เปิดโหมดการแก้ไขแบบกลุ่ม</span>
            <button 
              onClick={() => setIsBatchEditing(!isBatchEditing)}
              className={`w-10 h-5 rounded-full relative transition-all duration-300 shadow-sm ${isBatchEditing ? 'bg-primary ring-4 ring-primary/10' : 'bg-slate-200'}`}
              title="เปิด/ปิด โหมดแก้ไขแบบกลุ่ม"
            >
              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-md transition-all duration-300 flex items-center justify-center ${isBatchEditing ? 'left-5.5' : 'left-0.5'}`}>
                  {isBatchEditing && <span className="material-symbols-outlined text-primary text-[10px] font-black">check</span>}
              </div>
            </button>
          </div>

          {isBatchEditing && (
            <button 
              onClick={handleBatchSave}
              className="h-10 px-4 bg-emerald-500 text-white rounded-xl font-black text-[12px] shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center gap-2 border-none animate-bounce-in shrink-0"
            >
              <span className="material-symbols-outlined text-[20px]">save</span> บันทึก
            </button>
          )}

          <button 
            onClick={resetFilters}
            className="w-10 h-10 shrink-0 bg-red-500 text-white rounded-full flex items-center justify-center active:scale-90 shadow-lg shadow-red-500/30 transition-all border-none"
            title="รีเซ็ตการกรอง"
          >
            <span className="material-symbols-outlined text-[20px]">refresh</span>
          </button>
        </div>

      </div>

      {isMobile ? (
        <div className="w-full mx-auto py-2 space-y-3">
          {filteredDisplayItems.map((item, idx) => (
             <div key={idx} className={`bg-white border rounded-2xl p-4 grid grid-cols-12 gap-3 transition-all border-l-4 ${isBatchEditing ? 'border-primary shadow-lg ring-1 ring-primary/5 scale-[1.02]' : 'border-slate-200 active:scale-[0.98] border-l-primary/10'}`}>
                <div className="col-span-8 space-y-1.5">
                   <div className="flex items-center gap-2 flex-wrap">
                      {isBatchEditing ? (
                        <input 
                          title="ประเภท"
                          value={item.ประเภท} 
                          onChange={e => handleBatchItemChange(idx, 'ประเภท', e.target.value)}
                          className="px-2 py-0.5 bg-primary/5 text-primary text-[10px] font-black rounded-lg uppercase tracking-tight w-20 border-none focus:ring-0" 
                        />
                      ) : (
                        <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-black rounded-lg uppercase tracking-tight">{item.ประเภท}</span>
                      )}
                      
                      {isBatchEditing ? (
                        <input 
                          title="ยี่ห้อ"
                          value={item['ยี่ห้อหรือรูปแบบ'] || ''} 
                          onChange={e => handleBatchItemChange(idx, 'ยี่ห้อหรือรูปแบบ', e.target.value)}
                          className="text-[11px] font-black text-secondary/60 uppercase truncate bg-slate-50 rounded px-1.5 py-0.5 border-none focus:ring-1 ring-slate-200" 
                        />
                      ) : (
                        <span className="text-[11px] font-black text-secondary/30 uppercase truncate">{item['ยี่ห้อหรือรูปแบบ'] || '-'}</span>
                      )}
                   </div>
                   
                   {isBatchEditing ? (
                      <input 
                        title="รายการ"
                        value={item.รายการ} 
                        onChange={e => handleBatchItemChange(idx, 'รายการ', e.target.value)}
                        className="text-[14px] font-black text-secondary leading-snug w-full bg-slate-50 rounded px-2 py-1 border-none focus:ring-1 ring-slate-200" 
                      />
                   ) : (
                      <h3 className="text-[14px] font-black text-secondary leading-snug">{item.รายการ}</h3>
                   )}
                   
                   <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1">
                      {isBatchEditing ? (
                        <div className="flex items-center gap-1 bg-slate-50 rounded px-1.5 py-0.5">
                          <span className="material-symbols-outlined text-[12px] opacity-20">verified</span>
                          <input 
                            title="สภาพ"
                            value={item.สภาพ} 
                            onChange={e => handleBatchItemChange(idx, 'สภาพ', e.target.value)}
                            className="text-[11px] font-extrabold text-secondary/80 uppercase bg-transparent border-none focus:ring-0 p-0 w-16" 
                          />
                        </div>
                      ) : (
                        <span className="text-[11px] font-extrabold text-secondary/50 uppercase flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">verified</span>{item.สภาพ || '-'}</span>
                      )}
                      
                      {isBatchEditing ? (
                        <div className="flex items-center gap-1 bg-slate-50 rounded px-1.5 py-0.5">
                          <span className="material-symbols-outlined text-[12px] opacity-20">straighten</span>
                          <input 
                            title="ขนาด"
                            value={item.ขนาด} 
                            onChange={e => handleBatchItemChange(idx, 'ขนาด', e.target.value)}
                            className="text-[11px] font-extrabold text-secondary/80 uppercase bg-transparent border-none focus:ring-0 p-0 w-16" 
                          />
                        </div>
                      ) : (
                        <span className="text-[11px] font-extrabold text-secondary/50 uppercase flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">straighten</span>{item.ขนาด || '-'}</span>
                      )}
                   </div>
                </div>
                <div className="col-span-4 flex flex-col items-end justify-start gap-4">
                   <div className="flex items-center gap-2">
                      {isBatchEditing ? (
                        <input 
                          title="จำนวน"
                          type="number"
                          value={item.จำนวน} 
                          onChange={e => handleBatchItemChange(idx, 'จำนวน', e.target.value)}
                          className="text-xl font-black text-primary tracking-tighter w-16 bg-primary/5 rounded px-2 py-1 text-right border-none focus:ring-2 ring-primary/20" 
                        />
                      ) : (
                        <p className={`text-xl font-black ${Number(item.จำนวน) <= 0 ? 'text-red-500' : 'text-primary'} tracking-tighter mr-1`}>{Number(item.จำนวน).toLocaleString()}</p>
                      )}
                      
                      {!isBatchEditing && (
                        <div className="flex gap-2">
                           <button onClick={() => onEditItem(item)} className="w-8 h-8 rounded-lg bg-amber-50 text-amber-500 flex items-center justify-center border border-amber-100"><span className="material-symbols-outlined text-[16px]">edit</span></button>
                           <button onClick={() => onDeleteItem(item.rowIndex!)} className="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center border border-red-100"><span className="material-symbols-outlined text-[16px]">delete</span></button>
                        </div>
                      )}
                   </div>
                </div>
             </div>
          ))}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-[1.2rem] overflow-hidden overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px] table-fixed">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-black text-secondary/30 uppercase tracking-[0.2em]">
                <th className="px-6 py-4 w-[120px]">ประเภท</th>
                <th className="px-4 py-4 w-[140px]">ยี่ห้อ</th>
                <th className="px-4 py-4">ชื่อรายการ</th>
                <th className="px-4 py-4 w-[110px]">สภาพ</th>
                <th className="px-4 py-4 w-[120px]">ขนาด</th>
                <th className="px-4 py-4 w-[90px] text-right">จำนวน</th>
                <th className="px-6 py-4 w-[120px] text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredDisplayItems.map((item, idx) => (
                <tr key={idx} className={`transition-all ${isBatchEditing ? 'bg-primary/5' : 'hover:bg-slate-50/50 group'}`}>
                  <td className="px-6 py-3">
                    {isBatchEditing ? (
                      <input 
                        title="ประเภท"
                        value={item.ประเภท} 
                        onChange={e => handleBatchItemChange(idx, 'ประเภท', e.target.value)}
                        className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-black rounded-lg uppercase w-full border-none focus:ring-1 ring-primary" 
                      />
                    ) : (
                      <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-black rounded-lg uppercase">{item.ประเภท}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {isBatchEditing ? (
                      <input 
                        title="ยี่ห้อ/รูปแบบ"
                        value={item['ยี่ห้อหรือรูปแบบ'] || ''} 
                        onChange={e => handleBatchItemChange(idx, 'ยี่ห้อหรือรูปแบบ', e.target.value)}
                        className="text-[13px] font-bold text-secondary/80 w-full bg-white/50 rounded px-2 py-1 border-none focus:ring-1 ring-slate-200" 
                      />
                    ) : (
                      <div className="text-[13px] font-bold text-secondary/80 truncate">{item['ยี่ห้อหรือรูปแบบ'] || '-'}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {isBatchEditing ? (
                      <div className="space-y-1">
                        <input 
                          title="รายการ"
                          value={item.รายการ} 
                          onChange={e => handleBatchItemChange(idx, 'รายการ', e.target.value)}
                          className="text-[13px] font-black text-secondary leading-snug w-full bg-white/50 rounded px-2 py-1 border-none focus:ring-1 ring-slate-200" 
                        />
                        <input 
                          title="รายละเอียด"
                          value={item.รายละเอียด} 
                          placeholder="รายละเอียด"
                          onChange={e => handleBatchItemChange(idx, 'รายละเอียด', e.target.value)}
                          className="text-[10px] font-bold text-secondary/30 italic w-full bg-transparent border-none focus:ring-0 p-0" 
                        />
                      </div>
                    ) : (
                      <>
                        <div className="text-[13px] font-black text-secondary leading-snug truncate" title={item.รายการ}>{item.รายการ}</div>
                        {item.รายละเอียด && <p className="text-[10px] font-bold text-secondary/30 italic truncate opacity-70">{item.รายละเอียด}</p>}
                      </>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {isBatchEditing ? (
                      <input 
                        title="สภาพ"
                        value={item.สภาพ} 
                        onChange={e => handleBatchItemChange(idx, 'สภาพ', e.target.value)}
                        className="text-[13px] font-bold text-secondary/60 w-full bg-white/50 rounded px-2 py-1 border-none focus:ring-1 ring-slate-200" 
                      />
                    ) : (
                      <div className="text-[13px] font-bold text-secondary/60 truncate">{item.สภาพ || '-'}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {isBatchEditing ? (
                      <input 
                        title="ขนาด"
                        value={item.ขนาด} 
                        onChange={e => handleBatchItemChange(idx, 'ขนาด', e.target.value)}
                        className="text-[13px] font-bold text-secondary/60 w-full bg-white/50 rounded px-2 py-1 border-none focus:ring-1 ring-slate-200" 
                      />
                    ) : (
                      <div className="text-[13px] font-bold text-secondary/60 truncate">{item.ขนาด || '-'}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {isBatchEditing ? (
                      <input 
                        title="จำนวน"
                        type="number"
                        value={item.จำนวน} 
                        onChange={e => handleBatchItemChange(idx, 'จำนวน', e.target.value)}
                        className="text-[15px] font-black text-emerald-600 w-full bg-emerald-50 rounded px-2 py-1 text-right border-none focus:ring-1 ring-emerald-200" 
                      />
                    ) : (
                      <span className={`text-[15px] font-black ${Number(item.จำนวน) <= 0 ? 'text-red-500' : 'text-emerald-500'}`}>{Number(item.จำนวน).toLocaleString()}</span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-center">
                    {!isBatchEditing && (
                      <div className="flex items-center justify-center gap-1.5 opacity-20 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => onEditItem(item)} className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100"><span className="material-symbols-outlined text-[16px]">edit</span></button>
                        <button onClick={() => onDeleteItem(item.rowIndex!)} className="w-7 h-7 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center border border-rose-100"><span className="material-symbols-outlined text-[16px]">delete</span></button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* SIMPLE WARNING MODAL */}
      <ConfirmationModal 
         isOpen={!!importData}
         onClose={() => setImportData(null)}
         onConfirm={confirmImport}
         title="ยืนยันการบันทึกข้อมูล"
         message="การนำเข้าข้อมูลใหม่จาก Excel จะส่งผลต่อฐานข้อมูลหลักโดยตรง โปรดตรวจสอบความถูกต้องของหัวไฟล์ (ประเภท, รายการ, จำนวน) ก่อนกดยืนยันครับ"
         confirmText="ยืนยันการนำเข้า"
         cancelText="ยกเลิก"
         isLoading={loading}
      />
    </div>
  );
};

export default React.memo(SettingsMaster);
