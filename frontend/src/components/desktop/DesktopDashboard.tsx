import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, 
  AreaChart, Area
} from 'recharts';
import { 
  ArrowDownCircle, 
  ArrowUpCircle, 
  RotateCcw, 
  XCircle, 
  Package, 
  Users, 
  Clock,
  MapPin,
  TrendingUp,
  PieChart as PieIcon,
  BarChart2,
  Activity,
  Maximize2,
  Wrench,
  ShoppingBag,
  AlertTriangle,
  ShieldCheck
} from 'lucide-react';
import { 
  parseISO, subDays, subMonths, isWithinInterval, startOfDay, endOfDay, format 
} from 'date-fns';
import { th } from 'date-fns/locale/th';
import { formatThaiDate, formatThaiTime, safeParseDate } from '../../utils/dateTimeUtils';
import type { Transaction, MaterialItem } from '../../types';

interface DesktopDashboardProps {
  items: MaterialItem[];
  transactions: Transaction[];
  user: any;
  onRefresh?: () => void;
  loading?: boolean;
  setActiveTab?: (tab: any) => void;
  allRepair?: number;
  allScrap?: number;
  allLost?: number;
}

export default function DesktopDashboard({ transactions, items, user, setActiveTab, allRepair, allScrap, allLost }: DesktopDashboardProps) {
  const now = new Date();
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month' | 'year' | 'custom'>('day');
  const [selDay, setSelDay] = useState<string>(format(now, 'd'));
  const [selMonth, setSelMonth] = useState<string>(format(now, 'M'));
  const [selYear, setSelYear] = useState<string>(format(now, 'yyyy'));
  
  const [chartType, setChartType] = useState<'area' | 'bar' | 'line'>('area');
  const [visibleSeries, setVisibleSeries] = useState({ 
    in: true, 
    out: true, 
    return: false, 
    void: false, 
    request: false 
  });

  const months = [
    { v: '1', l: 'มกราคม' }, { v: '2', l: 'กุมภาพันธ์' }, { v: '3', l: 'มีนาคม' },
    { v: '4', l: 'เมษายน' }, { v: '5', l: 'พฤษภาคม' }, { v: '6', l: 'มิถุนายน' },
    { v: '7', l: 'กรกฎาคม' }, { v: '8', l: 'สิงหาคม' }, { v: '9', l: 'กันยายน' },
    { v: '10', l: 'ตุลาคม' }, { v: '11', l: 'พฤศจิกายน' }, { v: '12', l: 'ธันวาคม' }
  ];

  const years = Array.from({length: 5}, (_, i) => (parseInt(format(now, 'yyyy')) - 2 + i).toString());
  const days = Array.from({length: 31}, (_, i) => (i + 1).toString());

  // 1. Calculate Summary Metrics
  const stats = useMemo(() => {
    let filteredTxns = [];
    
    if (timeRange === 'custom') {
      filteredTxns = transactions.filter(t => {
        const d = safeParseDate(t['วัน-เวลา']);
        const matchYear = format(d, 'yyyy') === selYear;
        const matchMonth = selMonth ? format(d, 'M') === selMonth : true;
        const matchDay = selDay ? format(d, 'd') === selDay : true;
        return matchYear && matchMonth && matchDay;
      });
    } else {
      const getRangeInterval = () => {
        const n = new Date();
        switch (timeRange) {
          case 'day': return { start: startOfDay(n), end: endOfDay(n) };
          case 'week': return { start: startOfDay(subDays(n, 6)), end: endOfDay(n) };
          case 'month': return { start: startOfDay(subDays(n, 29)), end: endOfDay(n) };
          case 'year': return { start: startOfDay(subMonths(n, 11)), end: endOfDay(n) };
          default: return { start: startOfDay(n), end: endOfDay(n) };
        }
      };
      const interval = getRangeInterval();
      filteredTxns = transactions.filter(t => isWithinInterval(safeParseDate(t['วัน-เวลา']), interval));
    }

    return {
      receive: filteredTxns.filter(t => t.สถานะ === 'รับเข้า').length,
      issue: filteredTxns.filter(t => t.สถานะ === 'เบิกออก').length,
      return: filteredTxns.filter(t => t.สถานะ === 'รับคืน').length,
      void: filteredTxns.filter(t => (t.สถานะ || '').includes('ยกเลิก')).length,
      repair: allRepair || items.reduce((s, it) => s + (it.repair_qty || 0), 0),
      scrap: allScrap || items.reduce((s, it) => s + (it.scrap_qty || 0), 0),
      lost: allLost || items.reduce((s, it) => s + (it.lost_qty || 0), 0),
      transit: items.reduce((s, it) => s + (it.transit_qty || 0), 0),
      quarantine: items.reduce((s, it) => s + (it.quarantine_qty || 0), 0),
      totalItems: items.length,
      lowStock: items.filter(i => i.จำนวน <= 5).length
    };
  }, [transactions, items, selDay, selMonth, selYear, timeRange, allRepair, allScrap, allLost]);

  // 2. Prepare Chart Data
  const chartData = useMemo(() => {
    const data = [];
    const getCounts = (txns: any[]) => ({
      'รับเข้า': txns.filter(t => t.สถานะ === 'รับเข้า').length,
      'เบิกออก': txns.filter(t => t.สถานะ === 'เบิกออก').length,
      'รับคืน': txns.filter(t => t.สถานะ === 'รับคืน').length,
      'ยกเลิก': txns.filter(t => (t.สถานะ || '').includes('ยกเลิก')).length,
      'แจ้งคืน': txns.filter(t => t.สถานะ === 'แจ้งคืน').length,
    });

    if (timeRange === 'day' || (timeRange === 'custom' && selDay)) {
      const todayStr = timeRange === 'day' ? format(now, 'yyyy-MM-dd') : `${selYear}-${selMonth.padStart(2, '0')}-${selDay.padStart(2, '0')}`;
      for (let i = 0; i < 24; i++) {
        const hour = i.toString().padStart(2, '0');
        const hourTxns = transactions.filter(t => t['วัน-เวลา']?.startsWith(`${todayStr}T${hour}`));
        data.push({ name: `${hour}:00`, ...getCounts(hourTxns) });
      }
    } else if (timeRange === 'week') {
      for (let i = 6; i >= 0; i--) {
        const date = subDays(now, i);
        const dateStr = format(date, 'yyyy-MM-dd');
        data.push({ name: format(date, 'd MMM', { locale: th }), ...getCounts(transactions.filter(t => t['วัน-เวลา']?.startsWith(dateStr))) });
      }
    } else if (timeRange === 'month' || (timeRange === 'custom' && selMonth)) {
      if (timeRange === 'month') {
        for (let i = 29; i >= 0; i--) {
          const date = subDays(now, i);
          const dateStr = format(date, 'yyyy-MM-dd');
          data.push({ name: format(date, 'd MMM', { locale: th }), ...getCounts(transactions.filter(t => t['วัน-เวลา']?.startsWith(dateStr))) });
        }
      } else {
        const targetPrefix = `${selYear}-${selMonth.padStart(2, '0')}-`;
        const daysInMonth = new Date(parseInt(selYear), parseInt(selMonth), 0).getDate();
        for (let i = 1; i <= daysInMonth; i++) {
          const dayStr = i.toString().padStart(2, '0');
          data.push({ name: `${i} ${months.find(m => m.v === selMonth)?.l.substring(0, 3)}`, ...getCounts(transactions.filter(t => t['วัน-เวลา']?.startsWith(`${targetPrefix}${dayStr}`))) });
        }
      }
    } else {
      // Year or Custom Year view
      if (timeRange === 'year') {
         for (let i = 11; i >= 0; i--) {
            const date = subMonths(now, i);
            const mStr = format(date, 'yyyy-MM');
            data.push({ name: format(date, 'MMM yy', { locale: th }), ...getCounts(transactions.filter(t => t['วัน-เวลา']?.startsWith(mStr))) });
         }
      } else {
        for (let i = 1; i <= 12; i++) {
          const mStr = i.toString().padStart(2, '0');
          data.push({ name: months[i-1].l.substring(0, 3), ...getCounts(transactions.filter(t => t['วัน-เวลา']?.startsWith(`${selYear}-${mStr}`))) });
        }
      }
    }
    return data;
  }, [transactions, selDay, selMonth, selYear, timeRange]);

  // 3. Prepare Pie Chart Data
  const pieData = useMemo(() => {
    const counts: Record<string, number> = {};
    items.forEach(item => {
      counts[item.ประเภท] = (counts[item.ประเภท] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [items]);

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444'];

  // 4. Recent Activity (Sorted)
  const recentActivity = useMemo(() => {
    return [...transactions]
      .sort((a, b) => safeParseDate(b['วัน-เวลา']).getTime() - safeParseDate(a['วัน-เวลา']).getTime())
      .slice(0, 15);
  }, [transactions]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-4xl font-bold text-slate-900 tracking-tight">แดชบอร์ดภาพรวม</h2>
          <p className="text-slate-400 font-semibold uppercase tracking-[0.2em] text-[13px] mt-1">
            ยินดีต้อนรับกลับมา, คุณ {user.name} • {format(new Date(), "EEEE 'ที่' d MMMM yyyy", { locale: th })}
          </p>
        </div>
        <div className="flex items-center gap-3">
           {/* Relative Quick Filters */}
           <div className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-3xl border border-slate-200 shadow-inner">
             {[
               {id: 'day', label: 'วัน'},
               {id: 'week', label: 'สัปดาห์'},
               {id: 'month', label: 'เดือน'},
               {id: 'year', label: 'ปี'}
             ].map((btn) => (
               <button
                 key={btn.id}
                 onClick={() => setTimeRange(btn.id as any)}
                 className={`px-4 py-1.5 rounded-2xl text-[12px] font-black uppercase tracking-widest transition-all ${
                   timeRange === btn.id 
                     ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200' 
                     : 'text-slate-400 hover:text-slate-600'
                 }`}
               >
                 {btn.label}
               </button>
             ))}
           </div>

           {/* Precise Custom Filters */}
           <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-3xl border border-slate-200">
              <select 
                value={selYear}
                onChange={(e) => { setSelYear(e.target.value); setTimeRange('custom'); }}
                className={`bg-white px-3 py-1.5 rounded-2xl text-[12px] font-black uppercase border-none outline-none shadow-sm ring-1 ring-slate-200 ${timeRange === 'custom' ? 'text-emerald-600' : 'text-slate-600'}`}
              >
                {years.map(y => <option key={y} value={y}>{parseInt(y) + 543}</option>)}
              </select>

              <select 
                value={selMonth}
                onChange={(e) => { setSelMonth(e.target.value); setSelDay(''); setTimeRange('custom'); }}
                className={`bg-white px-3 py-1.5 rounded-2xl text-[12px] font-black uppercase border-none outline-none shadow-sm ring-1 ring-slate-200 ${timeRange === 'custom' ? 'text-emerald-600' : 'text-slate-600'}`}
              >
                <option value="">ทุกเดือน</option>
                {months.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
              </select>

              <select 
                value={selDay}
                onChange={(e) => { setSelDay(e.target.value); setTimeRange('custom'); }}
                disabled={!selMonth}
                className={`bg-white px-3 py-1.5 rounded-2xl text-[12px] font-black uppercase border-none outline-none shadow-sm ring-1 ring-slate-200 disabled:opacity-50 ${timeRange === 'custom' && selDay ? 'text-emerald-600' : 'text-slate-600'}`}
              >
                <option value="">ทุกวัน</option>
                {days.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
           </div>
           <div className="px-4 py-2 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="text-[12px] font-bold text-slate-600 uppercase tracking-wider">พร้อมใช้งาน</span>
           </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { id: 'logistics', label: 'พัสดุระหว่างส่ง', val: stats.transit, icon: MapPin, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
          { id: 'repair', label: 'รอตรวจสอบ/อนุมัติ', val: stats.quarantine, icon: ShieldCheck, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100' },
          { id: 'history', label: 'รับเข้าช่วงนี้', val: stats.receive, icon: ArrowDownCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
          { id: 'history', label: 'เบิกออกช่วงนี้', val: stats.issue, icon: ArrowUpCircle, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
          { id: 'repair', label: 'ตู้เสียรอซ่อม', val: stats.repair, icon: Wrench, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100' },
          { id: 'repair', label: 'รอจำหน่าย', val: stats.scrap, icon: ShoppingBag, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100' },
          { id: 'repair', label: 'พัสดุสูญหาย', val: stats.lost, icon: AlertTriangle, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100' },
          { id: 'audit', label: 'บันทึกระบบ (Audit Log)', val: transactions.length, icon: ShieldCheck, color: 'text-slate-800', bg: 'bg-slate-100', border: 'border-slate-200', visible: (user.role === 'admin' || user.role === 'manager') }
        ].filter(k => k.visible !== false).map((kpi, i) => (
          <div 
            key={i} 
            onClick={() => kpi.id && setActiveTab?.(kpi.id as any)}
            className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 ${kpi.bg} ${kpi.color} rounded-2xl flex items-center justify-center border ${kpi.border}`}>
                <kpi.icon size={24} strokeWidth={2.5} />
              </div>
              <span className="material-symbols-outlined text-[14px] text-slate-200 group-hover:text-indigo-400 transition-colors">arrow_forward_ios</span>
            </div>
            <p className="text-4xl font-bold text-slate-900 tracking-tighter">{kpi.val.toLocaleString()}</p>
            <p className="text-[14px] font-semibold text-slate-400 uppercase tracking-widest mt-1">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Main Graph Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-8 overflow-hidden">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                     <TrendingUp size={20} />
                  </div>
                   <div>
                     <h3 className="text-xl font-bold text-slate-800 leading-none">แนวโน้มการขยับพัสดุ</h3>
                   </div>
               </div>

               <div className="flex items-center gap-4">
                  {/* Series Selector - Optimized for many buttons */}
                  <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-100 overflow-x-auto no-scrollbar">
                     {[
                        { id: 'in', label: 'รับเข้า', color: 'bg-emerald-500', dot: 'bg-emerald-500' },
                        { id: 'out', label: 'เบิกออก', color: 'bg-amber-500', dot: 'bg-amber-500' },
                        { id: 'return', label: 'รับคืน', color: 'bg-purple-500', dot: 'bg-purple-500' },
                        { id: 'void', label: 'ยกเลิก', color: 'bg-rose-500', dot: 'bg-rose-500' },
                        { id: 'request', label: 'แจ้งคืน', color: 'bg-cyan-500', dot: 'bg-cyan-500' }
                     ].map(s => (
                        <button 
                           key={s.id}
                           onClick={() => setVisibleSeries(prev => ({ ...prev, [s.id]: !prev[s.id as keyof typeof prev] }))}
                           className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase flex items-center gap-1.5 whitespace-nowrap ${visibleSeries[s.id as keyof typeof visibleSeries] ? `${s.color} text-white shadow-sm` : 'text-slate-400 hover:bg-slate-100'}`}
                        >
                           <div className={`w-1.5 h-1.5 rounded-full ${visibleSeries[s.id as keyof typeof visibleSeries] ? 'bg-white' : s.dot}`}></div>
                           {s.label}
                        </button>
                     ))}
                  </div>

                  {/* Chart Type Selector */}
                  <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                     {[
                        { id: 'area', icon: Activity },
                        { id: 'bar', icon: BarChart2 },
                        { id: 'line', icon: Maximize2 }
                     ].map(opt => (
                        <button
                           key={opt.id}
                           onClick={() => setChartType(opt.id as any)}
                           className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${chartType === opt.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                           <opt.icon size={16} />
                        </button>
                     ))}
                  </div>
               </div>
            </div>

            <div className="h-[300px] w-full mt-4">
               <ResponsiveContainer width="100%" height="100%">
                  {chartType === 'area' ? (
                     <AreaChart data={chartData}>
                        <defs>
                           {['In', 'Out', 'Return', 'Void', 'Request'].map((name, i) => (
                             <linearGradient key={name} id={`color${name}`} x1="0" y1="0" x2="0" y2="1">
                               <stop offset="5%" stopColor={['#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'][i]} stopOpacity={0.1}/>
                               <stop offset="95%" stopColor={['#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'][i]} stopOpacity={0}/>
                             </linearGradient>
                           ))}
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 'bold'}} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 'bold'}} />
                        <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -1px rgba(0,0,0,0.1)'}} />
                        {visibleSeries.in && <Area type="monotone" dataKey="รับเข้า" stroke="#10b981" strokeWidth={3} fill="url(#colorIn)" isAnimationActive={false} />}
                        {visibleSeries.out && <Area type="monotone" dataKey="เบิกออก" stroke="#f59e0b" strokeWidth={3} fill="url(#colorOut)" isAnimationActive={false} />}
                        {visibleSeries.return && <Area type="monotone" dataKey="รับคืน" stroke="#8b5cf6" strokeWidth={3} fill="url(#colorReturn)" isAnimationActive={false} />}
                        {visibleSeries.void && <Area type="monotone" dataKey="ยกเลิก" stroke="#ef4444" strokeWidth={3} fill="url(#colorVoid)" isAnimationActive={false} />}
                        {visibleSeries.request && <Area type="monotone" dataKey="แจ้งคืน" stroke="#06b6d4" strokeWidth={3} fill="url(#colorRequest)" isAnimationActive={false} />}
                     </AreaChart>
                  ) : chartType === 'bar' ? (
                     <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 'bold'}} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 'bold'}} />
                        <Tooltip cursor={{fill: '#f8fafc'}} />
                        {visibleSeries.in && <Bar dataKey="รับเข้า" fill="#10b981" radius={[4, 4, 0, 0]} barSize={timeRange === 'year' ? 8 : 15} isAnimationActive={false} />}
                        {visibleSeries.out && <Bar dataKey="เบิกออก" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={timeRange === 'year' ? 8 : 15} isAnimationActive={false} />}
                        {visibleSeries.return && <Bar dataKey="รับคืน" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={timeRange === 'year' ? 8 : 15} isAnimationActive={false} />}
                        {visibleSeries.void && <Bar dataKey="ยกเลิก" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={timeRange === 'year' ? 8 : 15} isAnimationActive={false} />}
                        {visibleSeries.request && <Bar dataKey="แจ้งคืน" fill="#06b6d4" radius={[4, 4, 0, 0]} barSize={timeRange === 'year' ? 8 : 15} isAnimationActive={false} />}
                     </BarChart>
                  ) : (
                     <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 'bold'}} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 'bold'}} />
                        <Tooltip />
                        {visibleSeries.in && <Line type="monotone" dataKey="รับเข้า" stroke="#10b981" strokeWidth={3} dot={{r: 4, fill: '#10b981'}} activeDot={{r: 6}} isAnimationActive={false} />}
                        {visibleSeries.out && <Line type="monotone" dataKey="เบิกออก" stroke="#f59e0b" strokeWidth={3} dot={{r: 4, fill: '#f59e0b'}} activeDot={{r: 6}} isAnimationActive={false} />}
                        {visibleSeries.return && <Line type="monotone" dataKey="รับคืน" stroke="#8b5cf6" strokeWidth={3} dot={{r: 4, fill: '#8b5cf6'}} activeDot={{r: 6}} isAnimationActive={false} />}
                        {visibleSeries.void && <Line type="monotone" dataKey="ยกเลิก" stroke="#ef4444" strokeWidth={3} dot={{r: 4, fill: '#ef4444'}} activeDot={{r: 6}} isAnimationActive={false} />}
                        {visibleSeries.request && <Line type="monotone" dataKey="แจ้งคืน" stroke="#06b6d4" strokeWidth={3} dot={{r: 4, fill: '#06b6d4'}} activeDot={{r: 6}} isAnimationActive={false} />}
                     </LineChart>
                  )}
               </ResponsiveContainer>
            </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
           <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-pink-50 text-pink-600 rounded-xl flex items-center justify-center">
                 <PieIcon size={20} />
              </div>
               <div>
                  <h3 className="text-xl font-bold text-slate-800 leading-none">สัดส่วนพัสดุ</h3>
                  <p className="text-[12px] font-semibold text-slate-400 uppercase tracking-widest mt-1">Composition</p>
               </div>
           </div>
           <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                      {pieData.map((_entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                 </PieChart>
              </ResponsiveContainer>
           </div>
           <div className="mt-4 space-y-2">
              {pieData.map((d, i) => (
                 <div key={i} className="flex items-center justify-between text-[12px] font-bold">
                    <div className="flex items-center gap-2">
                       <div className="w-2 h-2 rounded-full" style={{backgroundColor: COLORS[i % COLORS.length]}}></div>
                       <span className="text-slate-500">{d.name}</span>
                    </div>
                    <span className="text-slate-900">{d.value}</span>
                 </div>
              ))}
           </div>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
         <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                  <Clock size={20} />
               </div>
               <div>
                  <h3 className="text-xl font-bold text-slate-800 leading-none">กิจกรรมล่าสุด</h3>
                  <p className="text-[12px] font-semibold text-slate-400 uppercase tracking-widest mt-1">Activity Log</p>
               </div>
            </div>
         </div>
         <div className="overflow-x-auto">
            <table className="w-full text-left">
               <thead>
                   <tr className="bg-slate-50/50">
                      <th className="px-8 py-4 text-[12px] font-bold text-slate-400 uppercase tracking-widest">เวลา</th>
                      <th className="px-8 py-4 text-[12px] font-bold text-slate-400 uppercase tracking-widest">ประเภท</th>
                      <th className="px-8 py-4 text-[12px] font-bold text-slate-400 uppercase tracking-widest">รายการ</th>
                      <th className="px-8 py-4 text-[12px] font-bold text-slate-400 uppercase tracking-widest">ผู้กระทำ</th>
                      <th className="px-8 py-4 text-[12px] font-bold text-slate-400 uppercase tracking-widest">เขต/CV</th>
                   </tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                  {recentActivity.map((txn, i) => (
                     <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-8 py-4">
                           <p className="text-[13px] font-bold text-slate-900">{formatThaiTime(txn['วัน-เวลา'])}</p>
                           <p className="text-[10px] text-slate-400 font-medium">{formatThaiDate(txn['วัน-เวลา'])}</p>
                        </td>
                        <td className="px-6 py-3">
                           <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                              txn.สถานะ === 'รับเข้า' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                              txn.สถานะ?.includes('ยกเลิก') ? 'bg-rose-50 text-rose-600 border-rose-100' :
                              'bg-amber-50 text-amber-600 border-amber-100'
                           }`}>
                              {txn.สถานะ}
                           </span>
                        </td>
                        <td className="px-6 py-3">
                           <p className="text-[13px] font-bold text-slate-800">{txn.รายการ}</p>
                           <p className="text-[11px] text-slate-400">{txn.ยี่ห้อหรือรูปแบบ || txn.ประเภท}</p>
                        </td>
                        <td className="px-6 py-3">
                           <span className="text-[13px] font-bold text-slate-700">{txn.ผู้ทำรายการ}</span>
                        </td>
                        <td className="px-6 py-3">
                           <span className="text-[13px] font-bold text-slate-500">{txn.เขตการทำงาน || txn.CV || '-'}</span>
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>
   </div>
  );
}
