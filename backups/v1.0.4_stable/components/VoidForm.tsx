import { useState, useMemo } from 'react';
import { cancelTransaction } from '../api';
import type { Transaction, User } from '../types';
import ConfirmationModal from './ConfirmationModal';

interface Props {
  transactions: Transaction[];
  user: User;
  customers?: any[];
  onRefresh?: () => void;
  onUpdateTransactions?: (updated: Transaction[]) => void;
}

export default function VoidForm({ transactions, user, customers = [], onRefresh, onUpdateTransactions }: Props) {
  const [txnNo, setTxnNo] = useState('');
  const [loading, setLoading] = useState(false);
  const [targetGroup, setTargetGroup] = useState<Transaction[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const isStaff = useMemo(() => {
    const role = (user.role || '').toLowerCase();
    return role.includes('staff') || role.includes('เจ้าหน้าที่') || role.toLowerCase() === 'user';
  }, [user.role]);

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setTargetGroup(null);

    const term = txnNo.trim();
    if (!term) return;

    let matches = transactions.filter(tx => 
       String(tx['เลขที่รายการ']).trim() === term ||
       parseInt(String(tx['เลขที่รายการ']), 10) === parseInt(term, 10)
    );

    // RULE: Staff can only search for THEIR OWN transactions
    if (isStaff) {
      matches = matches.filter(tx => tx['ผู้ทำรายการ'] === user.name);
    }

    if (matches.length === 0) {
      const msg = isStaff 
        ? `ไม่พบรายการเลขที่ "${term}" หรือคุณไม่มีสิทธิ์ลบรายการของผู้อื่นครับ` 
        : `ไม่พบรายการเลขที่ "${term}" ในฐานข้อมูลครับ`;
      setError(msg);
      return;
    }

    setTargetGroup(matches);
  };

  const handleVoid = async () => {
    if (!txnNo || !targetGroup) return;
    setLoading(true);
    setError(null);
    try {
      const res = await cancelTransaction(txnNo, user.name, voidReason);
      
      // OPTIMISTIC UPDATE: Update local state immediately
      if (onUpdateTransactions && targetGroup) {
        const updated = targetGroup.map(tx => ({
          ...tx,
          'สถานะ': `ยกเลิกแล้ว (${voidReason})`,
          'ยกเลิกโดย': user.name,
          'เหตุผลการยกเลิก': voidReason
        }));
        onUpdateTransactions(updated);
      }
      
      if (onRefresh) onRefresh(); // Still trigger background sync
      
      setSuccessMsg(res.message || 'ยกเลิกรายการสำเร็จแล้ว');
      setTargetGroup(null);
      setTxnNo('');
      setIsModalOpen(false);
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการยกเลิกรายการ');
      setIsModalOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const isAlreadyVoided = targetGroup?.every(tx => String(tx['สถานะ'] || '').includes('ยกเลิก'));
  
  const matchedTargetCustomer = useMemo(() => {
    if (!targetGroup || !targetGroup[0] || !customers.length) return null;
    const targetCv = String(targetGroup[0].CV || '').trim();
    if (!targetCv) return null;
    return customers.find(c => String(c.cv || c.CV || '').trim() === targetCv);
  }, [targetGroup, customers]);

  // FIND RECENT 5 NON-VOIDED GROUPS
  const recentNonVoided = useMemo(() => {
    const groups = new Map<string, Transaction[]>();
    
    // Process in reverse to get newest first
    const sorted = [...transactions].sort((a,b) => {
        const da = new Date(a['วัน-เวลา']).getTime();
        const db = new Date(b['วัน-เวลา']).getTime();
        return db - da;
    });

    for (const tx of sorted) {
      const tNo = String(tx['เลขที่รายการ'] || '').trim();
      const status = String(tx['สถานะ'] || '').trim();
      const operator = String(tx['ผู้ทำรายการ'] || '').trim();
      
      if (!tNo || status.includes('ยกเลิก')) continue;

      // RULE: Staff can only see their OWN recent transactions
      if (isStaff && operator !== user.name) continue;
      
      if (!groups.has(tNo)) {
        if (groups.size >= 5) break; 
        groups.set(tNo, []);
      }
      groups.get(tNo)!.push(tx);
    }
    return Array.from(groups.values());
  }, [transactions, isStaff, user.name]);

  // Common UI Styles from TransactionForm
  const labelClass = "block text-sm font-medium text-outline mb-1.5 uppercase tracking-widest ml-2";
  const selectClass = "w-full bg-surface-container-low border-none rounded-2xl px-5 py-3.5 text-sm font-medium text-on-surface focus:ring-4 focus:ring-primary/10 transition-all outline-none appearance-none shadow-sm tracking-tight";

  if (successMsg) {
    return (
      <div className="max-w-xl mx-auto py-20 px-6 animate-fade-in text-center">
        <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner shadow-green-200">
          <span className="material-symbols-outlined text-5xl font-black">check_circle</span>
        </div>
        <h2 className="text-4xl font-black text-secondary mb-3 tracking-tighter uppercase">ยกเลิกสำเร็จแล้ว!</h2>
        <p className="text-outline mb-10 text-lg leading-relaxed font-black">
           ระบบได้บันทึกข้อมูลการยกเลิกเรียบร้อย <br/>
           และส่งแจ้งเตือน เรียบร้อยแล้วครับ
        </p>
        <button onClick={() => setSuccessMsg('')} className="px-12 py-4 bg-secondary text-white rounded-2xl font-black shadow-xl active:scale-95 transition-all text-lg uppercase">
          ดำเนินการต่อ
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-xl mx-auto font-black pb-24 md:pb-10 animate-fade-in">
        {!targetGroup ? (
            <div className="mt-2 bg-white rounded-2xl shadow-xl border border-outline-variant/10 overflow-hidden">
               {/* Header - EXACT SAME AS YELLOW HEADER but RED */}
               <div className="px-6 py-10 bg-gradient-to-r from-rose-600 to-red-700 text-white text-center shadow-lg relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                     <div className="grid grid-cols-6 gap-2 rotate-12 scale-150">
                        {[...Array(12)].map((_, i) => <div key={i} className="h-20 bg-white/20 rounded-full"></div>)}
                     </div>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-black tracking-tight mb-2 relative z-10">ระบบยกเลิกพัสดุอุปกรณ์</h2>
                  <div className="bg-white/20 backdrop-blur-md inline-block px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest relative z-10 border border-white/10 shadow-sm">
                     Operator: {user.name}
                  </div>
               </div>
  
               {/* Body - EXACT SAME AS SELECT BOX BODY */}
               <div className="p-6 space-y-8">
                  <div>
                     <label className={labelClass}>หมายเลขรายการ (#)</label>
                     <div className="relative">
                        <input 
                          type="text" 
                          title="ระบุเลขที่รายการ"
                          className={selectClass + " text-center text-2xl h-18 py-6"} 
                          value={txnNo} 
                          onChange={(e) => setTxnNo(e.target.value)}
                          onKeyPress={(e) => { if (e.key === 'Enter') handleSearch(); }}
                          placeholder="-- ใส่เลขที่รายการ (#) --" 
                        />
                     </div>
                  </div>
  
                  {error && <div className="text-rose-600 text-xs bg-rose-50 p-4 rounded-xl font-black animate-shake border border-rose-100">{error}</div>}
  
                  <button
                    onClick={() => handleSearch()}
                    disabled={loading}
                    className={`w-full py-4 rounded-2xl text-[14px] font-bold shadow-xl flex items-center justify-center transition-all duration-300 active:scale-95 ${
                      loading ? 'bg-slate-300/80 cursor-not-allowed text-white shadow-none' : 'bg-rose-600 text-white shadow-rose-200/50 hover:bg-rose-700'
                    }`}
                  >
                    {loading ? (
                      <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <div className="flex items-center justify-center gap-3">
                        <span className="material-symbols-outlined text-[20px]">travel_explore</span>
                        ค้นหาข้อมูลรายการ
                      </div>
                    )}
                  </button>
               </div>
  
               {/* RECENT TRANSACTIONS SHORTCUT */}
               {recentNonVoided.length > 0 && (
                  <div className="px-6 pb-8 animate-fade-in">
                     <div className="flex items-center gap-2 mb-3 px-1">
                        <span className="material-symbols-outlined text-[14px] text-rose-600 font-black">history</span>
                        <h3 className="text-sm font-black text-rose-800 uppercase tracking-widest">รายการล่าสุดที่ยังไม่ได้ยกเลิก</h3>
                     </div>
                     <div className="space-y-2">
                        {recentNonVoided.map((group) => {
                           const first = group[0];
                           const tNo = String(first['เลขที่รายการ']);
                           const totalQ = group.reduce((s, t) => s + Math.abs(parseFloat(String(t.จำนวน || 0))), 0);
                           return (
                              <div key={tNo} className="bg-surface-container-low/50 border border-outline-variant/10 rounded-2xl p-3 flex items-center justify-between group hover:bg-white transition-all shadow-sm">
                                 <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 mb-0.5">
                                       <span className="text-[14px] font-black text-secondary">#{tNo}</span>
                                       <span className="text-[10px] text-outline font-medium tracking-tighter opacity-70 flex items-center gap-1">
                                          <span className="material-symbols-outlined text-[12px]">schedule</span>
                                          {new Date(first['วัน-เวลา']).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} | {new Date(first['วัน-เวลา']).toLocaleDateString('th-TH')}
                                       </span>
                                    </div>
                                    <p className="text-[12px] font-medium text-secondary/70 truncate uppercase tracking-tight">
                                       {group.length} รายการ - {first.รายการ} {group.length > 1 ? '...' : ''}
                                    </p>
                                 </div>
                                 <div className="flex items-center gap-3 ml-4">
                                    <span className="text-sm font-black text-secondary shrink-0">{totalQ.toLocaleString()} ชิ้น</span>
                                    <button 
                                       onClick={() => { setTxnNo(tNo); setTimeout(() => handleSearch(), 50); }}
                                       className="h-8 px-4 bg-rose-100 text-rose-700 text-[11px] font-black rounded-xl hover:bg-rose-200 transition-all uppercase tracking-tight"
                                    >
                                       เลือก
                                    </button>
                                 </div>
                              </div>
                           );
                        })}
                     </div>
                  </div>
               )}
            </div>
        ) : (
          /* Result Screen - Also keeping it Clean */
           <div className="mt-2 bg-white rounded-2xl shadow-xl border border-outline-variant/10 overflow-hidden animate-slide-up">
              <div className="px-6 py-6 bg-gradient-to-r from-rose-700 to-red-800 text-white text-center shadow-lg relative">
                 <h2 className="text-xl font-black tracking-tighter mb-0.5 uppercase">ตรวจสอบรายการ #{txnNo}</h2>
                  <div className="text-[10px] font-black text-rose-100 opacity-60 uppercase tracking-widest flex flex-col gap-0.5">
                     <span>พนักงาน: {user.name}</span>
                     {targetGroup && targetGroup[0] && (
                        <span>วัน-เวลาเดิม: {new Date(targetGroup[0]['วัน-เวลา']).toLocaleTimeString('th-TH')} | {new Date(targetGroup[0]['วัน-เวลา']).toLocaleDateString('th-TH')}</span>
                     )}
                  </div>
                
                <button 
                   onClick={() => {setTargetGroup(null); setTxnNo(''); setError(null);}} 
                   className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full text-white transition-all active:scale-90 shadow-sm"
                >
                   <span className="material-symbols-outlined font-black">arrow_back</span>
                </button>
             </div>
  
              <div className="p-6 space-y-4">
                 {error && <div className="text-rose-600 text-xs bg-rose-50 p-4 rounded-xl font-black animate-shake border border-rose-100 mb-2">{error}</div>}
                 
                  <div className="space-y-3">
                    <p className="text-[12px] font-black text-outline uppercase tracking-widest px-2 opacity-50">ข้อมูลพัสดุในชุดรายการ ({targetGroup.length})</p>
                    <div className="space-y-2">
                       {targetGroup.map((item: any) => (
                         <div key={item.rowIndex} className={`p-4 rounded-[1.5rem] bg-white border border-secondary/5 shadow-sm flex justify-between items-center ${isAlreadyVoided ? 'opacity-40 grayscale' : ''}`}>
                            <div className="flex-1 min-w-0 pr-4">
                               <p className="text-[13px] font-bold text-secondary leading-relaxed tracking-tight">
                                  {[
                                    item.ประเภท,
                                    item['ยี่ห้อ/รูปแบบ'] || item['ยี่ห้อหรือรูปแบบ'] || item['ยี่ห้อ/รายการ'],
                                    item.รายการ,
                                    item.สภาพ,
                                    item.รายละเอียด,
                                    item.ขนาด
                                  ].map(s => String(s || '').trim()).filter(s => s && s !== '-').join(' | ')}
                               </p>
                            </div>
                            <div className={`text-xl font-black shrink-0 tracking-tighter ${item['สถานะ'] === 'รับเข้า' ? 'text-emerald-600' : 'text-rose-600'}`}>
                               {item['สถานะ'] === 'รับเข้า' ? '+' : '-'}{item.จำนวน} <span className="text-[10px] opacity-40">ชิ้น</span>
                            </div>
                         </div>
                       ))}
                    </div>

                    {matchedTargetCustomer && (
                       <div className="mt-4 bg-white rounded-[2rem] border border-secondary/5 shadow-md overflow-hidden animate-fade-in">
                          <div className="bg-slate-50 px-6 py-4 border-b border-secondary/5 flex justify-between items-center">
                             <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-secondary/60 text-[20px]">account_circle</span>
                                <span className="text-[14px] font-black text-secondary">{matchedTargetCustomer.name}</span>
                             </div>
                             {(matchedTargetCustomer.lat && matchedTargetCustomer.lng) && (
                                <button 
                                  onClick={() => window.open(`https://www.google.com/maps?q=${matchedTargetCustomer.lat},${matchedTargetCustomer.lng}`, '_blank')}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-xl text-[11px] font-black shadow-lg shadow-blue-200 active:scale-95 transition-all"
                                >
                                   <span className="material-symbols-outlined text-[16px]">map</span>
                                   เปิดแผนที่
                                </button>
                             )}
                          </div>
                          <div className="p-5 space-y-3">
                             <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-secondary/30 text-[18px]">call</span>
                                <span className="text-[13px] font-bold text-secondary/80">{matchedTargetCustomer.phone || '-'}</span>
                             </div>
                             <div className="flex items-start gap-3">
                                <span className="material-symbols-outlined text-secondary/30 text-[18px] mt-0.5">location_on</span>
                                <span className="text-[13px] font-bold text-secondary/80 leading-relaxed">
                                   {matchedTargetCustomer.address && `${matchedTargetCustomer.address} `}
                                   ต.{matchedTargetCustomer.subdistrict} อ.{matchedTargetCustomer.district} จ.{matchedTargetCustomer.province} {matchedTargetCustomer.zipcode}
                                </span>
                             </div>
                             {(matchedTargetCustomer.lat && matchedTargetCustomer.lng) && (
                                <div className="flex items-center gap-3 pt-1">
                                   <span className="material-symbols-outlined text-secondary/20 text-[18px]">explore</span>
                                   <span className="text-[11px] font-medium text-secondary/40 tracking-wider">พิกัด: {matchedTargetCustomer.lat}, {matchedTargetCustomer.lng}</span>
                                </div>
                             )}
                          </div>
                       </div>
                    )}
                    
                    {targetGroup[0] && (
                       <div className="mt-6 p-5 bg-secondary/5 rounded-[2rem] space-y-4 border border-secondary/5">
                          <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-1">
                                <p className="text-[10px] font-black text-secondary/30 uppercase tracking-widest">จัดส่งโดย / ผู้รับ</p>
                                <div className="flex items-center gap-2">
                                   <span className="material-symbols-outlined text-[18px] text-secondary/40">local_shipping</span>
                                   <p className="text-[13px] font-black text-secondary truncate">{targetGroup[0].จัดส่งโดย || '-'}</p>
                                </div>
                             </div>
                             <div className="space-y-1">
                                <p className="text-[10px] font-black text-secondary/30 uppercase tracking-widest">สถานที่ / เขต</p>
                                <div className="flex items-center gap-2">
                                   <span className="material-symbols-outlined text-[18px] text-secondary/40">location_on</span>
                                   <p className="text-[13px] font-black text-secondary truncate">{targetGroup[0].เขตการทำงาน || targetGroup[0].CV || '-'}</p>
                                </div>
                             </div>
                          </div>
                          
                          <div className="h-px bg-secondary/5 w-full"></div>
                          
                          <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-1">
                                <p className="text-[10px] font-black text-secondary/30 uppercase tracking-widest">กำหนดส่งพัสดุ</p>
                                <div className="flex items-center gap-2">
                                   <span className="material-symbols-outlined text-[18px] text-secondary/40">calendar_month</span>
                                   <p className="text-[13px] font-black text-secondary">
                                      {targetGroup[0].กำหนดส่ง 
                                         ? new Date(targetGroup[0].กำหนดส่ง).toLocaleDateString('th-TH', {day:'numeric', month:'short', year:'2-digit', hour:'2-digit', minute:'2-digit'})
                                         : '-'}
                                   </p>
                                </div>
                             </div>
                             <div className="space-y-1">
                                <p className="text-[10px] font-black text-secondary/30 uppercase tracking-widest">หมายเหตุเดิม</p>
                                <p className="text-[12px] font-medium text-secondary/60 truncate italic">"{targetGroup[0].หมายเหตุ || 'ไม่มีหมายเหตุ'}"</p>
                             </div>
                          </div>
                       </div>
                    )}

                 </div>
  
                {!isAlreadyVoided && (
                   <div className="space-y-6 pt-2">
                      <div>
                         <label className={labelClass}>ระบุเหตุผลการยกเลิก</label>
                          <textarea 
                            rows={3}
                            title="ระบุเหตุผลการยกเลิก"
                            value={voidReason}
                            onChange={(e) => setVoidReason(e.target.value)}
                            placeholder="เขียนเหตุผลประกอบการยกเลิก..."
                            className={selectClass + " resize-none text-sm py-3"} 
                          />
                      </div>
  
  
                      <div className="pt-2">
                         {(() => {
                           const firstTx = targetGroup[0];
                           const txTime = new Date(firstTx['วัน-เวลา']).getTime();
                           const diff = Date.now() - txTime;
                           const fifteenMins = 15 * 60 * 1000;
                           const isExpired = isStaff && !isNaN(txTime) && diff > fifteenMins;
  
                           if (isExpired) {
                             return (
                               <div className="bg-amber-50 border border-amber-200 p-6 rounded-2xl text-center space-y-3 text-amber-900 font-black">
                                  <span className="material-symbols-outlined text-amber-600 text-4xl">warning</span>
                                  <h3 className="text-xl">เกินกำหนด 15 นาที</h3>
                                  <p className="text-xs opacity-80 leading-relaxed font-black">สิทธิ์ Staff สามารถยกเลิกได้ภายใน 15 นาทีเท่านั้น<br/>กรุณาแจ้ง Administrator ให้ช่วยยกเลิกแทนครับ</p>
                               </div>
                             );
                           }
  
                           return (
                               <button 
                                 onClick={() => setIsModalOpen(true)}
                                 disabled={loading || !voidReason.trim()}
                                 className={`w-full py-5 rounded-3xl font-black shadow-xl active:scale-[0.98] transition-all flex items-center justify-center text-lg ${
                                   loading
                                     ? 'bg-slate-300/80 cursor-not-allowed shadow-none'
                                     : !voidReason.trim()
                                       ? 'bg-outline-variant cursor-not-allowed shadow-none text-white'
                                       : 'bg-rose-600 text-white hover:bg-rose-700 shadow-rose-200'
                                 }`}
                               >
                                {loading ? (
                                  <svg className="animate-spin h-7 w-7 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                ) : (
                                  <div className="flex items-center gap-3">
                                    <span className="material-symbols-outlined font-black">delete_forever</span>
                                    ยืนยันการยกเลิกรายการ
                                  </div>
                                )}
                              </button>
                           );
                         })()}
                      </div>
                   </div>
                )}
             </div>
          </div>
        )}
      </div>

      <ConfirmationModal 
        isOpen={isModalOpen}
        onClose={() => !loading && setIsModalOpen(false)}
        onConfirm={handleVoid}
        title="ยืนยันการยกเลิก"
        message="คุณกำลังจะยกเลิกรายการเลขที่"
        itemDisplay={txnNo}
        confirmText="ยืนยันยกเลิก"
        cancelText="กลับไปตรวจสอบ"
        isLoading={loading}
      />
    </>
  );
}
