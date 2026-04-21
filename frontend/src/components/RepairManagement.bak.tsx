import React, { useState, useMemo, useEffect } from 'react';
import { 
  Wrench, 
  Clock, 
  Package, 
  CheckCircle2, 
  ShoppingBag, 
  Trash2, 
  AlertCircle,
  Search,
  ShieldCheck,
  FileSearch,
  History,
  AlertTriangle,
  RefreshCw,
  Camera,
  Eye,
  ExternalLink
} from 'lucide-react';
import { processBatchTransaction, API_URL } from '../api';
import { formatThaiDate, formatThaiTime, formatThaiDateTime } from '../utils/dateTimeUtils';
import type { MaterialItem, Transaction } from '../types';

interface RepairManagementProps {
  items: any[];
  transactions: any[];
  customers: any[];
  operatorName?: string;
  onSuccess?: () => void;
  onClose?: () => void;
}

type ManagementTab = 'quarantine' | 'repair' | 'scrap' | 'lost';

const RepairManagement: React.FC<RepairManagementProps> = ({ 
  items, 
  transactions, 
  customers,
  operatorName, 
  onSuccess,
  onClose 
}) => {
  const getDriveThumbnail = (url: string) => {
    if (!url) return '';
    const cleanUrl = url.trim();
    if (cleanUrl.includes('\n') || cleanUrl.includes(' ')) {
      const firstUrl = cleanUrl.split(/[\n\s]+/).filter(Boolean)[0];
      return getDriveThumbnail(firstUrl);
    }
    const match = cleanUrl.match(/\/(?:d|open|uc)\/(?:id=)?([a-zA-Z0-9_-]{25,})/);
    if (match && match[1]) {
      return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w512-h512`;
    }
    return cleanUrl.replace("/view?usp=drivesdk", "").split('?')[0].replace("file/d/", "uc?id=");
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<ManagementTab>('quarantine');
  const [localLoading, setLocalLoading] = useState<number | string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{item: any, action: string, apiAction: string, statusLabel: string, note: string, message: string, qty: number} | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  const getCustomerDetails = (cv: string) => customers.find(c => c.cv === cv);
  const [localItems, setLocalItems] = useState<MaterialItem[]>(items);

  useEffect(() => {
    setLocalItems(items);
  }, [items]);

  const groupedTasks = useMemo(() => {
    const relevantStatus = activeTab === 'quarantine' ? ['รอตรวจ', 'quarantine', 'returned_to_base', 'ถึงออฟฟิศ', 'รับคืน', 'ตรวจสอบ', 'ปกติ', 'รอซ่อม', 'ซาก', 'ชำรุด', 'สูญหาย', 'หาย'] : 
                           (activeTab === 'repair' ? ['ตรวจสอบแล้วพบว่าเสีย', 'ส่งซ่อม', 'repair_qty'] : 
                           (activeTab === 'scrap' ? ['ตรวจสอบแล้วพบว่าเป็นซาก', 'รอจำหน่าย', 'scrap_qty'] : ['ตรวจสอบแล้วพบว่าสูญหาย', 'lost_qty']));
    const sortedTxns = [...transactions].sort((a, b) => new Date(b['วัน-เวลา']).getTime() - new Date(a['วัน-เวลา']).getTime());

    const allTasks: any[] = [];
    localItems.forEach(it => {
      const bucketQty = activeTab === 'quarantine' ? Number(it.quarantine_qty || 0) :
                        (activeTab === 'repair' ? Number(it.repair_qty || 0) : 
                        (activeTab === 'scrap' ? Number(it.scrap_qty || 0) : Number(it.lost_qty || 0)));

      if (bucketQty <= 0) return;

      const it_name = (it.รายการ || it.item_name || it.ประเภท || '').toLowerCase();
      const it_brand = (it.ยี่ห้อหรือรูปแบบ || it.brand || '').toLowerCase();

      let matchTxns = sortedTxns.filter(t => {
        // 🚀 ENHANCED MATCHING: Prefer IDs over name matching
        const tid = t.item_id || t.item?.id;
        const targetId = (it as any).id || it.rowIndex;

        const modelMatch = (tid && targetId) ? Number(tid) === Number(targetId) : 
                           ((t.รายการ || t.item_name || '').toLowerCase() === it_name && (t['ยี่ห้อ/รูปแบบ'] || t.brand || '').toLowerCase() === it_brand);
        
        if (!modelMatch) return false;

        // Status Match
        const statusStr = (t.สถานะ + ' ' + (t['สภาพตู้'] || '')).toLowerCase();
        const matchesStatus = relevantStatus.some(s => statusStr.includes(s.toLowerCase()));
        
        // 🚨 CRITICAL FIX: Explicitly exclude Delivery/Issue keywords in Quarantine/Repair tabs
        const isDeliveryAction = statusStr.includes('ส่ง') || statusStr.includes('เบิก') || statusStr.includes('ออก');
        if ((activeTab === 'quarantine' || activeTab === 'repair') && isDeliveryAction && !statusStr.includes('คืน')) {
          return false;
        }

        return matchesStatus;
      });

      let remainingToAssign = bucketQty;
      for (const txn of matchTxns) {
        if (remainingToAssign <= 0) break;
        const take = Math.min(Number(txn.จำนวน || 1), remainingToAssign);
        allTasks.push({
          ...it,
          รายการ: it.รายการ || it.item_name || it.ประเภท || 'พัสดุ',
          ยี่ห้อหรือรูปแบบ: it.ยี่ห้อหรือรูปแบบ || it.brand || '-',
          displayQty: take,
          txn: txn,
          key: `${(it as any).id || it.rowIndex}-${txn.id || txn.เลขที่รายการ}-${allTasks.length}`
        });
        remainingToAssign -= take;
      }
      if (remainingToAssign > 0) {
        allTasks.push({
          ...it,
          รายการ: it.รายการ || it.item_name || it.ประเภท || 'พัสดุ',
          ยี่ห้อหรือรูปแบบ: it.ยี่ห้อหรือรูปแบบ || it.brand || '-',
          displayQty: remainingToAssign,
          txn: null,
          key: `${(it as any).id || it.rowIndex}-missing-txn-${allTasks.length}`
        });
      }
    });

    const filteredTasks = allTasks.filter(task => {
      const search = searchTerm.toLowerCase();
      return (task.รายการ || '').toLowerCase().includes(search) ||
             (task.ยี่ห้อหรือรูปแบบ || '').toLowerCase().includes(search) ||
             (task.txn?.เลขที่รายการ || '').toLowerCase().includes(search) ||
             (task.txn?.serial_number || '').toLowerCase().includes(search) ||
             (task.txn?.CV || '').toLowerCase().includes(search) ||
             (task.txn?.ผู้แจ้ง || '').toLowerCase().includes(search);
    });

    const groups: { [key: string]: any } = {};
    filteredTasks.forEach(task => {
      const groupId = task.txn?.job_id || task.txn?.jobId || task.txn?.เลขที่รายการ || "NO_ID";
      if (!groups[groupId]) {
        const cvKey = task.txn?.CV || task.txn?.customer_cv || task.txn?.cv;
        const c = getCustomerDetails(cvKey);
        let cName = c?.name || cvKey || "ไม่ทราบลูกค้า";
        if (cName === '99999999') cName = "ไม่ทราบลูกค้า";

        // Collect all 3 note sources from full transaction list for this job
        const allJobTxns = sortedTxns.filter(t =>
          (t.job_id || t.jobId || t.เลขที่รายการ) === groupId
        );
        
        // 1. Job Request Note (Always comes from the job's original 'note' field)
        const jobRequestNote = allJobTxns.find(t => t['หมายเหตุแจ้งงาน'])?.[ 'หมายเหตุแจ้งงาน'] || '';
        
        // 2. Issue Note (Comes from individual 'Issue' transactions where a driver entered a note)
        const issueNote = allJobTxns.find(t =>
          ['เบิก', 'แจ้งส่ง', 'แจ้งคืน', 'จ่ายออก'].some(k => (t.สถานะ || '').includes(k)) && t['หมายเหตุเพิ่มเติม']
        )?.['หมายเหตุเพิ่มเติม'] || '';
        
        // 3. Return Note (Comes from 'Return' transactions where a driver entered a note)
        const returnNote = allJobTxns.find(t =>
          ['รับคืน', 'รอตรวจ', 'สำเร็จ', 'ปิดงาน', 'ถึงออฟฟิศ'].some(k => (t.สถานะ || '').toLowerCase().includes(k.toLowerCase())) && t['หมายเหตุเพิ่มเติม']
        )?.['หมายเหตุเพิ่มเติม'] || '';
        
        // 4. Return Reason (The categorical reason, e.g. "Sales Closed")
        const returnReason = allJobTxns.find(t => t['สาเหตุการคืน'])?.['สาเหตุการคืน'] || '';

        // Full address
        const addressParts = [c?.address, c?.subdistrict, c?.district, c?.province, c?.zipcode].filter(Boolean);

        groups[groupId] = {
          jobId: groupId,
          customer: cName,
          cv: cvKey || '',
          phone: c?.phone || '',
          address: addressParts.join(' '),
          lat: c?.lat || '',
          lng: c?.lng || '',
          date: task.txn?.['วัน-เวลา'] || task.txn?.created_at || new Date().toISOString(),
          opener: task.txn?.ผู้แจ้ง || task.txn?.notifier || '-',
          driver: task.txn?.ผู้ทำรายการ || task.txn?.จัดส่งโดย || '-',
          noteJob: jobRequestNote,
          noteIssue: issueNote,
          noteReturn: returnNote,
          returnReason: returnReason,
          items: []
        };
      }
      groups[groupId].items.push(task);
    });

    return Object.values(groups)
      .filter((g: any) => g.jobId !== 'NO_ID') // ซ่อนรายการที่ไม่มีงานผูกอยู่ (orphaned stock)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [localItems, transactions, searchTerm, activeTab]);

  const stats = useMemo(() => {
    const counts = { quarantine: 0, repair: 0, scrap: 0, lost: 0 };
    
    // Helper to check if an item has a valid Job ID/Transaction match
    const getTabCount = (tab: ManagementTab) => {
      const relevantStatus = tab === 'quarantine' ? ['รอตรวจ', 'quarantine', 'returned_to_base', 'ถึงออฟฟิศ', 'รับคืน', 'ตรวจสอบ', 'ปกติ', 'รอซ่อม', 'ซาก', 'ชำรุด', 'สูญหาย', 'หาย'] : 
                             (tab === 'repair' ? ['ตรวจสอบแล้วพบว่าเสีย', 'ส่งซ่อม', 'repair_qty'] : 
                             (tab === 'scrap' ? ['ตรวจสอบแล้วพบว่าเป็นซาก', 'รอจำหน่าย', 'scrap_qty'] : ['ตรวจสอบแล้วพบว่าสูญหาย', 'lost_qty']));
      
      let tabTotal = 0;
      localItems.forEach(it => {
        const qty = tab === 'quarantine' ? Number(it.quarantine_qty || 0) :
                    (tab === 'repair' ? Number(it.repair_qty || 0) : 
                    (tab === 'scrap' ? Number(it.scrap_qty || 0) : Number(it.lost_qty || 0)));
        if (qty <= 0) return;

        const tid = (it as any).id || it.rowIndex;
        const it_name = (it.รายการ || it.item_name || it.ประเภท || '').toLowerCase();
        const it_brand = (it.ยี่ห้อหรือรูปแบบ || it.brand || '').toLowerCase();

        // Check if any matching transaction exists for this item in this tab's state
        const hasJob = transactions.some(t => {
          const t_item_id = t.item_id || t.item?.id;
          const modelMatch = (t_item_id && tid) ? Number(t_item_id) === Number(tid) : 
                             ((t.รายการ || t.item_name || '').toLowerCase() === it_name && (t['ยี่ห้อ/รูปแบบ'] || t.brand || '').toLowerCase() === it_brand);
          if (!modelMatch) return false;
          
          const statusStr = ((t.สถานะ || '') + ' ' + (t['สภาพตู้'] || '')).toLowerCase();
          const matchesStatus = relevantStatus.some(s => statusStr.includes(s.toLowerCase()));
          const isDeliveryAction = statusStr.includes('ส่ง') || statusStr.includes('เบิก') || statusStr.includes('ออก');
          if ((tab === 'quarantine' || tab === 'repair') && isDeliveryAction && !statusStr.includes('คืน')) return false;
          
          return matchesStatus && (t.job_id || t.jobId || t.เลขที่รายการ);
        });

        if (hasJob) tabTotal += qty;
      });
      return tabTotal;
    };

    return {
      quarantine: getTabCount('quarantine'),
      repair: getTabCount('repair'),
      scrap: getTabCount('scrap'),
      lost: getTabCount('lost')
    };
  }, [localItems, transactions]);

  const handleActionClick = (task: any, action: string) => {
    let confirmMsg = "";
    let apiAction = "issue"; 
    let statusLabel = "";
    let note = "";
    const itemName = task.รายการ || "พัสดุไม่มีชื่อ";
    const qty = task.displayQty;

    if (action === 'repair_done') {
      confirmMsg = `ซ่อมเสร็จแล้ว? (ย้ายเข้าสต๊อกพร้อมใช้)`;
      apiAction = "receive";
      statusLabel = "รับคืนแล้ว";
      note = "ซ่อมเสร็จ เปลี่ยนสถานะเป็นพร้อมใช้งาน";
    } else if (action === 'scrap_sold') {
      confirmMsg = `ยืนยันการจำหน่ายซาก?`;
      apiAction = "issue";
      statusLabel = "รอจำหน่าย";
      note = "อนุมัติจำหน่ายโดยแอดมิน";
    } else if (action === 'confirm_loss') {
      confirmMsg = `ยืนยันพัสดุสูญหาย?`;
      apiAction = "issue";
      statusLabel = "ยืนยันสูญหาย";
      note = "อนุมัติยืนยันสูญหายโดยแอดมิน";
    } else if (action === 'to_scrap') {
      confirmMsg = `ตีเป็นรายการซาก?`;
      apiAction = "receive"; 
      statusLabel = "ชรุดหนัก/รอจำหน่าย";
      note = "ย้ายจากรอซ่อมไปรอจำหน่าย";
    } else if (action === 'quarantine_approve') {
       confirmMsg = `ตรวจสอบแล้วปกติ (พร้อมใช้งาน)?`;
       apiAction = "receive";
       statusLabel = "ตรวจสอบปกติ";
    } else if (action === 'quarantine_to_repair') {
       confirmMsg = `ตรวจสอบแล้วเสีย (ต้องส่งซ่อม)?`;
       apiAction = "receive";
       statusLabel = "ตรวจสอบพบว่าเสีย";
    } else if (action === 'quarantine_to_scrap') {
        confirmMsg = `ตีเป็นรายการซาก (รอจำหน่าย)?`;
        apiAction = "receive";
        statusLabel = "ตรวจสอบพบว่าควรจำหน่าย";
    } else if (action === 'quarantine_to_lost') {
        confirmMsg = `ยืนยันว่าพัสดุสูญหาย?`;
        apiAction = "receive";
        statusLabel = "ตรวจสอบพบว่าสู่หาย";
        note = "ยืนยันสูญหายจากการตรวจสอบคลังกักกัน";
    }

    setConfirmDialog({ item: task, action, apiAction, statusLabel, note, message: confirmMsg, qty });
  };

  const executeAction = async () => {
    if (!confirmDialog) return;
    const { item: task, action, statusLabel, note, qty } = confirmDialog;
    const itemKey = (task as any).id || task.rowIndex;
    if (!itemKey) return;
    
    setConfirmDialog(null);
    setLocalLoading(task.key);
    try {
      const response = await fetch(`${API_URL}/transactions/confirm-repair`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          itemId: itemKey,
          serialNumber: task.txn?.serial_number,
          originalTxnId: task.txn?.id,
          operatorName: operatorName,
          note: note,
          quantity: qty
        })
      });
      const res = await response.json();
      if (res.status === 'success') {
        setLocalItems(prev => prev.map(it => {
          if (String((it as any).id || it.rowIndex) === String(itemKey)) {
             const updated = { ...it };
             if (activeTab === 'quarantine') updated.quarantine_qty = Math.max(0, Number(updated.quarantine_qty || 0) - qty);
             else if (activeTab === 'repair') updated.repair_qty = Math.max(0, Number(updated.repair_qty || 0) - qty);
             else if (activeTab === 'scrap') updated.scrap_qty = Math.max(0, Number(updated.scrap_qty || 0) - qty);
             else if (activeTab === 'lost') updated.lost_qty = Math.max(0, Number(updated.lost_qty || 0) - qty);
             return updated;
          }
          return it;
        }));
        setTimeout(() => { if (onSuccess) onSuccess(); }, 1000);
      } else {
        alert(res.message || "ไม่สามารถทำรายการได้");
      }
    } catch (err: any) {
      alert("เกิดข้อผิดพลาด: " + err.message);
    } finally {
      setLocalLoading(null);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#f8fafc] pb-32">
      {/* 🌊 Minimal Soft UI Header */}
      <div className="relative h-56 bg-gradient-to-br from-white via-indigo-50/30 to-purple-50/30 overflow-hidden border-b border-slate-200/60 shadow-sm">
        <div className="absolute inset-0 opacity-20">
           <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[140%] bg-purple-300 rounded-full blur-[80px]" />
           <div className="absolute bottom-[-20%] left-[-10%] w-[60%] h-[140%] bg-indigo-300 rounded-full blur-[80px]" />
        </div>

        <div className="relative z-10 px-4 pt-10 flex flex-col gap-6 items-start max-w-4xl mx-auto">
          {/* 👀 Search Bar Moved UP as requested */}
          <div className="relative group w-full flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              <input 
                 type="text" 
                 placeholder="ค้นหาพัสดุหรือเลขที่งาน..." 
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 className="w-full h-12 pl-11 pr-4 bg-white/80 backdrop-blur-xl rounded-2xl border border-slate-200 outline-none text-slate-700 text-[13px] font-bold shadow-sm placeholder:text-slate-300 focus:bg-white focus:ring-4 focus:ring-indigo-500/5 transition-all"
              />
            </div>
            <button className="h-12 px-5 bg-indigo-600 text-white rounded-2xl flex items-center justify-center gap-2 font-black text-[12px] uppercase shadow-lg shadow-indigo-100 active:scale-95 transition-all shrink-0">
               <Search size={16} />
               <span>ค้นหา</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-indigo-600 shadow-lg shadow-indigo-100/50 border border-indigo-50">
               <ShieldCheck size={20} />
             </div>
             <div>
               <h1 className="text-xl font-black text-slate-800 tracking-tight">ตรวจสอบและอนุมัติ</h1>
               <p className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em] leading-none mt-1">Approval Queue</p>
             </div>
          </div>
        </div>
      </div>

      {/* 🗂 Compact Tab Switcher */}
      <div className="flex justify-center -mt-6 px-4 relative z-20 max-w-4xl mx-auto w-full">
        <div className="bg-white/80 backdrop-blur-2xl p-1 rounded-2xl border border-slate-200 shadow-[0_12px_24px_-8px_rgba(0,0,0,0.1)] flex items-center gap-1 w-full overflow-hidden">
             {[
              { id: 'quarantine', label: 'รอตรวจ', icon: ShieldCheck, count: stats.quarantine, color: 'text-indigo-600' },
              { id: 'repair', label: 'รอซ่อม', icon: Wrench, count: stats.repair, color: 'text-purple-600' },
              { id: 'scrap', label: 'จำหน่าย', icon: ShoppingBag, count: stats.scrap, color: 'text-amber-600' },
              { id: 'lost', label: 'สูญหาย', icon: FileSearch, count: stats.lost, color: 'text-rose-600' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as ManagementTab)}
                className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-xl transition-all relative ${
                  activeTab === tab.id 
                    ? 'bg-slate-900 text-white shadow-xl scale-100' 
                    : 'text-slate-400 hover:text-slate-600 scale-95'
                }`}
              >
                 <tab.icon size={15} />
                 <span className="text-[10px] font-black tracking-tight">{tab.label}</span>
                 {tab.count > 0 && (
                   <span className={`absolute top-1 right-2 px-1 py-0.5 rounded-md text-[8px] font-black ${
                     activeTab === tab.id ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-500'
                   }`}>
                     {tab.count}
                   </span>
                 )}
              </button>
           ))}
        </div>
      </div>

      {/* Main List Area */}
      <div className="px-3 py-6 space-y-6 max-w-4xl mx-auto w-full">
        {groupedTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 opacity-40">
            <ShieldCheck size={64} className="mb-4 text-slate-200" />
            <p className="text-lg font-black text-slate-400 uppercase tracking-widest">ตรวจสอบครบแล้ว</p>
            <p className="text-sm font-bold text-slate-300 mt-1">ไม่พบรายการค้างในหมวดหมู่ {activeTab}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8">
            {groupedTasks.map((group) => (
               <div key={group.jobId} className="bg-white rounded-[1.5rem] border border-slate-200/60 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-all duration-300">
                {/* Visual Status Bar */}
                <div className={`h-1 w-full ${activeTab === 'quarantine' ? 'bg-indigo-500' : (activeTab === 'repair' ? 'bg-purple-500' : (activeTab === 'scrap' ? 'bg-amber-500' : 'bg-rose-500'))}`} />
                
                {/* ✅ Job Header - Full Metadata */}
                <div className="px-5 py-5 bg-slate-50/50 border-b border-slate-100 flex flex-col gap-4">
                  {/* Row 1: Customer name + Job ID + date */}
                  <div className="flex flex-col gap-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-900 rounded-[1.2rem] flex items-center justify-center text-white shadow-lg shadow-slate-200 shrink-0">
                          <History size={24} />
                        </div>
                        <div>
                          <h3 className="text-[17px] font-black text-slate-800 leading-tight flex items-center gap-2 flex-wrap">
                            {group.customer || "ไม่ทราบชื่อลูกค้า"}
                            <span className="px-2.5 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black rounded-lg border border-indigo-100/50">
                              {group.jobId}
                            </span>
                            {group.items.some((it: any) => {
                              const s = (it.txn?.['สภาพตู้'] || '').toLowerCase();
                              return s && !['ปกติ', 'พร้อมใช้', 'สมบูรณ์', 'success', 'ปกติ(รอตรวจ)'].includes(s);
                            }) && (
                              <span className="px-2.5 py-1 bg-rose-600 text-white text-[9px] font-black rounded-lg shadow-sm flex items-center gap-1 animate-pulse">
                                <AlertTriangle size={10} />
                                RIDER CLAIMED
                              </span>
                            )}
                          </h3>
                          <div className="flex items-center gap-1.5 mt-1 opacity-60">
                            <span className="material-symbols-outlined text-[14px] text-slate-500">schedule</span>
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                              {formatThaiDateTime(group.date)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* CV + Phone + Address + Map pill */}
                    {group.cv && (
                      <div className="bg-white border border-slate-100 rounded-2xl px-4 py-3 flex flex-col gap-2 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] w-full">
                        {/* CV row */}
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Customer CV</span>
                            <p className="text-[15px] font-black text-slate-800 leading-none">{group.cv}</p>
                          </div>
                          {group.phone && (
                            <>
                              <div className="w-px h-8 bg-slate-100" />
                              <div className="flex flex-col gap-0.5 pl-2">
                                <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Contact</span>
                                <a href={`tel:${group.phone}`} className="text-[15px] font-black text-indigo-600 leading-none hover:underline">{group.phone}</a>
                              </div>
                            </>
                          )}
                        </div>
                        {/* Address row */}
                        {group.address && (
                          <p className="text-[12px] text-slate-500 font-medium leading-snug border-t border-slate-50 pt-2.5">{group.address}</p>
                        )}
                        {/* Map button */}
                        {(group.lat && group.lng && group.lat !== '' && group.lng !== '') && (
                          <a
                            href={`https://www.google.com/maps?q=${group.lat},${group.lng}`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center justify-center gap-2 h-9 mt-1 bg-indigo-50/50 border border-indigo-100 text-indigo-600 text-[11px] font-black uppercase rounded-xl tracking-widest hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all shadow-sm"
                          >
                            <span className="material-symbols-outlined text-[16px]">map</span>
                            ดูแผนที่
                          </a>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Row 2: Opener + Driver grid */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white border border-slate-100 rounded-xl px-3 py-2">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">ผู้เปิดงาน / แจ้ง</span>
                      <p className="text-[12px] font-black text-slate-700 leading-tight">
                        {group.opener !== '-' ? group.opener : <span className="text-slate-300">-</span>}
                      </p>
                    </div>
                    <div className="bg-white border border-slate-100 rounded-xl px-3 py-2">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">ผู้ไปรับคืน</span>
                      <p className="text-[12px] font-black text-slate-700 leading-tight">
                        {group.driver !== '-' ? group.driver : <span className="text-slate-300">-</span>}
                      </p>
                    </div>
                  </div>

                  {/* Row 3: Notes (Timeline style) */}
                  {(group.noteJob || group.noteIssue || group.noteReturn || group.returnReason) && (
                    <div className="flex flex-col gap-2">
                      <div className="px-3 py-1 flex items-center justify-between opacity-40">
                         <span className="text-[10px] font-black uppercase tracking-[0.2em]">Transaction Audit Trail</span>
                         <span className="material-symbols-outlined text-[14px]">history</span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {/* 1. Request Phase */}
                        <div className={`p-4 rounded-2xl border transition-all ${group.noteJob ? 'bg-indigo-50/50 border-indigo-100 shadow-sm' : 'bg-slate-50/30 border-slate-100 opacity-40'}`}>
                           <div className="flex items-center gap-2 mb-2">
                              <span className="material-symbols-outlined text-[16px] text-indigo-400">add_task</span>
                              <span className="text-[9px] font-black uppercase tracking-widest text-indigo-400">Step 1: แจ้งงาน</span>
                           </div>
                           <p className="text-[12px] font-bold text-slate-700 leading-snug">
                             {group.noteJob || <span className="font-normal italic opacity-50">ไม่มีหมายเหตุ</span>}
                           </p>
                        </div>

                        {/* 2. Logistics Phase */}
                        <div className={`p-4 rounded-2xl border transition-all ${group.noteIssue ? 'bg-amber-50/50 border-amber-100 shadow-sm' : 'bg-slate-50/30 border-slate-100 opacity-40'}`}>
                           <div className="flex items-center gap-2 mb-2">
                              <span className="material-symbols-outlined text-[16px] text-amber-500">local_shipping</span>
                              <span className="text-[9px] font-black uppercase tracking-widest text-amber-500">Step 2: เบิกของ/ขนส่ง</span>
                           </div>
                           <p className="text-[12px] font-bold text-slate-700 leading-snug">
                             {group.noteIssue || <span className="font-normal italic opacity-50">ไม่มีหมายเหตุ</span>}
                           </p>
                        </div>

                        {/* 3. Return Phase */}
                        <div className={`p-4 rounded-2xl border transition-all ${(group.noteReturn || group.returnReason) ? 'bg-rose-50/50 border-rose-100 shadow-sm' : 'bg-slate-50/30 border-slate-100 opacity-40'}`}>
                           <div className="flex items-center gap-2 mb-2">
                              <span className="material-symbols-outlined text-[16px] text-rose-500">assignment_return</span>
                              <span className="text-[9px] font-black uppercase tracking-widest text-rose-500">Step 3: รับคืน/รอตรวจ</span>
                           </div>
                           <div className="flex flex-col gap-1">
                             {group.returnReason && (
                               <div className="bg-rose-100/50 px-2 py-0.5 rounded text-[10px] font-black text-rose-700 w-fit mb-1">{group.returnReason}</div>
                             )}
                             <p className="text-[12px] font-bold text-slate-700 leading-snug">
                                {group.noteReturn || <span className="font-normal italic opacity-50">ไม่มีหมายเหตุเพิ่มเติม</span>}
                             </p>
                           </div>
                        </div>
                      </div>
                    </div>
                  )}

                </div>

                <div className="p-3 space-y-3">
                  {group.items.map((item: any) => {
                    const isLoading = localLoading === item.key;
                    return (
                      <div key={item.key} className="bg-white p-4 rounded-2xl border border-slate-100 hover:border-indigo-200 transition-all group overflow-hidden relative">

                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                          <div className="flex items-start gap-3 flex-1">
                            <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-sm">
                              <Package size={18} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${activeTab === 'quarantine' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : (activeTab === 'repair' ? 'bg-purple-50 text-purple-600 border-purple-100' : (activeTab === 'scrap' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-rose-50 text-rose-600 border-rose-100'))}`}>
                                  {activeTab === 'quarantine' ? 'รอตรวจสอบ' : (activeTab === 'repair' ? 'ส่งซ่อม' : (activeTab === 'scrap' ? 'จำหน่ายซาก' : 'ศูนย์หาย'))}
                                </span>

                                <h4 className="text-[14px] font-black text-slate-800 leading-tight uppercase truncate pr-14">
                                  {item.รายการ}
                                </h4>
                                <span className="text-[12px] font-black text-slate-300">x{item.displayQty}</span>
                              </div>
                              <div className="flex items-center gap-2 flex-wrap text-[11px] font-bold text-slate-500 mt-2">
                                <span className="bg-slate-100 px-2 py-0.5 rounded-lg uppercase tracking-tight">{item.ยี่ห้อหรือรูปแบบ} {item.ขนาด}</span>
                                {item.txn?.serial_number && (
                                  <span className="text-white bg-slate-900 px-2 py-0.5 rounded-lg font-black flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[12px]">barcode_scanner</span>
                                    S/N: {item.txn.serial_number}
                                  </span>
                                )}
                              </div>
                              
                              <div className="mt-4 space-y-2">
                                {item.txn?.['สาเหตุการคืน'] && (
                                  <div className="p-3 bg-rose-50/50 border border-rose-100 rounded-2xl flex items-start gap-3 shadow-sm shadow-rose-100/20">
                                    <div className="w-6 h-6 bg-rose-100 rounded-lg flex items-center justify-center text-rose-600 shrink-0">
                                      <AlertTriangle size={14} />
                                    </div>
                                    <div className="flex-1">
                                       <span className="text-[9px] font-black text-rose-400 uppercase tracking-widest block mb-1">สาเหตุการคืน</span>
                                       <p className="text-[13px] font-bold text-rose-700 leading-snug">
                                          {item.txn['สาเหตุการคืน']}
                                       </p>
                                    </div>
                                  </div>
                                )}

                                {(item.txn?.['สภาพตู้'] || item.txn?.['สถานะ']) && (() => {
                                  const rawStatus = (item.txn?.['สภาพตู้'] || item.txn?.['สถานะ'] || '').trim();
                                  const isRiderClaim = rawStatus && !['ปกติ', 'พร้อมใช้', 'สมบูรณ์', 'success', 'ปกติ(รอตรวจ)', 'รอตรวจ', 'รอตรวจสอบ', 'waiting'].includes(rawStatus.toLowerCase());
                                  
                                  let displayLabel = rawStatus;
                                  let badgeStyles = "bg-emerald-50 border-emerald-100 text-emerald-600";
                                  let iconColor = "text-emerald-500";
                                  let dotColor = "bg-emerald-500";

                                  if (rawStatus.includes('สูญหาย') || rawStatus.includes('หาย')) {
                                    displayLabel = 'พัสดุสูญหาย';
                                    badgeStyles = "bg-rose-600 border-rose-700 text-white shadow-lg shadow-rose-200";
                                    iconColor = "text-white";
                                    dotColor = "bg-white";
                                  } else if (rawStatus.includes('ซาก') || rawStatus.includes('ชำรุดหนัก')) {
                                    displayLabel = 'ชำรุดหนัก/ซาก';
                                    badgeStyles = "bg-slate-900 border-slate-950 text-white shadow-lg shadow-slate-200";
                                    iconColor = "text-slate-400";
                                    dotColor = "bg-white";
                                  } else if (rawStatus.includes('ซ่อม') || rawStatus.includes('เสีย') || rawStatus.includes('ชำรุด')) {
                                    displayLabel = 'รอส่งซ่อม';
                                    badgeStyles = "bg-purple-100 border-purple-200 text-purple-700 shadow-sm";
                                    iconColor = "text-purple-500";
                                    dotColor = "bg-purple-600";
                                  } else if (isRiderClaim) {
                                    badgeStyles = "bg-amber-100 border-amber-200 text-amber-700 shadow-sm";
                                    iconColor = "text-amber-500";
                                    dotColor = "bg-amber-600";
                                  }

                                  return (
                                    <div className={`p-4 border rounded-3xl flex items-center gap-4 transition-all ${badgeStyles} group/status`}>
                                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 bg-white/20 backdrop-blur-md shadow-inner`}>
                                        {rawStatus.includes('สูญหาย') ? <AlertCircle size={20} /> : 
                                         rawStatus.includes('ซาก') ? <ShoppingBag size={20} /> : 
                                         rawStatus.includes('ซ่อม') ? <Wrench size={20} /> : <CheckCircle2 size={20} />}
                                      </div>
                                      <div className="flex-1 flex flex-col">
                                         <div className="flex items-center gap-2">
                                           {isRiderClaim && (
                                             <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/30 text-[9px] font-black uppercase tracking-wider">
                                               <span className={`w-1 h-1 rounded-full animate-pulse ${dotColor}`} />
                                               Rider Claim
                                             </span>
                                           )}
                                           <span className="text-[10px] font-black uppercase tracking-widest opacity-60">สภาพเมื่อรับกลับ</span>
                                         </div>
                                         <p className="text-[17px] font-black leading-tight mt-0.5">
                                            {displayLabel}
                                         </p>
                                      </div>
                                      {isRiderClaim && (
                                        <div className="hidden md:flex flex-col items-end opacity-60">
                                          <span className="text-[9px] font-black uppercase tracking-widest whitespace-nowrap">Requires Admin</span>
                                          <span className="text-[10px] font-bold">Review</span>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center justify-center gap-2 pt-3 mt-1 border-t border-slate-50">
                            {activeTab === 'quarantine' ? (
                                <>
                                  <button onClick={() => handleActionClick(item, 'quarantine_approve')} disabled={!!isLoading} className="h-9 px-4 bg-emerald-600 text-white rounded-xl flex items-center justify-center gap-2 text-[11px] font-black uppercase shadow-sm disabled:opacity-50 active:scale-95 transition-all">
                                    <CheckCircle2 size={13} /> <span>ปกติ</span>
                                  </button>
                                  <button onClick={() => handleActionClick(item, 'quarantine_to_repair')} disabled={!!isLoading} className="h-9 px-4 bg-purple-600 text-white rounded-xl flex items-center justify-center gap-2 text-[11px] font-black uppercase shadow-sm disabled:opacity-50 active:scale-95 transition-all">
                                    <Wrench size={13} /> <span>ส่งซ่อม</span>
                                  </button>
                                  <button onClick={() => handleActionClick(item, 'quarantine_to_scrap')} disabled={!!isLoading} className="h-9 px-4 bg-amber-500 text-white rounded-xl flex items-center justify-center gap-2 text-[11px] font-black uppercase shadow-sm disabled:opacity-50 active:scale-95 transition-all">
                                    <Trash2 size={13} /> <span>จำหน่าย</span>
                                  </button>
                                  <button onClick={() => handleActionClick(item, 'quarantine_to_lost')} disabled={!!isLoading} className="h-9 px-4 bg-rose-600 text-white rounded-xl flex items-center justify-center gap-2 text-[11px] font-black uppercase shadow-sm disabled:opacity-50 active:scale-95 transition-all">
                                    <ShieldCheck size={13} /> <span>สูญหาย</span>
                                  </button>
                                </>
                            ) : activeTab === 'repair' ? (
                                <>
                                  <button onClick={() => handleActionClick(item, 'repair_done')} disabled={!!isLoading} className="h-10 px-6 bg-emerald-600 text-white rounded-xl flex items-center justify-center gap-2 text-[11px] font-black uppercase active:scale-95 transition-all shadow-sm disabled:opacity-50">
                                    {isLoading ? <RefreshCw size={13} className="animate-spin" /> : <CheckCircle2 size={13} />} <span>ซ่อมเสร็จ</span>
                                  </button>
                                  <button onClick={() => handleActionClick(item, 'to_scrap')} disabled={!!isLoading} className="h-10 px-6 bg-amber-500 text-white rounded-xl flex items-center justify-center gap-2 text-[11px] font-black uppercase active:scale-95 transition-all shadow-sm disabled:opacity-50">
                                    {isLoading ? <RefreshCw size={13} className="animate-spin" /> : <Trash2 size={13} />} <span>ตีของเสีย</span>
                                  </button>
                                </>
                            ) : activeTab === 'scrap' ? (
                                <button onClick={() => handleActionClick(item, 'scrap_sold')} disabled={!!isLoading} className="h-10 px-8 bg-amber-600 text-white rounded-xl flex items-center justify-center gap-2 text-[11px] font-black uppercase active:scale-95 transition-all shadow-md disabled:opacity-50">
                                  {isLoading ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} <span>อนุมัติจำหน่าย</span>
                                </button>
                            ) : (
                                <button onClick={() => handleActionClick(item, 'confirm_loss')} disabled={!!isLoading} className="h-10 px-8 bg-rose-600 text-white rounded-xl flex items-center justify-center gap-2 text-[11px] font-black uppercase active:scale-95 transition-all shadow-md disabled:opacity-50">
                                  {isLoading ? <RefreshCw size={14} className="animate-spin" /> : <ShieldCheck size={14} />} <span>ยืนยันสูญหาย</span>
                                </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 📸 Consolidated Evidence Section at Bottom */}
                {(() => {
                   const evidenceString = group.items.find((it: any) => it.txn?.รูปภาพประกอบ)?.txn?.รูปภาพประกอบ;
                   if (!evidenceString) return null;
                   const rawPhotos = String(evidenceString).split(/[\n\s]+/).filter(Boolean);
                   
                   return (
                     <div className="px-5 pb-5 pt-2 border-t border-slate-50 bg-slate-50/20">
                        <div className="flex items-center gap-2 mb-3 grayscale-[0.5] opacity-50">
                           <Camera size={14} />
                           <span className="text-[10px] font-black uppercase tracking-[0.2em]">หลักฐานรูปถ่าย (Evidence)</span>
                        </div>
                        <div className="flex flex-wrap gap-3">
                           {rawPhotos.map((url, i) => {
                              let imgSrc = getDriveThumbnail(url);
                              if (!imgSrc.startsWith('http') && !imgSrc.startsWith('data:')) {
                                imgSrc = `${API_URL}/uploads/${imgSrc}`;
                              }
                              return (
                                <div key={i} className="relative group/evidence rounded-2xl overflow-hidden border border-slate-200 bg-white aspect-square w-20 shadow-sm hover:shadow-md transition-all">
                                   <img 
                                     src={imgSrc} 
                                     alt="evidence" 
                                     className="w-full h-full object-cover cursor-pointer group-hover/evidence:scale-110 transition-transform duration-500" 
                                     onClick={() => setPreviewImage(imgSrc)}
                                     onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/200x200?text=Error'; }}
                                   />
                                   <div 
                                     className="absolute inset-0 bg-black/40 opacity-0 group-hover/evidence:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                                     onClick={() => setPreviewImage(imgSrc)}
                                   >
                                      <Eye size={20} className="text-white" />
                                   </div>
                                   {url.startsWith('http') && (
                                      <a 
                                        href={url} target="_blank" rel="noreferrer"
                                        className="absolute top-1 right-1 w-6 h-6 bg-white/90 backdrop-blur-sm rounded-lg flex items-center justify-center text-slate-600 hover:bg-white hover:text-indigo-600 transition-colors shadow-sm"
                                        onClick={e => e.stopPropagation()}
                                      >
                                         <ExternalLink size={12} />
                                      </a>
                                   )}
                                </div>
                              );
                           })}
                        </div>
                     </div>
                   );
                })()}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 🛑 Custom Confirmation Modal */}
      {confirmDialog && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl p-6 md:p-8 w-full max-w-sm animate-scale-in flex flex-col items-center text-center">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
              activeTab === 'repair' ? 'bg-emerald-100 text-emerald-600' : 
              activeTab === 'scrap' ? 'bg-amber-100 text-amber-600' : 'bg-rose-100 text-rose-600'
            }`}>
              {activeTab === 'repair' ? <CheckCircle2 size={32} /> : 
               activeTab === 'scrap' ? <Trash2 size={32} /> : <ShieldCheck size={32} />}
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2 leading-none uppercase">ยืนยันการทำรายการ</h3>
            <p className="text-slate-500 font-bold text-[9px] uppercase tracking-[0.2em] mb-6 opacity-60">Verification Process</p>
            <p className="text-slate-600 font-medium text-sm whitespace-pre-wrap">{confirmDialog.message}</p>
            <div className="flex gap-3 w-full mt-8">
              <button onClick={() => setConfirmDialog(null)} className="flex-1 h-12 bg-slate-100 text-slate-600 font-bold rounded-xl active:scale-95 transition-all">ยกเลิก</button>
              <button onClick={executeAction} className={`flex-1 h-12 text-white font-bold rounded-xl active:scale-95 transition-all shadow-lg ${activeTab === 'quarantine' ? 'bg-indigo-600 shadow-indigo-200' : activeTab === 'repair' ? 'bg-emerald-600 shadow-emerald-200' : 'bg-rose-600 shadow-rose-200'}`}>ยืนยัน</button>
            </div>
          </div>
        </div>
      )}

      {/* 🖼️ Image Preview Lightbox */}
      {previewImage && (
        <div 
          className="fixed inset-0 bg-slate-900/95 backdrop-blur-2xl z-[10000] flex flex-col items-center justify-center p-4 animate-fade-in"
          onClick={() => setPreviewImage(null)}
        >
           <div className="relative max-w-full max-h-full flex flex-col items-center justify-center gap-8" onClick={e => e.stopPropagation()}>
              <img 
                src={previewImage} 
                className="max-w-[95vw] max-h-[80vh] rounded-[2.5rem] shadow-2xl border-4 border-white/10"
                alt="preview"
              />
              
              <button 
                className="w-16 h-16 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center backdrop-blur-md border border-white/20 transition-all active:scale-90 hover:scale-110"
                onClick={() => setPreviewImage(null)}
              >
                 <span className="material-symbols-outlined text-[32px]">close</span>
              </button>
           </div>
        </div>
      )}
    </div>
  );
};

export default RepairManagement;
