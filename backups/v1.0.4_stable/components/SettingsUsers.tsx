import React from 'react';

interface SettingsUsersProps {
  users: any[];
  onEditUser: (user: any) => void;
  onDeleteUser: (user: any) => void;
  onAddUser: () => void;
  onManagePermissions?: () => void;
}

const SettingsUsers: React.FC<SettingsUsersProps> = ({ users, onEditUser, onDeleteUser, onAddUser, onManagePermissions }) => {
  return (
    <div className="p-3 md:p-6 font-bold animate-fade-in space-y-5">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-[0.02] pointer-events-none transform rotate-12">
            <span className="material-symbols-outlined text-[80px] text-primary">badge</span>
        </div>
        <div className="space-y-1 relative z-10">
          <h2 className="text-[18px] font-black text-secondary flex items-center gap-2 uppercase tracking-tight">
             <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[22px]">group</span>
             </div>
             จัดการพนักงาน
          </h2>
          <p className="text-[10px] text-secondary/30 font-bold uppercase tracking-widest leading-none ml-1">Team Access Control</p>
        </div>
        <div className="flex flex-row gap-3 md:gap-4 w-full md:w-auto relative z-10 items-center overflow-x-auto scrollbar-hide pb-1">
          <button 
            onClick={onAddUser} 
            className="flex-1 md:flex-none h-14 px-6 md:px-10 bg-primary text-white rounded-[1.2rem] font-black flex items-center justify-center gap-3 shadow-xl shadow-primary/20 active:scale-95 transition-all text-[13px] md:text-[14px] uppercase tracking-widest whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-[24px]">person_add</span>
            เพิ่มพนักงาน
          </button>
          {onManagePermissions && (
            <button 
              onClick={onManagePermissions} 
              className="flex-1 md:flex-none h-14 px-6 md:px-10 bg-white text-primary rounded-[1.2rem] font-black flex items-center justify-center gap-3 active:scale-95 transition-all text-[13px] md:text-[14px] uppercase tracking-widest border-2 border-primary shadow-lg shadow-primary/5 whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-[24px]">admin_panel_settings</span>
              กำหนดสิทธิ์
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {users.map((u, idx) => (
          <div key={idx} className="bg-white border border-slate-100 rounded-[1.8rem] p-4 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
             <div className="flex flex-col h-full space-y-2 relative z-10">
                <div className="flex items-start justify-between gap-3">
                   <div className="flex-1 space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 bg-primary/5 text-primary text-[9px] font-black rounded-md uppercase tracking-tighter border border-primary/5">{u.role}</span>
                        <span className="text-[11px] text-secondary/30 font-bold uppercase tracking-tighter antialiased">@{u.username}</span>
                      </div>
                      <h3 className="text-[14px] font-black text-secondary leading-snug line-clamp-1">{u.name}</h3>
                   </div>
                   <div className="flex gap-1 shrink-0">
                      <button onClick={() => onEditUser(u)} className="w-7 h-7 rounded-lg bg-orange-50 text-orange-500 flex items-center justify-center border border-orange-100 hover:bg-orange-500 hover:text-white transition-all shadow-sm shadow-orange-100">
                         <span className="material-symbols-outlined text-[16px]">edit</span>
                      </button>
                      <button onClick={() => onDeleteUser(u)} className="w-7 h-7 rounded-lg bg-red-50 text-red-100 flex items-center justify-center border border-red-50 hover:bg-red-500 hover:text-white transition-all">
                         <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                   </div>
                </div>
             </div>
          </div>
        ))}
        {users.length === 0 && <div className="py-20 text-center col-span-full text-secondary/10 font-black uppercase tracking-[0.3em] italic text-[10px]">ไม่พบข้อมูลพนักงาน</div>}
      </div>
    </div>
  );
};

export default React.memo(SettingsUsers);
