import { useState, useEffect, useMemo, Fragment } from 'react';
import { getInitialData, getCurrentUser, saveSettings, logoutData, pingStatus } from './api';
import type { MaterialItem, Transaction, User, Customer } from './types';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import History from './components/History';
import TransactionForm from './components/TransactionForm';
import Welcome from './components/Welcome';
import Settings from './components/Settings';
import VoidForm from './components/VoidForm';
import CalendarView from './components/CalendarView';

import THAI_ADDRESS_ALL from './data/thai_address_all.json';

function App() {
  const CURRENT_APP_VERSION = '1.0.4'; 
  const [user, setUser] = useState<User | null>(getCurrentUser());
  const [items, setItems] = useState<MaterialItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [settings, setSettings] = useState<any>({});
  const [activeTab, setActiveTab] = useState<any>(() => localStorage.getItem('ete-active-tab') || 'welcome');
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [onlineCount, setOnlineCount] = useState(0);
  const [latency, setLatency] = useState<number | null>(null);
  const [permissions, setPermissions] = useState<any>({});

  // ข้อมูลที่อยู่ขนาดใหญ่ ไม่ควรเก็บไว้ใน State เพราะจะทำให้ React หน่วงตอน Re-render
  // เราจะส่ง THAI_ADDRESS_ALL ตรงๆ ไปยังคอมโพเนนต์ที่จำเป็นต้องใช้

  useEffect(() => {
    localStorage.setItem('ete-active-tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (!user) return;
    const tick = async () => {
      const startTime = Date.now();
      try {
        const result = await pingStatus(user.username, user.name);
        const endTime = Date.now();
        setLatency(endTime - startTime);
        
        if (result && result.status === 'deleted') {
           console.warn("Security Alert: Session invalidated from server.");
           handleLogout();
           return;
        }

        if (result && typeof result.count === 'number') {
           setOnlineCount(result.count);
        }
      } catch (e) { 
        console.error("Heartbeat error", e); 
        setLatency(null);
      }
    };
    tick();
    const interval = setInterval(tick, 60000);
    return () => clearInterval(interval);
  }, [user]);

  // NAVIGATION LOGIC - Standardized with Roles
  const navItems = useMemo(() => {
    if (!user) return [];
    const itemsList = [
      { id: 'welcome', icon: 'home', label: 'หน้าแรก', desktopIcon: 'dashboard_customize' },
      { id: 'dashboard', icon: 'inventory_2', label: 'สต็อก', desktopIcon: 'inventory_2' },
      { id: 'receive', icon: 'input', label: 'รับเข้า', desktopIcon: 'input', color: 'text-emerald-500' },
      { id: 'issue', icon: 'output', label: 'เบิกออก', desktopIcon: 'output', color: 'text-amber-500' },
      { id: 'void', icon: 'history_edu', label: 'ยกเลิก', desktopIcon: 'history_edu', color: 'text-rose-500' },
      { id: 'history', icon: 'history', label: 'ประวัติ', desktopIcon: 'history' },
      { id: 'calendar', icon: 'calendar_month', label: 'ปฏิทิน', desktopIcon: 'calendar_month' },
      { id: 'settings', icon: 'settings', label: 'ตั้งค่า', desktopIcon: 'settings' },
    ];

    return itemsList.filter(nav => {
      // 1. Mobile Cleanup
      if (isMobile && (nav.id === 'calendar' || nav.id === 'settings')) return false;

      const role = user.role || '';
      
      // 2. Super Admin / Admin / Manager bypass
      if (role.toLowerCase().includes('manager') || role.toLowerCase().includes('จัดการ') || 
          role.toLowerCase().includes('admin') || role.toLowerCase().includes('ผู้ดูแลระบบ') ) return true;

      const rolePerms = permissions[role] || {};

      // 3. Map Nav IDs to Permission Keys
      const mapping: Record<string, string> = {
        'welcome': 'nav_home',
        'dashboard': 'nav_inventory',
        'receive': 'nav_receive',
        'issue': 'nav_issue',
        'void': 'nav_void',
        'history': 'nav_history',
        'calendar': 'nav_calendar',
        'settings': 'nav_settings'
      };

      const permKey = mapping[nav.id];
      if (permKey) {
          // Special case for welcome (default allow)
          if (permKey === 'nav_home') return rolePerms[permKey] !== false;
          return rolePerms[permKey] === true;
      }

      return false;
    });
  }, [user, isMobile, permissions]);

  useEffect(() => {
    if (!user) return;
    
    // Check if current tab is authorized (even if hidden from bottom nav)
    const role = (user.role || '').toLowerCase();
    const isSpecialAdmin = role.includes('admin') || role.includes('manager') || role.includes('ผู้ดูแล') || role.includes('จัดการ');
    const isHistoryOrVoid = ['welcome', 'dashboard', 'issue', 'history', 'void'].includes(activeTab);
    
    // Authorization Check: Revised for dynamic permissions
    const canAccessSettings = permissions?.[user.role]?.nav_settings === true;
    
    // 1. If it's a special admin, let them go anywhere
    // 2. If it's authorized for the specific tab, stay
    // 3. If it's standard history/inv tabs, stay
    if (!isSpecialAdmin && activeTab === 'settings' && !canAccessSettings) {
      setActiveTab('welcome');
    } else if (!isSpecialAdmin && !isHistoryOrVoid && activeTab !== 'settings') {
      setActiveTab('welcome');
    }
  }, [user, activeTab, permissions]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchData = async (showLoading = true) => {
    if (!user) return;
    if (showLoading) setLoading(true);
    try {
      const data = await getInitialData();
      if (data) {
        setItems(data.items || []);
        setTransactions(data.transactions || []);
        setSettings(data.settings || {});
        setCustomers(data.customers || []);
        setPermissions(data.permissions || {});
      }
    } catch (err) { console.error("Fetch Error:", err); } 
    finally { if (showLoading) setLoading(false); }
  };

  const updateLocalTransactions = (updatedTxns: Transaction[]) => {
    setTransactions(prev => {
      const next = [...prev];
      updatedTxns.forEach(upd => {
        const idx = next.findIndex(t => t.rowIndex === upd.rowIndex);
        if (idx !== -1) next[idx] = upd;
        else next.unshift(upd);
      });
      return next;
    });
  };

  const handleUpdateSettings = async (newSettings: any) => {
    setLoading(true);
    try {
      const merged = { ...settings, ...newSettings };
      await saveSettings(merged);
      setSettings(merged);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleLogout = () => { logoutData(); setUser(null); };

  useEffect(() => { if (user) fetchData(); }, [user]);

  const handleLogin = (u: User) => { setUser(u); setActiveTab('welcome'); };

  if (!user) return <Login onLogin={handleLogin} />;

  return (
    <div className="min-h-screen bg-white flex flex-col font-body">
      {isMobile ? (
        <Fragment>
          <header className="bg-white sticky top-0 z-50 px-5 h-16 flex items-center justify-between border-b border-slate-100">
              <div className="flex flex-col">
                <h1 className="text-[17px] font-bold tracking-tight text-slate-900 leading-none">
                  ระบบจัดการพัสดุ
                </h1>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">ETE DC PHUKET</span>
              </div>
              
              <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-full border border-slate-100">
                      <span className="material-symbols-outlined text-[12px] text-slate-400">visibility</span>
                      <span className="text-[9px] font-bold text-slate-500">{onlineCount}</span>
                  </div>
                  {latency !== null && (
                    <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-full border border-slate-100">
                        <span className={`w-1.5 h-1.5 rounded-full ${latency < 1000 ? 'bg-emerald-500' : (latency < 2000 ? 'bg-amber-500' : 'bg-rose-500')}`}></span>
                        <span className="text-[9px] font-bold text-slate-500">{latency}ms</span>
                    </div>
                  )}
                  <button 
                    onClick={() => fetchData(true)}
                    disabled={loading}
                    className={`flex items-center justify-center w-9 h-9 bg-slate-50 rounded-full border border-slate-100 text-slate-600 active:scale-90 transition-all ${loading ? 'animate-spin opacity-50' : ''}`}
                  >
                    <span className="material-symbols-outlined text-[18px]">refresh</span>
                  </button>
              </div>
          </header>

          <main className="flex-1 px-4 py-5 pb-24 overflow-y-auto">
            <div className="relative h-full">
              {loading && (
                <div className="fixed inset-0 bg-white/40 z-[60] flex items-center justify-center pointer-events-none">
                  <div className="w-10 h-10 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                </div>
              )}
              <Fragment>
                {activeTab === 'welcome' && <Welcome user={user} transactions={transactions} announcement={settings.ANNOUNCEMENT} onUpdateAnnouncement={(msg) => handleUpdateSettings({ ANNOUNCEMENT: msg })} onLogout={handleLogout} setActiveTab={setActiveTab} currentVersion={CURRENT_APP_VERSION} latestVersion={settings.APP_VERSION} permissions={permissions} />}
                {activeTab === 'dashboard' && <Dashboard items={items} />}
                {activeTab === 'history' && <History transactions={transactions} user={user} customers={customers} onRefresh={fetchData} />}
                {(activeTab === 'receive' || activeTab === 'issue') && <TransactionForm key={activeTab} items={items} transactions={transactions} initialAction={activeTab} operatorName={user.name} thaiAddressData={THAI_ADDRESS_ALL} onSuccess={() => fetchData(false)} />}
                {activeTab === 'settings' && <Settings onRefresh={fetchData} user={user} onLogout={handleLogout} thaiAddressData={THAI_ADDRESS_ALL} permissions={permissions} />}
                {activeTab === 'void' && <VoidForm transactions={transactions} user={user} customers={customers} onRefresh={() => fetchData(false)} onUpdateTransactions={updateLocalTransactions} />}
                {activeTab === 'calendar' && <CalendarView transactions={transactions} items={items} />}
              </Fragment>
            </div>
          </main>

          <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 flex items-center justify-around z-50 h-16 px-2">
             {navItems.map(nav => (
                <button 
                  key={nav.id}
                  onClick={() => setActiveTab(nav.id as any)} 
                  className={`flex-1 flex flex-col items-center justify-center gap-1 transition-all ${activeTab === nav.id ? (nav.color || 'text-primary') : 'text-slate-400'}`}
                >
                   <span className="material-symbols-outlined text-[24px]">{nav.icon}</span>
                   <span className="text-[9px] font-bold uppercase tracking-tight">{nav.label}</span>
                </button>
             ))}
          </nav>
        </Fragment>
      ) : (
        <div className="flex h-screen overflow-hidden">
           <aside className="w-72 bg-secondary text-white flex flex-col shadow-2xl relative z-40">
             <div className="p-8 border-b border-white/5 text-center">
                <h1 className="text-2xl font-bold tracking-tighter italic">ETE DC PHUKET</h1>
                <p className="text-[11px] uppercase tracking-[0.3em] text-primary font-bold mt-1">Management System</p>
             </div>
             
             <nav className="flex-1 p-6 space-y-2 overflow-y-auto">
               {navItems.map(nav => (
                  <button
                    key={nav.id}
                    onClick={() => setActiveTab(nav.id as any)}
                    className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-sm font-bold transition-all group ${
                      activeTab === nav.id ? 'bg-primary text-secondary shadow-lg shadow-primary/20' : 'text-stone-400 hover:bg-white/5'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[22px]">{nav.desktopIcon || nav.icon}</span>
                    {nav.label}
                  </button>
               ))}
             </nav>
             
             <div className="p-6 border-t border-white/5 bg-black/10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-secondary font-bold shadow-inner">{user.name[0]}</div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-[15px] font-bold text-white truncate mb-1 leading-none">{user.name}</p>
                    <p className="text-[11px] text-primary uppercase font-bold tracking-widest">{user.role}</p>
                  </div>
                </div>
                <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 py-3 bg-white/5 hover:bg-red-500/10 hover:text-red-500 border border-white/5 rounded-xl text-xs font-bold transition-all">
                  <span className="material-symbols-outlined text-sm">logout</span>ออกจากระบบ
                </button>
             </div>
           </aside>

           <main className="flex-1 overflow-y-auto bg-surface relative">
              <div className="max-w-full mx-auto p-10 pb-20">
                <div className="relative">
                  {loading && (
                    <div className="absolute inset-0 bg-surface/40 backdrop-blur-[1px] z-50 flex items-center justify-center pointer-events-none animate-fade-in">
                      <div className="flex flex-col items-center gap-3">
                        <svg className="animate-spin h-10 w-10 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        <span className="text-[11px] font-black uppercase tracking-widest text-primary/60 animate-pulse">กำลังซิงค์ข้อมูลล่าสุด...</span>
                      </div>
                    </div>
                  )}
                  <Fragment>
                      {activeTab === 'welcome' && <Welcome user={user} transactions={transactions} announcement={settings.ANNOUNCEMENT} onUpdateAnnouncement={(msg) => handleUpdateSettings({ ANNOUNCEMENT: msg })} onLogout={handleLogout} setActiveTab={setActiveTab} currentVersion={CURRENT_APP_VERSION} latestVersion={settings.APP_VERSION} permissions={permissions} />}
                      {activeTab === 'dashboard' && <Dashboard items={items} />}
                      {activeTab === 'history' && <History transactions={transactions} user={user} customers={customers} onRefresh={fetchData} />}
                      {(activeTab === 'receive' || activeTab === 'issue') && <TransactionForm key={activeTab} items={items} transactions={transactions} initialAction={activeTab} operatorName={user.name} thaiAddressData={THAI_ADDRESS_ALL} onSuccess={() => fetchData(false)} />}
                      {activeTab === 'settings' && <Settings onRefresh={fetchData} user={user} onLogout={handleLogout} thaiAddressData={THAI_ADDRESS_ALL} permissions={permissions} />}
                       {activeTab === 'void' && <VoidForm transactions={transactions} user={user} customers={customers} onRefresh={() => fetchData(false)} onUpdateTransactions={updateLocalTransactions} />}
                      {activeTab === 'calendar' && <CalendarView transactions={transactions} items={items} />}
                  </Fragment>
                </div>
              </div>
           </main>
        </div>
      )}
    </div>
  );
}

export default App;
