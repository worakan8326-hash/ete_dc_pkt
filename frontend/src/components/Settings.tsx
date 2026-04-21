import React, { useState, useEffect, useMemo, useCallback, Suspense, Fragment, lazy } from 'react';
import { 
  getUsers, saveUser, deleteUser, 
  getSettings, saveSettings,
  getItems, saveMasterItem, deleteMasterItem,
  clearTransactions,
  getZones, saveZone,
  getCustomers, getNextCustomerCv, deleteCustomer,
  getWarehouses,
  testTelegram, relinkTelegram,
  updateApiUrl, resetApiUrl, API_URL
} from '../api';
import type { MaterialItem, Zone, Customer } from '../types';
import ConfirmationModal from './ConfirmationModal';


import SettingsUsers from './SettingsUsers';
import SettingsMaster from './SettingsMaster';
import SettingsNotify from './SettingsNotify';
import SettingsCustomers from './SettingsCustomers';
import SettingsWarehouses from './SettingsWarehouses';
import CustomerQuickEdit from './CustomerQuickEdit';
import SettingsPermissions from './SettingsPermissions';

interface SettingsProps {
  onRefresh?: () => void;
  user?: any;
  FULL_ADDRESS_LIST?: any[];
  FILTERED_ADDRESS_LIST?: any[];
  permissions?: any;
  clientVersion: string;
  transactions: any[];
  logisticsJobs: any[];
}

export default function Settings({ onRefresh, user, FULL_ADDRESS_LIST, FILTERED_ADDRESS_LIST, permissions, clientVersion = "2.1.1", transactions = [], logisticsJobs = [] }: SettingsProps) {
  const userRoleRaw = user?.role?.toLowerCase() || '';
  // Fix: Exclude 'office' from being treated as Super Admin even if it contains 'admin'
  const isAdministrator = (userRoleRaw.includes('admin') || userRoleRaw.includes('manager')) && !userRoleRaw.includes('office');
  const isManager = userRoleRaw === 'manager' || userRoleRaw.includes('ผู้จัดการ');

  const [activeTab, setActiveTab] = useState<'users' | 'master' | 'notify' | 'system' | 'zones' | 'customers' | 'permissions' | 'warehouses'>(() => {
    const saved = localStorage.getItem('settings_active_tab');
    if (isAdministrator && !isManager) {
      if (saved === 'notify' || saved === 'system' || saved === 'users' || saved === 'customers' || saved === 'permissions') return 'master'; 
    }
    return (saved as any) || 'users';
  });

  const [users, setUsers] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({ 
    LINE_ACCESS_TOKEN: '', NOTIFY_PRIORITY: 'LINE'
  });
  const [channels, setChannels] = useState<any[]>([]);
  const [tokens, setTokens] = useState<string[]>(['']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form states
  const [showUserForm, setShowUserForm] = useState(false);
  const [editUser, setEditUser] = useState<any>({ username: '', password: '', name: '', role: 'staff' });
  const [showPermissions, setShowPermissions] = useState(false);
  
  const [editItem, setEditItem] = useState<MaterialItem>({
    ประเภท: '', 'ยี่ห้อหรือรูปแบบ': '', รายการ: '', สภาพ: '', รายละเอียด: '', ขนาด: '', จำนวน: 0,
    repair_qty: 0, quarantine_qty: 0,
    warehouseId: null
  } as any);

  const [masterItems, setMasterItems] = useState<MaterialItem[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [showZoneForm, setShowZoneForm] = useState(false);
  const [editZone, setEditZone] = useState<Zone | null>(null);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer>({ cv: '', name: '', phone: '', address: '', subdistrict: '', district: '', province: '', zipcode: '', lat: '', lng: '' });

  const [warehouses, setWarehouses] = useState<any[]>([]);

  const [deleteConfirm, setDeleteConfirm] = useState<{show: boolean, rowIndex: any, itemName: string, type: 'item' | 'user' | 'customer'}>({ show: false, rowIndex: null, itemName: '', type: 'item' });
  const [showItemForm, setShowItemForm] = useState(false);
  const [clearHistoryConfirm, setClearHistoryConfirm] = useState(false);
  const [keepFormOpen, setKeepFormOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [appScriptUrl, setAppScriptUrl] = useState(API_URL);
  
  const toggleExpand = (id: string) => setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));
  
  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [uData, sData, iData, zData, cData, wData] = await Promise.all([
        getUsers(), getSettings(true), getItems(true), getZones(true), getCustomers(true), getWarehouses()
      ]);
      setUsers(uData || []);
      setMasterItems(iData || []);
      setZones(zData || []);
      setCustomers(cData || []);
      setWarehouses(wData || []);
      setSettings((prev: any) => {
        const ns = { ...prev, ...sData };
        const tList = (ns.LINE_ACCESS_TOKEN || "").split(",").map((t: string) => t.trim()).filter(Boolean);
        setTokens(tList.length ? tList : ['']);
        return ns;
      });
    } catch (err: any) { setError(err.message || 'Error loading data'); } finally { setLoading(false); }
  }, []);

  const refreshItems = useCallback(async () => {
    setLoading(true);
    try {
      const iData = await getItems(true);
      setMasterItems(iData || []);
    } catch (err: any) { setError(err.message || 'Error refreshing items'); } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  
  const suggestions = useMemo(() => {
    const getUnique = (field: keyof MaterialItem) => 
       Array.from(new Set(masterItems.map(item => String(item[field] || '').trim()).filter(Boolean))).sort();
    
    return {
      types: getUnique('ประเภท'),
      brands: getUnique('ยี่ห้อหรือรูปแบบ'),
      items: getUnique('รายการ'),
      conditions: getUnique('สภาพ'),
      sizes: getUnique('ขนาด')
    };
  }, [masterItems]);

  const showSuccess = useCallback((msg: string) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 3000); }, []);

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    try { await saveUser(editUser); setShowUserForm(false); showSuccess('บันทึกสำเร็จ'); await loadData(); } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  const handleSaveMasterItem = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    try { 
      await saveMasterItem(editItem); 
      showSuccess('บันทึกพัสดุสำเร็จ'); 
      await refreshItems(); 
      if (onRefresh) onRefresh();
      if (!editItem.rowIndex && keepFormOpen) {
        setEditItem(prev => ({ ...prev, รายการ: '', ขนาด: '', จำนวน: 0 }));
      } else {
        setShowItemForm(false); 
      }
    } catch (err: any) { setError(err.message); } 
    finally { setLoading(false); }
  };

  const handleSaveZone = async (e: React.FormEvent) => {
    if (e) e.preventDefault(); 
    if (!editZone) return; 
    setLoading(true);
    try { await saveZone(editZone); showSuccess('บันทึกเขตสำเร็จ'); setShowZoneForm(false); await loadData(); } catch (err: any) { alert(err.message); } finally { setLoading(false); }
  };

  const handleAddNewCustomer = async () => {
    setLoading(true);
    try {
      const nextCv = await getNextCustomerCv();
      setEditCustomer({ 
        cv: nextCv, name: '', phone: '', address: '', 
        subdistrict: '', district: '', province: '', zipcode: '', lat: '', lng: '' 
      });
      setShowCustomerForm(true);
    } catch (err: any) {
      const autoCV = 'A' + Date.now().toString().slice(-8);
      setEditCustomer({ cv: autoCV, name: '', phone: '', address: '', subdistrict: '', district: '', province: '', zipcode: '', lat: '', lng: '' });
      setShowCustomerForm(true);
    } finally {
      setLoading(false);
    }
  };

  const [isUrlVisible, setIsUrlVisible] = useState(false);
  const labelClass = "text-[11px] font-black text-secondary/40 uppercase tracking-widest ml-1";

  return (
    <div className="w-full mx-auto py-4 px-1 md:px-4 relative">
      {/* 🚀 Clean Flat Success Popup (Instant) */}
      {successMsg && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40">
           <div className="bg-white rounded-[2rem] p-10 shadow-lg border border-slate-100 flex flex-col items-center text-center space-y-6 max-w-sm w-full">
              <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center shadow-inner">
                 <span className="material-symbols-outlined text-[60px] font-black">check_circle</span>
              </div>
              <div>
                 <h3 className="text-2xl font-black text-slate-900 leading-tight">บันทึกข้อมูลเรียบร้อย</h3>
                 <p className="text-[14px] font-bold text-slate-400 uppercase tracking-widest mt-2">{successMsg}</p>
              </div>
              <div className="w-full h-1.5 bg-slate-50 rounded-full overflow-hidden">
                 <div className="h-full bg-emerald-500 w-full transition-all duration-300"></div>
              </div>
           </div>
        </div>
      )}

      {/* 🔄 Simple Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-white/80">
           <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                 <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                 <div className="absolute inset-0 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary text-[20px]">cloud_sync</span>
                 </div>
              </div>
              <p className="text-[15px] font-black text-secondary uppercase tracking-[0.3em]">กำลังประมวลผล...</p>
           </div>
        </div>
      )}

      <div className="flex overflow-x-auto pb-4 mb-4 scrollbar-hide gap-3 sticky top-0 z-20 bg-[#f8f9fc] px-2 pt-2">
        {[
          { id: 'users', label: 'พนักงาน', icon: 'person', perm: 'set_users' },
          { id: 'master', label: 'พัสดุหลัก', icon: 'database', perm: 'set_items' },
          { id: 'notify', label: 'แจ้งเตือน', icon: 'notifications', perm: 'set_notifications' },
          { id: 'zones', label: 'เขตงาน', icon: 'map', perm: 'set_zones' },
          { id: 'customers', label: 'ลูกค้า', icon: 'groups', perm: 'set_customers' },
          { id: 'warehouses', label: 'คลังย่อย', icon: 'warehouse', perm: 'set_warehouses' },
          { id: 'system', label: 'ระบบ', icon: 'settings', perm: 'set_system' },
        ].filter(tab => {
          if (isAdministrator) return true;
          const rolePerms = permissions?.[user?.role] || {};
          return rolePerms[tab.perm as string] === true;
        }).map((tab) => (
          <button
            key={tab.id}
            onClick={(e) => { 
                setActiveTab(tab.id as any); 
                localStorage.setItem('settings_active_tab', tab.id);
                setShowUserForm(false); setShowItemForm(false); setShowCustomerForm(false); setShowZoneForm(false); 
                (e.currentTarget as HTMLElement).scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
            }}
            className={`
              relative flex-shrink-0 group flex flex-col items-center justify-center min-w-[72px] h-20 rounded-2xl transition-all duration-300 shadow-sm
              ${activeTab === tab.id 
                ? 'bg-primary text-white border-2 border-primary/20 z-10 shadow shadow-primary/10' 
                : 'bg-white text-slate-400 border border-slate-100 hover:bg-white'
              }
            `}
          >
            <div className={`
              w-9 h-9 rounded-xl mb-1 flex items-center justify-center transition-all
              ${activeTab === tab.id ? 'bg-white/20' : 'bg-slate-50 group-hover:bg-primary/5'}
            `}>
              <span className={`material-symbols-outlined text-[20px] ${activeTab === tab.id ? 'text-white' : 'text-slate-300 group-hover:text-primary transition-colors'}`}>
                {tab.icon}
              </span>
            </div>
            <span className="text-[10px] font-black tracking-tight leading-none uppercase">
              {tab.label}
            </span>
            {activeTab === tab.id && (
              <div className="absolute -bottom-1 w-1 h-1 bg-white rounded-full"></div>
            )}
          </button>
        ))}
      </div>

        <div className="bg-white rounded-[1.5rem] border border-slate-200 min-h-[500px] overflow-hidden">
          {error && <div className="m-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 font-bold">{error}</div>}
          
          <div className="relative">
          {activeTab === 'users' && !showUserForm && (
            showPermissions ? (
              <SettingsPermissions 
                users={users} 
                onRefresh={onRefresh}
                onBack={() => setShowPermissions(false)}
              />
            ) : (
              <SettingsUsers 
                users={users} 
                onEditUser={(u) => { setEditUser(u); setShowUserForm(true); }}
                onDeleteUser={(u) => { setDeleteConfirm({ show: true, type: 'user', rowIndex: u.rowIndex, itemName: u.name || u.username }); }}
                onAddUser={() => { setEditUser({ username: '', password: '', name: '', role: 'Staff' }); setShowUserForm(true); }}
                onManagePermissions={() => setActiveTab('permissions')}
              />
            )
          )}
          {activeTab === 'master' && !showItemForm && (
            <SettingsMaster 
              masterItems={masterItems} 
              warehouses={warehouses}
              settings={settings}
              onRefresh={loadData} 
              onAddItem={() => { 
                setEditItem({ 
                  ประเภท: '', 
                  'ยี่ห้อหรือรูปแบบ': '', 
                  รายการ: '', 
                  สภาพ: '', 
                  รายละเอียด: '', 
                  ขนาด: '', 
                  จำนวน: 0,
                  repair_qty: 0,
                  quarantine_qty: 0,
                  lost_qty: 0,
                  scrap_qty: 0,
                  warehouseId: settings.MAIN_WAREHOUSE_ID ? parseInt(settings.MAIN_WAREHOUSE_ID) : (warehouses[0]?.id || null)
                }); 
                setShowItemForm(true); 
              }} 
              onEditItem={it => { 
                setEditItem({
                  ...it,
                  repair_qty: it.repair_qty || 0,
                  quarantine_qty: it.quarantine_qty || 0,
                  lost_qty: it.lost_qty || 0,
                  scrap_qty: it.scrap_qty || 0,
                  warehouseId: settings.MAIN_WAREHOUSE_ID ? parseInt(settings.MAIN_WAREHOUSE_ID) : (warehouses[0]?.id || null)
                }); 
                setShowItemForm(true); 
              }} 
              onDeleteItem={idx => { 
                const t = masterItems.find(it => it.rowIndex === Number(idx)); 
                setDeleteConfirm({ show: true, rowIndex: idx, itemName: t ? t.รายการ : "รายการนี้", type: 'item' }); 
              }} 
              showSuccess={showSuccess} 
              setError={setError} 
              setLoading={setLoading} 
              loading={loading} 
            />
          )}
          {activeTab === 'notify' && (
            <SettingsNotify 
              settings={settings} 
              setSettings={setSettings} 
              tokens={tokens} 
              setTokens={setTokens} 
              channels={channels} 
              setChannels={setChannels} 
              loading={loading} 
              setLoading={setLoading} 
              showSuccess={showSuccess} 
              setError={setError}
              testTelegram={testTelegram}
              relinkTelegram={relinkTelegram}
              onSave={async () => {
                setLoading(true);
                try {
                  await saveSettings(settings);
                  showSuccess('บันทึกการตั้งค่าแจ้งเตือนสำเร็จ');
                  await loadData();
                } catch(e:any) { setError(e.message); }
                finally { setLoading(false); }
              }}
            />
          )}
          {activeTab === 'customers' && !showCustomerForm && (
            <SettingsCustomers 
              customers={customers} 
              transactions={transactions}
              logisticsJobs={logisticsJobs}
              items={masterItems}
              onAddCustomer={handleAddNewCustomer} 
              onEditCustomer={c => { setEditCustomer({...c}); setShowCustomerForm(true); }} 
              onDeleteCustomer={c => setDeleteConfirm({ show: true, rowIndex: c.rowIndex, itemName: c.name, type: 'customer' })} 
              onLoadCustomers={loadData}
              isLoadingCustomers={loading}
            />
          )}
          
          {activeTab === 'warehouses' && (
            <SettingsWarehouses 
              settings={settings} 
              setSettings={setSettings}
              onRefresh={loadData}
            />
          )}
          
          {activeTab === 'zones' && !showZoneForm && (
            <div className="p-4 md:p-8 animate-fade-in space-y-6">
              <div className="flex justify-between items-center bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                    <span className="material-symbols-outlined text-[24px]">location_on</span>
                  </div>
                  <div className="text-left">
                    <h2 className="text-[16px] font-black text-secondary uppercase tracking-tight">เขตการทำงาน</h2>
                    <p className="text-[10px] text-secondary/30 font-bold uppercase tracking-widest leading-none">Work Zone Management</p>
                  </div>
                </div>
                <button 
                  onClick={() => { setEditZone({ name: '', description: '' }); setShowZoneForm(true); }} 
                  className="bg-primary text-white h-10 px-6 rounded-xl font-black flex items-center gap-2 text-[12px] shadow-lg shadow-primary/20 uppercase tracking-widest active:scale-95 transition-all"
                > 
                  <span className="material-symbols-outlined text-[18px]">add_location_alt</span> เพิ่มเขต 
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-left">
                {zones
                  .filter(z => !String(z.name || '').includes('โซน 1/1'))
                  .map((z, i) => (
                  <div key={i} className="bg-white border border-slate-100 rounded-2xl p-3.5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-6 opacity-[0.02] pointer-events-none transform rotate-12">
                        <span className="material-symbols-outlined text-[60px] text-primary">distance</span>
                    </div>
                    <div className="relative z-10">
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                          <h3 className="font-black text-[14px] text-secondary leading-tight">{z.name}</h3>
                          <p className="text-[11px] text-secondary/40 font-bold mt-0.5 line-clamp-1 leading-relaxed">{z.description || 'ไม่มีรายละเอียด'}</p>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <button 
                            onClick={() => { setEditZone(z); setShowZoneForm(true); }} 
                            className="w-7 h-7 flex items-center justify-center text-primary bg-primary/5 rounded-lg hover:bg-primary hover:text-white transition-all"
                            title="แก้ไข"
                          >
                            <span className="material-symbols-outlined text-[16px]">edit</span>
                          </button>
                          <button 
                            onClick={() => { if(confirm('ยืนยันลบเขตงานนี้?')) handleSaveZone(null as any); }} 
                            className="w-7 h-7 flex items-center justify-center text-red-100 bg-red-50 rounded-lg hover:bg-red-500 hover:text-white transition-all"
                            title="ลบ"
                          >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {activeTab === 'system' && (
              <div className="max-w-2xl mx-auto p-4 md:p-8 space-y-6 animate-fade-in pb-32">
                
                {/* 1. API Endpoint Section */}
                <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden text-left">
                   <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                         <div className="w-10 h-10 bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center">
                            <span className="material-symbols-outlined text-[24px]">link</span>
                         </div>
                         <div>
                            <h2 className="text-[15px] font-black text-slate-900 leading-none">การตั้งค่า API Endpoint</h2>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Backend Configuration</p>
                         </div>
                      </div>
                   </div>
                   
                   <div className="p-6 space-y-4">
                       <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-slate-400 ml-1 uppercase">URL Google Apps Script</label>
                          <div className="relative group overflow-hidden rounded-2xl border border-slate-100 shadow-sm">
                             <textarea 
                                title="Api Url"
                                value={isUrlVisible ? appScriptUrl : '••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••'}
                                onChange={(e) => { if (isUrlVisible) setAppScriptUrl(e.target.value); }}
                                readOnly={!isUrlVisible}
                                className={`w-full bg-slate-50 px-5 py-4 font-bold text-[12px] text-slate-900 outline-none focus:bg-white h-24 resize-none break-all transition-all duration-300 ${!isUrlVisible ? 'blur-[4px] select-none text-slate-300' : ''}`}
                                spellCheck={false}
                             />
                             {!isUrlVisible && (
                                <div className="absolute inset-0 flex items-center justify-center bg-slate-50/5 pointer-events-none">
                                   <div className="flex flex-col items-center gap-1.5 animate-pulse">
                                      <span className="material-symbols-outlined text-[16px] text-slate-400">lock</span>
                                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Masked for Security</span>
                                   </div>
                                </div>
                             )}
                             <button 
                                type="button"
                                title="Show URL Toggle"
                                onClick={() => setIsUrlVisible(!isUrlVisible)}
                                className="absolute top-2.5 right-2.5 w-9 h-9 bg-white/90 backdrop-blur-md rounded-xl flex items-center justify-center text-slate-400 hover:text-primary shadow-sm hover:shadow-md transition-all active:scale-90"
                             >
                                <span className="material-symbols-outlined text-[20px]">{isUrlVisible ? 'visibility_off' : 'lock_open'}</span>
                             </button>
                          </div>
                       </div>
                      
                      <div className="flex gap-2">
                        <button 
                           title="บันทึกและเชื่อมต่อ API"
                           onClick={() => { updateApiUrl(appScriptUrl); window.location.reload(); }}
                           className="flex-1 h-12 bg-emerald-600 text-white rounded-xl font-bold text-[13px] shadow-lg shadow-emerald-600/20 active:scale-95 transition-all flex items-center justify-center"
                        >
                           อัปเดตและเชื่อมต่อใหม่
                        </button>
                        <button 
                           title="Reset API"
                           onClick={() => { if (confirm('กลับเป็นค่าเริ่มต้น?')) { resetApiUrl(); window.location.reload(); } }}
                           className="h-12 px-4 bg-slate-100 text-slate-400 rounded-xl font-bold text-[12px] hover:bg-rose-50 hover:text-rose-500 transition-all"
                        >
                           Reset
                        </button>
                      </div>
                   </div>
                </div>

                {/* 2. Region Filter Section */}
                <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden text-left">
                   <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                         <div className="w-10 h-10 bg-indigo-50 text-indigo-500 rounded-xl flex items-center justify-center">
                            <span className="material-symbols-outlined text-[24px]">map_search</span>
                         </div>
                         <div>
                            <h2 className="text-[15px] font-black text-slate-900 leading-none">ตัวกรองข้อมูลพื้นที่</h2>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Data Precision Control</p>
                         </div>
                      </div>
                   </div>

                   <div className="p-6 space-y-6">
                      <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100">
                         <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${String(settings.ENABLE_AREA_FILTER) === 'true' ? 'bg-indigo-500' : 'bg-slate-300'}`}></div>
                            <span className="text-[14px] font-black text-slate-900">เปิดใช้งานการคัดกรองพื้นที่</span>
                         </div>
                         <button 
                           title="Toggle Filter"
                           onClick={() => setSettings({...settings, ENABLE_AREA_FILTER: String(settings.ENABLE_AREA_FILTER) === 'true' ? 'false' : 'true'})}
                           className={`w-12 h-7 rounded-full transition-all relative flex items-center px-0.5 ${String(settings.ENABLE_AREA_FILTER) === 'true' ? 'bg-indigo-500' : 'bg-slate-200'}`}
                         >
                            <div className={`w-6 h-6 bg-white rounded-full shadow-md transition-all transform ${String(settings.ENABLE_AREA_FILTER) === 'true' ? 'translate-x-5' : 'translate-x-0'}`}></div>
                         </button>
                      </div>

                      <div className="text-center">
                        <p className="text-[11px] text-slate-400 font-bold px-4 leading-relaxed italic">
                           * ปรับแต่งภูมิภาคและจังหวัดที่จะแสดงผลในระบบ เพื่อความสะดวกรวดเร็วในการค้นหาที่อยู่
                        </p>
                        <button 
                           title="Open Region Editor"
                           onClick={() => toggleExpand('AREA_EDITOR')}
                           className="mt-4 text-[12px] font-black text-indigo-600 border border-indigo-100 bg-indigo-50/50 px-6 py-2.5 rounded-full hover:bg-indigo-50 transition-all active:scale-95"
                        >
                           {expandedItems['AREA_EDITOR'] ? 'ปิดเครื่องมือปรับแต่ง' : 'เปิดเครื่องมือปรับแต่งภูมิภาค'}
                        </button>
                      </div>

                      {expandedItems['AREA_EDITOR'] && (
                        <div className="bg-slate-50/50 rounded-2xl border border-slate-100 p-2 space-y-4 animate-fade-in max-h-[500px] overflow-y-auto scrollbar-hide">
                           {(() => {
                               const regions: Record<string, { label: string, colorClass: string, provinces: string[] }> = {
                                  CENTRAL: { label: 'ภาคกลาง', colorClass: 'bg-blue-500', provinces: ['กรุงเทพมหานคร', 'กำแพงเพชร', 'ชัยนาท', 'นครนายก', 'นครปฐม', 'นครสวรรค์', 'นนทบุรี', 'ปทุมธานี', 'พระนครศรีอยุธยา', 'พิจิตร', 'พิษณุโลก', 'ลพบุรี', 'สมุทรปราการ', 'สมุทรสงคราม', 'สมุทรสาคร', 'สระบุรี', 'สิงห์บุรี', 'สุโขทัย', 'สุพรรณบุรี', 'อ่างทอง', 'อุทัยธานี'] },
                                  NORTH: { label: 'ภาคเหนือ', colorClass: 'bg-emerald-500', provinces: ['เชียงราย', 'เชียงใหม่', 'น่าน', 'พะเยา', 'แพร่', 'แม่ฮ่องสอน', 'ลำปาง', 'ลำพูน', 'อุตรดิตถ์'] },
                                  NORTHEAST: { label: 'ภาคอีสาน', colorClass: 'bg-orange-500', provinces: ['กาฬสินธุ์', 'ขอนแก่น', 'ชัยภูมิ', 'นครพนม', 'นครราชสีมา', 'บึงกาฬ', 'บุรีรัมย์', 'มหาสารคาม', 'มุกดาหาร', 'ยโสธร', 'ร้อยเอ็ด', 'เลย', 'ศรีสะเกษ', 'สกลนคร', 'สุรินทร์', 'หนองคาย', 'หนองบัวลำภู', 'อำนาจเจริญ', 'อุดรธานี', 'อุบลราชธานี'] },
                                  EAST: { label: 'ภาคตะวันออก', colorClass: 'bg-cyan-500', provinces: ['จันทบุรี', 'ฉะเชิงเทรา', 'ชลบุรี', 'ตราด', 'ปราจีนบุรี', 'ระยอง', 'สระแก้ว'] },
                                  WEST: { label: 'ภาคตะวันตก', colorClass: 'bg-indigo-500', provinces: ['กาญจนบุรี', 'ตาก', 'ประจวบคีรีขันธ์', 'เพชรบุรี', 'ราชบุรี'] },
                                  SOUTH: { label: 'ภาคใต้', colorClass: 'bg-rose-500', provinces: ['กระบี่', 'ชุมพร', 'ตรัง', 'นครศรีธรรมราช', 'นราธิวาส', 'ปัตตานี', 'พังงา', 'พัทลุง', 'ภูเก็ต', 'ระนอง', 'สตูล', 'สงขลา', 'สุราษฎร์ธานี', 'ยะลา'] }
                               };
                               return Object.entries(regions).map(([key, reg]) => {
                                  const regId = `FILTER_REG_${key}`;
                                  const isActive = String(settings[regId]) !== 'false';
                                  return (
                                     <div key={key} className="flex items-center justify-between bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm">
                                        <div className="flex items-center gap-3">
                                           <div className={`w-3 h-3 rounded-full ${reg.colorClass} shadow-sm opacity-80`}></div>
                                           <span className="text-[13px] font-black text-slate-800">{reg.label}</span>
                                        </div>
                                        <button 
                                           title={`Toggle ${reg.label}`}
                                           onClick={() => setSettings({...settings, [regId]: isActive ? 'false' : 'true'})}
                                           className={`w-10 h-6 rounded-full transition-all relative flex items-center px-0.5 ${isActive ? reg.colorClass : 'bg-slate-200'}`}
                                        >
                                           <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-all transform ${isActive ? 'translate-x-4' : 'translate-x-0'}`}></div>
                                        </button>
                                     </div>
                                  );
                               });
                            })()}
                        </div>
                      )}

                      <button 
                        title="บันทึกการตั้งค่า"
                        onClick={async () => {
                           setLoading(true);
                           try { await saveSettings(settings); showSuccess('บันทึกสำเร็จ'); await loadData(); if(onRefresh) onRefresh(); } catch(e:any) { alert(e.message); } finally { setLoading(false); }
                        }}
                        className="w-full h-14 bg-indigo-600 text-white rounded-2xl font-black text-[14px] shadow-xl shadow-indigo-600/10 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                      >
                         <span className="material-symbols-outlined">save</span> บันทึกการตั้งค่าระบบ
                      </button>
                   </div>
                </div>

                {/* 3. OTA Version Section */}
                <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden text-left">
                   <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                         <div className="w-10 h-10 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center">
                            <span className="material-symbols-outlined text-[24px]">system_update_alt</span>
                         </div>
                         <div>
                            <h2 className="text-[15px] font-black text-slate-900 leading-none">จัดการเวอร์ชันแอป (OTA)</h2>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Version Control Dashboard</p>
                         </div>
                      </div>
                      <div className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[12px] font-black tracking-widest">
                         v{settings.APP_VERSION || '1.0.0'}
                      </div>
                   </div>

                   <div className="p-6 space-y-5">
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between shadow-inner">
                         <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-100/50">
                               <span className="material-symbols-outlined text-[20px] text-indigo-500">terminal</span>
                            </div>
                            <div>
                               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight">Build Version</p>
                               <p className="text-[14px] font-black text-slate-900 leading-tight">v{clientVersion || '---'}</p>
                            </div>
                         </div>
                         <div className="flex flex-col items-end">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight">Cloud Link</p>
                            <p className="text-[14px] font-black text-indigo-600 leading-tight">v{settings.APP_VERSION || '---'}</p>
                         </div>
                      </div>

                      <div className="px-4 py-2 bg-blue-50/50 rounded-xl border border-blue-100/50">
                         <p className="text-[11px] font-bold text-blue-600/70 text-center leading-relaxed italic uppercase tracking-tight">
                            * เมื่อกดปุ่มด้านล่าง ระบบจะบังคับให้ผู้ใช้ทุกคนทำการรีเฟรชหน้าเว็บ <br />เพื่อเริ่มใช้งานเวอร์ชัน {clientVersion} ทันที
                         </p>
                      </div>

                      <button 
                          title="ยืนยันการตั้งค่าเวอร์ชัน"
                          disabled={!clientVersion || settings.APP_VERSION === clientVersion}
                          onClick={async () => {
                             if (!confirm(`ยืนยันการ Deploy เวอร์ชัน v${clientVersion} ไปยังผู้ใช้ทุกคน?`)) return;
                             setLoading(true);
                             try {
                                 const updateData = { ...settings, APP_VERSION: clientVersion };
                                 await saveSettings(updateData);
                                 showSuccess('Deploy เวอรชันใหม่สำเร็จ!');
                                 await loadData();
                             } catch(e:any) { setError(e.message); }
                             finally { setLoading(false); }
                          }}
                          className={`w-full h-14 rounded-2xl font-black text-[14px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                             !clientVersion || settings.APP_VERSION === clientVersion
                                ? 'bg-slate-50 text-slate-300 cursor-not-allowed border border-slate-100'
                                : 'bg-primary text-white shadow-xl shadow-primary/20 active:scale-95 border-b-4 border-indigo-700'
                          }`}
                      > 
                        <span className="material-symbols-outlined font-black">rocket_launch</span>
                        {settings.APP_VERSION === clientVersion ? 'ระบบเป็นเวอร์ชันล่าสุดแล้ว' : `Deploy v${clientVersion} to Cloud`}
                      </button>
                   </div>
                </div>

                {/* 4. Dangerous Operations */}
                <div className="p-8 bg-rose-50/30 rounded-[2.5rem] border border-rose-100 text-center space-y-5">
                    <div className="w-14 h-14 bg-white text-rose-500 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                        <span className="material-symbols-outlined text-[28px] [font-variation-settings:'FILL'_1]">warning</span>
                    </div>
                    <div>
                        <h2 className="text-[16px] font-black text-rose-900 leading-tight">ดูแลรักษาฐานข้อมูล</h2>
                        <p className="text-[10px] text-rose-400 font-bold uppercase tracking-widest mt-1">Dangerous Zone</p>
                    </div>
                    <button 
                      title="Clear History Button"
                      onClick={() => setClearHistoryConfirm(true)} 
                      disabled={loading} 
                      className="w-full h-14 bg-white text-rose-500 rounded-2xl font-black text-[12px] uppercase tracking-widest border border-rose-200 shadow-sm active:scale-95 hover:bg-rose-500 hover:text-white transition-all transition-duration-300"
                    > 
                       ล้างประวัติธุรกรรมทั้งหมด
                    </button>
                </div>
              </div>
          )}
        </div>

        {/* FORMS Layer */}
        {showUserForm && activeTab === 'users' && (
          <div className="p-4 animate-fade-in max-w-4xl mx-auto">
            <button onClick={() => setShowUserForm(false)} className="mb-6 text-secondary/40 hover:text-red-400 font-black flex items-center gap-1.5 text-xs bg-white px-5 py-2.5 rounded-xl border border-slate-100 shadow-sm transition-all uppercase tracking-widest">
              <span className="material-symbols-outlined text-[18px]">arrow_back</span> กลับหน้ารายการ
            </button>

            <div className="bg-white p-8 md:p-12 rounded-[3rem] border border-secondary/5 shadow-2xl overflow-hidden relative">
              <div className="flex items-center gap-4 mb-10 pb-6 border-b border-slate-50 text-left">
                <div className="w-14 h-14 bg-primary text-white rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
                  <span className="material-symbols-outlined text-[28px]">{editUser.rowIndex ? 'edit_note' : 'person_add'}</span>
                </div>
                <div>
                  <h2 className="text-2xl font-black text-secondary tracking-tight">{editUser.rowIndex ? 'แก้ไขข้อมูลพนักงาน' : 'เพิ่มพนักงานใหม่'}</h2>
                  <p className="text-[10px] text-secondary/40 font-bold uppercase tracking-widest mt-0.5">User Account Management</p>
                </div>
              </div>

              <form onSubmit={handleSaveUser} className="space-y-6 text-left">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                       <label className={labelClass}>Username (ใช้สำหรับ Login)</label>
                       <input title="Username" required value={editUser.username} onChange={e => setEditUser({...editUser, username: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 font-bold text-secondary focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="username" />
                    </div>
                    <div className="space-y-1.5">
                       <label className={labelClass}>รหัสผ่าน {editUser.rowIndex && '(เว้นว่างหากไม่แก้)'}</label>
                       <input title="Password" type="password" value={editUser.password || ''} onChange={e => setEditUser({...editUser, password: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 font-bold text-secondary focus:ring-2 focus:ring-primary/20 outline-none transition-all font-mono" placeholder="••••••••" />
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                       <label className={labelClass}>ชื่อ-นามสกุล / ชื่อเล่น</label>
                       <input title="Name" required value={editUser.name} onChange={e => setEditUser({...editUser, name: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 font-bold text-secondary focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="ชื่อพนักงาน..." />
                    </div>
                    <div className="space-y-1.5">
                       <label className={labelClass}>ระดับสิทธิ์ (Role)</label>
                        <select 
                           title="เลือกระดับสิทธิ์"
                           value={editUser.role} 
                           onChange={e => setEditUser({...editUser, role: e.target.value})} 
                           className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 font-bold text-secondary focus:ring-2 focus:ring-primary/20 outline-none transition-all appearance-none"
                        >
                           {/* Dynamic Roles Generation */}
                           {(() => {
                              // Define standard names for mapping
                              const labelMap: Record<string, string> = {
                                'staff': 'Staff (เจ้าหน้าที่)',
                                'office admin': 'Office Admin (แอดมินออฟฟิศ)',
                                'admin': 'Admin (ผู้ดูแลระบบ)',
                                'manager': 'Manager (ผู้จัดการสูงสุด)'
                              };

                              // Get all unique roles from: 
                              // 1. Existing users 
                              // 2. Standard roles
                              // 3. Permissions table keys (This captures newly created roles)
                              const userRoles = users.map(u => String(u.role || '').toLowerCase());
                              const permRoles = Object.keys(permissions).map(r => r.toLowerCase());
                              const standardRoles = ['staff', 'office admin', 'admin', 'manager'];
                              
                              // Combine and ensure we have a clean list
                              const allRoles = Array.from(new Set([...standardRoles, ...userRoles, ...permRoles])).filter(Boolean);

                              return allRoles.map(r => (
                                 <option key={r} value={r}>
                                    {labelMap[r] || r.charAt(0).toUpperCase() + r.slice(1)}
                                 </option>
                              ));
                           })()}
                        </select>
                    </div>
                 </div>

                 <div className="pt-6 flex gap-4">
                    <button type="button" onClick={() => setShowUserForm(false)} className="flex-1 py-4 bg-slate-100 text-secondary font-black rounded-2xl transition-all hover:bg-slate-200 uppercase tracking-widest text-xs">ยกเลิก</button>
                    <button type="submit" className="flex-[2] py-4 bg-primary text-white rounded-2xl font-black shadow-xl shadow-primary/20 active:scale-95 transition-all text-sm uppercase tracking-widest">
                       {editUser.rowIndex ? 'บันทึกการแก้ไขข้อมูล' : 'บันทึกพนักงานใหม่'}
                    </button>
                 </div>
              </form>
            </div>
          </div>
        )}
        
        {showItemForm && activeTab === 'master' && (
            <div className="p-2 md:p-4 animate-fade-in max-w-4xl mx-auto overflow-y-auto">
              <button onClick={() => setShowItemForm(false)} className="mb-4 text-secondary/40 hover:text-primary font-black flex items-center gap-2 text-[12px] bg-white px-4 py-2.5 rounded-xl border border-slate-100 shadow-sm transition-all uppercase tracking-widest">
                <span className="material-symbols-outlined text-[18px]">arrow_back</span> ย้อนกลับ
              </button>
              
              <div className="bg-white p-6 md:p-10 rounded-[2.5rem] border border-slate-100 shadow-2xl relative overflow-hidden text-left">
                <div className="absolute top-0 right-0 p-10 opacity-[0.03] pointer-events-none">
                    <span className="material-symbols-outlined text-[120px] text-primary">history_edu</span>
                </div>

                <div className="flex items-center gap-4 mb-8 pb-6 border-b border-slate-50">
                  <div className="w-12 h-12 bg-primary text-white rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
                    <span className="material-symbols-outlined text-[24px] font-black">{editItem.rowIndex ? 'edit_square' : 'add_circle'}</span>
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-secondary tracking-tight">{editItem.rowIndex ? 'แก้ไขข้อมูลพัสดุ' : 'เพิ่มพัสดุใหม่เข้าคลัง'}</h2>
                    <p className="text-[10px] text-secondary/30 font-black uppercase tracking-[0.2em] mt-0.5">Inventory Intelligence Input</p>
                  </div>
                </div>

                <form onSubmit={handleSaveMasterItem} className="space-y-5 relative z-10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <label className="text-[12px] font-black text-secondary/60 uppercase tracking-widest ml-1 flex items-center gap-2">
                          <span className="material-symbols-outlined text-[16px]">category</span> ประเภทพัสดุ
                      </label>
                      <input title="Item Category" list="suggest-types" value={editItem.ประเภท || ''} onChange={e => setEditItem({...editItem, ประเภท: e.target.value})} className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl px-5 py-3.5 font-bold text-secondary focus:bg-white focus:border-primary/20 focus:ring-4 focus:ring-primary/5 transition-all text-[14px]" placeholder="เริ่มพิมพ์ประเภท..." />
                      <datalist id="suggest-types">{suggestions.types.map(v => <option key={v} value={v} />)}</datalist>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[12px] font-black text-secondary/60 uppercase tracking-widest ml-1 flex items-center gap-2">
                          <span className="material-symbols-outlined text-[16px]">branding_watermark</span> ยี่ห้อหรือรูปแบบ
                      </label>
                      <input title="Item Brand" list="suggest-brands" value={editItem['ยี่ห้อหรือรูปแบบ']} onChange={e => setEditItem({...editItem, 'ยี่ห้อหรือรูปแบบ': e.target.value})} className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl px-5 py-3.5 font-bold text-secondary focus:bg-white focus:border-primary/20 focus:ring-4 focus:ring-primary/5 transition-all text-[14px]" placeholder="เริ่มพิมพ์ยี่ห้อ..." />
                      <datalist id="suggest-brands">{suggestions.brands.map(v => <option key={v} value={v} />)}</datalist>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[12px] font-black text-secondary/60 uppercase tracking-widest ml-1 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px]">inventory</span> ชื่อรายการพัสดุ
                    </label>
                    <input title="Item Name" list="suggest-items" value={editItem.รายการ || ''} onChange={e => setEditItem({...editItem, รายการ: e.target.value})} className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl px-5 py-3.5 font-bold text-secondary focus:bg-white focus:border-primary/20 focus:ring-4 focus:ring-primary/5 transition-all text-[14px]" placeholder="เลือกชื่อรายการที่มีอยู่ หรือพิมพ์ใหม่..." />
                    <datalist id="suggest-items">{suggestions.items.map(v => <option key={v} value={v} />)}</datalist>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div className="space-y-1.5">
                      <label className="text-[12px] font-black text-secondary/60 uppercase tracking-widest ml-1 flex items-center gap-2">
                          <span className="material-symbols-outlined text-[16px]">verified</span> สภาพ
                      </label>
                      <input title="Item Condition" list="suggest-conds" value={editItem.สภาพ} onChange={e => setEditItem({...editItem, สภาพ: e.target.value})} className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl px-5 py-3.5 font-bold text-secondary focus:bg-white focus:border-primary/20 transition-all text-[14px]" placeholder="ใหม่ / มือสอง" />
                      <datalist id="suggest-conds">{suggestions.conditions.map(v => <option key={v} value={v} />)}</datalist>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[12px] font-black text-secondary/60 uppercase tracking-widest ml-1 flex items-center gap-2">
                          <span className="material-symbols-outlined text-[16px]">straighten</span> ขนาด
                      </label>
                      <input title="Item Size" list="suggest-sizes" value={editItem.ขนาด} onChange={e => setEditItem({...editItem, ขนาด: e.target.value})} className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl px-5 py-3.5 font-bold text-secondary focus:bg-white focus:border-primary/20 transition-all text-[14px]" placeholder="ระบุขนาด" />
                      <datalist id="suggest-sizes">{suggestions.sizes.map(v => <option key={v} value={v} />)}</datalist>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[12px] font-black text-indigo-600 uppercase tracking-widest ml-1 flex items-center gap-2">
                          <span className="material-symbols-outlined text-[16px]">pin</span> จำนวนตั้งต้น
                      </label>
                      <input title="Item Quantity" type="number" value={editItem.จำนวน} onChange={e => setEditItem({...editItem, จำนวน: Number(e.target.value)})} className="w-full bg-slate-50/50 border border-indigo-200 rounded-2xl px-5 py-3.5 font-black text-indigo-600 focus:bg-white focus:ring-4 focus:ring-indigo-50 transition-all text-[16px]" placeholder="0" />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[12px] font-black text-indigo-600 uppercase tracking-widest ml-1 flex items-center gap-2">
                          <span className="material-symbols-outlined text-[16px]">warehouse</span> คลังที่เก็บ
                      </label>
                      <select 
                        title="เลือกคลังสินค้า"
                        value={editItem.warehouseId || ''}
                        onChange={e => setEditItem({...editItem, warehouseId: Number(e.target.value)})}
                        className="w-full bg-slate-50/50 border border-indigo-200 rounded-2xl px-5 py-3.5 font-black text-indigo-600 focus:bg-white focus:ring-4 focus:ring-indigo-50 transition-all text-[14px] appearance-none"
                      >
                        {warehouses.map(wh => (
                          <option key={wh.id} value={wh.id}>{wh.name} {wh.id === (settings.MAIN_WAREHOUSE_ID ? parseInt(settings.MAIN_WAREHOUSE_ID) : -1) ? '(หลัก)' : ''}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[12px] font-black text-secondary/60 uppercase tracking-widest ml-1 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px]">notes</span> หมายเหตุ / รายละเอียด
                    </label>
                    <textarea title="Item Remark" rows={1} value={editItem.รายละเอียด} onChange={e => setEditItem({...editItem, รายละเอียด: e.target.value})} className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl px-5 py-3.5 font-bold text-secondary focus:bg-white transition-all resize-none text-[14px]" placeholder="ระบุข้อมูลเพิ่มเติม..." />
                  </div>

                  {!editItem.rowIndex && (
                    <div className="px-1 py-1">
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <div className="relative flex items-center">
                          <input 
                            title="Keep Form Open Check"
                            type="checkbox" 
                            checked={keepFormOpen} 
                            onChange={e => setKeepFormOpen(e.target.checked)}
                            className="w-5 h-5 rounded-lg border-2 border-slate-200 text-primary focus:ring-primary/20 transition-all cursor-pointer"
                          />
                        </div>
                        <span className="text-[13px] font-black text-secondary/60 group-hover:text-primary transition-colors uppercase tracking-tight">บันทึกและเพิ่มรายการต่อไป (ไม่ปิดฟอร์ม)</span>
                      </label>
                    </div>
                  )}

                  <div className="pt-6 flex gap-4">
                    <button disabled={loading} type="button" onClick={() => setShowItemForm(false)} className="flex-1 py-4 bg-slate-100 text-secondary/60 font-black rounded-2xl transition-all hover:bg-slate-200 uppercase tracking-widest text-xs disabled:opacity-50">ยกเลิก</button>
                    <button 
                      type="submit" 
                      disabled={loading}
                      className="flex-[2] py-4 bg-primary text-white rounded-2xl font-black shadow-xl shadow-primary/20 active:scale-95 transition-all text-sm uppercase tracking-widest flex items-center justify-center gap-2 disabled:bg-slate-400 disabled:shadow-none"
                    >
                      {loading ? (
                         <>
                           <span className="material-symbols-outlined animate-spin text-[20px]">sync</span>
                           กำลังบันทึกข้อมูล...
                         </>
                      ) : (
                         <>
                           <span className="material-symbols-outlined text-[20px]">save</span>
                           {editItem.rowIndex ? 'บันทึกการแก้ไข' : 'ลงทะเบียนพัสดุ'}
                         </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
        )}

        <Suspense fallback={null}>
          <CustomerQuickEdit 
            isOpen={showCustomerForm && activeTab === 'customers'}
            onClose={() => setShowCustomerForm(false)}
            customer={editCustomer}
            onSave={loadData}
            thaiAddressData={FILTERED_ADDRESS_LIST || FULL_ADDRESS_LIST || []}
            customers={customers}
          />
        </Suspense>

        {showZoneForm && activeTab === 'zones' && (
          <div className="p-4 animate-fade-in max-w-xl mx-auto">
            <button onClick={() => setShowZoneForm(false)} className="mb-4 text-secondary/40 hover:text-primary font-black flex items-center gap-2 text-[12px] bg-white px-4 py-2.5 rounded-xl border border-slate-100 shadow-sm transition-all uppercase tracking-widest">
              <span className="material-symbols-outlined text-[18px]">arrow_back</span> ย้อนกลับ
            </button>
            <div className="bg-white p-8 md:p-10 rounded-[3rem] border border-slate-100 shadow-2xl relative overflow-hidden text-left">
               <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
                  <span className="material-symbols-outlined text-[100px] text-primary">add_location</span>
              </div>
              <div className="flex items-center gap-4 mb-8 pb-6 border-b border-slate-50 relative z-10">
                <div className="w-12 h-12 bg-primary text-white rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
                  <span className="material-symbols-outlined text-[24px] font-black">{editZone?.rowIndex ? 'edit_location' : 'share_location'}</span>
                </div>
                <div>
                  <h2 className="text-xl font-black text-secondary tracking-tight">{editZone?.rowIndex ? 'แก้ไขเขตงาน' : 'เพิ่มเขตงานใหม่'}</h2>
                  <p className="text-[10px] text-secondary/30 font-black uppercase tracking-[0.2em] mt-0.5">Work Zone Setup</p>
                </div>
              </div>

              <form onSubmit={handleSaveZone} className="space-y-5 relative z-10">
                <div className="space-y-1.5">
                  <label className="text-[12px] font-black text-secondary/60 uppercase tracking-widest ml-1 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px]">pin_drop</span> ชื่อเขตงาน / รหัสเขต
                  </label>
                  <input title="Zone Name Input" required value={editZone?.name || ''} onChange={e => setEditZone(p=>p?({...p, name: e.target.value}):null)} className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl px-5 py-3.5 font-bold text-secondary focus:bg-white focus:border-primary/20 focus:ring-4 focus:ring-primary/5 transition-all text-[14px]" placeholder="เช่น เขต 1, โซนเหนือ..." />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[12px] font-black text-secondary/60 uppercase tracking-widest ml-1 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px]">description</span> รายละเอียดเพิ่มเติม
                  </label>
                  <textarea title="Zone Description" rows={2} value={editZone?.description || ''} onChange={e => setEditZone(p=>p?({...p, description: e.target.value}):null)} className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl px-5 py-3.5 font-bold text-secondary focus:bg-white transition-all resize-none text-[14px]" placeholder="ระบุพื้นที่ครอบคลุม (ถ้ามี)..." />
                </div>
                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setShowZoneForm(false)} className="flex-1 py-4 bg-slate-100 text-secondary/60 font-black rounded-2xl transition-all hover:bg-slate-200 uppercase tracking-widest text-[11px]">ยกเลิก</button>
                  <button type="submit" className="flex-[2] py-4 bg-primary text-white rounded-2xl font-black shadow-xl shadow-primary/20 active:scale-95 transition-all text-sm uppercase tracking-widest flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined text-[20px]">save</span> บันทึกเขตงาน
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      <ConfirmationModal isOpen={deleteConfirm.show} title="ยืนยันการลบ" message={`ยืนยันการลบ "${deleteConfirm.itemName}"?`} confirmText="ลบ" onConfirm={async () => { const {rowIndex, type} = deleteConfirm; if(!rowIndex) return; setDeleteConfirm(p=>({...p, show:false})); setLoading(true); try { if(type==='user') await deleteUser(Number(rowIndex)); else if(type==='customer') await deleteCustomer(String(rowIndex)); else await deleteMasterItem(Number(rowIndex)); showSuccess('ลบสำเร็จ'); await loadData(); if(onRefresh) onRefresh(); } catch(e:any){alert(e.message)} finally {setLoading(false)} }} onClose={() => setDeleteConfirm(p=>({...p, show:false}))} />
      <ConfirmationModal isOpen={clearHistoryConfirm} title="ล้างประวัติ" message="ยืนยันล้างประวัติทั้งหมด?" confirmText="ล้าง" onConfirm={async () => { setClearHistoryConfirm(false); setLoading(true); try { await clearTransactions(); showSuccess('ล้างประวัติแล้ว'); if(onRefresh) onRefresh(); } catch(e:any){alert(e.message)} finally {setLoading(false)} }} onClose={() => setClearHistoryConfirm(false)} />

    </div>
  );
}

