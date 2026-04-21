import React from 'react';
import { 
  LayoutDashboard, 
  Package, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  RotateCcw, 
  History, 
  CalendarDays, 
  Settings, 
  LogOut,
  Search,
  User as UserIcon,
  Bell,
  RefreshCw,
  ShieldCheck
} from 'lucide-react';

interface DesktopLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: any) => void;
  user: { name: string; role: string };
  onLogout: () => void;
  onRefresh: () => void;
  loading: boolean;
  onlineCount: number;
  latency: number | null;
  version: string;
  permissions?: any;
}

const DesktopLayout: React.FC<DesktopLayoutProps> = ({
  children,
  activeTab,
  setActiveTab,
  user,
  onLogout,
  onRefresh,
  loading,
  onlineCount,
  latency,
  version,
  permissions
}) => {

  const navItems = [
    { id: 'dashboard', label: 'หน้าแรก / แดชบอร์ด', icon: LayoutDashboard, color: 'text-slate-600' },
    { id: 'inventory', label: 'สต็อกพัสดุ', icon: Package, color: 'text-slate-600' },
    { id: 'receive', label: 'รับพัสดุเข้าคลัง', icon: ArrowDownCircle, color: 'text-emerald-600' },
    { id: 'job-request', label: 'แจ้งงาน / เบิกพัสดุ', icon: ArrowUpCircle, color: 'text-indigo-600' },
    { id: 'issue', label: 'เบิกพัสดุออกหน้างาน', icon: ArrowUpCircle, color: 'text-amber-600' },
    { id: 'return', label: 'รับคืนพัสดุ', icon: RotateCcw, color: 'text-purple-600' },
    { id: 'history', label: 'ประวัติรายการ', icon: History, color: 'text-indigo-600' },
    { id: 'audit', label: 'บันทึกระบบ (Admin Log)', icon: ShieldCheck, color: 'text-rose-600' },
    { id: 'survey', label: 'สำรวจลูกค้า (Survey)', icon: Search, color: 'text-emerald-600' },
    { id: 'calendar', label: 'ปฏิทินงาน', icon: CalendarDays, color: 'text-violet-600' },
    { id: 'logistics', label: 'รายการงานขนส่ง (Logistics)', icon: ArrowDownCircle, color: 'text-emerald-700' },
    { id: 'settings', label: 'ตั้งค่าระบบ', icon: Settings, color: 'text-slate-600' },
  ];

  // Filtering based on permissions (Similar logic to App.tsx)
  const filteredNav = navItems.filter(nav => {
     const role = user.role || '';
     if (role.toLowerCase().includes('admin') || role.toLowerCase().includes('manager')) return true;
     
     const rolePerms = permissions?.[role] || {};
     const mapping: Record<string, string> = {
        'dashboard': 'nav_home',
        'inventory': 'nav_inventory',
        'receive': 'nav_receive',
        'job-request': 'nav_job_request',
        'issue': 'nav_issue',
        'return': 'nav_return',
        'history': 'nav_history',
        'audit': 'nav_audit',
        'calendar': 'nav_calendar',
        'logistics': 'nav_logistics',
        'settings': 'nav_settings'
     };
     const permKey = mapping[nav.id];
     return rolePerms[permKey] === true || nav.id === 'dashboard';
  });

  return (
    <div className="flex h-screen bg-slate-50 font-desktop text-slate-900 overflow-hidden">
      {/* 🟢 Sidebar (E-Filing Clean Style) */}
      <aside className="w-72 bg-white border-r border-slate-200 flex flex-col z-30 shadow-sm">
        <div className="p-8 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-200">
                <Package size={24} strokeWidth={2.5} />
             </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-800 leading-none">ETE DC</h1>
                <p className="text-[12px] font-semibold text-emerald-600 uppercase tracking-widest mt-1">Phuket Manager</p>
              </div>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto custom-scrollbar">
          {filteredNav.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;
            
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-[15px] font-semibold group ${
                  isActive 
                    ? 'bg-emerald-50 text-emerald-700 shadow-sm border border-emerald-100/50' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700 border border-transparent'
                }`}
              >
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'text-emerald-600' : 'text-slate-400 group-hover:text-slate-600'} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="p-6 border-t border-slate-100 bg-slate-50/50 mt-4">
           <div className="flex items-center gap-3 mb-4 p-3 bg-white rounded-2xl border border-slate-100">
              <div className="w-10 h-10 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-slate-400">
                <UserIcon size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold text-slate-800 truncate leading-none">{user.name}</p>
                <p className="text-[11px] text-emerald-600 font-semibold uppercase tracking-widest mt-1">{user.role}</p>
              </div>
           </div>
           <button 
             onClick={onLogout}
             className="w-full flex items-center justify-center gap-2 py-3 bg-white hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200 hover:border-rose-100 rounded-xl text-xs font-bold shadow-sm"
           >
             <LogOut size={16} /> ออกจากระบบ
           </button>
           <p className="text-[9px] text-center text-slate-300 font-bold uppercase tracking-widest mt-4">Version {version}</p>
        </div>
      </aside>

      {/* 🚀 Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 relative h-full">
        {/* 🟢 TopBar (Clean & Functional) */}
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-10 sticky top-0 z-20 shadow-sm">
           <div className="flex items-center gap-8">
              <div className="relative group overflow-hidden bg-slate-50 rounded-xl px-4 py-2 border border-slate-100 hover:bg-white hover:border-emerald-200 w-80">
                 <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-500" />
                 <input 
                   type="text" 
                   placeholder="ค้นหาพัสดุ, รายการ หรือลูกค้า..." 
                   className="bg-transparent border-none outline-none text-[14px] font-medium w-full pl-6 pr-2 placeholder:text-slate-300"
                  />
              </div>
           </div>

           <div className="flex items-center gap-5">
              {/* Online Status & Stats */}
              <div className="flex items-center gap-3">
                 <div className="flex flex-col items-end mr-2">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100">
                       <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                       <span className="text-[11px] font-bold uppercase tracking-widest">Online: {onlineCount}</span>
                    </div>
                    {latency !== null && (
                       <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest mt-1">Latency: {latency}ms</p>
                    )}
                 </div>
                 
                 <button 
                   onClick={onRefresh}
                   disabled={loading}
                   className={`w-10 h-10 rounded-xl flex items-center justify-center border border-slate-200 text-slate-500 hover:bg-slate-50 transition-all ${loading ? 'animate-spin' : 'active:scale-90'}`}
                 >
                   <RefreshCw size={18} />
                 </button>

                 <button className="relative w-10 h-10 rounded-xl flex items-center justify-center border border-slate-200 text-slate-500 hover:bg-slate-50 transition-all active:scale-95">
                    <Bell size={18} />
                    <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
                 </button>
              </div>
           </div>
        </header>

        {/* 🟡 Workspace area */}
        <main className="flex-1 overflow-y-auto custom-scrollbar relative p-10 bg-slate-50/50">
           {children}
        </main>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}</style>
    </div>
  );
};

export default DesktopLayout;
