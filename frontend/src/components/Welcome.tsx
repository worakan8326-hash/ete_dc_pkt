import React, { useMemo } from 'react';
import { ShieldCheck } from 'lucide-react';

interface WelcomeProps {
  user: any;
  stats: {
    todayCount: number;
    allIn: number;
    allOut: number;
    allVoid: number;
    allRepair: number;
    allScrap: number;
    allLost: number;
    allTransit: number;
    allQuarantine: number;
  };
  latestVersion: string;
  currentVersion: string;
  announcement: string;
  onLogout: () => void;
  setActiveTab: (tab: any) => void;
  permissions?: any;
}

const Welcome: React.FC<WelcomeProps> = ({ user, stats, latestVersion, currentVersion, announcement, onLogout, setActiveTab, permissions }) => {
  const roleDisplay = useMemo(() => {
    const role = (user.role || '').toLowerCase();
    if (role === 'admin') return 'ADMIN';
    if (role === 'staff') return 'STAFF';
    if (role === 'user') return 'USER';
    return user.role || 'USER';
  }, [user.role]);

  const canManageSettings = user.role === 'admin' || (permissions && permissions.settings);
  const needsUpdate = latestVersion && currentVersion && latestVersion !== currentVersion;

  return (
    <div className="flex flex-col items-center py-4 px-4 max-w-4xl mx-auto space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Header Profile Section - Glassmorphism */}
      <div className="w-full relative py-2 overflow-hidden">
         <div className="flex flex-col items-center text-center space-y-1 relative z-10">
            <div className="w-16 h-16 bg-gradient-to-tr from-indigo-500 to-primary rounded-full mb-2 flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-primary/20 border-4 border-white">
                {user.name?.charAt(0) || 'U'}
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Welcome Back</p>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">{user.name}</h2>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/40 backdrop-blur-md rounded-full border border-white/60 shadow-sm">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.1em]">{roleDisplay}</span>
            </div>
         </div>
      </div>

      {needsUpdate && (
        <div className="w-full bg-gradient-to-r from-indigo-600 to-rose-500 rounded-3xl p-4 flex items-center justify-between shadow-xl shadow-indigo-500/20 border border-white/20 relative overflow-hidden group">
          <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-10 h-10 bg-white/20 backdrop-blur-lg rounded-xl flex items-center justify-center border border-white/20">
              <span className="material-symbols-outlined text-white text-[20px]">system_update_alt</span>
            </div>
            <div>
              <p className="text-[12px] font-black text-white leading-none">New Update Available</p>
              <p className="text-[9px] font-bold text-white/70 uppercase tracking-widest mt-1 italic">{currentVersion} → {latestVersion}</p>
            </div>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="bg-white/20 backdrop-blur-xl text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase ring-1 ring-white/40 active:scale-95 transition-all hover:bg-white/30"
          >
            Update
          </button>
        </div>
      )}

      {/* Stats Summary - Ultra Compact Glass Pill */}
      <div className="w-full bg-white/60 backdrop-blur-xl border border-white shadow-2xl shadow-slate-200/50 rounded-[2rem] p-1.5 flex items-center justify-center overflow-x-auto scrollbar-hide gap-1.5">
          {[
            { id: 'history', label: 'รอทำ', val: stats.todayCount, bg: 'bg-slate-100/50', text: 'text-slate-600' },
            { id: 'logistics', label: 'รถส่ง', val: stats.allTransit, bg: 'bg-blue-50/50', text: 'text-blue-600' },
            { id: 'repair', label: 'รอตรวจ', val: stats.allQuarantine, bg: 'bg-purple-50/50', text: 'text-purple-600' },
            { id: 'receive', label: 'รับเข้า', val: stats.allIn, bg: 'bg-emerald-50/50', text: 'text-emerald-600' },
            { id: 'issue', label: 'เบิกออก', val: stats.allOut, bg: 'bg-amber-50/50', text: 'text-amber-600' },
            { id: 'void', label: 'ยกเลิก', val: stats.allVoid, bg: 'bg-rose-50/50', text: 'text-rose-600' },
          ].map((s, i) => (
            <div 
              key={i} 
              onClick={() => setActiveTab(s.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl cursor-pointer active:scale-95 transition-all shrink-0 border border-white/50 ${s.bg}`}
            >
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter leading-none whitespace-nowrap">{s.label}</p>
              <p className={`text-[15px] font-black ${s.text} leading-none`}>{s.val}</p>
            </div>
          ))}
      </div>

      {/* Admin Review Alert - Glassmorphism */}
      {(stats.allQuarantine > 0 || stats.allScrap > 0 || stats.allLost > 0) && (
        <div 
          onClick={() => setActiveTab('repair')}
          className="w-full bg-white/40 backdrop-blur-xl border border-white border-b-rose-200/50 rounded-3xl p-3 flex items-center justify-between cursor-pointer active:scale-95 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 ${stats.allQuarantine > 0 ? 'bg-indigo-600' : 'bg-rose-500'} rounded-xl flex items-center justify-center text-white shadow-lg group-hover:rotate-12 transition-transform`}>
               <ShieldCheck size={20} />
            </div>
            <div>
               <p className={`text-[12px] font-black ${stats.allQuarantine > 0 ? 'text-indigo-600' : 'text-rose-600'} leading-none`}>
                  {stats.allQuarantine > 0 ? 'Items Waiting for Inspection' : 'Admin Approval Required'}
               </p>
               <p className="text-[9px] font-bold text-slate-400 tracking-widest mt-1 uppercase">
                 Check: {stats.allQuarantine} • Scrap: {stats.allScrap} • Lost: {stats.allLost}
               </p>
            </div>
          </div>
          <span className="material-symbols-outlined text-slate-300 group-hover:translate-x-1 transition-transform">chevron_right</span>
        </div>
      )}

      {/* Primary Management Actions Grid - Glass Cards */}
      <div className="w-full space-y-4 pt-1">
        <div className="flex items-center justify-between px-2">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Management Suite</p>
          <div className="h-px bg-slate-100 flex-1 ml-4 opacity-50"></div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          {[
            { id: 'dashboard', label: 'Inventory', sub: 'สต็อกพัสดุ', icon: 'inventory_2', color: 'bg-rose-500', visible: permissions.btn_inventory !== false },
            { id: 'history', label: 'History', sub: 'ประวัติรายการ', icon: 'history', color: 'bg-indigo-500', visible: permissions.btn_history !== false },
            { id: 'receive', label: 'Receive', sub: 'รับพัสดุเข้า', icon: 'input', color: 'bg-emerald-500', visible: permissions.btn_receive !== false },
            { id: 'issue', label: 'Issue Out', sub: 'เบิกพัสดุออก', icon: 'output', color: 'bg-amber-500', visible: permissions.btn_issue !== false },
            { id: 'return', label: 'Return', sub: 'รับพัสดุคืน', icon: 'assignment_return', color: 'bg-purple-500', visible: permissions.btn_return !== false },
            { id: 'job-request', label: 'Jobs', sub: 'แจ้งงาน / คืน', icon: 'assignment', color: 'bg-blue-500', visible: permissions.btn_job_request !== false },
            { id: 'logistics', label: 'Logistics', sub: 'งานขนส่ง', icon: 'local_shipping', color: 'bg-emerald-600', visible: permissions.btn_logistics !== false },
            { id: 'survey', label: 'Survey', sub: 'สำรวจลูกค้า', icon: 'person_search', color: 'bg-emerald-500', visible: true },
            { id: 'repair', label: 'Approv', sub: 'ศูนย์ซ่อม/คืน', icon: 'engineering', color: 'bg-rose-600', isLarge: true, visible: (user.role === 'admin' || user.role === 'manager' || permissions.btn_repair === true) },
            { id: 'audit', label: 'Admin Logs', sub: 'บันทึกระบบ', icon: 'admin_panel_settings', color: 'bg-slate-800', visible: (user.role === 'admin' || user.role === 'manager') }
          ].filter(i => {
             if (i.id === 'repair' || i.id === 'audit') return i.visible;
             return user.role === 'admin' || user.role === 'manager' || i.visible;
          }).map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className="group relative flex flex-col items-start p-5 bg-white/60 backdrop-blur-xl border border-white rounded-[2.2rem] active:scale-95 transition-all shadow-xl shadow-slate-200/30 hover:shadow-primary/5 hover:border-primary/20"
            >
              <div className={`w-11 h-11 ${item.color} rounded-2xl flex items-center justify-center text-white mb-3 group-hover:scale-110 transition-transform shadow-lg shadow-current/20`}>
                <span className="material-symbols-outlined text-[24px]">{item.icon}</span>
              </div>
              <span className="text-[13px] font-black text-slate-900 leading-none">{item.label}</span>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">{item.sub}</span>
              
              {/* Subtle glass reflection effect icon */}
               <div className="absolute top-4 right-4 opacity-[0.05] group-hover:opacity-10 transition-opacity">
                  <span className="material-symbols-outlined text-[40px] text-slate-900">{item.icon}</span>
               </div>
            </button>
          ))}
        </div>

        {/* Secondary Settings - Smaller Glass Row */}
        <div className="pt-4 grid grid-cols-1 gap-2.5">
          {canManageSettings && (
            <button
              onClick={() => setActiveTab('settings')}
              className="w-full flex items-center justify-start px-6 gap-4 p-4 bg-white/40 backdrop-blur-md border border-white rounded-[1.8rem] active:scale-95 transition-all shadow-sm hover:bg-white/60 group"
            >
              <div className="w-9 h-9 bg-slate-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-slate-200 group-hover:scale-110 transition-transform shrink-0">
                <span className="material-symbols-outlined text-[18px]">settings</span>
              </div>
              <div className="flex flex-col items-start">
                  <span className="text-[13px] font-black text-slate-700 leading-none">System Settings</span>
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">ตั้งค่าระบบจัดการ</span>
              </div>
            </button>
          )}

          <div className="grid grid-cols-2 gap-2.5">
            <button
                onClick={() => {
                if (window.confirm('คุณต้องการรีเซ็ตข้อมูล (เคลียร์แคช) และดึงข้อมูลใหม่จากระบบใช่หรือไม่?')) {
                    localStorage.clear();
                    window.location.reload();
                }
                }}
                className="flex items-center justify-center gap-3 p-4 bg-white/40 backdrop-blur-md border border-white rounded-[1.8rem] active:scale-95 transition-all shadow-sm group"
            >
                <span className="material-symbols-outlined text-[18px] text-indigo-500 group-hover:rotate-180 transition-transform duration-500">sync</span>
                <span className="text-[11px] font-black text-slate-600 uppercase tracking-wide">Reload</span>
            </button>

            <button
                onClick={onLogout}
                className="flex items-center justify-center gap-3 p-4 bg-white/40 backdrop-blur-md border border-white rounded-[1.8rem] active:scale-95 transition-all shadow-sm group"
            >
                <span className="material-symbols-outlined text-[18px] text-rose-500 group-hover:-translate-x-1 transition-transform">logout</span>
                <span className="text-[11px] font-black text-slate-600 uppercase tracking-wide">Logout</span>
            </button>
          </div>
        </div>
        
        <div className="py-8 text-center opacity-40">
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.4em]">ETE DC PHUKET • v{currentVersion}</p>
        </div>
      </div>
    </div>
  );
};

export default Welcome;
