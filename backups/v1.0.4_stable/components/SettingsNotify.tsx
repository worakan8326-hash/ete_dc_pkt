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
    <div className="p-3 md:p-6 max-w-2xl mx-auto font-bold animate-fade-in space-y-3 pb-24">
      {/* Platform Selector Compact */}
      <div className="flex bg-slate-50 p-1 rounded-2xl border border-slate-100 shadow-inner mb-4">
         {[
           { id: 'LINE', label: 'LINE Notify' },
           { id: 'TELEGRAM', label: 'Telegram (แนะนำ)' }
         ].map(mode => (
           <button 
             key={mode.id}
             onClick={() => setSettings({...settings, NOTIFY_PRIORITY: mode.id})}
             className={`flex-1 py-2 rounded-xl text-[12px] font-black tracking-tight transition-all duration-300 ${
               notifyPriority === mode.id ? 'bg-white text-primary shadow-sm' : 'text-secondary/30 hover:text-secondary'
             }`}
           >
             {mode.label}
           </button>
         ))}
      </div>

      {/* Config Panel Content Container */}
      <div className="space-y-3">
        {notifyPriority === 'TELEGRAM' ? (
          <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/20 space-y-4">
             <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                    <label className="text-[10px] font-black text-secondary/40 uppercase tracking-widest ml-1">BOT TOKEN</label>
                    <input value={settings.TG_BOT_TOKEN || ''} onChange={e => setSettings({...settings, TG_BOT_TOKEN: e.target.value})} className="w-full bg-slate-50/50 border border-slate-100 h-10 rounded-xl px-4 font-bold text-secondary focus:bg-white focus:border-primary/20 transition-all text-[13px]" placeholder="Bot Token" title="TG Token" />
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-black text-secondary/40 uppercase tracking-widest ml-1">CHAT ID</label>
                    <input value={settings.TG_CHAT_ID || ''} onChange={e => setSettings({...settings, TG_CHAT_ID: e.target.value})} className="w-full bg-slate-50/50 border border-slate-100 h-10 rounded-xl px-4 font-bold text-secondary focus:bg-white focus:border-primary/20 transition-all text-[13px]" placeholder="-100xxxx" title="TG Chat ID" />
                </div>
             </div>

             <div className="grid grid-cols-2 gap-2 pt-1 pb-1">
                <button onClick={async () => { try { setLoading(true); const r = await testTelegram(); showSuccess(r.message); } catch(e:any){setError(e.message)} finally {setLoading(false)} }} className="h-9 bg-blue-50 text-blue-600 rounded-xl text-[11px] font-black uppercase flex items-center justify-center gap-2 hover:bg-blue-100 border border-blue-100/30">
                   <span className="material-symbols-outlined text-[16px]">send</span> ทดลองส่ง
                </button>
                <button onClick={async () => { const n = window.prompt("API URL:", API_URL); if(n) { try { setLoading(true); const r = await relinkTelegram(n); showSuccess(r.message); } catch(e:any){setError(e.message)} finally {setLoading(false)} } }} className="h-9 bg-slate-50 text-secondary/60 rounded-xl text-[11px] font-black uppercase flex items-center justify-center gap-2 hover:bg-slate-100 border border-slate-200/30">
                   <span className="material-symbols-outlined text-[16px]">link</span> อัปเดตลิงก์
                </button>
             </div>

             <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-50">
                {[
                    { id: 'NOTIFY_RECEIVE', label: 'รับเข้า', icon: 'login' },
                    { id: 'NOTIFY_ISSUE', label: 'เบิกออก', icon: 'logout' },
                    { id: 'NOTIFY_VOID', label: 'ยกเลิก', icon: 'cancel' },
                    { id: 'NOTIFY_REPORT', label: 'รายงาน', icon: 'description' },
                ].map(action => (
                    <button key={action.id} onClick={() => toggleAction(action.id)} className={`flex flex-col items-center justify-center gap-1.5 h-16 rounded-xl transition-all ${settings[action.id] ? 'bg-primary text-white shadow-md' : 'bg-slate-50 text-secondary/30 hover:bg-slate-100'}`}>
                        <span className="material-symbols-outlined text-[18px]">{action.icon}</span>
                        <span className="text-[10px] font-black uppercase">{action.label}</span>
                    </button>
                ))}
             </div>
          </div>
        ) : (
          <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/20 space-y-3">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-black text-secondary/40 uppercase tracking-widest ml-1">LINE TOKENS</span>
                <button onClick={() => setTokens([...tokens, ''])} className="text-emerald-500 text-[10px] font-black uppercase bg-emerald-50 px-3 py-1 rounded-lg">+ เพิ่ม</button>
              </div>
              <div className="space-y-2">
                {tokens.map((t, i) => (
                  <div key={i} className="flex gap-2">
                    <input value={t} onChange={e => { const nt = [...tokens]; nt[i] = e.target.value; setTokens(nt); }} className="flex-1 bg-slate-50 border border-slate-100 h-10 rounded-xl px-4 font-bold text-secondary font-mono text-[12px]" placeholder="Token" title={`Token ${i+1}`} />
                    {tokens.length > 1 && <button onClick={() => setTokens(tokens.filter((_, idx) => idx !== i))} className="h-10 w-10 rounded-xl bg-red-50 text-red-500 font-bold text-sm">×</button>}
                  </div>
                ))}
              </div>
          </div>
        )}

        {/* Low Stock Threshold Compact */}
        <div className="bg-blue-50/30 p-4 rounded-[2rem] border border-blue-100/50 flex items-center justify-between gap-4">
           <div className="flex gap-3 items-center">
              <button onClick={() => setSettings({...settings, ENABLE_LOW_STOCK_NOTIFY: !settings.ENABLE_LOW_STOCK_NOTIFY})} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${settings.ENABLE_LOW_STOCK_NOTIFY ? 'bg-primary text-white shadow-md' : 'bg-white text-slate-300 border border-slate-100'}`} title="Stock Notify">
                  <span className="material-symbols-outlined text-[18px]">{settings.ENABLE_LOW_STOCK_NOTIFY ? 'check_circle' : 'circle'}</span>
              </button>
              <h3 className="text-[13px] font-black text-secondary">เตือนสต็อกใกล้หมด</h3>
           </div>
           
           <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-100">
              <span className="text-[9px] font-black text-secondary/30 uppercase ml-2 leading-none">คงเหลือ ≤</span>
              <input type="number" value={settings.LOW_STOCK_THRESHOLD || 3} onChange={e => setSettings({...settings, LOW_STOCK_THRESHOLD: parseInt(e.target.value) || 0})} className="w-10 h-8 bg-slate-50 border-none rounded-lg text-center font-black text-primary text-[14px] focus:ring-0" title="Threshold" />
           </div>
        </div>

        {/* Daily Report Config Panel - Multi-Day Selection */}
        <div className="bg-white p-5 md:p-6 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/20 space-y-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-orange-50 text-orange-500 rounded-xl flex items-center justify-center">
                      <span className="material-symbols-outlined text-[18px]">folder_open</span>
                  </div>
                  <h3 className="text-[14px] font-black text-secondary tracking-tight">รายงานประจำวัน</h3>
              </div>
              <button 
                  onClick={() => setSettings({...settings, ENABLE_DAILY_REPORT: !settings.ENABLE_DAILY_REPORT})}
                  className={`w-12 h-6.5 rounded-full relative transition-all duration-300 ${settings.ENABLE_DAILY_REPORT ? 'bg-primary' : 'bg-slate-200'}`}
                  title="Daily Toggle"
              >
                  <div className={`absolute top-0.5 w-5.5 h-5.5 bg-white rounded-full transition-all duration-300 ${settings.ENABLE_DAILY_REPORT ? 'left-6' : 'left-0.5'}`}></div>
              </button>
          </div>

          {settings.ENABLE_DAILY_REPORT && (
              <div className="space-y-5 animate-slide-up">
                  <div className="space-y-2">
                      <label className="text-[11px] font-black text-primary uppercase ml-1 flex justify-between items-center">
                        เลือกส่งตามวัน:
                        <span className="text-[9px] text-secondary/30 font-bold uppercase tracking-widest">{currentRptDays.length} วันขนะนี้</span>
                      </label>
                      <div className="flex justify-between items-center gap-1.5 p-1 bg-slate-50/50 rounded-2xl border border-slate-100">
                          {weekDays.map((d: any) => (
                              <button 
                                key={d.id} 
                                onClick={() => toggleDay(d.id)}
                                className={`flex-1 h-9 rounded-xl text-[12px] font-black transition-all ${currentRptDays.includes(d.id) ? 'bg-primary text-white shadow-md' : 'bg-white text-secondary/30 hover:bg-slate-100'}`}
                              >
                                {d.label}
                              </button>
                          ))}
                      </div>
                  </div>

                  <div className="flex items-center gap-4 bg-slate-50/50 p-3 rounded-2xl border border-slate-50">
                      <div className="flex-1">
                        <label className="text-[11px] font-black text-primary uppercase ml-1 block mb-1">เวลาส่งมอบ (24 ชม.):</label>
                        <p className="text-[9px] text-secondary/30 font-bold uppercase tracking-tight ml-1">ระบบจะส่งรายงานอัตโนมัติ</p>
                      </div>
                      <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-100">
                           <input type="number" placeholder="00" value={settings.RPT_DAILY_TIME_H || ''} onChange={e => setSettings({...settings, RPT_DAILY_TIME_H: e.target.value})} className="w-10 h-8 bg-slate-50 border-none rounded-lg text-center font-black text-secondary text-[14px] focus:bg-slate-100" title="Hour" />
                           <span className="text-secondary/20 font-black">:</span>
                           <input type="number" placeholder="00" value={settings.RPT_DAILY_TIME_M || ''} onChange={e => setSettings({...settings, RPT_DAILY_TIME_M: e.target.value})} className="w-10 h-8 bg-slate-50 border-none rounded-lg text-center font-black text-secondary text-[14px] focus:bg-slate-100" title="Minute" />
                      </div>
                  </div>

                  <div className="grid grid-cols-2 gap-y-2 gap-x-3 pt-2">
                      {[
                          { id: 'RPT_ISSUE', label: 'ยอดเบิกออก' },
                          { id: 'RPT_RECEIVE', label: 'ยอดรับเข้า' },
                          { id: 'RPT_VOID', label: 'ยอดคืนคลัง (ยกเลิก)', color: 'text-red-500' },
                          { id: 'RPT_LOW_STOCK', label: 'ยอดคงเหลือต่ำ' },
                          { id: 'RPT_ALL', label: 'ยอดคงเหลือทั้งหมด', isBold: true },
                      ].map(rpt => (
                          <button key={rpt.id} onClick={() => toggleAction(rpt.id)} className="flex items-center gap-3 group cursor-pointer w-full text-left">
                              <div className={`w-4.5 h-4.5 rounded-md border-2 flex items-center justify-center transition-all ${settings[rpt.id] ? 'bg-primary border-primary text-white' : 'border-slate-200 text-transparent'}`}>
                                  <span className="material-symbols-outlined text-[12px] font-black">check</span>
                              </div>
                              <span className={`text-[13px] leading-tight ${rpt.isBold ? 'font-black text-secondary' : 'font-bold text-secondary/60'} ${rpt.color ? rpt.color : ''} group-hover:text-primary transition-colors`}>
                                  {rpt.label}
                              </span>
                          </button>
                      ))}
                  </div>
              </div>
          )}
        </div>
      </div>

      {/* Global Save Button - Ultra Compact */}
      <div className="fixed bottom-6 left-0 right-0 px-8 z-50 pointer-events-none">
        <button 
            onClick={onSave} 
            disabled={loading} 
            className="w-full max-w-[280px] mx-auto h-11 bg-primary text-white rounded-full shadow-xl shadow-primary/30 font-black uppercase text-[12px] tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2 pointer-events-auto disabled:opacity-50"
        >
            {loading ? (
                <div className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full"></div>
            ) : (
                <>
                    <span className="material-symbols-outlined text-[18px]">cloud_upload</span>
                    บันทึกการตั้งค่า
                </>
            )}
        </button>
      </div>
    </div>
  );
}

export default React.memo(SettingsNotify);
