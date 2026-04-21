import { useState, useMemo, useEffect } from 'react';
import type { Transaction, User, Customer } from '../types';

interface Props {
  transactions: Transaction[];
  user: User;
  customers: Customer[];
  onRefresh?: () => void;
}

export default function History({ transactions, user, customers, onRefresh }: Props) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [pageSize, setPageSize] = useState<number>(30);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [searchTerm, setSearchTerm] = useState('');

  const formatDate = (dateString: string) => {
    if (!dateString) return '- -';
    try {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return dateString;
      const day = d.getDate();
      const month = d.getMonth() + 1;
      const year = d.getFullYear() + 543;
      const hours = d.getHours().toString().padStart(2, '0');
      const minutes = d.getMinutes().toString().padStart(2, '0');
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    } catch { return dateString; }
  };

  const filteredTransactions = useMemo(() => {
    let baseTransactions = transactions;
    if (user.role.toLowerCase() === 'staff') {
      baseTransactions = transactions.filter(tx => tx['ผู้ทำรายการ'] === user.name);
    }
    const term = searchTerm.toLowerCase();
    if (!term) return baseTransactions;
    return baseTransactions.filter(tx =>
      Object.values(tx).some(v => String(v).toLowerCase().includes(term))
    );
  }, [transactions, searchTerm, user.role, user.name]);

  const groupedTransactions = useMemo(() => {
    if (!filteredTransactions.length) return [];
    
    const sorted = [...filteredTransactions]
      .sort((a, b) => new Date(b['วัน-เวลา']).getTime() - new Date(a['วัน-เวลา']).getTime());

    const groupsList: Transaction[][] = [];
    const groupsMap = new Map<string, number>();
    let noTxnCounter = 0;

    sorted.forEach(tx => {
      let txnNo = String(tx['เลขที่รายการ'] || '').trim();
      if (!txnNo) txnNo = `NO_TXN_${noTxnCounter++}`;
      
      const existingIdx = groupsMap.get(txnNo);
      if (existingIdx !== undefined) {
        groupsList[existingIdx].push(tx);
      } else {
        groupsMap.set(txnNo, groupsList.length);
        groupsList.push([tx]);
      }
    });

    return groupsList;
  }, [filteredTransactions]);

  const totalPages = Math.max(1, Math.ceil(groupedTransactions.length / pageSize));
  const paginatedGroups = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return groupedTransactions.slice(start, start + pageSize);
  }, [groupedTransactions, currentPage, pageSize]);

  const toggleGroup = (txnNo: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(txnNo)) next.delete(txnNo);
      else next.add(txnNo);
      return next;
    });
  };

  if (transactions.length === 0) {
    return (
      <div className="text-center py-20 px-4">
        <p className="text-slate-300 font-bold uppercase tracking-widest text-xs">ยังไม่มีประวัติรายการ</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-28 px-2 max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pt-4 px-1">
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">ประวัติรายการ</h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Transaction History</p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-[18px]">search</span>
            <input
              type="text"
              placeholder="ค้นหา..."
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full pl-9 pr-4 h-10 bg-slate-50 border border-slate-200 rounded-lg text-[13px] font-medium outline-none focus:border-slate-300 transition-colors"
            />
          </div>
          <button onClick={() => onRefresh?.()} className="w-10 h-10 flex items-center justify-center bg-slate-100 text-slate-500 rounded-lg active:scale-95 transition-all">
             <span className="material-symbols-outlined text-[20px]">refresh</span>
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {paginatedGroups.map((group, groupIdx) => {
          const firstTx = group[0];
          const txnNo = firstTx['เลขที่รายการ'] || `TXN-${groupIdx}`;
          const status = String(firstTx['สถานะ'] || '');
          const isReceive = status === 'รับเข้า';
          const isCancelled = status.includes('ยกเลิก');
          const isExpanded = expandedGroups.has(String(txnNo));
          const totalQty = group.reduce((sum, tx) => sum + Math.abs(parseFloat(String(tx.จำนวน || 0))), 0);
          const dateParts = formatDate(String(firstTx['วัน-เวลา'] || '')).split(' ');

          return (
            <div key={txnNo} className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                <div 
                  onClick={() => toggleGroup(String(txnNo))}
                  className={`p-4 flex items-center justify-between gap-4 active:bg-slate-50 transition-colors cursor-pointer ${isExpanded ? 'bg-slate-50/50' : ''}`}
                >
                   <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[12px] font-bold text-slate-900 uppercase tracking-tight">#{txnNo}</span>
                        <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded ${
                          isCancelled ? 'bg-rose-50 text-rose-600' : isReceive ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                        }`}>{status}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                        <span className="flex items-center gap-1">{dateParts[0]}</span>
                        <span className="flex items-center gap-1 text-slate-300">•</span>
                        <span className="flex items-center gap-1">{dateParts[1]}</span>
                      </div>
                   </div>
                   
                   <div className="flex flex-col items-end shrink-0">
                      <p className={`text-lg font-bold tracking-tight ${isReceive ? 'text-emerald-600' : 'text-slate-900'}`}>
                        {isReceive ? '+' : '-'}{totalQty.toLocaleString()}
                      </p>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-[-2px]">รวม {group.length} รายการ</span>
                   </div>
                </div>

                {isExpanded && (
                  <div className="bg-slate-50/50 border-t border-slate-100 p-4 space-y-4">
                    <div className="space-y-2">
                       {group.map((tx, idx) => (
                          <div key={idx} className="flex justify-between items-start gap-4 text-[12px] pb-2 border-b border-white last:border-0 last:pb-0">
                             <p className="font-medium text-slate-600 flex-1 leading-relaxed">
                                {[tx.ประเภท, tx.รายการ, tx.รายละเอียด].filter(Boolean).join(' • ')}
                             </p>
                             <p className="font-bold text-slate-900 whitespace-nowrap bg-white px-2 py-0.5 rounded border border-slate-100">{tx.จำนวน} ชิ้น</p>
                          </div>
                       ))}
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-3 pt-3 border-t border-slate-100">
                        <div className="space-y-0.5">
                           <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">ผู้ทำรายการ</p>
                           <p className="text-[12px] font-bold text-slate-700 truncate">{firstTx['ผู้ทำรายการ'] || '-'}</p>
                        </div>
                        <div className="space-y-0.5 text-right">
                           <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">สถานที่ / CV</p>
                           <p className="text-[12px] font-bold text-slate-700 truncate">{firstTx.เขตการทำงาน || firstTx.CV || '-'}</p>
                        </div>
                        <div className="space-y-0.5 col-span-2">
                           <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">ข้อมูลการจัดส่ง</p>
                           <p className="text-[12px] font-bold text-slate-700">{firstTx.จัดส่งโดย || '-'} ({formatDate(firstTx.กำหนดส่ง || firstTx['วัน-เวลา']).split(' ')[0]})</p>
                        </div>
                        {isCancelled && (
                          <div className="space-y-1 col-span-2 bg-rose-50 p-3 rounded-lg border border-rose-100">
                             <p className="text-[9px] font-bold text-rose-400 uppercase tracking-widest">สาเหตุการยกเลิก</p>
                             <p className="text-[12px] font-bold text-rose-700 leading-relaxed">{firstTx.เหตุผลการยกเลิก || 'ไม่ระบุ'}</p>
                             <p className="text-[10px] text-rose-400 italic">ยกเลิกโดย: {firstTx['ยกเลิกโดย'] || 'N/A'}</p>
                          </div>
                        )}
                    </div>

                    {/* Customer Info Section */}
                    {(() => {
                      const allValues = group.flatMap(tx => Object.values(tx)).map(v => String(v || '').replace(/^[']*/, '').trim().toLowerCase()).filter(Boolean);
                      const finalCust = customers.find(c => {
                         const cleanCV = String(c.cv || '').replace(/^[']*/, '').trim().toLowerCase();
                         const cleanName = String(c.name || '').trim().toLowerCase();
                         return allValues.some(val => (cleanCV && val === cleanCV) || (cleanName && val === cleanName));
                      });

                      if (!finalCust) return null;

                      return (
                        <div className="bg-white p-4 rounded-xl border border-slate-100 space-y-2 shadow-sm">
                           <div className="flex items-center justify-between border-b border-slate-50 pb-2 mb-1">
                              <span className="text-[13px] font-bold text-slate-900">{finalCust.name}</span>
                              <span className="text-[9px] font-bold text-primary uppercase tracking-[0.2em] bg-primary/5 px-2 py-0.5 rounded">CUSTOMER</span>
                           </div>
                           <p className="text-[11px] text-slate-500 leading-relaxed">
                              {finalCust.address} {finalCust.subdistrict} {finalCust.district} {finalCust.province} {finalCust.zipcode}
                           </p>
                           {finalCust.phone && (
                              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-900 pt-1">
                                 <span className="material-symbols-outlined text-[16px] text-slate-300">call</span>
                                 {finalCust.phone}
                              </div>
                           )}
                        </div>
                      );
                    })()}
                  </div>
                )}
            </div>
          );
        })}
      </div>

      {/* Pagination control */}
      <div className="flex items-center justify-between py-6 px-1 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Rows:</span>
            <select title="Rows selection" value={pageSize} onChange={e => {setPageSize(Number(e.target.value)); setCurrentPage(1);}} className="text-[11px] font-bold text-slate-900 bg-transparent outline-none cursor-pointer">
               {[10, 30, 50, 100].map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          
          <div className="flex items-center gap-4">
             <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-900 disabled:opacity-20 transition-all active:scale-90">
                <span className="material-symbols-outlined text-[20px]">chevron_left</span>
             </button>
             <span className="text-[11px] font-bold text-slate-900 tracking-widest">{currentPage} / {totalPages}</span>
             <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)} className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-900 disabled:opacity-20 transition-all active:scale-90">
                <span className="material-symbols-outlined text-[20px]">chevron_right</span>
             </button>
          </div>
      </div>
    </div>
  );
}
