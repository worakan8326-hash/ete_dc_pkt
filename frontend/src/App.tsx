import React, { useState, useEffect, Suspense, Fragment, lazy, useMemo } from 'react';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  RotateCcw,
  History,
  Settings as SettingsIcon,
  Search,
  LayoutDashboard,
  Calendar,
  Package,
  RefreshCw,
  LogOut,
  Bell,
  XCircle,
  Menu,
  Clock
} from 'lucide-react';

// 🕰️ Utilities & API
import { safeParseDate } from './utils/dateTimeUtils';
import { API_URL, getInitialData, getLogisticsJobs } from './api';
import { getClientSocket } from './lib/socket';
import THAI_ADDRESS_ALL from './data/thai_address_all.json';

// 🌍 External Assets/Fonts
import './index.css';

// 🧱 Common UI
import { LoadingOverlay, Toast } from './components/CommonUI';

// 🚀 Lazy Load Components
const Welcome = lazy(() => import('./components/Welcome'));
const Login = lazy(() => import('./components/Login'));
const ReceiveForm = lazy(() => import('./components/ReceiveForm'));
const IssueForm = lazy(() => import('./components/IssueForm'));
const ReturnForm = lazy(() => import('./components/ReturnForm'));
const CalendarView = lazy(() => import('./components/CalendarView'));
const Dashboard = lazy(() => import('./components/Dashboard'));
const HistoryView = lazy(() => import('./components/History'));
const JobRequestForm = lazy(() => import('./components/JobRequestForm'));
const Reports = lazy(() => import('./components/Reports'));
const MobileDashboard = lazy(() => import('./components/MobileDashboard'));
const VoidForm = lazy(() => import('./components/VoidForm'));
import RepairManagement from './components/RepairManagement';
const LogisticsTasks = lazy(() => import('./components/LogisticsTasks'));
const LogisticsDashboard = lazy(() => import('./components/LogisticsDashboard'));
const AuditLog = lazy(() => import('./components/AuditLog'));
const CustomerSurvey = lazy(() => import('./components/CustomerSurvey'));
const TransferForm = lazy(() => import('./components/TransferForm'));

// ⚙️ Direct Imports for Stability
import Settings from './components/Settings';


// 🖥️ Desktop Components
import DesktopLayout from './components/desktop/DesktopLayout';
import DesktopDashboard from './components/desktop/DesktopDashboard';
import DesktopInventory from './components/desktop/DesktopInventory';
import DesktopHistory from './components/desktop/DesktopHistory';
import DesktopCalendar from './components/desktop/DesktopCalendar';
import DesktopSettings from './components/desktop/DesktopSettings';
import DesktopTransactionWorkstation from './components/desktop/DesktopTransactionWorkstation';

// 📦 Types
import type { MaterialItem, Transaction, User, Customer } from './types';

// ⚙️ Configurations (Defined locally to avoid missing file errors)
const CURRENT_APP_VERSION = "1.1.0";
const APP_CONFIG = {
  API_URL: API_URL
};

/**
 * 📱 Mobile Header Component
 */
const MobileHeader: React.FC<{
  activeTab: string;
  operatorName: string;
  onRefresh: () => void;
  permissions: string[];
  loading: boolean;
}> = ({ activeTab, operatorName, onRefresh, loading }) => (
  <header className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between sticky top-0 z-40">
    <div className="flex items-center gap-4">
      <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
        <Package className="text-white" size={20} />
      </div>
      <div>
        <h1 className="text-[17px] font-black tracking-tight text-slate-800 leading-none">ETE DC</h1>
        <p className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] mt-1">{operatorName}</p>
      </div>
    </div>
    <div className="flex items-center gap-3">
      <button
        onClick={onRefresh}
        className={`w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 ${loading ? 'animate-spin' : ''}`}
      >
        <RefreshCw size={18} />
      </button>
      <div className="relative">
        <button className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
          <Bell size={18} />
          <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
        </button>
      </div>
    </div>
  </header>
);

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [items, setItems] = useState<MaterialItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [logisticsJobs, setLogisticsJobs] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'welcome' | 'dashboard' | 'receive' | 'issue' | 'return' | 'history' | 'calendar' | 'settings' | 'void' | 'inventory' | 'repair' | 'logistics' | 'job-request' | 'audit' | 'transfer' | 'survey'>('welcome');

  const [loading, setLoading] = useState(false);
  const [onlineCount, _setOnlineCount] = useState(1);
  const [latency, setLatency] = useState(0);
  const [voidTxnId, setVoidTxnId] = useState<string | null>(null);
  const [preSelectedLogisticsJobId, setPreSelectedLogisticsJobId] = useState<string | null>(null);
  const [permissions, _setPermissions] = useState<string[]>(['read', 'write', 'admin']);
  const [logisticsSubTab, setLogisticsSubTab] = useState<'waiting' | 'active' | 'history'>('waiting');
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'warning', message: string } | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [isOutdated, setIsOutdated] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({ APP_VERSION: CURRENT_APP_VERSION, ANNOUNCEMENT: '' });


  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const playSuccessSound = () => { try { new Audio('/success.mp3').play(); } catch (e) { } };

  const handleLogin = (authenticatedUser: User) => {
    setUser(authenticatedUser);
    localStorage.setItem('user', JSON.stringify(authenticatedUser));
    fetchData(true);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
    setActiveTab('welcome');
    setPreSelectedLogisticsJobId(null);
  };

  const fetchData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    const start = Date.now();
    try {
      const data = await getInitialData();
      const logisticsData = await getLogisticsJobs().catch(() => []);

      setItems(data.items || []);
      setTransactions(data.transactions || []);
      setLogisticsJobs(logisticsData || []);
      setCustomers(data.customers || []);
      setWarehouses(data.warehouses || []);
      setSettings(data.settings || { APP_VERSION: CURRENT_APP_VERSION });


      if (data.settings?.APP_VERSION && data.settings.APP_VERSION !== CURRENT_APP_VERSION) {
        setIsOutdated(true);
      }

      setLatency(Date.now() - start);
    } catch (error) {
      console.error('Fetch error:', error);
      setToast({ type: 'error', message: 'เชื่อมต่อฐานข้อมูลล้มเหลว' });
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser && !user) {
      setUser(JSON.parse(savedUser));
      fetchData(true);
    }

    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [user]);

  // 📡 Real-time Updates via WebSocket
  useEffect(() => {
    if (!user) return;

    const socket = getClientSocket();

    const handleDataUpdated = (payload: any) => {
      console.log('📡 [WebSocket] Received update:', payload);
      // Show notification toast
      if (payload?.message) {
        setToast({ type: 'success', message: payload.message });
        playSuccessSound();
      }

      // Fetch fresh data in the background
      fetchData(false);
    };

    socket.on('DATA_UPDATED', handleDataUpdated);

    // Occasional fallback poll just in case of silent disconnects (every 2mins)
    const fallbackPoll = setInterval(() => fetchData(false), 120000);

    return () => {
      socket.off('DATA_UPDATED', handleDataUpdated);
      clearInterval(fallbackPoll);
    };
  }, [user]);

  const updateLocalTransactions = (updated: Transaction[]) => {
    setTransactions(updated);
  };

  const handleVoidFromHistory = (txnNo: string) => {
    setVoidTxnId(txnNo);
    setActiveTab('void');
    setPreSelectedLogisticsJobId(null);
  };

  const handleNavigateToJobForm = (tab: any, jobId: string) => {
    setPreSelectedLogisticsJobId(jobId);
    setLogisticsSubTab('active');
    setActiveTab(tab);
  };

  const stats = useMemo(() => {
    const today = new Date().toLocaleDateString('th-TH');
    return {
      todayCount: transactions.filter(t => new Date(t['วัน-เวลา']).toLocaleDateString('th-TH') === today).length,
      allIn: transactions.filter(t => t.สถานะ === 'รับเข้า').reduce((s, t) => s + (t.จำนวน || 0), 0),
      allOut: transactions.filter(t => t.สถานะ === 'เบิกออก').reduce((s, t) => s + Math.abs(t.จำนวน || 0), 0),
      allVoid: transactions.filter(t => (t.สถานะ || '').includes('ยกเลิก')).length,
      allRepair: items.reduce((s, it) => s + (it.repair_qty || 0), 0),
      allScrap: items.reduce((s, it) => s + (it.scrap_qty || 0), 0),
      allLost: items.reduce((s, it) => s + (it.lost_qty || 0), 0),
      allTransit: items.reduce((s, it) => s + (it.transit_qty || 0), 0),
      allQuarantine: items.reduce((s, it) => s + (it.quarantine_qty || 0), 0)
    };
  }, [transactions, items]);

  const navItems = useMemo(() => {
    if (!user) return [];
    const itemsList = [
      { id: 'welcome', icon: 'home', label: 'หน้าแรก', desktopIcon: 'dashboard_customize', color: 'text-blue-600' },
      { id: 'dashboard', icon: 'inventory_2', label: 'สต็อก', desktopIcon: 'inventory_2', color: 'text-rose-600' },
      { id: 'receive', icon: 'input', label: 'รับเข้า', desktopIcon: 'input', color: 'text-emerald-600' },
      { id: 'job-request', icon: 'assignment', label: 'แจ้งงาน', desktopIcon: 'assignment', color: 'text-indigo-600' },
      { id: 'issue', icon: 'output', label: 'เบิกออก', desktopIcon: 'output', color: 'text-amber-600' },
      { id: 'return', icon: 'assignment_return', label: 'รับคืน', desktopIcon: 'assignment_return', color: 'text-purple-600' },
      { id: 'history', icon: 'history', label: 'ประวัติ', desktopIcon: 'history', color: 'text-indigo-600' },
      { id: 'audit', icon: 'shield_person', label: 'Audit Log', desktopIcon: 'admin_panel_settings', color: 'text-rose-600' },
      { id: 'repair', icon: 'engineering', label: 'จัดการพัสดุรับคืน', desktopIcon: 'engineering', color: 'text-rose-600' },

      { id: 'calendar', icon: 'calendar_month', label: 'ปฏิทิน', desktopIcon: 'calendar_month', color: 'text-violet-600' },
      { id: 'settings', icon: 'settings', label: 'ตั้งค่า', desktopIcon: 'settings', color: 'text-slate-600' },
      { id: 'logistics', icon: 'local_shipping', label: 'งานส่งของ', desktopIcon: 'local_shipping', color: 'text-indigo-600' },
      { id: 'transfer', icon: 'swap_horiz', label: 'ย้ายพัสดุ', desktopIcon: 'swap_horiz', color: 'text-sky-600' },
      { id: 'survey', icon: 'person_search', label: 'สำรวจลูกค้า', desktopIcon: 'person_search', color: 'text-emerald-600' },
    ];


    return itemsList.filter(nav => {
      // สำหรับมือถือ ให้โชว์แค่ "หน้าแรก" ตามใจลูกค้า
      if (isMobile && nav.id !== 'welcome') return false;

      const role = user.role || '';
      if (role.toLowerCase().includes('manager') || role.toLowerCase().includes('admin')) return true;
      const rolePerms = permissions[role] || {};
      const mapping: Record<string, string> = {
        'welcome': 'nav_home', 'dashboard': 'nav_inventory', 'job-request': 'nav_job_request', 'receive': 'nav_receive', 'issue': 'nav_issue', 'return': 'nav_return', 'history': 'nav_history', 'calendar': 'nav_calendar', 'settings': 'nav_settings', 'repair': 'nav_repair', 'logistics': 'nav_logistics', 'audit': 'nav_settings', 'survey': 'nav_home'
      };
      // only admins/managers can see audit log anyway, handled above. But we fallback to nav_settings perms if they manually grant.
      const permKey = mapping[nav.id];
      if (permKey) return rolePerms[permKey] === true || (permKey === 'nav_home' && rolePerms[permKey] !== false);
      return false;
    });
  }, [user, isMobile, permissions]);

  return (
    <div className="min-h-screen bg-slate-50">
      <Suspense fallback={<LoadingOverlay message="กำลังเปิดแอปพลิเคชัน..." />}>
        {!user ? (
          <Login onLogin={handleLogin} />
        ) : (
          <Fragment>
            {/* Mobile View */}
            <div className="md:hidden">
              <header className="flex items-center justify-between px-6 pt-8 pb-4">
                <div className="flex flex-col">
                  <h1 className="text-[22px] font-black text-slate-900 tracking-tight leading-none">ระบบจัดการพัสดุ</h1>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-2">{settings.CORP_NAME || 'ETE DC PHUKET'}</p>
                  <p className="text-[10px] font-black text-primary/60 uppercase tracking-widest mt-1">เวอร์ชัน {CURRENT_APP_VERSION}</p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-full border border-slate-100 shadow-sm">
                    <span className="material-symbols-outlined text-[14px] text-slate-400">visibility</span>
                    <span className="text-[11px] font-black text-slate-600">{onlineCount}</span>
                  </div>
                  {latency !== null && (
                    <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-full border border-slate-100 shadow-sm">
                      <div className={`w-2 h-2 rounded-full ${latency < 1000 ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]' : (latency < 2000 ? 'bg-amber-500' : 'bg-rose-500')}`}></div>
                      <span className="text-[11px] font-black text-slate-600 truncate max-w-[50px]">{latency}ms</span>
                    </div>
                  )}
                  <button onClick={() => fetchData(true)} disabled={loading} className={`flex items-center justify-center w-10 h-10 bg-white rounded-full border border-slate-100 text-slate-600 shadow-sm active:scale-90 transition-all ${loading ? 'animate-spin opacity-50' : ''}`}>
                    <span className="material-symbols-outlined text-[18px]">refresh</span>
                  </button>
                  {activeTab !== 'welcome' && (
                    <button
                      onClick={() => setActiveTab('welcome')}
                      className="flex items-center justify-center w-10 h-10 bg-rose-500 rounded-full text-white shadow-lg shadow-rose-200 active:scale-90 transition-all ml-1 border border-rose-400/20"
                    >
                      <span className="material-symbols-outlined text-[20px] font-bold">close</span>
                    </button>
                  )}
                </div>
              </header>

              <main className="flex-1 px-4 py-5 pb-10 overflow-y-auto">
                <div className="relative h-full">
                  {loading && <LoadingOverlay message="กำลังซิงค์ข้อมูลล่าสุด..." />}
                  <Suspense fallback={<div className="flex items-center justify-center p-20 opacity-50 font-black">กำลังซิงค์...</div>}>
                    <Fragment>
                      {activeTab === 'welcome' && <Welcome user={user} stats={stats} announcement={settings.ANNOUNCEMENT || ''} currentVersion={CURRENT_APP_VERSION} latestVersion={settings.APP_VERSION || ''} onLogout={handleLogout} setActiveTab={setActiveTab} permissions={permissions} />}
                      {activeTab === 'dashboard' && <Dashboard items={items} warehouses={warehouses} onRefresh={() => fetchData(true)} loading={loading} />}

                      {activeTab === 'history' && <HistoryView transactions={transactions} user={user} customers={customers} onRefresh={fetchData} onVoid={handleVoidFromHistory} />}
                      {activeTab === 'receive' && <ReceiveForm items={items} warehouses={warehouses} operatorName={user.name} transactions={transactions} thaiAddressData={THAI_ADDRESS_ALL} onSuccess={() => { fetchData(false); playSuccessSound(); }} />}
                      {activeTab === 'issue' && <IssueForm key={preSelectedLogisticsJobId || 'issue-default'} items={items} warehouses={warehouses} transactions={transactions} operatorName={user.name} thaiAddressData={THAI_ADDRESS_ALL} initialJobId={preSelectedLogisticsJobId || undefined} onSuccess={() => { fetchData(false); playSuccessSound(); setPreSelectedLogisticsJobId(null); }} setActiveTab={setActiveTab} setLogisticsSubTab={setLogisticsSubTab} setPreSelectedLogisticsJobId={setPreSelectedLogisticsJobId} />}
                      {activeTab === 'return' && <ReturnForm key={preSelectedLogisticsJobId || 'return-default'} items={items} warehouses={warehouses} operatorName={user.name} transactions={transactions} thaiAddressData={THAI_ADDRESS_ALL} initialJobId={preSelectedLogisticsJobId || undefined} onSuccess={() => { fetchData(false); playSuccessSound(); setPreSelectedLogisticsJobId(null); }} setActiveTab={setActiveTab} setLogisticsSubTab={setLogisticsSubTab} />}

                      {activeTab === 'settings' && <Settings onRefresh={fetchData} user={user} transactions={transactions} logisticsJobs={logisticsJobs} FULL_ADDRESS_LIST={THAI_ADDRESS_ALL} FILTERED_ADDRESS_LIST={THAI_ADDRESS_ALL} permissions={permissions} clientVersion={CURRENT_APP_VERSION} />}
                      {activeTab === 'void' && <VoidForm transactions={transactions} user={user} customers={customers} onRefresh={() => { fetchData(false); playSuccessSound(); }} onUpdateTransactions={updateLocalTransactions} initialTxnNo={voidTxnId || undefined} setActiveTab={setActiveTab} />}
                      {activeTab === 'calendar' && <CalendarView transactions={transactions} items={items} />}

                      {activeTab === 'job-request' && <JobRequestForm items={items} warehouses={warehouses} customers={customers} operatorName={user.name} thaiAddressData={THAI_ADDRESS_ALL} onSuccess={() => { fetchData(true); }} onClose={() => setActiveTab('welcome')} />}

                      {activeTab === 'repair' && <RepairManagement items={items} transactions={transactions} customers={customers} operatorName={user.name} onSuccess={() => fetchData(true)} onClose={() => setActiveTab('welcome')} loading={loading} />}
                      {activeTab === 'logistics' && <LogisticsDashboard items={items} customers={customers} operatorName={user.name} onNavigateToTab={handleNavigateToJobForm} onSuccess={() => fetchData(true)} initialTab={logisticsSubTab} transactions={transactions} loading={loading} />}
                      {activeTab === 'transfer' && <TransferForm items={items} warehouses={warehouses} operatorName={user.name} transactions={transactions} thaiAddressData={THAI_ADDRESS_ALL} onSuccess={() => { fetchData(false); playSuccessSound(); }} />}
                      {activeTab === 'audit' && <AuditLog transactions={transactions} user={user} />}
                      {activeTab === 'survey' && <CustomerSurvey items={items} customers={customers} transactions={transactions} logisticsJobs={logisticsJobs} operatorName={user.name} onRefresh={() => fetchData(true)} onClose={() => setActiveTab('welcome')} thaiAddressData={THAI_ADDRESS_ALL} />}

                    </Fragment>
                  </Suspense>
                </div>
              </main>
            </div>

            {/* Desktop View */}
            <div className="hidden md:block">
              <DesktopLayout
                activeTab={activeTab === 'welcome' ? 'dashboard' : activeTab}
                setActiveTab={setActiveTab}
                user={user}
                onLogout={handleLogout}
                onRefresh={() => fetchData(true)}
                loading={loading}
                onlineCount={onlineCount}
                latency={latency}
                version={CURRENT_APP_VERSION}
                permissions={permissions}
              >
                {loading && <LoadingOverlay message="กำลังซิงค์ข้อมูลล่าสุด..." />}

                {isOutdated && (
                  <div className="mb-8 p-6 bg-emerald-600 rounded-3xl text-white flex items-center justify-between shadow-lg shadow-emerald-100">
                    <div className="flex items-center gap-4">
                      <RefreshCw size={32} />
                      <div>
                        <h3 className="text-lg font-bold">พบรุ่นล่าสุด v{settings.APP_VERSION}</h3>
                        <p className="text-emerald-50/70 text-sm">กรุณาอัปเดตเพื่อรับฟีเจอร์ Desktop ใหม่ล่าสุด</p>
                      </div>
                    </div>
                    <button
                      onClick={() => { localStorage.clear(); window.location.reload(); }}
                      className="bg-white text-emerald-700 px-6 py-3 rounded-xl font-bold hover:bg-emerald-50"
                    >
                      อัปเดตทันที
                    </button>
                  </div>
                )}

                <Suspense fallback={<div className="flex items-center justify-center p-20 opacity-50 font-bold text-slate-400">กำลังโหลดข้อมูล...</div>}>
                  <Fragment>
                    {(activeTab === 'welcome' || activeTab === 'dashboard') && <DesktopDashboard items={items} transactions={transactions} user={user} onRefresh={() => fetchData(true)} setActiveTab={setActiveTab} allRepair={stats.allRepair} allScrap={stats.allScrap} allLost={stats.allLost} />}
                    {activeTab === 'history' && <DesktopHistory transactions={transactions} user={user} customers={customers} onRefresh={fetchData} onVoid={handleVoidFromHistory} />}
                    {activeTab === 'receive' && <DesktopTransactionWorkstation mode="receive" items={items} operatorName={user.name} onSuccess={() => { fetchData(false); playSuccessSound(); }} customers={customers} />}
                    {activeTab === 'issue' && <DesktopTransactionWorkstation mode="issue" items={items} operatorName={user.name} onSuccess={() => { fetchData(false); playSuccessSound(); }} customers={customers} />}
                    {activeTab === 'return' && <DesktopTransactionWorkstation mode="return" items={items} operatorName={user.name} onSuccess={() => { fetchData(false); playSuccessSound(); }} customers={customers} />}
                    {activeTab === 'settings' && <DesktopSettings onRefresh={fetchData} user={user} transactions={transactions} logisticsJobs={logisticsJobs} FULL_ADDRESS_LIST={THAI_ADDRESS_ALL} permissions={permissions} clientVersion={CURRENT_APP_VERSION} />}
                    {activeTab === 'void' && <VoidForm transactions={transactions} user={user} customers={customers} onRefresh={() => { fetchData(false); playSuccessSound(); }} onUpdateTransactions={updateLocalTransactions} initialTxnNo={voidTxnId || undefined} setActiveTab={setActiveTab} />}
                    {activeTab === 'calendar' && <DesktopCalendar transactions={transactions} items={items} />}
                    {activeTab === 'inventory' && <DesktopInventory items={items} warehouses={warehouses} onRefresh={() => fetchData(true)} loading={loading} />}
                    {activeTab === 'survey' && <CustomerSurvey items={items} customers={customers} transactions={transactions} logisticsJobs={logisticsJobs} operatorName={user.name} onRefresh={() => fetchData(true)} onClose={() => setActiveTab('welcome')} thaiAddressData={THAI_ADDRESS_ALL} />}
                    {activeTab === 'job-request' && <JobRequestForm items={items} customers={customers} operatorName={user.name} thaiAddressData={THAI_ADDRESS_ALL} onSuccess={() => fetchData(true)} onClose={() => setActiveTab('welcome')} />}
                    {activeTab === 'repair' && <RepairManagement items={items} transactions={transactions} customers={customers} operatorName={user.name} onSuccess={() => fetchData(true)} onClose={() => setActiveTab('welcome')} loading={loading} />}
                    {activeTab === 'logistics' && <LogisticsDashboard items={items} customers={customers} operatorName={user.name} onNavigateToTab={handleNavigateToJobForm} onSuccess={() => fetchData(true)} loading={loading} />}
                    {activeTab === 'transfer' && <div className="py-2"><TransferForm items={items} warehouses={warehouses} operatorName={user.name} transactions={transactions} thaiAddressData={THAI_ADDRESS_ALL} onSuccess={() => { fetchData(false); playSuccessSound(); }} /></div>}
                    {activeTab === 'audit' && <div className="py-8"><AuditLog transactions={transactions} user={user} /></div>}
                  </Fragment>
                </Suspense>
              </DesktopLayout>
            </div>
          </Fragment>
        )}
      </Suspense>

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] px-4 w-full max-md pointer-events-none">
          <div className="pointer-events-auto">
            <Toast
              type={toast.type === 'warning' ? 'warning' : (toast.type as 'success' | 'error')}
              message={toast.message}
              onClose={() => setToast(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
