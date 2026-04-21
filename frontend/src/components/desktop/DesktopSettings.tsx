import React, { useState, useEffect, useMemo, useCallback } from 'react';
import SettingsWarehouses from '../SettingsWarehouses';
import { 
  getSettings, 
  saveSettings, 
  testTelegram, 
  relinkTelegram,
  clearTransactions,
  getUsers,
  saveUser,
  deleteUser,
  getCustomers,
  saveCustomer,
  deleteCustomer,
  getNextCustomerCv,
  saveMasterItem,
  deleteMasterItem,
  getItems,
  getWarehouses,
  getNextTxnNo
} from '../../api';

import SettingsCustomers from '../SettingsCustomers';
import CustomerQuickEdit from '../CustomerQuickEdit';

// Shared modular components
import SettingsNotify from '../SettingsNotify';

interface DesktopSettingsProps {
  onRefresh: () => void;
  user: any;
  FULL_ADDRESS_LIST: any[];
  permissions: any;
  clientVersion: string;
  transactions: any[];
  logisticsJobs: any[];
}

const DesktopSettings: React.FC<DesktopSettingsProps> = ({ 
  onRefresh, 
  user, 
  FULL_ADDRESS_LIST, 
  permissions, 
  clientVersion,
  transactions = [],
  logisticsJobs = []
}) => {
  const [activeTab, setActiveTab] = useState('system');
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Core Data States
  const [users, setUsers] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  
  // SKU/Registration States
  const [skuSearch, setSkuSearch] = useState('');
  const [isEditingSku, setIsEditingSku] = useState(false);
  const [expandedSkuId, setExpandedSkuId] = useState<number | null>(null);
  const [skuForm, setSkuForm] = useState<any>({ 
    ประเภท: '', รายการ: '', 'ยี่ห้อหรือรูปแบบ': '', ขนาด: '', จำนวน: 0, 
    warehouseId: null, rowIndex: null 
  });

  // User Manager States
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [userForm, setUserForm] = useState<any>({ username: '', password: '', name: '', role: 'Staff', rowIndex: null });

  // Load all central data
  const loadAllSettingsData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sData, uData, cData, iData, wData] = await Promise.all([
        getSettings(true),
        getUsers(),
        getCustomers(),
        getItems(true),
        getWarehouses()
      ]);
      setSettings(sData || {});
      setUsers(uData || []);
      setCustomers(cData || []);
      setItems(iData || []);
      setWarehouses(wData || []);
    } catch (err: any) { 
      console.error('Settings Data Fetch Error:', err);
      setError('Data link established, but fetch failed. Please check network.');
    }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    loadAllSettingsData();
  }, [loadAllSettingsData]);

  const handleGlobalRefresh = () => {
     loadAllSettingsData();
     if(onRefresh) onRefresh();
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      await saveSettings(settings);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      handleGlobalRefresh();
    } catch (e: any) { alert(e.message); }
    finally { setLoading(false); }
  };

  const mainWhId = useMemo(() => {
    if (!settings || !settings.MAIN_WAREHOUSE_ID) return -1;
    return parseInt(settings.MAIN_WAREHOUSE_ID);
  }, [settings]);

  const navGroups = [
    {
      group: 'ทั่วไป (General)',
      items: [
        { id: 'system', label: 'ตั้งค่าระบบหลัก', icon: 'settings' },
        { id: 'notify', label: 'แจ้งเตือน (Notifications)', icon: 'notifications' },
      ]
    },
    {
      group: 'ทะเบียนข้อมูล (Master)',
      items: [
        { id: 'users', label: 'จัดการเจ้าหน้าที่', icon: 'person' },
        { id: 'skus', label: 'หน้าทะเบียนพัสดุ (SKU)', icon: 'inventory_2' },
      ]
    },
    {
      group: 'โครงสร้าง (INFRA)',
      items: [
        { id: 'warehouses', label: 'จัดการคลังย่อย (Sub DC)', icon: 'warehouse' },
        { id: 'customers', label: 'ฐานข้อมูลลูกค้า', icon: 'contact_page' },
      ]
    }
  ];

  return (
    <div className="flex h-full bg-[#f8f9fc] text-left select-none">
      {/* 🧭 PREMIUM Sidebar */}
      <div className="w-[300px] border-r border-slate-100 flex flex-col bg-white overflow-y-auto scrollbar-hide shrink-0 shadow-[10px_0_30px_rgba(0,0,0,0.01)]">
        <div className="p-10">
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter">DC Settings</h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.25em] mt-3 bg-slate-50 px-3 py-1.5 rounded-lg w-fit">System Module v{clientVersion}</p>
        </div>

        <div className="px-6 space-y-10 pb-20">
          {navGroups.map((group, idx) => (
            <div key={idx} className="space-y-3">
              <h3 className="px-4 text-[10px] font-black text-slate-300 uppercase tracking-widest">{group.group}</h3>
              <div className="space-y-1">
                {group.items.map(item => (
                  <button
                    key={item.id}
                    onClick={() => { setActiveTab(item.id); setError(null); }}
                    className={`w-full flex items-center gap-4 px-5 py-4 rounded-3xl transition-all duration-300 ${
                      activeTab === item.id 
                        ? 'bg-indigo-600 text-white shadow-[0_20px_40px_rgba(79,70,229,0.25)] scale-105 active:scale-95' 
                        : 'text-slate-500 hover:bg-slate-50/80'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                    <span className="text-[14px] font-bold leading-none">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 🖥️ CONTENT CANVAS */}
      <div className="flex-1 overflow-y-auto relative bg-[#f8f9fc] scrollbar-hide">
        {loading && (
          <div className="absolute inset-0 z-[100] bg-white/40 backdrop-blur-md flex items-center justify-center animate-in fade-in duration-300">
            <div className="flex flex-col items-center gap-8 p-12 bg-white rounded-[4rem] shadow-2xl border border-slate-50">
               <div className="w-16 h-16 border-[6px] border-indigo-50 border-t-indigo-600 rounded-full animate-spin"></div>
               <div className="text-center">
                  <p className="text-[15px] font-black text-slate-900 uppercase tracking-[0.25em]">Synchronizing State</p>
                  <p className="text-[10px] text-slate-400 font-bold mt-2 uppercase tracking-widest">Bridging Cloud & Edge Nodes</p>
               </div>
            </div>
          </div>
        )}

        {success && (
          <div className="fixed top-12 right-12 z-[110] animate-in slide-in-from-right-10 duration-500">
            <div className="bg-white border border-emerald-100 text-emerald-600 px-10 py-5 rounded-[2.5rem] shadow-[0_30px_60px_rgba(0,0,0,0.1)] flex items-center gap-4">
              <div className="w-10 h-10 bg-emerald-500 text-white rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined">check</span>
              </div>
              <div>
                 <p className="font-black uppercase tracking-widest text-[11px]">บันทึกข้อมูลเรียบร้อยแล้ว</p>
                 <p className="text-[10px] font-bold text-slate-300">System Preferences Updated</p>
              </div>
            </div>
          </div>
        )}

        <div className="max-w-6xl mx-auto p-16">
          {error && (
            <div className="mb-10 p-8 bg-rose-50 border border-rose-100 rounded-[3rem] shadow-xl shadow-rose-100/20 flex items-center gap-6 text-rose-600 animate-in slide-in-from-top-4">
               <div className="w-14 h-14 bg-rose-500 text-white rounded-2xl flex items-center justify-center">
                  <span className="material-symbols-outlined text-[32px]">warning</span>
               </div>
               <div>
                  <p className="font-black uppercase tracking-widest text-[12px] opacity-60">System Resilience Event</p>
                  <p className="font-bold text-[18px] tracking-tight">{error}</p>
               </div>
            </div>
          )}

          {/* 🛠️ SYSTEM TAB */}
          {activeTab === 'system' && (
            <div className="space-y-12 animate-in fade-in duration-700">
               <div className="flex flex-col gap-3">
                  <h2 className="text-5xl font-black text-slate-900 tracking-tighter leading-none">Settings</h2>
                  <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[11px] bg-slate-100 px-3 py-1 rounded w-fit">Infrastructure Control</p>
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                  <div className="bg-white p-12 rounded-[3.5rem] border border-slate-100 shadow-[0_30px_60px_rgba(0,0,0,0.02)] space-y-8 relative overflow-hidden">
                     <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none">
                        <span className="material-symbols-outlined text-[140px]">domain</span>
                     </div>
                     <h3 className="text-2xl font-black text-slate-800 flex items-center gap-4">
                        <span className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                           <span className="material-symbols-outlined text-[20px]">corporate_fare</span>
                        </span>
                        ข้อมูลหน่วยงาน
                     </h3>
                     <div className="space-y-6 relative z-10 pt-4">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-2">ชื่อหน่วยงาน (Corp Name)</label>
                           <input className="w-full px-7 py-5 bg-slate-50 border border-slate-100 rounded-3xl font-black text-slate-800 outline-none focus:bg-white focus:border-indigo-200 focus:ring-8 focus:ring-indigo-50/50 transition-all" value={settings.CORP_NAME || ''} onChange={e => setSettings({...settings, CORP_NAME: e.target.value})} />
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                           <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-2">เบอร์ติดต่อ</label>
                              <input className="w-full px-7 py-5 bg-slate-50 border border-slate-100 rounded-3xl font-black text-slate-800 outline-none focus:bg-white transition-all" value={settings.CONTACT_PHONE || ''} onChange={e => setSettings({...settings, CONTACT_PHONE: e.target.value})} />
                           </div>
                           <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-2">Line Token</label>
                              <input className="w-full px-7 py-5 bg-slate-50 border border-slate-100 rounded-3xl font-black text-slate-800 outline-none focus:bg-white transition-all" value={settings.LINE_GROUP || ''} onChange={e => setSettings({...settings, LINE_GROUP: e.target.value})} />
                           </div>
                        </div>
                     </div>
                  </div>

                  <div className="bg-white p-12 rounded-[3.5rem] border border-slate-100 shadow-[0_30px_60px_rgba(0,0,0,0.02)] space-y-10">
                    <h3 className="text-2xl font-black text-slate-800 flex items-center gap-4 border-b border-slate-50 pb-8">
                        <span className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                           <span className="material-symbols-outlined text-[20px]">bolt</span>
                        </span>
                        System Efficiency
                     </h3>
                     <div className="space-y-6">
                        <div className="flex items-center justify-between p-7 bg-slate-50 rounded-[2.5rem] border border-white">
                           <div className="space-y-1 text-left">
                              <p className="font-black text-slate-900 text-[16px]">Edge Node Synchronization</p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Optimized Real-time Feeds</p>
                           </div>
                           <div className="w-14 h-8 bg-indigo-600 rounded-full relative shadow-inner"><div className="absolute right-1 top-1 w-6 h-6 bg-white rounded-full shadow-lg"></div></div>
                        </div>
                        <button onClick={handleSaveSettings} className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black shadow-2xl shadow-slate-200 hover:bg-black active:scale-95 transition-all text-sm uppercase tracking-[0.25em]">Commit Changes</button>
                     </div>
                  </div>
               </div>
            </div>
          )}

          {/* 📦 SKU TAB (Master) */}
          {activeTab === 'skus' && (
            <div className="space-y-12 animate-in fade-in duration-700">
               <div className="bg-white p-16 rounded-[4rem] border border-slate-100 shadow-[0_40px_80px_rgba(0,0,0,0.03)] relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-16 opacity-[0.04] pointer-events-none group-hover:scale-110 transition-transform duration-1000">
                     <span className="material-symbols-outlined text-[200px] text-indigo-600">inventory_2</span>
                  </div>
                  <div className="flex justify-between items-center relative z-10">
                     <div className="text-left">
                        <h2 className="text-5xl font-black text-slate-900 tracking-tighter leading-none">SKU Master</h2>
                        <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-[11px] mt-6 flex items-center gap-3">
                           <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(79,70,229,1)]"></span>
                           Global Logistics Registry
                        </p>
                     </div>
                     {!isEditingSku && (
                        <button 
                          onClick={() => {
                             setSkuForm({ ประเภท: '', รายการ: '', 'ยี่ห้อหรือรูปแบบ': '', ขนาด: '', จำนวน: 0, warehouseId: mainWhId, rowIndex: null });
                             setIsEditingSku(true);
                          }}
                          className="px-10 py-6 bg-indigo-600 text-white rounded-[2.5rem] font-black text-[14px] shadow-[0_25px_50px_rgba(79,70,229,0.3)] flex items-center gap-4 uppercase tracking-widest hover:scale-105 active:scale-95 transition-all"
                        >
                           <span className="material-symbols-outlined font-bold">add_task</span> Register New SKU
                        </button>
                     )}
                  </div>
               </div>

               {!isEditingSku && (
                  <div className="relative group max-w-2xl text-left">
                     <span className="material-symbols-outlined absolute left-8 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors text-[24px]">search</span>
                     <input 
                        className="w-full pl-20 pr-10 py-7 bg-white border border-slate-100 rounded-[3rem] font-black text-slate-800 outline-none focus:ring-8 focus:ring-indigo-50/50 transition-all text-xl shadow-[0_20px_40px_rgba(0,0,0,0.01)]"
                        placeholder="Search SKU catalog..."
                        value={skuSearch}
                        onChange={e => setSkuSearch(e.target.value)}
                     />
                  </div>
               )}

               {isEditingSku ? (
                  <div className="bg-white p-14 rounded-[4rem] border border-slate-100 shadow-2xl animate-in zoom-in-95 duration-500 text-left relative overflow-hidden">
                     <div className="absolute -top-10 -right-10 p-20 opacity-[0.02] pointer-events-none">
                         <span className="material-symbols-outlined text-[160px]">edit_note</span>
                     </div>
                     
                     <div className="flex items-center gap-5 mb-12 pb-8 border-b border-slate-50">
                        <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center">
                           <span className="material-symbols-outlined text-[32px]">{skuForm.rowIndex ? 'edit_square' : 'add_task'}</span>
                        </div>
                        <div>
                           <h3 className="text-3xl font-black text-slate-900 tracking-tight">{skuForm.rowIndex ? 'Edit Catalog Reference' : 'New Master Registration'}</h3>
                           <p className="text-[11px] font-black text-slate-300 uppercase tracking-widest mt-1">Data Model v2.4 Integrity</p>
                        </div>
                     </div>

                     <div className="grid grid-cols-2 gap-10">
                        {[
                           { label: 'พัสดุประเภท (Category)', val: skuForm.ประเภท, key: 'ประเภท', placeholder: 'e.g. Cables, Terminals...' },
                           { label: 'รายการพัสดุ (Description)', val: skuForm.รายการ, key: 'รายการ', placeholder: 'e.g. Dropwire 2 Core...' },
                           { label: 'ยี่ห้อ/คลาส (Brand/Model)', val: skuForm['ยี่ห้อหรือรูปแบบ'], key: 'ยี่ห้อหรือรูปแบบ', placeholder: 'e.g. SCG Premium...' },
                           { label: 'ขนาด (Specification)', val: skuForm.ขนาด, key: 'ขนาด', placeholder: 'e.g. 1/2 Inch...' }
                        ].map((field, fIdx) => (
                           <div key={fIdx} className="space-y-3">
                              <label className="text-[11px] font-black text-slate-400 ml-2 uppercase tracking-widest">{field.label}</label>
                              <input className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-[2rem] font-black text-slate-800 outline-none focus:bg-white focus:ring-8 focus:ring-indigo-50/50 transition-all placeholder:text-slate-300" placeholder={field.placeholder} value={field.val} onChange={e => setSkuForm({...skuForm, [field.key]: e.target.value})} />
                           </div>
                        ))}
                        <div className="space-y-3">
                           <label className="text-[11px] font-black text-indigo-500 ml-2 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-full w-fit">บันทึกลงคลัง (Primary DC)</label>
                           <select 
                             className="w-full px-8 py-5 bg-indigo-50/50 border border-indigo-100/50 rounded-[2rem] font-black text-indigo-700 outline-none appearance-none cursor-pointer"
                             value={skuForm.warehouseId || mainWhId}
                             onChange={e => setSkuForm({...skuForm, warehouseId: parseInt(e.target.value)})}
                           >
                             {warehouses.map(wh => <option key={wh.id} value={wh.id}>{wh.name} {wh.id === mainWhId ? '(Global Hub)' : ''}</option>)}
                           </select>
                        </div>
                        <div className="space-y-3">
                           <label className="text-[11px] font-black text-emerald-500 ml-2 uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-full w-fit">Initial Quantity (UNIT)</label>
                           <input type="number" className="w-full px-8 py-5 bg-emerald-50/50 border border-emerald-100/50 rounded-[2rem] font-black text-emerald-800 text-2xl outline-none" value={skuForm.จำนวน} onChange={e => setSkuForm({...skuForm, จำนวน: parseInt(e.target.value) || 0})} />
                        </div>
                     </div>

                     <div className="flex gap-6 mt-16">
                        <button 
                          onClick={async () => {
                             setLoading(true);
                             try {
                                await saveMasterItem(skuForm);
                                await loadAllSettingsData();
                                setIsEditingSku(false);
                                setSuccess(true);
                                setTimeout(() => setSuccess(false), 2000);
                             } catch(err:any) { alert(err.message); }
                             finally { setLoading(false); }
                          }}
                          className="flex-[2] py-6 bg-indigo-600 text-white rounded-[2.5rem] font-black text-[16px] shadow-2xl shadow-indigo-100 active:scale-95 transition-all flex items-center justify-center gap-4 uppercase tracking-[0.3em]"
                        >
                           <span className="material-symbols-outlined font-bold">save_as</span> Commit Registry
                        </button>
                        <button onClick={() => setIsEditingSku(false)} className="flex-1 py-6 bg-slate-50 text-slate-400 rounded-[2.5rem] font-black text-[14px] uppercase tracking-widest hover:bg-slate-100 transition-all">Cancel</button>
                     </div>
                  </div>
               ) : (
                  <div className="grid grid-cols-1 gap-8 pb-40">
                     {items
                       .filter(it => (
                          String(it.รายการ || '').toLowerCase().includes(skuSearch.toLowerCase()) || 
                          String(it.ประเภท || '').toLowerCase().includes(skuSearch.toLowerCase()) ||
                          String(it['ยี่ห้อหรือรูปแบบ'] || '').toLowerCase().includes(skuSearch.toLowerCase())
                       ))
                       .map((it, i) => {
                         const isExpanded = expandedSkuId === it.rowIndex;
                         return (
                           <div key={i} className={`bg-white border text-left rounded-[3.5rem] p-10 transition-all duration-500 group relative overflow-hidden ${isExpanded ? 'border-indigo-400 ring-[16px] ring-indigo-50/40 shadow-2xl' : 'border-slate-100 hover:border-indigo-200 hover:shadow-2xl'}`}>
                              <div className="flex items-center justify-between relative z-10">
                                 <div className="flex items-center gap-10 flex-1">
                                    <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center transition-all duration-700 ${isExpanded ? 'bg-indigo-600 text-white scale-110' : 'bg-slate-100 text-slate-300 group-hover:bg-indigo-50 group-hover:text-indigo-400'}`}>
                                       <span className="material-symbols-outlined text-[40px]">inventory_2</span>
                                    </div>
                                    <div className="flex-1 space-y-3">
                                       <div className="flex items-center gap-3">
                                          <span className="px-4 py-1.5 bg-indigo-50 text-indigo-600 text-[10px] font-black rounded-full uppercase tracking-widest border border-indigo-100">{it.ประเภท || 'UNSET'}</span>
                                          <span className="text-[11px] font-black text-slate-300 uppercase tracking-widest border-l border-slate-100 pl-4">{it['ยี่ห้อหรือรูปแบบ'] || 'GENERIC'}</span>
                                       </div>
                                       <h4 className="text-[28px] font-black text-slate-900 leading-none tracking-tight">{it.รายการ}</h4>
                                       <div className="text-[13px] font-bold text-slate-400 mt-4 flex items-center gap-6">
                                          <span className="flex items-center gap-2"><span className="material-symbols-outlined text-[18px] text-indigo-300">straighten</span> {it.ขนาด || '-'}</span>
                                          <span className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-xl"><span className="material-symbols-outlined text-[18px]">verified</span> {it.สภาพ || 'ปกติ'}</span>
                                       </div>
                                    </div>
                                 </div>

                                 <div className="flex items-center gap-12">
                                    <div className="text-right">
                                       <p className="text-[11px] font-black text-slate-300 uppercase tracking-widest mb-2">Aggregate Stock</p>
                                       <div className="flex items-center gap-4">
                                          <p className={`text-5xl font-black ${Number(it.จำนวน) <= 0 ? 'text-rose-500' : 'text-slate-900'} tracking-tighter`}>{Number(it.จำนวน || 0).toLocaleString()}</p>
                                          <button onClick={() => setExpandedSkuId(isExpanded ? null : it.rowIndex)} className={`w-14 h-14 rounded-[1.5rem] flex items-center justify-center transition-all ${isExpanded ? 'bg-indigo-600 text-white shadow-xl' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}>
                                            <span className="material-symbols-outlined text-[24px]">{isExpanded ? 'expand_less' : 'warehouse'}</span>
                                          </button>
                                       </div>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                       <button onClick={() => { setSkuForm({...it, warehouseId: mainWhId}); setIsEditingSku(true); }} className="w-12 h-12 flex items-center justify-center bg-white border border-slate-100 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-all shadow-sm active:scale-90"><span className="material-symbols-outlined text-[22px]">edit</span></button>
                                       <button onClick={async () => { if(window.confirm(`Permanently remove ${it.รายการ} from master registry?`)) { setLoading(true); await deleteMasterItem(it.rowIndex); await loadAllSettingsData(); } }} className="w-12 h-12 flex items-center justify-center bg-white border border-slate-100 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all shadow-sm active:scale-90"><span className="material-symbols-outlined text-[22px]">delete_forever</span></button>
                                    </div>
                                 </div>
                              </div>

                              {isExpanded && (
                                <div className="mt-12 pt-10 border-t border-slate-50 grid grid-cols-3 gap-6 animate-in fade-in slide-in-from-top-6 duration-700">
                                  {warehouses.map(wh => {
                                    const ws = it.warehouse_stocks?.find((s: any) => s.warehouseId === wh.id);
                                    const stockLevel = ws?.stock || 0;
                                    const isPrimary = wh.id === mainWhId;
                                    return (
                                      <div key={wh.id} className="bg-slate-50/50 p-6 rounded-[2.5rem] border border-white flex items-center justify-between group/wh hover:bg-white hover:shadow-xl transition-all duration-500">
                                        <div className="flex items-center gap-4 text-left">
                                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isPrimary ? 'bg-indigo-600 text-white' : 'bg-white text-slate-300'} group-hover/wh:scale-110 transition-transform shadow-sm`}>
                                            <span className="material-symbols-outlined text-[20px]">warehouse</span>
                                          </div>
                                          <div>
                                            <p className="text-[15px] font-black text-slate-800 leading-none">{wh.name}</p>
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-2">{isPrimary ? 'Global Hub' : 'Regional DC'}</p>
                                          </div>
                                        </div>
                                        <div className="text-right">
                                          <p className={`text-2xl font-black ${stockLevel > 0 ? 'text-indigo-600' : 'text-slate-200'}`}>{stockLevel.toLocaleString()}</p>
                                          <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">PCS</p>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                           </div>
                         );
                       })}
                  </div>
               )}
            </div>
          )}

          {/* 👥 PERSONNEL TAB */}
          {activeTab === 'users' && (
             <div className="space-y-12 animate-in fade-in duration-700">
                <div className="bg-white p-14 rounded-[4rem] border border-slate-100 shadow-sm relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-14 opacity-[0.03] pointer-events-none group-hover:scale-110 transition-transform duration-1000">
                     <span className="material-symbols-outlined text-[180px] text-blue-600">badge</span>
                  </div>
                  <div className="flex justify-between items-center relative z-10 text-left">
                     <div>
                        <h2 className="text-5xl font-black text-slate-900 tracking-tighter leading-none">Employees</h2>
                        <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px] mt-6">Active Personnel & Role Access Control</p>
                     </div>
                     {!isEditingUser && (
                        <button onClick={() => { setUserForm({ username: '', password: '', name: '', role: 'Staff', rowIndex: null }); setIsEditingUser(true); }} className="px-10 py-6 bg-blue-600 text-white rounded-[2.5rem] font-black text-[13px] shadow-[0_20px_40px_rgba(37,99,235,0.2)] flex items-center gap-4 uppercase tracking-widest hover:scale-105 active:scale-95 transition-all">
                           <span className="material-symbols-outlined font-bold">person_add</span> Enlist New Staff
                        </button>
                     )}
                  </div>
                </div>

                {isEditingUser ? (
                   <div className="bg-white p-16 rounded-[4rem] shadow-2xl animate-in zoom-in-95 duration-500 border border-slate-50 text-left">
                      <div className="grid grid-cols-2 gap-10">
                         <div className="space-y-3">
                           <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-2">Username</label>
                           <input className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-[2rem] font-black text-slate-800 outline-none" value={userForm.username} onChange={e => setUserForm({...userForm, username: e.target.value})} />
                         </div>
                         <div className="space-y-3">
                           <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-2">Credentials (Password)</label>
                           <input type="password" className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-[2rem] font-black text-slate-800 outline-none" placeholder={userForm.rowIndex ? '•••••••• (Empty to keep)' : 'ระบุรหัสผ่าน...'} value={userForm.password} onChange={e => setUserForm({...userForm, password: e.target.value})} />
                         </div>
                         <div className="space-y-3">
                           <label className="text-[11px] font-black text-slate-300 uppercase tracking-widest ml-2">Legal Identity (Full Name)</label>
                           <input className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-[2rem] font-black text-slate-800 outline-none" value={userForm.name} onChange={e => setUserForm({...userForm, name: e.target.value})} />
                         </div>
                         <div className="space-y-3">
                           <label className="text-[11px] font-black text-slate-300 uppercase tracking-widest ml-2">Access Lifecycle (Role)</label>
                           <select className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-[2rem] font-black text-slate-800 outline-none appearance-none cursor-pointer" value={userForm.role} onChange={e => setUserForm({...userForm, role: e.target.value})}>
                              <option value="Staff">Warehouse Staff (หน้าร้าน)</option>
                              <option value="Manager">Operations Manager (ผู้จัดการ)</option>
                              <option value="Admin">System Administrator (ไอที)</option>
                           </select>
                         </div>
                      </div>
                      <div className="flex gap-6 mt-16">
                         <button onClick={async () => { setLoading(true); try { await saveUser(userForm); await loadAllSettingsData(); setIsEditingUser(false); setSuccess(true); setTimeout(()=>setSuccess(false), 2000); } catch(err:any) { alert(err.message); } finally { setLoading(false); } }} className="flex-[2] py-6 bg-blue-600 text-white rounded-[2.5rem] font-black text-[16px] shadow-2xl shadow-blue-100 active:scale-95 transition-all uppercase tracking-widest">Commit Operational Profile</button>
                         <button onClick={() => setIsEditingUser(false)} className="flex-1 py-6 bg-slate-50 text-slate-400 rounded-[2.5rem] font-black text-[13px] uppercase hover:bg-slate-100 transition-all">Cancel</button>
                      </div>
                   </div>
                ) : (
                   <div className="grid grid-cols-2 gap-8 pb-40">
                      {users.map((u, i) => (
                         <div key={i} className="bg-white border border-slate-50 p-8 rounded-[3rem] flex items-center justify-between hover:shadow-2xl transition-all group/user">
                            <div className="flex items-center gap-6 text-left">
                               <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-[1.5rem] flex items-center justify-center font-black text-2xl group-hover/user:bg-blue-600 group-hover/user:text-white transition-all shadow-sm">
                                  {u.name?.charAt(0) || u.username?.charAt(0)}
                               </div>
                               <div className="text-left">
                                  <h4 className="font-black text-slate-900 text-[20px] leading-none tracking-tight">{u.name || u.username}</h4>
                                  <p className="text-[11px] font-bold text-slate-300 uppercase tracking-widest mt-3 flex items-center gap-2">
                                     <span className="w-2 h-2 rounded-full bg-blue-500"></span> @{u.username} • {u.role}
                                  </p>
                               </div>
                            </div>
                            <div className="flex items-center gap-3">
                               <button onClick={() => { setUserForm({...u, password: ''}); setIsEditingUser(true); }} className="w-12 h-12 bg-slate-50 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-2xl transition-all flex items-center justify-center"><span className="material-symbols-outlined text-[20px]">edit</span></button>
                               <button onClick={async () => { if(window.confirm(`Permanently revoke access for ${u.name || u.username}?`)) { setLoading(true); await deleteUser(u.rowIndex); await loadAllSettingsData(); } }} className="w-12 h-12 bg-slate-50 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all flex items-center justify-center"><span className="material-symbols-outlined text-[20px]">person_remove</span></button>
                            </div>
                         </div>
                      ))}
                   </div>
                )}
             </div>
          )}

          {activeTab === 'customers' && (
             <div className="animate-in fade-in duration-700">
                <SettingsCustomers 
                   customers={customers}
                   transactions={transactions}
                   logisticsJobs={logisticsJobs}
                   onEditCustomer={(c) => { 
                      // Custom logic for quick edit in desktop
                      // For now we'll just open the modal if we have one or handle it
                      loadAllSettingsData();
                   }}
                   onDeleteCustomer={async (c) => {
                      if (window.confirm(`ลบข้อมูลลูกค้า ${c.name} หรือไม่?`)) {
                        await deleteCustomer(c.cv);
                        loadAllSettingsData();
                      }
                   }}
                   onAddCustomer={() => {
                      // Add new customer logic
                   }}
                   onLoadCustomers={loadAllSettingsData}
                   isLoadingCustomers={loading}
                />
             </div>
          )}

          {/* 📡 INFRA: WAREHOUSES */}
          {activeTab === 'warehouses' && (
             <div className="animate-in fade-in duration-700">
                <SettingsWarehouses 
                   settings={settings}
                   setSettings={setSettings}
                   onRefresh={handleGlobalRefresh}
                />
             </div>
          )}

          {/* 🔔 NOTIFICATIONS */}
          {activeTab === 'notify' && (
             <div className="animate-in fade-in duration-700">
               <SettingsNotify 
                  settings={settings} 
                  setSettings={setSettings} 
                  tokens={[]} 
                  setTokens={()=>{}} 
                  channels={[]} 
                  setChannels={()=>{}} 
                  loading={loading} 
                  setLoading={setLoading} 
                  showSuccess={() => { setSuccess(true); setTimeout(() => setSuccess(false), 2000); }} 
                  setError={(msg)=>setError(msg)}
                  testTelegram={testTelegram}
                  relinkTelegram={relinkTelegram}
                  onSave={handleSaveSettings}
               />
             </div>
          )}

          {/* 🧩 CONSTRUCTION: OTHER TABS */}
          {['areas', 'perms', 'health'].includes(activeTab) && (
             <div className="p-40 text-center space-y-10 bg-white rounded-[5rem] border border-slate-50 shadow-[0_40px_100px_rgba(0,0,0,0.02)] animate-in zoom-in-95 duration-1000 overflow-hidden relative">
                <div className="absolute inset-0 bg-indigo-50/5 opacity-50 pointer-events-none"></div>
                <div className="w-40 h-40 bg-slate-50 text-slate-200 rounded-[3rem] flex items-center justify-center mx-auto shadow-inner relative group/icon">
                   <span className="material-symbols-outlined text-[80px] group-hover/icon:scale-110 transition-transform duration-700">engineering</span>
                   <div className="absolute inset-0 border-8 border-dashed border-slate-100/50 rounded-[3rem] animate-[spin_15s_linear_infinite]"></div>
                </div>
                <div className="space-y-6 relative z-10">
                   <h3 className="text-4xl font-black text-slate-900 tracking-tighter leading-none uppercase">Module Encrypted</h3>
                   <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[12px] max-w-sm mx-auto leading-relaxed">This secure management sector is currently being audited and optimized for your territory.</p>
                </div>
                <button onClick={() => setActiveTab('system')} className="px-12 py-5 bg-slate-900 text-white rounded-[2rem] font-black text-[12px] shadow-2xl shadow-slate-200 hover:scale-110 active:scale-95 transition-all uppercase tracking-[0.3em]">Return to Base</button>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DesktopSettings;
