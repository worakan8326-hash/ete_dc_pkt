import React, { useState, useMemo, useEffect } from 'react';
import { Search, RefreshCw, RotateCcw } from 'lucide-react';
import * as XLSX from 'xlsx';
import { saveMasterItems } from '../api';
import type { MaterialItem } from '../types';
import ConfirmationModal from './ConfirmationModal';

interface SettingsMasterProps {
  masterItems: MaterialItem[];
  warehouses: any[];
  settings: any;
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
  masterItems, warehouses, settings, onRefresh, onAddItem, onEditItem, onDeleteItem, 
  showSuccess, setError, setLoading, loading
}) => {
  const [filterType, setFilterType] = useState<string>('ทั้งหมด');
  const [filterBrand, setFilterBrand] = useState<string>('ทั้งหมด');
  const [filterName, setFilterName] = useState<string>('ทั้งหมด');
  const [filterCondition, setFilterCondition] = useState<string>('ทั้งหมด');
  const [filterDetail, setFilterDetail] = useState<string>('ทั้งหมด');
  const [qtyLimit, setQtyLimit] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchValue, setDebouncedSearchValue] = useState('');

  const [importData, setImportData] = useState<any[] | null>(null);
  const [isBatchEditing, setIsBatchEditing] = useState(false);
  const [batchItems, setBatchItems] = useState<MaterialItem[]>([]);
  const [expandedStockId, setExpandedStockId] = useState<number | null>(null);

  useEffect(() => {
    if (isBatchEditing) {
      setBatchItems([...masterItems]);
    }
  }, [isBatchEditing, masterItems]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchValue(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

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

  const filteredItems = useMemo(() => {
    return masterItems.filter(i => {
      const matchType = filterType === 'ทั้งหมด' || String(i.ประเภท || '').trim() === filterType.trim();
      const matchBrand = filterBrand === 'ทั้งหมด' || String(i.ยี่ห้อหรือรูปแบบ || '').trim() === filterBrand.trim();
      const matchName = filterName === 'ทั้งหมด' || String(i.รายการ || '').trim() === filterName.trim();
      const matchCond = filterCondition === 'ทั้งหมด' || String(i.สภาพ || '').trim() === filterCondition.trim();
      const matchDet = filterDetail === 'ทั้งหมด' || String(i.รายละเอียด || '').trim() === filterDetail.trim();
      const matchQty = !qtyLimit || (i.จำนวน || 0) <= parseInt(qtyLimit);
      
      const term = debouncedSearchValue.toLowerCase();
      const matchSearch = !term || (
        (i.ประเภท || '').toLowerCase().includes(term) ||
        (i.ยี่ห้อหรือรูปแบบ || '').toLowerCase().includes(term) ||
        (i.รายการ || '').toLowerCase().includes(term) ||
        (i.สภาพ || '').toLowerCase().includes(term) ||
        (i.รายละเอียด || '').toLowerCase().includes(term)
      );
      
      return matchType && matchBrand && matchName && matchCond && matchDet && matchQty && matchSearch;
    });
  }, [masterItems, filterType, filterBrand, filterName, filterCondition, filterDetail, qtyLimit, debouncedSearchValue]);

  const filteredDisplayItems = useMemo(() => {
    if (!isBatchEditing) return filteredItems;
    return filteredItems.map(fItem => {
       const bItem = batchItems.find(b => b.rowIndex === fItem.rowIndex);
       return bItem || fItem;
    });
  }, [isBatchEditing, filteredItems, batchItems]);

  const handleBatchItemChange = (index: number, field: keyof MaterialItem, value: any) => {
    const updated = [...batchItems];
    const itemIdx = updated.findIndex(it => it.rowIndex === filteredItems[index].rowIndex);
    if (itemIdx !== -1) {
      (updated[itemIdx] as any)[field] = field === 'จำนวน' ? (parseInt(value) || 0) : value;
      setBatchItems(updated);
    }
  };

  const handleBatchSave = async () => {
    setLoading(true);
    try {
      await saveMasterItems(batchItems);
      showSuccess('บันทึกการแก้ไขพัสดุเป็นกลุ่มเรียบร้อยแล้ว');
      setIsBatchEditing(false);
      onRefresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(masterItems);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "MasterData");
    XLSX.writeFile(wb, `MasterInventory_${new Date().getTime()}.xlsx`);
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
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws);
        if (data.length > 0) setImportData(data);
         else throw new Error("ไฟล์ไม่มีข้อมูล");
      } catch (err: any) { setError(err.message); }
      finally { setLoading(false); e.target.value = ""; }
    };
    reader.readAsBinaryString(file);
  };

  const confirmImport = async () => {
    if (!importData) return;
    setLoading(true);
    try {
      await saveMasterItems(importData);
      showSuccess('นำเข้าพัสดุหลักเรียบร้อยแล้ว');
      setImportData(null);
      onRefresh();
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  const mainWhId = settings?.MAIN_WAREHOUSE_ID ? parseInt(settings.MAIN_WAREHOUSE_ID) : -1;

  return (
    <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-700 max-w-[1600px] mx-auto">
      {/* 🔮 Premium Header Card */}
      <div className="bg-white p-8 md:p-10 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none group-hover:scale-110 group-hover:rotate-12 transition-all duration-700">
           <span className="material-symbols-outlined text-[160px] text-indigo-600">database</span>
        </div>
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 relative z-10">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-indigo-600 text-white rounded-[1.5rem] flex items-center justify-center shadow-xl shadow-indigo-200 animate-in zoom-in-95 duration-500">
              <span className="material-symbols-outlined text-[32px]">inventory_2</span>
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-none">ทะเบียนพัสดุหลัก (SKU)</h2>
              <p className="text-[12px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-3 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></span>
                Inventory Intelligence System
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 w-full md:w-auto">
            <button 
              onClick={onAddItem}
              className="flex-1 md:flex-none h-14 px-8 bg-indigo-600 text-white rounded-2xl font-black flex items-center justify-center gap-3 shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all text-[13px] uppercase tracking-widest"
            >
              <span className="material-symbols-outlined text-[20px]">add_circle</span> เพิ่มพัสดุใหม่
            </button>
            <div className="flex gap-2 flex-1 md:flex-none">
              <button 
                onClick={handleExportExcel}
                className="flex-1 md:flex-none h-14 px-6 bg-white border border-slate-100 text-indigo-600 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-indigo-50 transition-all text-[12px] uppercase shadow-sm"
              >
                <span className="material-symbols-outlined text-[18px]">download</span> Export
              </button>
              <label className="flex-1 md:flex-none h-14 px-6 bg-white border border-slate-100 text-indigo-600 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-indigo-50 transition-all text-[12px] cursor-pointer uppercase shadow-sm">
                <span className="material-symbols-outlined text-[18px]">upload</span> Import
                <input type="file" hidden accept=".xlsx, .xls" onChange={handleFileChange} />
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* 🌫️ Glassmorphic Search & Filters */}
      <div className="bg-white/70 backdrop-blur-xl rounded-[2.5rem] p-8 border border-white shadow-xl shadow-slate-200/50 space-y-8 animate-in slide-in-from-bottom-4 duration-700">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: 'ประเภท', value: filterType, setter: setFilterType, options: types, icon: 'category' },
            { label: 'ยี่ห้อ', value: filterBrand, setter: setFilterBrand, options: brands, icon: 'branding_watermark' },
            { label: 'รายการ', value: filterName, setter: setFilterName, options: names, icon: 'list_alt' },
            { label: 'สภาพ', value: filterCondition, setter: setFilterCondition, options: conditions, icon: 'verified' },
            { label: 'รายละเอียด', value: filterDetail, setter: setFilterDetail, options: detailList, icon: 'info' }
          ].map((f, i) => (
            <div key={i} className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                <span className="material-symbols-outlined text-[14px]">{f.icon}</span> {f.label}
              </label>
              <select 
                value={f.value}
                onChange={e => f.setter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-100/50 rounded-2xl px-5 h-12 text-[13px] font-bold text-slate-700 focus:bg-white focus:border-indigo-300 transition-all outline-none appearance-none"
              >
                {f.options.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          ))}
        </div>

        <div className="flex flex-col lg:flex-row gap-4 items-center pt-6 border-t border-slate-100">
          <div className="relative flex-1 group w-full flex items-center gap-2">
            <div className="relative flex-1 group">
               <Search size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors" />
              <input 
                type="text"
                placeholder="ค้นหาพัสดุของคุณที่นี่..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full h-14 bg-white border border-slate-200 rounded-full pl-16 pr-6 text-[14px] font-bold focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/20 outline-none transition-all placeholder:text-slate-300 shadow-sm"
              />
            </div>
            <button className="h-14 px-8 bg-indigo-600 text-white rounded-full flex items-center justify-center gap-2 font-black text-[13px] uppercase shadow-xl shadow-indigo-100/50 active:scale-95 transition-all shrink-0">
               <Search size={18} />
               <span>ค้นหา</span>
            </button>
          </div>

          <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-2xl border border-slate-100 w-full lg:w-auto">
            <div className="flex items-center gap-3 px-4 py-2 bg-white rounded-xl shadow-sm border border-slate-100">
              <span className={`text-[11px] font-black uppercase tracking-widest ${isBatchEditing ? 'text-indigo-600' : 'text-slate-400'}`}>
                Batch Edit
              </span>
              <button 
                onClick={() => setIsBatchEditing(!isBatchEditing)}
                className={`w-12 h-6 rounded-full relative transition-all duration-500 ${isBatchEditing ? 'bg-indigo-600' : 'bg-slate-200'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-500 ${isBatchEditing ? 'left-7' : 'left-1'}`}></div>
              </button>
            </div>

            {isBatchEditing ? (
              <button 
                onClick={handleBatchSave}
                className="h-10 px-8 bg-indigo-600 text-white rounded-xl font-black text-[12px] shadow-lg shadow-indigo-200 active:scale-95 transition-all flex items-center gap-2 uppercase tracking-widest"
              >
                บันทึกกลุ่ม
              </button>
            ) : (
               <button 
                 onClick={() => { setSearchTerm(''); setQtyLimit(''); setFilterType('ทั้งหมด'); }}
                 className="w-10 h-10 bg-white text-slate-400 hover:text-rose-500 rounded-xl flex items-center justify-center transition-all shadow-sm border border-slate-100"
               >
                 <RotateCcw size={18} />
               </button>
            )}
          </div>
        </div>
      </div>

      {/* 📦 Item Cards & Breakdown */}
      <div className="grid grid-cols-1 gap-6 pb-20">
        {filteredDisplayItems.map((item, idx) => {
          const isExpanded = expandedStockId === item.rowIndex;
          const statusColor = Number(item.จำนวน) <= 0 ? 'text-rose-500' : 'text-emerald-500';
          const bgColor = Number(item.จำนวน) <= 0 ? 'bg-rose-50' : 'bg-emerald-50';

          return (
            <div key={idx} className={`bg-white border ${isExpanded ? 'border-indigo-200 shadow-xl' : 'border-slate-100 hover:border-indigo-100 hover:shadow-lg'} p-8 rounded-[2.5rem] transition-all duration-500 group relative flex flex-col gap-6 overflow-hidden`}>
              {/* Background Accent */}
              <div className={`absolute top-0 right-0 w-32 h-32 ${bgColor} opacity-[0.05] rounded-bl-[10rem] group-hover:scale-125 transition-all duration-700`}></div>
              
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 relative z-10 text-left">
                <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="px-4 py-1.5 bg-indigo-50 text-indigo-600 text-[10px] font-black rounded-full uppercase tracking-widest border border-indigo-100">
                      {item.ประเภท}
                    </span>
                    <span className="text-[12px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                       <span className="material-symbols-outlined text-[14px]">branding_watermark</span> {item['ยี่ห้อหรือรูปแบบ'] || 'No Brand'}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-[20px] font-black text-slate-800 leading-tight">{item.รายการ}</h3>
                    <div className="flex items-center gap-6 mt-3">
                      <span className="text-[12px] font-bold text-slate-400 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[14px] text-emerald-500">verified</span> {item.สภาพ || 'ปกติ'}
                      </span>
                      <span className="text-[12px] font-bold text-slate-400 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[14px] text-indigo-500">straighten</span> {item.ขนาด || '-'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-8 w-full lg:w-auto">
                  <div className="text-right flex-1 lg:flex-none">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Stock รวม</p>
                     <div className="flex items-center justify-end gap-3">
                        <p className={`text-4xl font-black ${statusColor} tracking-tighter`}>
                           {Number(item.จำนวน || 0).toLocaleString()}
                        </p>
                        <button 
                          onClick={() => setExpandedStockId(isExpanded ? null : item.rowIndex!)}
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${isExpanded ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                        >
                           <span className="material-symbols-outlined text-[20px]">{isExpanded ? 'expand_less' : 'warehouse'}</span>
                        </button>
                     </div>
                  </div>

                  <div className="flex gap-2">
                    <button 
                      onClick={() => onEditItem(item)}
                      className="p-4 bg-white border border-slate-100 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 rounded-2xl transition-all shadow-sm active:scale-90"
                    >
                       <span className="material-symbols-outlined text-[20px]">edit</span>
                    </button>
                    <button 
                      onClick={() => onDeleteItem(item.rowIndex!)}
                      className="p-4 bg-white border border-slate-100 text-slate-400 hover:text-rose-500 hover:border-rose-200 rounded-2xl transition-all shadow-sm active:scale-90"
                    >
                       <span className="material-symbols-outlined text-[20px]">delete</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 🏠 Warehouse Breakdown (Sub-list) */}
              {isExpanded && (
                <div className="mt-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 animate-in fade-in slide-in-from-top-4 duration-500 bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100 text-left">
                  {warehouses && warehouses.length > 0 ? warehouses.map(wh => {
                    const ws = item.warehouse_stocks?.find((s: any) => s.warehouseId === wh.id);
                    const isMain = wh.id === mainWhId;
                    const stock = ws?.stock || 0;

                    return (
                      <div key={wh.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group/wh">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isMain ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-400'} group-hover/wh:scale-110 transition-transform`}>
                             <span className="material-symbols-outlined text-[20px]">warehouse</span>
                          </div>
                          <div>
                            <p className="text-[13px] font-black text-slate-700 leading-tight">{wh.name}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                              {isMain ? 'คลังหลัก' : 'คลังย่อย'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-[18px] font-black ${stock > 0 ? 'text-indigo-600' : 'text-slate-300'}`}>
                            {stock.toLocaleString()}
                          </p>
                          <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.1em]">UNIT</p>
                        </div>
                      </div>
                    );
                  }) : (
                    <div className="col-span-full p-10 text-center opacity-30 font-bold uppercase tracking-widest text-xs">ไม่พบข้อมูลคลังสินค้า</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <ConfirmationModal 
        isOpen={!!importData}
        onClose={() => setImportData(null)}
        onConfirm={confirmImport}
        title="ยืนยันการนำเข้าพัสดุเป็นกลุ่ม"
        message="กรุณาตรวจสอบข้อมูลในไฟล์ Excel อีกครั้งก่อนยืนยัน เพื่อป้องกันความผิดพลาดของสต็อกรวม"
        confirmText="เริ่มนำเข้าข้อมูล"
        cancelText="ตรวจสอบใหม่"
        isLoading={loading}
      />
    </div>
  );
};

export default React.memo(SettingsMaster);
