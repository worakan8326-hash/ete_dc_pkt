import React, { useState, useMemo } from 'react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  addDays, 
  eachDayOfInterval,
  isToday,
  isValid
} from 'date-fns';
import { th } from 'date-fns/locale';
import { safeParseDate, formatThaiTime } from '../../utils/dateTimeUtils';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Clock, 
  Package, 
  ArrowDownCircle, 
  ArrowUpCircle,
  RotateCcw
} from 'lucide-react';

interface DesktopCalendarProps {
  transactions: any[];
  items: any[];
}

const DesktopCalendar: React.FC<DesktopCalendarProps> = ({ transactions, items }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  // 1. Navigation Handlers
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToToday = () => {
    setCurrentMonth(new Date());
    setSelectedDate(new Date());
  };

  // 2. Calendar Data Generator
  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth));
    const end = endOfWeek(endOfMonth(currentMonth));
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  // 3. Transactions on SELECTED Date
  const dayTransactions = useMemo(() => {
    return transactions.filter(t => {
      try {
        const d = safeParseDate(t['วัน-เวลา']);
        return isSameDay(d, selectedDate);
      } catch (e) { return false; }
    });
  }, [transactions, selectedDate]);

  // 4. Helper to get daily transaction counts for indicators
  const getDayActivities = (day: Date) => {
    const txns = transactions.filter(t => {
      try {
        const d = safeParseDate(t['วัน-เวลา']);
        return isSameDay(d, day);
      } catch (e) { return false; }
    });
    return {
      receive: txns.filter(t => t.สถานะ === 'รับเข้า').length,
      issue: txns.filter(t => t.สถานะ === 'เบิกออก').length,
      return: txns.filter(t => t.สถานะ === 'รับคืน').length,
      void: txns.filter(t => (t.สถานะ || '').includes('ยกเลิก')).length,
    };
  };


  const getStatusColor = (status: string) => {
    if (status === 'รับเข้า') return 'bg-emerald-50 text-emerald-600 border-emerald-100';
    if (status === 'เบิกออก') return 'bg-amber-50 text-amber-600 border-amber-100';
    return 'bg-purple-50 text-purple-600 border-purple-100';
  };

  const weekDays = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

  return (
    <div className="flex h-full gap-8 animate-in fade-in slide-in-from-bottom-5 duration-700">
      
      {/* 🟢 Main Calendar Section */}
      <div className="flex-1 flex flex-col bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        
        {/* Header Controls */}
        <div className="p-8 border-b border-slate-50 flex items-center justify-between">
           <div className="flex items-center gap-6">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                 <CalendarIcon size={28} strokeWidth={2.5} />
              </div>
              <div>
                 <h2 className="text-3xl font-bold text-slate-800 tracking-tighter capitalize">
                    {format(currentMonth, 'MMMM yyyy', { locale: th })}
                 </h2>
                 <p className="text-[13px] font-semibold text-slate-400 uppercase tracking-widest mt-0.5">แผนงานรายเดือนและการเบิกจ่าย</p>
              </div>
           </div>

           <div className="flex items-center gap-3">
              <button onClick={goToToday} className="px-5 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-[13px] font-bold text-slate-500 hover:bg-white hover:text-emerald-600 transition-all">
                วันนี้
              </button>
              <div className="flex items-center bg-slate-50 rounded-xl p-1 border border-slate-100">
                <button onClick={prevMonth} className="p-2 hover:bg-white hover:shadow-sm rounded-lg text-slate-400 transition-all"><ChevronLeft size={20} /></button>
                <button onClick={nextMonth} className="p-2 hover:bg-white hover:shadow-sm rounded-lg text-slate-400 transition-all"><ChevronRight size={20} /></button>
              </div>
           </div>
        </div>

        {/* Weekday Labels */}
        <div className="grid grid-cols-7 border-b border-slate-50 bg-slate-50/30">
           {weekDays.map((day, i) => (
             <div key={day} className={`py-4 text-center text-[11px] font-black uppercase tracking-widest ${i === 0 || i === 6 ? 'text-rose-400' : 'text-slate-400'}`}>
                {day}
             </div>
           ))}
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 grid grid-cols-7 relative">
           {calendarDays.map((day, i) => {
             const activities = getDayActivities(day);
             const isSelected = isSameDay(day, selectedDate);
             const isCurrentMonth = isSameMonth(day, currentMonth);
             const isTodayDate = isToday(day);

             return (
               <button
                 key={day.toString()}
                 onClick={() => setSelectedDate(day)}
                 className={`relative h-full min-h-[100px] border-b border-r border-slate-50 p-3 text-left transition-all ${
                   !isCurrentMonth ? 'bg-slate-50/20 opacity-20' : 'hover:bg-emerald-50/30'
                 } ${isSelected ? 'bg-emerald-50 animate-pulse-soft ring-2 ring-inset ring-emerald-500/10' : ''}`}
               >
                  <span className={`text-[16px] font-bold ${
                     isSelected ? 'text-emerald-600' : (isTodayDate ? 'text-emerald-500 underline decoration-2 underline-offset-4' : 'text-slate-500')
                  }`}>
                     {format(day, 'd')}
                  </span>

                  {/* Indicators */}
                  <div className="mt-2 space-y-1">
                     {activities.receive > 0 && (
                       <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-100/50 rounded-md">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                          <span className="text-[9px] font-bold text-emerald-700">{activities.receive}</span>
                       </div>
                     )}
                     {activities.issue > 0 && (
                       <div className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-100/50 rounded-md">
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                          <span className="text-[9px] font-bold text-amber-700">{activities.issue}</span>
                       </div>
                     )}
                     {activities.return > 0 && (
                       <div className="flex items-center gap-1.5 px-2 py-0.5 bg-purple-100/50 rounded-md">
                          <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div>
                          <span className="text-[9px] font-bold text-purple-700">{activities.return}</span>
                       </div>
                     )}
                  </div>
               </button>
             );
           })}
        </div>
      </div>

      {/* 🚀 Detail Drill-Down Panel */}
      <div className="w-[450px] bg-white rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
           <div>
              <h3 className="text-2xl font-bold text-slate-800 tracking-tight leading-none">รายการประจำวัน</h3>
              <p className="text-[13px] font-semibold text-emerald-600 uppercase tracking-widest mt-2">
                 {format(selectedDate, 'd MMMM yyyy', { locale: th })}
              </p>
           </div>
           <div className="w-10 h-10 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-slate-400">
              <Clock size={18} />
           </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4 bg-slate-50/30">
           {dayTransactions.length > 0 ? (
             dayTransactions.map((txn, idx) => (
               <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow group">
                  <div className="flex justify-between items-start mb-3">
                     <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter border ${getStatusColor(txn.status || txn.สถานะ)}`}>
                        {txn.status || txn.สถานะ}
                     </span>
                     <span className="text-[10px] font-bold text-slate-300">{formatThaiTime(txn['วัน-เวลา'])}</span>
                  </div>
                  <h4 className="text-[16px] font-bold text-slate-800 leading-tight mb-3 group-hover:text-emerald-600 transition-colors">
                     {txn.รายการ}
                  </h4>
                  <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                     <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-400">
                           {txn.ผู้ทำรายการ?.[0] || 'U'}
                        </div>
                        <span className="text-[11px] font-bold text-slate-500">{txn.ผู้ทำรายการ}</span>
                     </div>
                     <span className="text-[14px] font-black text-slate-800">
                        {txn.จำนวน} {txn.หน่วย || 'ชิ้น'}
                     </span>
                  </div>
               </div>
             ))
           ) : (
             <div className="py-20 text-center opacity-30">
                <Package size={48} className="mx-auto text-slate-200 mb-4" />
                <p className="text-[13px] font-black uppercase tracking-widest">ไม่มีกิจกรรมในวันนี้</p>
             </div>
           )}
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
        @keyframes pulse-soft {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
        .animate-pulse-soft { animation: pulse-soft 2s infinite ease-in-out; }
      `}</style>
    </div>
  );
};

export default DesktopCalendar;
