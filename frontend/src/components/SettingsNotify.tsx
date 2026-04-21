import React from 'react';
import { API_URL } from '../api';

interface SettingsNotifyProps {
  settings: any;
  setSettings: React.Dispatch<React.SetStateAction<any>>;
  tokens: string[];
  setTokens: React.Dispatch<React.SetStateAction<string[]>>;
  channels: any[];
  setChannels: React.Dispatch<React.SetStateAction<any[]>>;
  loading: boolean;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  showSuccess: (msg: string) => void;
  setError: (msg: string) => void;
  onSave: () => Promise<void>;
  testTelegram: () => Promise<any>;
  relinkTelegram: (url: string) => Promise<any>;
}

function SettingsNotify({ 
  settings, setSettings, tokens, setTokens, 
  loading, setLoading, showSuccess, setError,
  onSave, testTelegram, relinkTelegram
}: SettingsNotifyProps) {
  const notifyPriority = settings.NOTIFY_PRIORITY || 'TELEGRAM';

  const toggleAction = (key: string) => {
    setSettings({ ...settings, [key]: !settings[key] });
  };

  const weekDays = [
    { id: 'MON', label: 'จ' },
    { id: 'TUE', label: 'อ' },
    { id: 'WED', label: 'พ' },
    { id: 'THU', label: 'พฤ' },
    { id: 'FRI', label: 'ศ' },
    { id: 'SAT', label: 'ส' },
    { id: 'SUN', label: 'อา' },
  ];

  const currentRptDays: string[] = (settings.RPT_DAYS || '').split(',').filter(Boolean);

  const toggleDay = (dayId: string) => {
    let nextDays;
    if (currentRptDays.includes(dayId)) {
      nextDays = currentRptDays.filter((d: string) => d !== dayId);
    } else {
      nextDays = [...currentRptDays, dayId];
    }
    setSettings({ ...settings, RPT_DAYS: nextDays.join(',') });
  };

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto font-bold space-y-6 pb-32 text-left">
      {/* Platform Selector Compact */}
      <div className="flex bg-slate-100/50 p-1.5 rounded-2xl border border-slate-200 shadow-inner mb-4">
         {[
           { id: 'LINE', label: 'LINE Notify', icon: 'chat' },
           { id: 'TELEGRAM', label: 'Telegram Bot', icon: 'send' }
         ].map(mode => (
           <button 
             key={mode.id}
             onClick={() => setSettings({...settings, NOTIFY_PRIORITY: mode.id})}
             className={`flex-1 py-3.5 rounded-xl text-[13px] font-black tracking-tight transition-all duration-300 flex items-center justify-center gap-2 ${
               notifyPriority === mode.id ? 'bg-white text-primary shadow-sm scale-100' : 'text-slate-400 hover:text-slate-600'
             }`}
           >
             <span className="material-symbols-outlined text-[18px]">{mode.icon}</span>
             {mode.label}
           </button>
         ))}
      </div>

      <div className="space-y-6">
        {notifyPriority === 'TELEGRAM' ? (
          <div className="bg-white p-7 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">BOT TOKEN</label>
                    <input title="Bot Token" value={settings.TG_BOT_TOKEN || ''} onChange={e => setSettings({...settings, TG_BOT_TOKEN: e.target.value})} className="w-full bg-slate-50/50 border border-slate-100 h-14 rounded-2xl px-5 font-black text-slate-700 focus:bg-white focus:ring-0 transition-all text-[14px]" placeholder="Bot Token" />
                </div>
                <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">CHAT ID</label>
                    <input title="Chat ID" value={settings.TG_CHAT_ID || ''} onChange={e => setSettings({...settings, TG_CHAT_ID: e.target.value})} className="w-full bg-slate-50/50 border border-slate-100 h-14 rounded-2xl px-5 font-black text-slate-700 focus:bg-white focus:ring-0 transition-all text-[14px]" placeholder="-100xxxx" />
                </div>
             </div>

             <div className="grid grid-cols-2 gap-4">
                <button onClick={async () => { try { setLoading(true); const r = await testTelegram(); showSuccess(r.message); } catch(e:any){setError(e.message)} finally {setLoading(false)} }} className="h-12 bg-blue-50 text-blue-600 rounded-xl text-[12px] font-black uppercase flex items-center justify-center gap-2 hover:bg-blue-100 transition-all active:scale-95">
                   <span className="material-symbols-outlined text-[20px]">send_and_archive</span> ทดลองส่ง
                </button>
                <button onClick={async () => { const n = window.prompt("API URL:", API_URL); if(n) { try { setLoading(true); const r = await relinkTelegram(n); showSuccess(r.message); } catch(e:any){setError(e.message)} finally {setLoading(false)} } }} className="h-12 bg-slate-50 text-slate-400 rounded-xl text-[12px] font-black uppercase flex items-center justify-center gap-2 hover:bg-slate-100 transition-all active:scale-95">
                   <span className="material-symbols-outlined text-[20px]">link</span> อัปเดตลิงก์
                </button>
             </div>

             <div className="grid grid-cols-4 gap-2.5 pt-4 border-t border-slate-50">
                {[
                    { id: 'NOTIFY_RECEIVE', label: 'รับเข้า', icon: 'login' },
                    { id: 'NOTIFY_ISSUE', label: 'เบิกออก', icon: 'logout' },
                    { id: 'NOTIFY_VOID', label: 'ยกเลิก', icon: 'cancel' },
                    { id: 'NOTIFY_REPORT', label: 'รายงาน', icon: 'description' },
                ].map(action => (
                    <button key={action.id} onClick={() => toggleAction(action.id)} className={`flex flex-col items-center justify-center gap-1.5 h-16 rounded-2xl transition-all border ${settings[action.id] ? 'bg-primary border-primary text-white shadow-sm' : 'bg-slate-50 border-slate-100 text-slate-300 hover:bg-slate-100'}`}>
                        <span className="material-symbols-outlined text-[20px]">{action.icon}</span>
                        <span className="text-[10px] font-black uppercase">{action.label}</span>
                    </button>
                ))}
             </div>
          </div>
        ) : (
          <div className="bg-white p-7 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">LINE NOTIFY TOKENS</span>
                <button onClick={() => setTokens([...tokens, ''])} className="text-emerald-600 text-[10px] font-black uppercase bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100">+ เพิ่มโทเค็น</button>
              </div>
              <div className="space-y-3">
                {tokens.map((t, i) => (
                  <div key={i} className="flex gap-2 group">
                    <input title="Line Token" value={t} onChange={e => { const nt = [...tokens]; nt[i] = e.target.value; setTokens(nt); }} className="flex-1 bg-slate-50 border border-slate-100 h-12 rounded-xl px-4 font-bold text-slate-700 font-mono text-[13px] focus:bg-white transition-all shadow-inner" placeholder="Line Token Key..." />
                    {tokens.length > 1 && <button onClick={() => setTokens(tokens.filter((_, idx) => idx !== i))} className="h-12 w-12 rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center"><span className="material-symbols-outlined text-[18px]">delete</span></button>}
                  </div>
                ))}
              </div>
          </div>
        )}

        <div className="bg-blue-50/50 p-6 rounded-[2.5rem] border border-blue-100/50 flex items-center justify-between gap-4 shadow-sm">
           <div className="flex gap-4 items-center">
              <button 
                title="Toggle Low Stock Notify"
                onClick={() => setSettings({...settings, ENABLE_LOW_STOCK_NOTIFY: !settings.ENABLE_LOW_STOCK_NOTIFY})} 
                className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${settings.ENABLE_LOW_STOCK_NOTIFY ? 'bg-primary text-white shadow-sm' : 'bg-white text-slate-300 border border-slate-100'}`}>
                  <span className="material-symbols-outlined text-[22px]">{settings.ENABLE_LOW_STOCK_NOTIFY ? 'notifications_active' : 'notifications_off'}</span>
              </button>
              <div>
                <h3 className="text-[15px] font-black text-slate-800 leading-tight">เตือนสต็อกใกล้หมด</h3>
                <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mt-1">Low Stock Alert System</p>
              </div>
           </div>
           
           <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-slate-100 shadow-sm">
              <span className="text-[10px] font-black text-slate-300 uppercase ml-2 tracking-tighter">ต่ำกว่า ≤</span>
              <input title="Threshold" type="number" value={settings.LOW_STOCK_THRESHOLD || 3} onChange={e => setSettings({...settings, LOW_STOCK_THRESHOLD: parseInt(e.target.value) || 0})} className="w-12 h-9 bg-slate-50 border-none rounded-lg text-center font-black text-primary text-[15px] focus:ring-0" />
           </div>
        </div>

        <div className="bg-white p-7 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                  <div className="w-11 h-11 bg-orange-50 text-orange-500 rounded-2xl flex items-center justify-center shadow-inner">
                      <span className="material-symbols-outlined text-[24px]">analytics</span>
                  </div>
                  <div>
                    <h3 className="text-[15px] font-black text-slate-800 leading-tight">ส่งรายงานสรุปประจำวัน</h3>
                    <p className="text-[10px] text-orange-400 font-bold uppercase tracking-widest mt-0.5">Automated Daily Reports</p>
                  </div>
              </div>
              <button 
                  title="Toggle Daily Report"
                  onClick={() => setSettings({...settings, ENABLE_DAILY_REPORT: !settings.ENABLE_DAILY_REPORT})}
                  className={`w-12 h-6.5 rounded-full relative transition-all duration-300 ${settings.ENABLE_DAILY_REPORT ? 'bg-primary' : 'bg-slate-200'}`}
              >
                  <div className={`absolute top-0.5 w-5.5 h-5.5 bg-white rounded-full transition-all duration-300 ${settings.ENABLE_DAILY_REPORT ? 'left-6' : 'left-0.5 shadow-sm'}`}></div>
              </button>
          </div>

          {settings.ENABLE_DAILY_REPORT && (
              <div className="space-y-6 bg-slate-50/30 p-5 rounded-[2rem] border border-slate-50">
                  <div className="space-y-3">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 flex justify-between items-center">
                        กำหนดส่งแจ้งเตือนตามวัน:
                        <span className="text-[9px] text-primary font-black uppercase tracking-widest">{currentRptDays.length} วันขนะนี้</span>
                      </label>
                      <div className="flex justify-between items-center gap-2 p-1.5 bg-white rounded-2xl border border-slate-100 shadow-inner">
                          {weekDays.map((d: any) => (
                              <button 
                                key={d.id} 
                                onClick={() => toggleDay(d.id)}
                                className={`flex-1 h-10 rounded-xl text-[12px] font-black transition-all ${currentRptDays.includes(d.id) ? 'bg-primary text-white shadow-sm' : 'text-slate-300 hover:bg-slate-50'}`}
                              >
                                {d.label}
                              </button>
                          ))}
                      </div>
                  </div>

                  <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 block mb-1">เวลาส่งรายงาน:</label>
                        <p className="text-[10px] text-slate-300 font-bold uppercase tracking-tight ml-1 leading-tight">ระบบจะประมวลสรุปในช่วงเวลาที่คุณตั้งค่า</p>
                      </div>
                      <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm">
                           <input title="Hour" type="number" placeholder="00" value={settings.RPT_DAILY_TIME_H || ''} onChange={e => setSettings({...settings, RPT_DAILY_TIME_H: e.target.value})} className="w-12 h-10 bg-slate-50 border-none rounded-xl text-center font-black text-slate-700 text-[16px] focus:ring-0" />
                           <span className="text-slate-200 font-black text-xl">:</span>
                           <input title="Minute" type="number" placeholder="00" value={settings.RPT_DAILY_TIME_M || ''} onChange={e => setSettings({...settings, RPT_DAILY_TIME_M: e.target.value})} className="w-12 h-10 bg-slate-50 border-none rounded-xl text-center font-black text-slate-700 text-[16px] focus:ring-0" />
                      </div>
                  </div>

                  <div className="grid grid-cols-2 gap-y-3.5 gap-x-4 pt-4 border-t border-slate-100">
                      {[
                          { id: 'RPT_ISSUE', label: 'ยอดเบิกออก' },
                          { id: 'RPT_RECEIVE', label: 'ยอดรับเข้า' },
                          { id: 'RPT_VOID', label: 'ยอดคืนคลัง (ยกเลิก)', color: 'text-rose-500' },
                          { id: 'RPT_LOW_STOCK', label: 'ยอดคงเหลือต่ำ' },
                          { id: 'RPT_ALL', label: 'ยอดคงเหลือทั้งหมด', isBold: true },
                      ].map(rpt => (
                          <button key={rpt.id} onClick={() => toggleAction(rpt.id)} className="flex items-center gap-3 group cursor-pointer w-full text-left">
                              <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${settings[rpt.id] ? 'bg-primary border-primary text-white shadow-sm' : 'bg-white border-slate-200 text-transparent'}`}>
                                  <span className="material-symbols-outlined text-[14px] font-black">check</span>
                              </div>
                              <span className={`text-[14px] leading-tight ${rpt.isBold ? 'font-black text-slate-800' : 'font-bold text-slate-500'} ${rpt.color ? rpt.color : ''} group-hover:text-primary transition-colors tracking-tight`}>
                                  {rpt.label}
                              </span>
                          </button>
                      ))}
                  </div>
              </div>
          )}
        </div>
      </div>

      <div className="pt-6">
        <button 
          onClick={onSave} 
          disabled={loading} 
          className="w-full h-16 bg-primary text-white rounded-[2.2rem] shadow shadow-primary/30 font-black flex items-center justify-center gap-3 active:scale-95 hover:bg-primary transition-all text-[15px] uppercase tracking-widest disabled:opacity-50"
        >
          {loading ? (
            <div className="w-6 h-6 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
          ) : (
            <>
              <span className="material-symbols-outlined text-[24px]">save</span>
              บันทึกการตั้งค่าทั้งหมด
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default React.memo(SettingsNotify);
