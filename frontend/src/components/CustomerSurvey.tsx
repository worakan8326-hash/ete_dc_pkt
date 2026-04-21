import React, { useState, useMemo, useCallback } from 'react';
import { 
  Search, 
  MapPin, 
  Camera, 
  Save, 
  X, 
  CheckCircle, 
  Phone, 
  Navigation,
  ArrowLeft,
  RefreshCw,
  Package,
  Compass,
  ArrowRight,
  Edit,
  ZoomIn,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { saveCustomer, processBatchTransaction, getNextTxnNo } from '../api';
import ResultsMapModal from './ResultsMapModal';
import { ImageLightbox } from './CommonUI';
import { CustomerSurveyHistory } from './CustomerSurveyHistory';
import CustomerQuickEdit from './CustomerQuickEdit';
import { useThaiAddress } from '../hooks/useThaiAddress';
import { usePossession } from '../hooks/usePossession';
import { TRANSACTION_STATUSES } from '../constants/logisticsConstants';
import type { Customer, Transaction, MaterialItem } from '../types';

interface Props {
  items: MaterialItem[];
  customers: Customer[];
  transactions: Transaction[];
  logisticsJobs?: any[];
  operatorName: string;
  onRefresh: () => void;
  onClose: () => void;
  thaiAddressData: any[]; 
}

/**
 * 🕵️ Helper: Find master photo from any potential key
 */
const getMasterPhoto = (c: any) => {
  if (!c) return null;
  const priorityKeys = ['image_url', 'Image_URL', 'image_Url', 'imageURL', 'photo_url'];
  for (const key of priorityKeys) {
    if (c[key] && typeof c[key] === 'string' && c[key].length > 10) return c[key];
  }
  const allKeys = Object.keys(c);
  for (const key of allKeys) {
    const lowerKey = key.toLowerCase();
    const val = c[key];
    if (typeof val !== 'string') continue;
    if ((lowerKey.includes('image') || lowerKey.includes('photo')) && (val.startsWith('http') || val.startsWith('data:image'))) {
      return val;
    }
  }
  return null;
};

export default function CustomerSurvey({ 
  items, 
  customers, 
  transactions, 
  logisticsJobs = [],
  operatorName, 
  onRefresh, 
  onClose, 
  thaiAddressData = [] 
}: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerDraft, setCustomerDraft] = useState<Customer | null>(null);
  const [isReadOnly, setIsReadOnly] = useState(true);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [note, setNote] = useState('');
  const [newLocation, setNewLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isNearbyMode, setIsNearbyMode] = useState(false);
  const [showResultsMap, setShowResultsMap] = useState(false);
  const [showQuickEdit, setShowQuickEdit] = useState(false);

  // --- Externalized Hooks ---
  const { availableDistricts, availableSubdistricts } = useThaiAddress(
    thaiAddressData, 
    customerDraft?.province || '', 
    customerDraft?.district || ''
  );

  const possessionList = usePossession(transactions, selectedCustomer?.cv, logisticsJobs);

  const customerHistory = useMemo(() => {
    if (!selectedCustomer) return [];
    return transactions
      .filter(t => {
        const tCv = String(t.CV || t.cv || '').trim();
        const sCv = String(selectedCustomer.cv || '').trim();
        return tCv === sCv && sCv !== '';
      })
      .sort((a, b) => new Date(b['วัน-เวลา']).getTime() - new Date(a['วัน-เวลา']).getTime())
      .slice(0, 5);
  }, [selectedCustomer, transactions]);

  // --- Callbacks ---
  const handleSelectCustomer = useCallback((c: Customer) => {
    setSelectedCustomer(c);
    setCustomerDraft({...c});
    setIsReadOnly(true);
    setShowResultsMap(false);
  }, []);

  const handleAddNewCustomer = useCallback(() => {
    setShowQuickEdit(true);
  }, []);

  // --- Business Logic ---
  const calculateDistance = useCallback((lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; 
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2); 
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }, []);

  const handleSearch = useCallback((overrideNearby?: boolean, overrideLoc?: {lat: number, lng: number}) => {
    setLoading(true);
    const nearby = overrideNearby !== undefined ? overrideNearby : isNearbyMode;
    const loc = overrideLoc || userLocation;

    let list = [...customers];
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      list = list.filter(c => String(c.cv || c.CV || '').toLowerCase().includes(lower) || String(c.name || '').toLowerCase().includes(lower));
    }

    if (nearby && loc) {
      list = list.map(c => {
        const cLat = parseFloat(String(c.lat || ''));
        const cLng = parseFloat(String(c.lng || ''));
        const dist = (!isNaN(cLat) && !isNaN(cLng)) ? calculateDistance(loc.lat, loc.lng, cLat, cLng) : 999999;
        return { ...c, distanceValue: dist };
      }).sort((a, b) => (a as any).distanceValue - (b as any).distanceValue);
    }

    setSearchResults(list.slice(0, 50)); 
    setLoading(false);
  }, [searchTerm, isNearbyMode, userLocation, customers, calculateDistance]);

  const handleNearbyToggle = () => {
    if (isNearbyMode) {
      setIsNearbyMode(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    if (!navigator.geolocation) {
      setError("อุปกรณ์ไม่รองรับการจับพิกัด");
      setLoading(false); return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => { 
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        setIsNearbyMode(true);
        handleSearch(true, loc); 
      },
      () => { 
        setError("ไม่สามารถเข้าถึงตำแหน่งได้ กรุณาเปิด GPS"); 
        setLoading(false); 
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleGetLocation = () => {
    setLoading(true);
    setError(null);
    if (!navigator.geolocation) {
      setError("อุปกรณ์ไม่รองรับการจับพิกัด");
      setLoading(false); return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => { setNewLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLoading(false); },
      () => { setError("ไม่สามารถเข้าถึงพิกัดได้ กรุณาเปิด GPS"); setLoading(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSaveSurvey = useCallback(async () => {
    if (!selectedCustomer || !customerDraft) return;
    setSaving(true);
    setError(null);
    try {
      const txnNo = await getNextTxnNo();
      
      // 1. Process Survey Transaction
      await processBatchTransaction({
        action: 'survey', 
        items: [{ activity_name: 'งานสำรวจลูกค้า', quantity: 1 }],
        cv: selectedCustomer.cv,
        deliveryBy: operatorName,
        deliveryDate: new Date().toISOString().split('T')[0],
        txnNo,
        operator: operatorName,
        note: note || `[SURVEY] บันทึกการสำรวจโดย ${operatorName}`,
        workZone: '',
        status: TRANSACTION_STATUSES.SURVEYING,
        photos,
        lat: newLocation?.lat.toString() || customerDraft.lat?.toString() || '',
        lng: newLocation?.lng.toString() || customerDraft.lng?.toString() || ''
      });

      // 2. Save/Update Customer Info
      await saveCustomer({
        ...customerDraft,
        lat: newLocation?.lat || customerDraft.lat || 0,
        lng: newLocation?.lng || customerDraft.lng || 0,
        image_url: photos.length > 0 ? photos[0] : customerDraft.image_url
      });

      setSuccess(true);
      onRefresh();
      setTimeout(() => {
        setSuccess(false);
        setSelectedCustomer(null);
        setCustomerDraft(null);
        setIsReadOnly(true);
        setPhotos([]);
      }, 3000);
    } catch (err: any) {
      setError(`บันทึกไม่สำเร็จ: ${err.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  }, [selectedCustomer, customerDraft, operatorName, note, photos, newLocation, onRefresh]);

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mb-6 shadow-xl border-4 border-white">
          <CheckCircle size={48} />
        </div>
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">บันทึกสำเร็จ!</h2>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-4 pb-32 px-4 space-y-6 font-sans">
      <div className="flex items-center gap-4 mb-2">
         <button onClick={() => selectedCustomer ? setSelectedCustomer(null) : onClose()} className="w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-800 transition-colors">
            <ArrowLeft size={20} />
         </button>
         <div>
            <h1 className="text-xl font-black text-slate-800 tracking-tight uppercase leading-none">Survey</h1>
            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mt-1">Site Investigation</p>
         </div>
      </div>

      <ImageLightbox isOpen={!!previewImage} imageUrl={previewImage || ''} onClose={() => setPreviewImage(null)} />
      <ResultsMapModal 
        isOpen={showResultsMap} 
        onClose={() => setShowResultsMap(false)} 
        customers={searchResults} 
        userLocation={userLocation} 
        onSelectCustomer={handleSelectCustomer}
      />

      {!selectedCustomer ? (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex flex-col space-y-3">
             <div className="flex gap-2">
                <div className="relative flex-1">
                   <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                   <input
                     type="text"
                     placeholder="พิมพ์รหัส CV หรือชื่อร้าน..."
                     value={searchTerm}
                     onChange={(e) => setSearchTerm(e.target.value)}
                     onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                     className="w-full h-16 bg-white border border-slate-200 rounded-2xl pl-16 pr-6 text-sm font-bold shadow-sm outline-none focus:border-emerald-500 transition-all"
                   />
                </div>
                <button 
                  onClick={handleNearbyToggle} 
                  disabled={loading}
                  className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg transition-all ${isNearbyMode ? 'bg-primary text-white' : 'bg-white text-slate-400 border border-slate-100'}`}
                >
                  <Compass size={24} className={loading && isNearbyMode ? 'animate-spin' : ''} />
                </button>
             </div>

             <div className="flex gap-2">
                <button onClick={() => handleSearch()} disabled={loading} className="flex-1 h-12 bg-indigo-600 text-white rounded-xl font-black text-[12px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 transition-all">
                    {loading && !isNearbyMode ? <RefreshCw size={18} className="animate-spin" /> : <Search size={18} />} กดเพื่อค้นหาลูกค้า
                </button>
                <button 
                  onClick={handleAddNewCustomer} 
                  className="flex-1 h-12 bg-emerald-500 text-white rounded-xl font-black text-[12px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95"
                >
                   <CheckCircle size={18} /> เพิ่มลูกค้าใหม่
                </button>
             </div>
             {isNearbyMode && searchResults.length > 0 && (
                <button 
                  onClick={() => setShowResultsMap(true)} 
                  className="w-full h-12 bg-slate-800 text-white rounded-xl font-black text-[12px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg transition-all"
                >
                  <MapPin size={18} /> ดูแผนที่ร้านรอบตัว
                </button>
             )}
          </div>
          <div className="space-y-2">
            {searchResults.map(c => (
              <button key={c.cv} onClick={() => handleSelectCustomer(c)} className="w-full flex items-center justify-between p-5 bg-white border border-slate-100 rounded-[1.8rem] hover:border-emerald-500/30 transition-all active:scale-[0.98] text-left group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-emerald-100 group-hover:text-emerald-600 transition-colors">
                    <Navigation size={22} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-800">{c.name}</h3>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      <div className="bg-slate-900 px-3 py-1 rounded-lg shadow-sm">
                        <p className="text-[15px] font-black text-white uppercase tracking-wider">CV: {c.cv}</p>
                      </div>
                      {(c as any).distanceValue !== undefined && (c as any).distanceValue < 999999 && (
                        <div className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-md text-[9px] font-black uppercase">
                          ห่างประมาณ { (c as any).distanceValue.toFixed(2) } กม.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <ArrowRight size={20} className="text-slate-200 group-hover:text-emerald-500 transition-colors" />
              </button>
            ))}
          </div>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
               <div className="bg-[#0b1b32] p-8 text-white relative">
                  <div className="flex items-center justify-between">
                     <div>
                        <h2 className="text-2xl font-black tracking-tight">{isReadOnly ? 'ข้อมูลลูกค้า' : 'แก้ไขข้อมูลลูกค้า'}</h2>
                        <div className="inline-block bg-black px-3 py-1 rounded-lg mt-2 shadow-lg border border-white/10">
                           <p className="text-[15px] font-black text-white uppercase">CV: {selectedCustomer.cv}</p>
                        </div>
                     </div>
                     <button onClick={() => setIsReadOnly(!isReadOnly)} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isReadOnly ? 'bg-white/10 text-white/60' : 'bg-emerald-500 text-white shadow-lg'}`}>
                        {isReadOnly ? <Edit size={18} /> : <X size={18} />}
                     </button>
                  </div>
               </div>
               
               <div className="p-8 space-y-6">
                  {customerDraft && (
                    <div className="grid grid-cols-1 gap-5 text-left">
                       <div className="flex flex-col">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">ชื่อร้าน/ลูกค้า:</span>
                          {isReadOnly ? <div className="px-4 py-3.5 bg-slate-50 rounded-2xl font-bold text-slate-800">{customerDraft.name}</div> : <input type="text" value={customerDraft.name} onChange={e => setCustomerDraft({...customerDraft, name: e.target.value})} className="px-4 py-3.5 bg-white rounded-2xl border border-emerald-500/30 font-bold text-slate-800 outline-none shadow-sm focus:border-emerald-500" />}
                       </div>

                       <div className="flex flex-col">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">เบอร์โทรศัพท์:</span>
                          {isReadOnly ? <div className="px-4 py-3.5 bg-slate-50 rounded-2xl font-bold text-slate-800 flex items-center gap-2"><Phone size={14} className="text-emerald-500" /> {customerDraft.phone || '-'}</div> : <input type="text" value={customerDraft.phone || ''} onChange={e => setCustomerDraft({...customerDraft, phone: e.target.value})} className="px-4 py-3.5 bg-white rounded-2xl border border-emerald-500/30 font-bold text-slate-800 outline-none shadow-sm focus:border-emerald-500" />}
                       </div>

                       <div className="flex flex-col">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">ที่อยู่:</span>
                          {isReadOnly ? <div className="px-4 py-3.5 bg-slate-50 rounded-2xl font-bold text-slate-800 leading-relaxed min-h-[60px]">{customerDraft.address || '-'}</div> : <textarea value={customerDraft.address || ''} onChange={e => setCustomerDraft({...customerDraft, address: e.target.value})} className="px-4 py-3.5 bg-white rounded-2xl border border-emerald-500/30 font-bold text-slate-800 outline-none min-h-[80px] focus:border-emerald-500" />}
                       </div>

                       {!isReadOnly ? (
                         <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col">
                               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">จังหวัด:</span>
                               <select value={customerDraft.province || ''} onChange={e => setCustomerDraft({...customerDraft, province: e.target.value, district: '', subdistrict: '', zipcode: ''})} className="px-4 py-3.5 bg-white rounded-2xl border border-emerald-500/30 font-bold text-slate-800 outline-none h-14 shadow-sm focus:border-emerald-500">
                                 <option value="">-- จังหวัด --</option>
                                 {(Array.isArray(thaiAddressData) ? thaiAddressData : []).map(p => <option key={p.name_th} value={p.name_th}>{p.name_th}</option>)}
                               </select>
                            </div>
                            <div className="flex flex-col">
                               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">อำเภอ:</span>
                               <select value={customerDraft.district || ''} disabled={!customerDraft.province} onChange={e => setCustomerDraft({...customerDraft, district: e.target.value, subdistrict: '', zipcode: ''})} className="px-4 py-3.5 bg-white rounded-2xl border border-emerald-500/30 font-bold text-slate-800 outline-none h-14 disabled:opacity-50">
                                 <option value="">-- อำเภอ --</option>
                                 {(Array.isArray(availableDistricts) ? availableDistricts : []).map((d: any) => <option key={d} value={d}>{d}</option>)}
                               </select>
                            </div>
                            <div className="flex flex-col">
                               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">ตำบล:</span>
                               <select value={customerDraft.subdistrict || ''} disabled={!customerDraft.district} onChange={e => {
                                 const t = (Array.isArray(availableSubdistricts) ? availableSubdistricts : []).find((tam: any) => tam.name_th === e.target.value);
                                 setCustomerDraft({...customerDraft, subdistrict: e.target.value, zipcode: t ? String(t.zip_code || t.zipcode || '') : ''});
                               }} className="px-4 py-3.5 bg-white rounded-2xl border border-emerald-500/30 font-bold text-slate-800 outline-none h-14 disabled:opacity-50">
                                 <option value="">-- ตำบล --</option>
                                 {(Array.isArray(availableSubdistricts) ? availableSubdistricts : []).map((t: any) => <option key={t.name_th} value={t.name_th}>{t.name_th}</option>)}
                               </select>
                            </div>
                            <div className="flex flex-col">
                               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">รหัสไปรษณีย์:</span>
                               <div className="px-4 py-3.5 bg-slate-50 rounded-2xl border border-slate-100 font-bold text-slate-400 flex items-center h-14">{customerDraft.zipcode || '-'}</div>
                            </div>
                         </div>
                       ) : (
                         <div className="grid grid-cols-4 gap-2">
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex flex-col min-w-0"><span className="text-[8px] font-black text-slate-300 uppercase">จังหวัด</span><span className="text-[11px] font-bold text-slate-700 truncate">{customerDraft.province || '-'}</span></div>
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex flex-col min-w-0"><span className="text-[8px] font-black text-slate-300 uppercase">อำเภอ</span><span className="text-[11px] font-bold text-slate-700 truncate">{customerDraft.district || '-'}</span></div>
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex flex-col min-w-0"><span className="text-[8px] font-black text-slate-300 uppercase">ตำบล</span><span className="text-[11px] font-bold text-slate-700 truncate">{customerDraft.subdistrict || '-'}</span></div>
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex flex-col min-w-0"><span className="text-[8px] font-black text-slate-300 uppercase">รหัสไปรษณีย์</span><span className="text-[11px] font-bold text-slate-700 truncate">{customerDraft.zipcode || '-'}</span></div>
                         </div>
                       )}
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button 
                      onClick={handleGetLocation} 
                      disabled={isReadOnly || loading} 
                      className={`flex-1 h-16 rounded-[1.8rem] shadow-lg flex items-center justify-center gap-3 font-black uppercase tracking-widest transition-all ${isReadOnly ? 'bg-slate-100 text-slate-300 shadow-none' : 'bg-emerald-600 text-white'}`}
                    >
                      <MapPin size={22} />
                      {isReadOnly ? 'เปิดการแก้ไขก่อนจับพิกัด' : (newLocation ? 'จับพิกัดอีกครั้ง' : 'Check-In (จับพิกัด)')}
                    </button>
                    
                    {customerDraft?.lat && customerDraft?.lng && (
                      <button 
                        onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${customerDraft.lat},${customerDraft.lng}`, '_blank')}
                        className="w-16 h-16 bg-blue-600 text-white rounded-[1.8rem] shadow-lg flex items-center justify-center hover:bg-blue-700 transition-all active:scale-95"
                        title="นำทางด้วย Google Maps"
                      >
                        <Navigation size={24} />
                      </button>
                    )}
                  </div>
               </div>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-emerald-100 shadow-xl overflow-hidden p-6 space-y-4">
               <h3 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2"><Package className="text-emerald-500" /> พัสดุในครอบครองของลูกค้า</h3>
               <div className="space-y-2">
                  {possessionList.length === 0 ? (
                     <p className="text-center py-6 text-slate-400 font-bold text-xs uppercase tracking-widest bg-slate-50 rounded-3xl">ไม่มีพัสดุครองครอง</p>
                  ) : possessionList.map((it, idx) => (
                     <div key={idx} className="flex flex-col p-4 bg-slate-50 border border-slate-100 rounded-3xl text-left">
                        <div className="flex justify-between items-center">
                           <span className="text-[13px] font-black text-slate-800">{it.name} {it.detail} {it.size && `ขนาด ${it.size}`} สภาพ {it.condition}</span>
                           <span className="text-[18px] font-black text-emerald-600 ml-4">{it.qty}</span>
                        </div>
                     </div>
                  ))}
               </div>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-4">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">รูปถ่ายหลักฐานหน้าร้าน (Photo & Note)</p>
               <div className="flex justify-center py-2">
                  <div className="relative group">
                     {(() => {
                        const masterPhoto = getMasterPhoto(customerDraft) || getMasterPhoto(selectedCustomer);
                        const currentPhoto = photos[0] || masterPhoto;
                        if (currentPhoto) {
                          return (
                             <div className="w-56 h-56 bg-slate-100 rounded-[2.5rem] overflow-hidden border-4 border-white shadow-2xl relative group/img cursor-zoom-in" onClick={() => setPreviewImage(currentPhoto)}>
                                <img src={currentPhoto} className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-110" alt="store evidence" onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400?text=Image+Load+Error'; }} />
                                <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/20 flex items-center justify-center transition-all">
                                   <ZoomIn size={40} className="text-white opacity-0 group-hover/img:opacity-100 scale-50 group-hover/img:scale-100 transition-all" />
                                </div>
                                {!isReadOnly && photos[0] && (
                                   <button onClick={(e) => { e.stopPropagation(); setPhotos([]); }} className="absolute top-3 right-3 w-10 h-10 bg-rose-600 text-white rounded-2xl flex items-center justify-center shadow-lg hover:bg-rose-700 transition-all"><X size={20} /></button>
                                )}
                                {!isReadOnly && !photos[0] && (
                                   <label className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex flex-col items-center justify-center text-white cursor-pointer backdrop-blur-[2px]" onClick={e => e.stopPropagation()}>
                                      <Camera size={40} className="mb-2" />
                                      <span className="text-[10px] font-bold uppercase tracking-widest">คลิกเพื่อเปลี่ยนรูป</span>
                                      <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => {
                                         const file = e.target.files?.[0];
                                         if (file) { const reader = new FileReader(); reader.onloadend = () => setPhotos([reader.result as string]); reader.readAsDataURL(file); }
                                      }} />
                                   </label>
                                )}
                             </div>
                          );
                        }
                        return (
                           !isReadOnly ? (
                              <label className="w-56 h-56 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2.5rem] flex flex-col items-center justify-center text-slate-300 cursor-pointer hover:bg-slate-100 transition-all shadow-inner">
                                 <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4"><Camera size={32} className="text-emerald-500" /></div>
                                 <span className="text-[11px] font-black uppercase tracking-[0.2em]">ถ่ายรูปหน้าร้าน</span>
                                 <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) { const reader = new FileReader(); reader.onloadend = () => setPhotos([reader.result as string]); reader.readAsDataURL(file); }
                                 }} />
                              </label>
                           ) : (
                              <div className="w-56 h-56 bg-slate-50 rounded-[2.5rem] flex flex-col items-center justify-center text-slate-200 border border-slate-100 shadow-inner">
                                 <Camera size={40} className="mb-4 opacity-50" />
                                 <span className="text-[11px] font-black uppercase tracking-widest">ยังไม่มีรูปถ่าย</span>
                              </div>
                           )
                        );
                     })()}
                  </div>
               </div>
               <textarea placeholder="เพิ่มหมายเหตุการสำรวจตรงนี้..." value={note} onChange={e => setNote(e.target.value)} className="w-full p-6 bg-slate-50 border border-slate-100 rounded-3xl text-sm font-bold outline-none min-h-[120px] focus:bg-white focus:border-emerald-500 transition-all shadow-inner" />
            </div>

            <div className="pt-8 space-y-4">
               <div className="flex items-center gap-3 px-2">
                  <div className="w-1.5 h-6 bg-amber-500 rounded-full"></div>
                  <h3 className="text-[14px] font-black text-slate-800 uppercase tracking-tight">ประวัติรายการ (Audit Log)</h3>
               </div>
               <CustomerSurveyHistory history={customerHistory} />
            </div>

            <div className="flex gap-3 pt-8 pb-10">
               <button onClick={() => setSelectedCustomer(null)} className="flex-1 h-16 bg-white border border-slate-200 rounded-[1.8rem] text-slate-400 font-black uppercase tracking-widest hover:bg-slate-50 transition-all">ยกเลิก</button>
               {!isReadOnly && (
                  <button onClick={handleSaveSurvey} disabled={saving} className="flex-[2] h-16 bg-[#0b1b32] text-white rounded-[1.8rem] shadow-xl flex items-center justify-center gap-3 font-black uppercase tracking-widest active:scale-95 disabled:bg-slate-300 transition-all">
                     {saving ? <div className="w-5 h-5 border-3 border-white/20 border-t-white rounded-full animate-spin"></div> : <><Check size={20} /> ยืนยันบันทึก</>}
                  </button>
               )}
            </div>
          </motion.div>
        </AnimatePresence>
      )}
      <CustomerQuickEdit 
        isOpen={showQuickEdit} 
        onClose={() => setShowQuickEdit(false)} 
        customer={null} 
        onSave={(newC) => {
          onRefresh();
          handleSelectCustomer(newC);
        }}
        thaiAddressData={thaiAddressData}
        customers={customers}
      />
    </div>
  );
}
