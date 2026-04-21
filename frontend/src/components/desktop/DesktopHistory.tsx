import React, { useState, useMemo } from 'react';
import { 
  Search, 
  MapPin, 
  User, 
  Calendar, 
  Tag, 
  FileText, 
  Map as MapIcon, 
  Eye, 
  Trash2, 
  Printer,
  ChevronRight,
  Info,
  Package,
  Clock,
  History as HistoryIcon,
  ChevronDown,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatThaiDate, formatThaiTime, formatThaiDateTime, formatThaiDateFullYear } from '../../utils/dateTimeUtils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface DesktopHistoryProps {
  transactions: any[];
  user: any;
  customers: any[];
  onRefresh: () => void;
  onVoid: (txnNo: string) => void;
}

const getDriveThumbnail = (url: string) => {
  if (!url) return '';
  const cleanUrl = url.trim();
  const match = cleanUrl.match(/\/d\/(.*?)(?:\/|\?|$)/);
  if (match && match[1]) {
    return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w512-h512`;
  }
  return cleanUrl.replace("/view?usp=drivesdk", "").replace("file/d/", "uc?id=");
};

const DesktopHistory: React.FC<DesktopHistoryProps> = ({ transactions, user, customers, onRefresh, onVoid }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTxnNo, setSelectedTxnNo] = useState<string | null>(null);

  // 1. Grouping Logic (Match Mobile to show complete Receipts)
  const groupedTransactions = useMemo(() => {
    const rawFiltered = transactions.filter(t => {
      const searchStr = `${t.เลขที่รายการ} ${t.รายการ} ${t.ผู้ทำรายการ} ${t.CV} ${t.สถานะ} ${t.serial_number || ''}`.toLowerCase();
      return searchStr.includes(searchTerm.toLowerCase());
    });

    const groups: Map<string, any[]> = new Map();
    rawFiltered.forEach(t => {
      const key = t.เลขที่รายการ || `UNTITLED-${t.id}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(t);
    });

    return Array.from(groups.values()).sort((a, b) => {
      return new Date(b[0]['วัน-เวลา']).getTime() - new Date(a[0]['วัน-เวลา']).getTime();
    });
  }, [transactions, searchTerm]);

  // 2. Selected Group Detail
  const selectedGroup = useMemo(() => {
    if (!selectedTxnNo) return null;
    return groupedTransactions.find(g => g[0].เลขที่รายการ === selectedTxnNo);
  }, [groupedTransactions, selectedTxnNo]);

  const firstTx = selectedGroup ? selectedGroup[0] : null;

  // 3. Customer Detail lookup
  const customerDetail = useMemo(() => {
    if (!firstTx?.CV) return null;
    return customers.find(c => String(c.cv) === String(firstTx.CV));
  }, [customers, firstTx]);

  const getStatusColor = (status: string) => {
    if (status === 'รับเข้า' || status === 'รับคืนแล้ว') return 'bg-emerald-50 text-emerald-700 border-emerald-100';
    if (status === 'เบิกออก') return 'bg-amber-50 text-amber-700 border-amber-100';
    if (status === 'รับคืน' || status === 'คืนบางส่วน') return 'bg-purple-50 text-purple-700 border-purple-100';
    if (status.includes('ยกเลิก')) return 'bg-rose-50 text-rose-700 border-rose-100';
    return 'bg-slate-50 text-slate-700 border-slate-100';
  };

  const exportPDF = () => {
    if (!selectedGroup) return;
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const header = selectedGroup[0];
      
      doc.setFontSize(20);
      doc.text('ETE DC PHUKET - TRANSACTION SLIP', 15, 20);
      doc.setFontSize(10);
      doc.text(`Transaction No: ${header.เลขที่รายการ}`, 15, 30);
      doc.text(`Date & Time: ${formatThaiDateTime(header['วัน-เวลา'])}`, 15, 35);
      doc.text(`Customer (CV): ${customerDetail?.name || header.CV || '-'}`, 15, 40);
      doc.text(`Operator: ${header.ผู้ทำรายการ}`, 15, 45);

      const tableData = selectedGroup.map((t: any) => [
        t.รายการ + ' ' + (t.ขนาด || ''),
        t.serial_number || '-',
        t.จำนวน + ' ' + (t.หน่วย || 'ชิ้น'),
        t.สถานะ
      ]);

      autoTable(doc, {
        startY: 55,
        head: [['รายการพัสดุ', 'Serial Number', 'จำนวน', 'สถานะ']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [16, 185, 129] }
      });

      doc.save(`Receipt_${header.เลขที่รายการ}.pdf`);
    } catch (err) {
      console.error(err);
      alert('Failed to export PDF');
    }
  };

  return (
    <div className="flex h-full gap-6 animate-in fade-in duration-500 overflow-hidden p-1">
      
      {/* 🟢 LEFT PANEL: Master List (Grouped) */}
      <div className="w-[400px] flex flex-col bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden text-slate-700 shrink-0">
        <div className="p-5 border-b border-slate-50 space-y-4">
           <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-900 tracking-tight">TRANSACTION HISTORY</h2>
              <button 
                onClick={onRefresh}
                className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 hover:text-emerald-500 transition-colors"
              >
                <Clock size={18} />
              </button>
           </div>
            <div className="relative group flex items-center gap-2">
               <div className="relative flex-1 group">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={18} />
                 <input 
                   type="text" 
                   placeholder="ค้นหาบิล, พัสดุ, S/N, ผู้แจ้ง..." 
                   value={searchTerm}
                   onChange={e => setSearchTerm(e.target.value)}
                   className="w-full pl-11 pr-4 h-12 bg-white border border-slate-200 rounded-full text-[14px] font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/20 transition-all placeholder:text-slate-300 shadow-sm"
                 />
               </div>
               <button className="h-12 px-6 bg-indigo-600 text-white rounded-full flex items-center justify-center gap-2 font-black text-[11px] uppercase shadow-lg shadow-indigo-100/50 active:scale-95 transition-all shrink-0">
                  <Search size={16} />
                  <span>ค้นหา</span>
               </button>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2.5 bg-slate-50/30">
           {groupedTransactions.map((group) => {
             const txn = group[0];
             const isSelected = selectedTxnNo === txn.เลขที่รายการ;
             const totalQty = group.reduce((sum, t) => sum + Math.abs(t.จำนวน), 0);
             
             return (
               <button
                 key={txn.เลขที่รายการ}
                 onClick={() => setSelectedTxnNo(txn.เลขที่รายการ)}
                 className={`w-full text-left p-4 rounded-3xl border transition-all ${
                   isSelected 
                    ? 'bg-white border-emerald-500 shadow-xl shadow-emerald-500/10 ring-1 ring-emerald-500/5' 
                    : 'bg-white border-transparent hover:border-slate-200 hover:shadow-md'
                 }`}
               >
                  <div className="flex justify-between items-start mb-2">
                      <div className="flex flex-col">
                         <span className={`text-[10px] font-black uppercase tracking-widest ${isSelected ? 'text-emerald-600' : 'text-slate-300'}`}>
                           #{txn.เลขที่รายการ || 'NO-ID'}
                         </span>
                         {txn['เลขงาน'] && txn['เลขงาน'] !== '-' && (
                            <span className="text-[10px] font-black text-indigo-500 mt-0.5">JOB: {txn['เลขงาน']}</span>
                         )}
                      </div>
                      <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-tighter border ${getStatusColor(txn.สถานะ)}`}>
                         {txn.สถานะ}
                      </span>
                  </div>
                  <h4 className="text-[15px] font-bold text-slate-800 leading-snug mb-3 line-clamp-1">
                    {group.length > 1 ? `${txn.รายการ} และอีก ${group.length - 1} รายการ` : txn.รายการ}
                  </h4>
                  
                  <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                     <div className="flex flex-col">
                        <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Operator</span>
                        <span className="text-[11px] font-bold text-slate-600">{txn.ผู้ทำรายการ}</span>
                     </div>
                     <div className="text-right">
                        <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Total Qty</span>
                        <span className="text-[14px] font-black text-slate-900 block">{totalQty}</span>
                     </div>
                  </div>
               </button>
             );
           })}
           {groupedTransactions.length === 0 && (
             <div className="py-20 text-center opacity-30">
                <Package size={48} className="mx-auto mb-3 text-slate-300" />
                <p className="text-[11px] font-black uppercase tracking-widest">ไม่พบรายการประวัติ</p>
             </div>
           )}
        </div>
      </div>

      {/* 🚀 RIGHT PANEL: Detailed View */}
      <div className="flex-1 bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col relative">
         <AnimatePresence mode="wait">
            {selectedGroup ? (
               <motion.div 
                 key={firstTx?.เลขที่รายการ}
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, y: -10 }}
                 className="flex-1 flex flex-col h-full overflow-hidden"
               >
                  {/* Sticky Header */}
                  <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between bg-white/80 backdrop-blur-md z-10">
                     <div className="flex items-center gap-5">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border-2 ${getStatusColor(firstTx!.สถานะ)} shadow-sm`}>
                           <FileText size={28} strokeWidth={2.5} />
                        </div>
                        <div>
                            <div className="flex items-center gap-3 mb-0.5">
                               <h2 className="text-2xl font-black text-slate-900 tracking-tight">#{firstTx!.เลขที่รายการ}</h2>
                               <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusColor(firstTx!.สถานะ)}`}>
                                  {firstTx!.สถานะ}
                               </span>
                            </div>
                           <p className="text-[12px] font-bold text-slate-400">
                             {formatThaiDateTime(firstTx!['วัน-เวลา'])} • บันทึกโดย {firstTx!.ผู้ทำรายการ}
                           </p>
                        </div>
                     </div>
                     <div className="flex items-center gap-3">
                        <button 
                          onClick={exportPDF}
                          className="flex items-center gap-2 px-5 h-12 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black text-[11px] uppercase hover:bg-slate-50 transition-all shadow-sm"
                        >
                           <Printer size={16} /> พิมพ์ใบเสร็จ
                        </button>
                        {user.role?.toLowerCase().includes('admin') && !firstTx!.สถานะ.includes('ยกเลิก') && (
                           <button 
                             onClick={() => onVoid(firstTx!.เลขที่รายการ)}
                             className="flex items-center gap-2 px-5 h-12 bg-rose-50 text-rose-600 border border-rose-100 rounded-2xl font-black text-[11px] uppercase hover:bg-rose-500 hover:text-white transition-all shadow-sm"
                           >
                              <Trash2 size={16} /> ยกเลิกรายการ
                           </button>
                        )}
                     </div>
                  </div>

                  <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                     <div className="grid grid-cols-12 gap-8 items-start">
                        
                        {/* Summary & Customer Info */}
                        <div className="col-span-12 lg:col-span-7 space-y-8">
                           
                           {/* Items List Table */}
                           <div className="space-y-4">
                              <div className="flex items-center gap-2 text-slate-400">
                                 <Package size={18} />
                                 <h3 className="text-[11px] font-black uppercase tracking-[0.2em]">รายการพัสดุในบิลนี้</h3>
                              </div>
                              <div className="bg-slate-50/50 rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm">
                                <table className="w-full text-left border-collapse">
                                  <thead>
                                    <tr className="bg-white/50 border-b border-slate-100">
                                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">รายการ</th>
                                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">จำนวน</th>
                                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">สถานะ</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {selectedGroup!.map((it, idx) => (
                                      <tr key={idx} className="border-b border-slate-100/50 last:border-0 hover:bg-white/40 transition-colors">
                                        <td className="px-6 py-5">
                                          <p className="text-[14px] font-black text-slate-800 uppercase leading-none mb-1.5">{it.รายการ} {it.ยี่ห้อหรือรูปแบบ}</p>
                                          <div className="flex flex-wrap gap-2">
                                            {it.ขนาด && <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{it.ขนาด}</span>}
                                            {it.serial_number && (
                                              <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded flex items-center gap-1">
                                                <ShieldCheck size={10} /> S/N: {it.serial_number}
                                              </span>
                                            )}
                                          </div>
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                          <span className="text-[18px] font-black text-slate-900">{it.จำนวน}</span>
                                          <span className="text-[10px] font-bold text-slate-400 ml-1 uppercase">{it.หน่วย || 'ชิ้น'}</span>
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                          <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black border uppercase ${getStatusColor(it.สถานะ)}`}>
                                            {it.สถานะ}
                                          </span>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                           </div>

                           {/* Metadata Grid */}
                           <div className="grid grid-cols-2 gap-4">
                              <div className="p-5 bg-white rounded-3xl border border-slate-100 shadow-sm space-y-4">
                                 <div className="flex items-center gap-2 text-indigo-500">
                                    <MapPin size={18} />
                                    <h3 className="text-[10px] font-black uppercase tracking-widest">ข้อมูลจุดติดตั้ง (CV)</h3>
                                 </div>
                                 {customerDetail ? (
                                    <div className="space-y-3">
                                       <div>
                                          <p className="text-[15px] font-black text-slate-800 leading-tight">{customerDetail.name}</p>
                                          <p className="text-[11px] font-bold text-indigo-500 mt-0.5">CV: {customerDetail.cv}</p>
                                       </div>
                                       <p className="text-[11px] font-medium text-slate-400 leading-relaxed italic line-clamp-2">
                                          {customerDetail.address} {customerDetail.subdistrict} {customerDetail.district} {customerDetail.province}
                                       </p>
                                       <button 
                                          onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${customerDetail.lat},${customerDetail.lng}`, '_blank')}
                                          className="w-full h-10 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 hover:bg-indigo-600 hover:text-white transition-all"
                                       >
                                          <MapIcon size={14} /> ดูบนแผนที่ Google
                                       </button>
                                    </div>
                                 ) : (
                                    <p className="text-[11px] font-bold text-slate-300 italic">ไม่ระบุข้อมูลร้านค้า (CV {firstTx!.CV || '-'})</p>
                                 )}
                              </div>

                              <div className="p-5 bg-white rounded-3xl border border-slate-100 shadow-sm space-y-4">
                                 <div className="flex items-center gap-2 text-slate-400">
                                    <User size={18} />
                                    <h3 className="text-[10px] font-black uppercase tracking-widest">ผู้รับผิดชอบงาน</h3>
                                 </div>
                                 <div className="space-y-3">
                                    <div>
                                       <p className="text-[10px] font-black text-slate-300 uppercase">ช่าง/ผู้จัดส่ง</p>
                                       <p className="text-[14px] font-black text-slate-800">{firstTx!["จัดส่งโดย"] || '-'}</p>
                                    </div>
                                    <div>
                                       <p className="text-[10px] font-black text-slate-300 uppercase">ผู้แจ้งเบิก/คืน</p>
                                       <p className="text-[14px] font-black text-slate-800">{firstTx!["ผู้แจ้ง"] || '-'}</p>
                                    </div>
                                    {firstTx!["วันที่แจ้ง"] && (
                                       <p className="text-[10px] font-bold text-slate-400 italic">เมื่อ: {formatThaiDate(firstTx!["วันที่แจ้ง"])}</p>
                                    )}
                                 </div>
                              </div>
                           </div>
                        </div>

                        {/* Evidence & Logs */}
                        <div className="col-span-12 lg:col-span-5 space-y-8">
                           
                           {/* Evidence Photos */}
                           <div className="space-y-4">
                              <div className="flex items-center gap-2 text-rose-500">
                                 <Eye size={18} />
                                 <h3 className="text-[11px] font-black uppercase tracking-[0.2em]">รูปถ่ายหลักฐาน (EVIDENCE)</h3>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                 {firstTx!["รูปภาพประกอบ"] ? (
                                    String(firstTx!["รูปภาพประกอบ"]).split('\n').map((url, i) => (
                                       <div key={i} className="aspect-square bg-slate-100 rounded-3xl border border-slate-100 overflow-hidden group relative shadow-inner">
                                          <img 
                                            src={getDriveThumbnail(url)} 
                                            alt={`Evidence ${i+1}`} 
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                                            onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/400x400?text=Image+Error'; }}
                                          />
                                          <button 
                                            onClick={() => window.open(url, '_blank')}
                                            className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                                          >
                                            <ExternalLink size={24} />
                                          </button>
                                       </div>
                                    ))
                                 ) : (
                                    <div className="col-span-2 aspect-video bg-slate-50 rounded-3xl border border-slate-100 flex flex-col items-center justify-center opacity-40">
                                       <FileText size={32} className="text-slate-200 mb-2" />
                                       <p className="text-[10px] font-black uppercase tracking-widest">ไม่มีหลักฐานรูปถ่าย</p>
                                    </div>
                                 )}
                              </div>
                           </div>

                           {/* Notes & Audit */}
                           <div className="p-6 bg-slate-900 rounded-[2.5rem] text-white shadow-xl shadow-slate-900/10 space-y-6">
                              <div className="space-y-4">
                                 <div className="flex items-center gap-2 text-slate-400">
                                    <Info size={16} />
                                    <h3 className="text-[10px] font-black uppercase tracking-widest">หมายเหตุ (NOTES)</h3>
                                 </div>
                                 <p className="text-[15px] font-medium text-slate-300 italic leading-relaxed">
                                    "{firstTx!.หมายเหตุ || 'ไม่มีหมายเหตุเพิ่มเติม'}"
                                 </p>
                                 {firstTx!["สาเหตุการคืน"] && (
                                   <div className="pt-4 border-t border-white/10">
                                      <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1">สาเหตุการคืน (Return Reason)</p>
                                      <p className="text-[14px] font-bold text-rose-100">{firstTx!["สาเหตุการคืน"]}</p>
                                   </div>
                                 )}
                              </div>

                              <div className="pt-6 border-t border-white/10 space-y-3">
                                 <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Audit Trail</span>
                                    <span className="text-[10px] font-black bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded">VERIFIED</span>
                                 </div>
                                 <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-slate-400">
                                       <User size={14} />
                                    </div>
                                    <div className="flex flex-col">
                                       <span className="text-[13px] font-black text-slate-200">{firstTx!.ผู้ทำรายการ}</span>
                                       <span className="text-[10px] font-bold text-slate-500 uppercase">Authorized Operator</span>
                                    </div>
                                 </div>
                              </div>
                           </div>
                           
                           {/* Geofence / GPS Status */}
                           {firstTx!.lat && (
                             <div className={`p-5 rounded-3xl border flex items-center justify-between ${firstTx!.distance_warning ? 'bg-rose-50 border-rose-100' : 'bg-emerald-50 border-emerald-100'}`}>
                                <div>
                                   <p className={`text-[9px] font-black uppercase tracking-widest mb-1 ${firstTx!.distance_warning ? 'text-rose-400' : 'text-emerald-400'}`}>GPS Location Validation</p>
                                   <div className="flex items-center gap-2">
                                      <span className="text-[11px] font-black text-slate-700">{firstTx!.lat}, {firstTx!.lng}</span>
                                      {firstTx!.distance_warning && (
                                        <span className="px-1.5 py-0.5 bg-rose-500 text-white text-[9px] font-black rounded">{firstTx!.distance_warning}</span>
                                      )}
                                   </div>
                                </div>
                                <div className={firstTx!.distance_warning ? 'text-rose-500' : 'text-emerald-500'}>
                                   {firstTx!.distance_warning ? <AlertTriangle size={20} /> : <ShieldCheck size={20} />}
                                </div>
                             </div>
                           )}

                        </div>
                     </div>
                  </div>
               </motion.div>
            ) : (
               <div className="flex-1 flex flex-col items-center justify-center p-20 text-center bg-slate-50/20">
                  <div className="w-40 h-40 bg-white rounded-[4rem] border border-slate-100 shadow-inner flex items-center justify-center text-slate-100 mb-8 animate-pulse">
                     <HistoryIcon size={80} strokeWidth={1} />
                  </div>
                  <h3 className="text-2xl font-black text-slate-800 tracking-tight uppercase mb-2">Transaction Details</h3>
                  <p className="text-[14px] font-medium text-slate-400 max-w-xs leading-relaxed uppercase tracking-widest">
                    โปรดเลือกรายการจากแถบด้านซ้าย<br/>เพื่อตรวจสอบข้อมูลโดยละเอียด
                  </p>
               </div>
            )}
         </AnimatePresence>
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

export default DesktopHistory;
