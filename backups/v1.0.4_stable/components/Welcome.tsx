import { useMemo, useState } from 'react';
import type { User, Transaction } from '../types';

interface WelcomeProps {
  user: User;
  transactions: Transaction[];
  announcement?: string;
  onUpdateAnnouncement?: (msg: string) => void;
  onLogout?: () => void;
  setActiveTab?: (tab: any) => void;
  currentVersion?: string;
  latestVersion?: string;
  permissions?: any;
}

export default function Welcome({ 
  user, transactions, announcement, onUpdateAnnouncement, onLogout, setActiveTab,
  currentVersion, latestVersion, permissions
}: WelcomeProps) {
  const needsUpdate = latestVersion && currentVersion && latestVersion !== currentVersion;
  const displayAnnouncement = announcement || "ยังไม่มีประกาศในขณะนี้";
  const [isEditing, setIsEditing] = useState(false);
  const [tempAnnouncement, setTempAnnouncement] = useState(displayAnnouncement);

  const isAdminOrManager = useMemo(() => {
    const role = (user.role || '').toLowerCase();
    return role.includes('admin') || role.includes('manager') || role.includes('ผู้ดูแล') || role.includes('จัดการ');
  }, [user.role]);

  const canShowInventory = useMemo(() => {
     if (isAdminOrManager) return true;
     return permissions?.[user.role]?.btn_inventory === true;
  }, [isAdminOrManager, permissions, user.role]);

  const canShowSettings = useMemo(() => {
     if (isAdminOrManager) return true;
     return permissions?.[user.role]?.btn_settings === true;
  }, [isAdminOrManager, permissions, user.role]);

  const roleDisplay = useMemo(() => {
    return (user.role || '').toUpperCase();
  }, [user.role]);

  const stats = useMemo(() => {
    const today = new Date().toLocaleDateString('th-TH');
    const myTx = transactions.filter(t => isAdminOrManager || t['ผู้ทำรายการ'] === user.name);
    
    const todayCount = myTx.filter(tx => {
       try { return new Date(tx['วัน-เวลา']).toLocaleDateString('th-TH') === today; } catch { return false; }
    }).length;
    
    const allIn = myTx.filter(tx => tx['สถานะ'] === 'รับเข้า').reduce((s, tx) => s + Math.abs(Number(tx.จำนวน || 0)), 0);
    const allOut = myTx.filter(tx => tx['สถานะ'] === 'เบิกออก').reduce((s, tx) => s + Math.abs(Number(tx.จำนวน || 0)), 0);
    const allVoid = myTx.filter(tx => String(tx['สถานะ'] || '').includes('ยกเลิก')).reduce((s, tx) => s + Math.abs(Number(tx.จำนวน || 0)), 0);

    return { todayCount, allIn, allOut, allVoid };
  }, [transactions, user.name, isAdminOrManager]);

  const handleUpdateAnnouncement = () => {
     if (onUpdateAnnouncement) onUpdateAnnouncement(tempAnnouncement);
     setIsEditing(false);
  };

  return (
    <div className="flex flex-col items-center py-6 px-4 max-w-4xl mx-auto space-y-6">
      
      <div className="flex flex-col items-center text-center space-y-1">
        <p className="text-[12px] font-bold text-slate-400 uppercase tracking-[0.2em]">ยินดีต้อนรับ</p>
        <h2 className="text-3xl font-bold text-slate-900 tracking-tight">{user.name}</h2>
        <div className="inline-flex mt-2 px-3 py-0.5 bg-slate-100 rounded-full border border-slate-200">
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{roleDisplay}</span>
        </div>
      </div>

      {needsUpdate && (
        <div className="w-full bg-slate-900 rounded-xl p-4 flex items-center justify-between border border-slate-800 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-white text-[20px]">system_update_alt</span>
              <div>
                <p className="text-[12px] font-bold text-white leading-none">ตรวจพบเวอร์ชันใหม่</p>
                <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest">{currentVersion} ➔ {latestVersion}</p>
              </div>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="bg-white text-slate-900 px-4 py-2 rounded-lg text-[11px] font-bold uppercase active:scale-95 transition-all"
            >
              อัปเดต
            </button>
        </div>
      )}

      {/* Announcement */}
      <div className="w-full bg-slate-50 rounded-2xl border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="material-symbols-outlined text-[18px] text-slate-400">campaign</span>
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ประกาศจากศูนย์</h3>
        </div>
        <p className="text-[14px] font-medium text-slate-700 leading-relaxed italic text-center">
          "{displayAnnouncement}"
        </p>
      </div>

      {/* Stats Table-like UI */}
      <div className="w-full bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
            <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">สรุปรายการพัสดุของคุณ</h3>
            <span className="text-[10px] text-slate-400 font-medium">{new Date().toLocaleDateString('th-TH')}</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-slate-50">
             {[
               { label: 'รอกำเนินการ', val: stats.todayCount, color: 'text-slate-900' },
               { label: 'รับเข้าทั้งหมด', val: stats.allIn, color: 'text-emerald-600' },
               { label: 'เบิกออกทั้งหมด', val: stats.allOut, color: 'text-amber-600' },
               { label: 'ยกเลิกรายการ', val: stats.allVoid, color: 'text-rose-600' }
             ].map((s, i) => (
                <div key={i} className="p-5 text-center">
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">{s.label}</p>
                   <p className={`text-2xl font-bold ${s.color} tracking-tight`}>{s.val.toLocaleString()}</p>
                </div>
             ))}
          </div>
      </div>

      {isAdminOrManager && (
         <div className="w-full p-4 bg-white border border-slate-200 rounded-2xl">
            {isEditing ? (
               <div className="space-y-3">
                  <textarea 
                     className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm font-medium outline-none focus:border-slate-400 min-h-[100px] transition-all"
                     value={tempAnnouncement}
                     onChange={(e) => setTempAnnouncement(e.target.value)}
                  />
                  <div className="flex gap-2">
                     <button onClick={handleUpdateAnnouncement} className="flex-1 py-3 bg-slate-900 text-white text-[11px] font-bold uppercase rounded-xl active:scale-95 transition-all">บันทึกข้อความ</button>
                     <button onClick={() => setIsEditing(false)} className="px-6 py-3 bg-slate-100 text-slate-600 text-[11px] font-bold uppercase rounded-xl active:scale-95 transition-all">ยกเลิก</button>
                  </div>
               </div>
            ) : (
               <button onClick={() => setIsEditing(true)} className="w-full py-2 flex items-center justify-center gap-2 text-slate-400 hover:text-slate-900 transition-colors">
                  <span className="material-symbols-outlined text-[18px]">edit</span>
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em]">แก้ไขประกาศกลาง</span>
               </button>
            )}
         </div>
      )}

      {/* Main Actions */}
      <div className="w-full grid grid-cols-1 gap-3 pt-6 pb-12">
          {canShowInventory && setActiveTab && (
            <button 
              onClick={() => { localStorage.setItem('settings_active_tab', 'master'); setActiveTab('settings'); }}
              className="w-full h-16 bg-emerald-600 text-white text-[15px] font-bold uppercase rounded-2xl flex items-center justify-center gap-3 active:scale-95 transition-all shadow-lg shadow-emerald-600/10"
            >
              <span className="material-symbols-outlined text-[24px]">inventory_2</span>
              เข้าสู่ระบบเช็คพัสดุ
            </button>
          )}

          {canShowSettings && setActiveTab && (
            <button 
              onClick={() => setActiveTab('settings')}
              className="w-full h-16 bg-white border border-slate-200 text-slate-900 text-[15px] font-bold uppercase rounded-2xl flex items-center justify-center gap-3 active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-[24px]">settings</span>
              ตั้งค่าระบบ & สมาชิก
            </button>
          )}
          
          {onLogout && (
            <button 
              onClick={onLogout}
              className="w-full h-14 mt-4 bg-white text-rose-600 text-[13px] font-bold uppercase rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all opacity-60 hover:opacity-100"
            >
              <span className="material-symbols-outlined text-[20px]">logout</span>
              ออกจากระบบงาน
            </button>
          )}
      </div>
      
    </div>
  );
}
