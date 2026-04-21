import React, { useState, useEffect, useMemo, lazy, Suspense, useCallback } from 'react';
import { 
  getUsers, saveUser, deleteUser, 
  getSettings, saveSettings,
  getItems, saveMasterItem, deleteMasterItem,
  clearTransactions,
  getZones, saveZone,
  getCustomers,
  testTelegram, relinkTelegram
} from '../api';
import type { MaterialItem, Zone, Customer } from '../types';
import ConfirmationModal from './ConfirmationModal';
import PermissionModal from './PermissionModal';


// Lazy load modular components for performance
const SettingsUsers = lazy(() => import('./SettingsUsers'));
const SettingsMaster = lazy(() => import('./SettingsMaster'));
const SettingsNotify = lazy(() => import('./SettingsNotify'));
const SettingsCustomers = lazy(() => import('./SettingsCustomers'));
const CustomerQuickEdit = lazy(() => import('./CustomerQuickEdit'));

interface SettingsProps {
  onRefresh?: () => void;
  user?: any;
  onLogout?: () => void;
  thaiAddressData?: any[];
  permissions?: any;
}

export default function Settings({ onRefresh, user, thaiAddressData, permissions }: SettingsProps) {
  const userRoleRaw = user?.role?.toLowerCase() || '';
  // Fix: Exclude 'office' from being treated as Super Admin even if it contains 'admin'
  const isAdministrator = (userRoleRaw.includes('admin') || userRoleRaw.includes('manager')) && !userRoleRaw.includes('office');
  const isManager = userRoleRaw === 'manager' || userRoleRaw.includes('ผู้จัดการ');

  const [activeTab, setActiveTab] = useState<'users' | 'master' | 'notify' | 'system' | 'zones' | 'customers' | 'permissions'>(() => {
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
  
  const [showItemForm, setShowItemForm] = useState(false);
  const [editItem, setEditItem] = useState<MaterialItem>({
    ประเภท: '', 'ยี่ห้อหรือรูปแบบ': '', รายการ: '', สภาพ: '', รายละเอียด: '', ขนาด: '', จำนวน: 0
  });

  const [masterItems, setMasterItems] = useState<MaterialItem[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [showZoneForm, setShowZoneForm] = useState(false);
  const [editZone, setEditZone] = useState<Zone | null>(null);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer>({ cv: '', name: '', phone: '', address: '', subdistrict: '', district: '', province: '', zipcode: '', lat: '', lng: '' });

  const [deleteConfirm, setDeleteConfirm] = useState<{show: boolean, rowIndex: any, itemName: string, type: 'item' | 'user'}>({ show: false, rowIndex: null, itemName: '', type: 'item' });
  const [clearHistoryConfirm, setClearHistoryConfirm] = useState(false);
  const [keepFormOpen, setKeepFormOpen] = useState(false);
  
  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [uData, sData, iData, zData, cData] = await Promise.all([
        getUsers(), getSettings(), getItems(true), getZones(true), getCustomers(true)
      ]);
      setUsers(uData || []);
      setMasterItems(iData || []);
      setZones(zData || []);
      setCustomers(cData || []);
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
  
  // Memoize suggestions to prevent lag during typing in the form
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

  // Form Handlers
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    try { await saveUser(editUser); setShowUserForm(false); showSuccess('บันทึกสำเร็จ'); await loadData(); } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  const handleSaveMasterItem = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    try { 
      await saveMasterItem(editItem); 
      showSuccess('บันทึกพัสดุสำเร็จ'); 
      
      // OPTIMIZED: Refresh only items, not everything
      await refreshItems(); 
      if (onRefresh) onRefresh();

      if (!editItem.rowIndex && keepFormOpen) {
        // Stay in form: Keep Category, Brand, Condition, and Detail
        // Only clear Item Name, Size, and Quantity for the next one
        setEditItem(prev => ({
          ...prev,
          รายการ: '',
          ขนาด: '',
          จำนวน: 0
        }));
      } else {
        setShowItemForm(false); 
      }
    } catch (err: any) { setError(err.message); } 
    finally { setLoading(false); }
  };



  const handleSaveZone = async (e: React.FormEvent) => {
    e.preventDefault(); if (!editZone) return; setLoading(true);
    try { await saveZone(editZone); showSuccess('บันทึกเขตสำเร็จ'); setShowZoneForm(false); await loadData(); } catch (err: any) { alert(err.message); } finally { setLoading(false); }
  };

  return (
    <div className="w-full mx-auto py-4 px-1 md:px-4">
      {successMsg && <div className="fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-bounce"> ✓ {successMsg} </div>}
      {loading && <div className="fixed inset-0 bg-white/60 backdrop-blur-[4px] z-[100] flex items-center justify-center animate-fade-in"><div className="bg-white/90 p-10 rounded-[2rem] border border-slate-100 flex flex-col items-center gap-6"><svg className="animate-spin h-10 w-10 text-primary" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg></div></div>}

      <div className="flex overflow-x-auto pb-8 mb-4 scrollbar-hide gap-4 sticky top-0 z-20 bg-[#f8f9fc]/95 backdrop-blur-xl px-2 pt-2">
        {[
          { id: 'users', label: 'ผู้ใช้งาน', icon: 'person', perm: 'set_users' },
          { id: 'master', label: 'พัสดุหลัก', icon: 'database', perm: 'set_items' },
          { id: 'notify', label: 'แจ้งเตือน', icon: 'notifications', perm: 'set_notifications' },
          { id: 'zones', label: 'เขตงาน', icon: 'map', perm: 'set_zones' },
          { id: 'customers', label: 'ลูกค้า', icon: 'groups', perm: 'set_customers' },
          { id: 'permissions', label: 'สิทธิ์', icon: 'admin_panel_settings', perm: 'set_users' },
          { id: 'system', label: 'ระบบ', icon: 'settings', perm: 'set_system' },
        ].filter(tab => {
          if (isAdministrator) return true;
          const rolePerms = permissions?.[user?.role] || {};
          return rolePerms[tab.perm as string] === true;
        }).map((tab) => (
          <button
            key={tab.id}
            onClick={() => { 
              setActiveTab(tab.id as any); 
              localStorage.setItem('settings_active_tab', tab.id);
              setShowUserForm(false); setShowItemForm(false); setShowCustomerForm(false); setShowZoneForm(false); 
            }}
            className={`
              relative flex-shrink-0 group flex flex-col items-center justify-center min-w-[82px] h-[82px] rounded-[1.8rem] transition-all duration-300
              ${activeTab === tab.id 
                ? 'bg-primary text-white border-2 border-primary z-10' 
                : 'bg-white text-secondary/40 hover:bg-slate-50 border border-slate-100'
              }
            `}
          >
            <div className={`
              w-10 h-10 rounded-xl mb-1 flex items-center justify-center transition-all
              ${activeTab === tab.id ? 'bg-white/20' : 'bg-slate-50 group-hover:bg-primary/5'}
            `}>
              <span className={`material-symbols-outlined text-[24px] ${activeTab === tab.id ? 'text-white' : 'text-secondary/20 group-hover:text-primary transition-colors'}`}>
                {tab.icon}
              </span>
            </div>
            <span className="text-[11px] font-black tracking-tight leading-none uppercase">
              {tab.label}
            </span>
            {activeTab === tab.id && (
              <div className="absolute -bottom-1 w-1.5 h-1.5 bg-primary rounded-full"></div>
            )}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-[1.5rem] border border-slate-200 min-h-[500px] overflow-hidden">
        {error && <div className="m-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 font-bold">{error}</div>}
        
        <Suspense fallback={<div className="flex items-center justify-center p-20 opacity-50 font-bold">กำลังโหลด...</div>}>
          {activeTab === 'users' && !showUserForm && (
            <SettingsUsers 
              users={users} 
              onAddUser={() => { setEditUser({ username: '', password: '', name: '', role: 'staff' }); setShowUserForm(true); }} 
              onEditUser={u => { setEditUser(u); setShowUserForm(true); }} 
              onDeleteUser={u => setDeleteConfirm({ show: true, rowIndex: u.rowIndex, itemName: u.name, type: 'user' })} 
              onManagePermissions={() => setActiveTab('permissions')}
            />
          )}
          {activeTab === 'master' && !showItemForm && <SettingsMaster masterItems={masterItems} onRefresh={loadData} onAddItem={() => { setEditItem({ ประเภท: '', 'ยี่ห้อหรือรูปแบบ': '', รายการ: '', สภาพ: '', รายละเอียด: '', ขนาด: '', จำนวน: 0 }); setShowItemForm(true); }} onEditItem={it => { setEditItem(it); setShowItemForm(true); }} onDeleteItem={idx => { const t = masterItems.find(it => it.rowIndex === Number(idx)); setDeleteConfirm({ show: true, rowIndex: idx, itemName: t ? t.รายการ : "รายการนี้", type: 'item' }); }} showSuccess={showSuccess} setError={setError} setLoading={setLoading} loading={loading} />}
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
          {activeTab === 'customers' && !showCustomerForm && <SettingsCustomers customers={customers} onRefresh={loadData} onAddCustomer={() => { setEditCustomer({ cv: '', name: '', phone: '', address: '', subdistrict: '', district: '', province: '', zipcode: '', lat: '', lng: '' }); setShowCustomerForm(true); }} onEditCustomer={c => { setEditCustomer({...c}); setShowCustomerForm(true); }} onDeleteCustomer={() => alert("กดยืนยันการลบที่หน้าหลัก")} />}
          
          {activeTab === 'zones' && !showZoneForm && (
            <div className="p-4 md:p-8 animate-fade-in space-y-6">
              <div className="flex justify-between items-center bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                    <span className="material-symbols-outlined text-[24px]">location_on</span>
                  </div>
                  <div>
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

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
          {activeTab === 'system' && (() => {
            // Helper to validate format (3 parts: x.y.z)
            const isValidFormat = (v: string) => /^\d+\.\d+\.\d+$/.test(v);
            
            // Helper to compare versions (Is new > old?)
            const isDowngrade = (v: string) => {
               const currentVal = settings.APP_VERSION || '';
               if (!v || !currentVal || !isValidFormat(v) || !isValidFormat(currentVal)) return false;
               const newParts = v.split('.').map(Number);
               const oldParts = currentVal.split('.').map(Number);
               for (let i = 0; i < 3; i++) {
                  if (newParts[i] > oldParts[i]) return false;
                  if (newParts[i] < oldParts[i]) return true;
               }
               return false; // Equal
            };

            return (
              <div className="p-10 md:p-20 space-y-10">

                {/* Full Database Active Status Section */}
                <div className="max-w-md mx-auto p-10 bg-white border border-emerald-100 rounded-[3rem] shadow-2xl shadow-emerald-500/5 space-y-8 relative overflow-hidden">
                  <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-50 rounded-full opacity-50 blur-3xl"></div>
                  
                  <div className="w-20 h-20 bg-emerald-500 text-white rounded-[2rem] flex items-center justify-center mx-auto shadow-xl shadow-emerald-200 animate-pulse-slow">
                      <span className="material-symbols-outlined text-[42px] [font-variation-settings:'FILL'_1]">public</span>
                  </div>
                  
                  <div className="text-center space-y-2 relative z-10">
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-black uppercase tracking-widest mb-2">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
                        System Active
                      </div>
                      <h2 className="text-2xl font-black uppercase tracking-tight text-secondary">ฐานข้อมูลที่อยู่หลัก</h2>
                      <p className="text-[11px] text-secondary/40 font-bold uppercase tracking-widest leading-relaxed">
                        Full Thailand Master Database <br/>
                        <span className="text-emerald-500/60">(77 Provinces / v1.0.3)</span>
                      </p>
                  </div>

                  <div className="bg-slate-50/80 rounded-[2rem] p-6 space-y-4">
                     <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-emerald-500">
                           <span className="material-symbols-outlined text-[20px]">check_circle</span>
                        </div>
                        <div className="text-left">
                           <p className="text-[13px] font-black text-secondary">ครอบคลุมทุกภูมิภาค</p>
                           <p className="text-[9px] font-bold text-secondary/30 uppercase tracking-tighter">เหนือ • กลาง • อีสาน • ใต้ • ตะวันออก</p>
                        </div>
                     </div>
                     <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-blue-500">
                           <span className="material-symbols-outlined text-[20px]">database_sync</span>
                        </div>
                        <div className="text-left">
                           <p className="text-[13px] font-black text-secondary">Local Storage Optimization</p>
                           <p className="text-[9px] font-bold text-secondary/30 uppercase tracking-tighter">โหลดข้อมูลไว ไม่ต้องรอเน็ต</p>
                        </div>
                     </div>
                  </div>

                  <p className="text-[10px] text-center text-secondary/20 font-bold italic px-4">
                    * ระบบยกเลิกการแยกโหลดรายภาคเนื่องจากฐานข้อมูลหลักมีความเร็วสูงและเสถียรกว่า
                  </p>
                </div>

                {/* OTA Version Section */}
                <div className="max-w-md mx-auto p-8 bg-white border border-slate-100 rounded-[2.5rem] shadow-sm space-y-6">
                   {/* ... Existing OTA Version code ... */}
                  <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto">
                      <span className="material-symbols-outlined text-[32px]">system_update_alt</span>
                  </div>
                  <div className="text-center">
                      <h2 className="text-xl font-black uppercase tracking-tight">จัดการเวอร์ชันแอป (OTA)</h2>
                      <p className="text-[10px] text-secondary/40 font-bold uppercase tracking-widest mt-1">Version Control Dashboard</p>
                  </div>
                  <div className="space-y-4">
                      <div>
                          <label className="text-[11px] font-black text-secondary/40 uppercase tracking-widest ml-1">รหัสล่าสุด (ในฐานข้อมูล)</label>
                          <input 
                              type="text" 
                              className={`w-full bg-slate-50 border-none rounded-2xl px-5 py-4 font-bold text-secondary focus:ring-2 outline-none transition-all placeholder:text-slate-200 ${
                                 settings.TEMP_VERSION && !isValidFormat(settings.TEMP_VERSION) ? 'ring-2 ring-red-400' : 'focus:ring-primary/20'
                              }`}
                              placeholder="เช่น 1.0.1, 1.0.2..."
                              value={settings.TEMP_VERSION ?? settings.APP_VERSION ?? ''} 
                              onChange={(e) => setSettings({...settings, TEMP_VERSION: e.target.value})} 
                          />
                          {settings.TEMP_VERSION && !isValidFormat(settings.TEMP_VERSION) && (
                            <p className="text-[10px] text-red-500 font-bold mt-2 ml-2 uppercase tracking-wide">⚠️ รูปแบบต้องเป็น 3 หลัก (เช่น 1.0.2)</p>
                          )}
                          {settings.TEMP_VERSION && isDowngrade(settings.TEMP_VERSION) && (
                            <p className="text-[10px] text-amber-600 font-bold mt-2 ml-2 uppercase tracking-wide">⚠️ ห้ามระบุเวอร์ชันต่ำกว่าเดิม ({settings.APP_VERSION})</p>
                          )}
                      </div>
                      <button 
                          disabled={!isValidFormat(settings.TEMP_VERSION || '') || isDowngrade(settings.TEMP_VERSION || '')}
                          onClick={async () => {
                              setLoading(true);
                              try {
                                  const finalSettings = { ...settings, APP_VERSION: settings.TEMP_VERSION };
                                  delete finalSettings.TEMP_VERSION;
                                  await saveSettings(finalSettings);
                                  setSettings(finalSettings);
                                  showSuccess('อัปเดตรหัสเวอร์ชัน OTA สำเร็จ!');
                              } catch(e:any) { setError(e.message); }
                              finally { setLoading(false); }
                          }}
                          className={`w-full py-4 rounded-2xl font-black shadow-lg shadow-primary/20 transition-all text-sm uppercase tracking-widest ${
                             !isValidFormat(settings.TEMP_VERSION || '') || isDowngrade(settings.TEMP_VERSION || '')
                                ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                                : 'bg-primary text-white active:scale-95'
                          }`}
                      > 
                          บันทึกเวอร์ชัน 
                      </button>
                  </div>
                </div>

                {/* Database Section */}
                <div className="max-w-md mx-auto p-8 bg-white border border-red-50 rounded-[2.5rem] shadow-sm space-y-6">
                  <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto">
                      <span className="material-symbols-outlined text-[32px]">dangerous</span>
                  </div>
                  <div className="text-center">
                      <h2 className="text-xl font-black">ฐานข้อมูล</h2>
                      <p className="text-[10px] text-red-400/60 font-bold uppercase tracking-widest mt-1">Dangerous Territory</p>
                  </div>
                  <button onClick={() => setClearHistoryConfirm(true)} disabled={loading} className="w-full py-4 bg-red-500 text-white rounded-2xl font-black shadow-lg shadow-red-100 active:scale-95 transition-all text-sm uppercase tracking-widest"> ล้างประวัติทั้งหมด </button>
                </div>
              </div>
            );
          })()}
        </Suspense>

        {/* FORMS Layer */}
        {showUserForm && activeTab === 'users' && (
          <div className="p-4 animate-fade-in max-w-4xl mx-auto">
            <button onClick={() => setShowUserForm(false)} className="mb-6 text-secondary/40 hover:text-red-400 font-black flex items-center gap-1.5 text-xs bg-white px-5 py-2.5 rounded-xl border border-slate-100 shadow-sm transition-all uppercase tracking-widest">
              <span className="material-symbols-outlined text-[18px]">arrow_back</span> กลับหน้ารายการ
            </button>

            <div className="bg-white p-8 md:p-12 rounded-[3rem] border border-secondary/5 shadow-2xl overflow-hidden relative">
              <div className="flex items-center gap-4 mb-10 pb-6 border-b border-slate-50">
                <div className="w-14 h-14 bg-primary text-white rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
                  <span className="material-symbols-outlined text-[28px]">{editUser.rowIndex ? 'edit_note' : 'person_add'}</span>
                </div>
                <div>
                  <h2 className="text-2xl font-black text-secondary tracking-tight">{editUser.rowIndex ? 'แก้ไขข้อมูลพนักงาน' : 'เพิ่มพนักงานใหม่'}</h2>
                  <p className="text-[10px] text-secondary/40 font-bold uppercase tracking-widest mt-0.5">User Account Management</p>
                </div>
              </div>

              <form onSubmit={handleSaveUser} className="space-y-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                       <label className="text-[11px] font-black text-secondary/40 uppercase tracking-widest ml-1">Username (ใช้สำหรับ Login)</label>
                       <input required value={editUser.username} onChange={e => setEditUser({...editUser, username: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 font-bold text-secondary focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="username" />
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-[11px] font-black text-secondary/40 uppercase tracking-widest ml-1">รหัสผ่าน {editUser.rowIndex && '(เว้นว่างหากไม่แก้)'}</label>
                       <input type="password" value={editUser.password || ''} onChange={e => setEditUser({...editUser, password: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 font-bold text-secondary focus:ring-2 focus:ring-primary/20 outline-none transition-all font-mono" placeholder="••••••••" />
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                       <label className="text-[11px] font-black text-secondary/40 uppercase tracking-widest ml-1">ชื่อ-นามสกุล / ชื่อเล่น</label>
                       <input required value={editUser.name} onChange={e => setEditUser({...editUser, name: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 font-bold text-secondary focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="ชื่อพนักงาน..." />
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-[11px] font-black text-secondary/40 uppercase tracking-widest ml-1">ระดับสิทธิ์ (Role)</label>
                        <select 
                           title="เลือกระดับสิทธิ์"
                           value={editUser.role} 
                           onChange={e => setEditUser({...editUser, role: e.target.value})} 
                           className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 font-bold text-secondary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                        >
                           <option value="staff">Staff (เจ้าหน้าที่)</option>
                           <option value="office admin">Office Admin (แอดมินออฟฟิศ)</option>
                           <option value="admin">Admin (ผู้ดูแลระบบ)</option>
                           <option value="manager">Manager (ผู้จัดการสูงสุด)</option>
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
              
              <div className="bg-white p-6 md:p-10 rounded-[2.5rem] border border-slate-100 shadow-2xl relative overflow-hidden">
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
                      <input list="suggest-types" value={editItem.ประเภท || ''} onChange={e => setEditItem({...editItem, ประเภท: e.target.value})} className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl px-5 py-3.5 font-bold text-secondary focus:bg-white focus:border-primary/20 focus:ring-4 focus:ring-primary/5 transition-all text-[14px]" placeholder="เริ่มพิมพ์ประเภท..." />
                      <datalist id="suggest-types">{suggestions.types.map(v => <option key={v} value={v} />)}</datalist>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[12px] font-black text-secondary/60 uppercase tracking-widest ml-1 flex items-center gap-2">
                          <span className="material-symbols-outlined text-[16px]">branding_watermark</span> ยี่ห้อหรือรูปแบบ
                      </label>
                      <input list="suggest-brands" value={editItem['ยี่ห้อหรือรูปแบบ']} onChange={e => setEditItem({...editItem, 'ยี่ห้อหรือรูปแบบ': e.target.value})} className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl px-5 py-3.5 font-bold text-secondary focus:bg-white focus:border-primary/20 focus:ring-4 focus:ring-primary/5 transition-all text-[14px]" placeholder="เริ่มพิมพ์ยี่ห้อ..." />
                      <datalist id="suggest-brands">{suggestions.brands.map(v => <option key={v} value={v} />)}</datalist>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[12px] font-black text-secondary/60 uppercase tracking-widest ml-1 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px]">inventory</span> ชื่อรายการพัสดุ
                    </label>
                    <input list="suggest-items" value={editItem.รายการ || ''} onChange={e => setEditItem({...editItem, รายการ: e.target.value})} className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl px-5 py-3.5 font-bold text-secondary focus:bg-white focus:border-primary/20 focus:ring-4 focus:ring-primary/5 transition-all text-[14px]" placeholder="เลือกชื่อรายการที่มีอยู่ หรือพิมพ์ใหม่..." />
                    <datalist id="suggest-items">{suggestions.items.map(v => <option key={v} value={v} />)}</datalist>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div className="space-y-1.5">
                      <label className="text-[12px] font-black text-secondary/60 uppercase tracking-widest ml-1 flex items-center gap-2">
                          <span className="material-symbols-outlined text-[16px]">verified</span> สภาพ
                      </label>
                      <input list="suggest-conds" value={editItem.สภาพ} onChange={e => setEditItem({...editItem, สภาพ: e.target.value})} className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl px-5 py-3.5 font-bold text-secondary focus:bg-white focus:border-primary/20 transition-all text-[14px]" placeholder="ใหม่ / มือสอง" />
                      <datalist id="suggest-conds">{suggestions.conditions.map(v => <option key={v} value={v} />)}</datalist>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[12px] font-black text-secondary/60 uppercase tracking-widest ml-1 flex items-center gap-2">
                          <span className="material-symbols-outlined text-[16px]">straighten</span> ขนาด
                      </label>
                      <input list="suggest-sizes" value={editItem.ขนาด} onChange={e => setEditItem({...editItem, ขนาด: e.target.value})} className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl px-5 py-3.5 font-bold text-secondary focus:bg-white focus:border-primary/20 transition-all text-[14px]" placeholder="ระบุขนาด" />
                      <datalist id="suggest-sizes">{suggestions.sizes.map(v => <option key={v} value={v} />)}</datalist>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[12px] font-black text-primary uppercase tracking-widest ml-1 flex items-center gap-2">
                          <span className="material-symbols-outlined text-[16px]">pin</span> จำนวนตั้งต้น
                      </label>
                      <input type="number" value={editItem.จำนวน} onChange={e => setEditItem({...editItem, จำนวน: Number(e.target.value)})} className="w-full bg-slate-50/50 border border-primary/20 rounded-2xl px-5 py-3.5 font-black text-primary focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all text-[16px]" placeholder="0" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[12px] font-black text-secondary/60 uppercase tracking-widest ml-1 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px]">notes</span> หมายเหตุ / รายละเอียด
                    </label>
                    <textarea rows={1} value={editItem.รายละเอียด} onChange={e => setEditItem({...editItem, รายละเอียด: e.target.value})} className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl px-5 py-3.5 font-bold text-secondary focus:bg-white transition-all resize-none text-[14px]" placeholder="ระบุข้อมูลเพิ่มเติม..." />
                  </div>

                  {!editItem.rowIndex && (
                    <div className="px-1 py-1">
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <div className="relative flex items-center">
                          <input 
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
                    <button type="button" onClick={() => setShowItemForm(false)} className="flex-1 py-4 bg-slate-100 text-secondary/60 font-black rounded-2xl transition-all hover:bg-slate-200 uppercase tracking-widest text-xs">ยกเลิก</button>
                    <button type="submit" className="flex-[2] py-4 bg-primary text-white rounded-2xl font-black shadow-xl shadow-primary/20 active:scale-95 transition-all text-sm uppercase tracking-widest flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-[20px]">save</span>
                      {editItem.rowIndex ? 'บันทึกการแก้ไข' : 'ลงทะเบียนพัสดุ'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
        )}

        {/* Using shared CustomerQuickEdit modal for consistency */}
        <Suspense fallback={null}>
          <CustomerQuickEdit 
            isOpen={showCustomerForm && activeTab === 'customers'}
            onClose={() => setShowCustomerForm(false)}
            customer={editCustomer}
            onSave={loadData}
            thaiAddressData={thaiAddressData || []}
            customers={customers}
          />
        </Suspense>

        {showZoneForm && activeTab === 'zones' && (
          <div className="p-4 animate-fade-in max-w-xl mx-auto">
            <button onClick={() => setShowZoneForm(false)} className="mb-4 text-secondary/40 hover:text-primary font-black flex items-center gap-2 text-[12px] bg-white px-4 py-2.5 rounded-xl border border-slate-100 shadow-sm transition-all uppercase tracking-widest">
              <span className="material-symbols-outlined text-[18px]">arrow_back</span> ย้อนกลับ
            </button>
            <div className="bg-white p-8 md:p-10 rounded-[3rem] border border-slate-100 shadow-2xl relative overflow-hidden">
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
                  <input required value={editZone?.name || ''} onChange={e => setEditZone(p=>p?({...p, name: e.target.value}):null)} className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl px-5 py-3.5 font-bold text-secondary focus:bg-white focus:border-primary/20 focus:ring-4 focus:ring-primary/5 transition-all text-[14px]" placeholder="เช่น เขต 1, โซนเหนือ..." />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[12px] font-black text-secondary/60 uppercase tracking-widest ml-1 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px]">description</span> รายละเอียดเพิ่มเติม
                  </label>
                  <textarea rows={2} value={editZone?.description || ''} onChange={e => setEditZone(p=>p?({...p, description: e.target.value}):null)} className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl px-5 py-3.5 font-bold text-secondary focus:bg-white transition-all resize-none text-[14px]" placeholder="ระบุพื้นที่ครอบคลุม (ถ้ามี)..." />
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

      <ConfirmationModal isOpen={deleteConfirm.show} title="ยืนยันการลบ" message={`ยืนยันการลบ "${deleteConfirm.itemName}"?`} confirmText="ลบ" onConfirm={async () => { const {rowIndex, type} = deleteConfirm; if(!rowIndex) return; setDeleteConfirm(p=>({...p, show:false})); setLoading(true); try { if(type==='user') await deleteUser(Number(rowIndex)); else await deleteMasterItem(Number(rowIndex)); showSuccess('ลบสำเร็จ'); await refreshItems(); if(onRefresh) onRefresh(); } catch(e:any){alert(e.message)} finally {setLoading(false)} }} onClose={() => setDeleteConfirm(p=>({...p, show:false}))} />
      <ConfirmationModal isOpen={clearHistoryConfirm} title="ล้างประวัติ" message="ยืนยันล้างประวัติทั้งหมด?" confirmText="ล้าง" onConfirm={async () => { setClearHistoryConfirm(false); setLoading(true); try { await clearTransactions(); showSuccess('ล้างประวัติแล้ว'); if(onRefresh) onRefresh(); } catch(e:any){alert(e.message)} finally {setLoading(false)} }} onClose={() => setClearHistoryConfirm(false)} />
      
      <PermissionModal 
        isOpen={activeTab === 'permissions'} 
        onClose={() => setActiveTab('users')} 
        onRefresh={onRefresh}
        users={users} 
      />
    </div>
  );
}
