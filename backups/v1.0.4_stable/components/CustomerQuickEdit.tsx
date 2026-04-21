import React, { useState, useEffect, useRef } from 'react';
import { saveCustomer } from '../api';

interface CustomerQuickEditProps {
  isOpen: boolean;
  onClose: () => void;
  customer: any;
  onSave: (savedData?: any) => void;
  thaiAddressData: any[];
  customers: any[];
}

const CustomerQuickEdit: React.FC<CustomerQuickEditProps> = ({ 
  isOpen, onClose, customer, onSave, thaiAddressData, customers 
}) => {
  const [editingCustomer, setEditingCustomer] = useState<any>({ cv: '', name: '', phone: '', address: '', subdistrict: '', district: '', province: '', zipcode: '', lat: '', lng: '' });
  const [loading, setLoading] = useState(false);
  const [districts, setDistricts] = useState<string[]>([]);
  const [subdistricts, setSubdistricts] = useState<any[]>([]);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const prevOpenRef = useRef(false);

  useEffect(() => {
    if (showMapPicker && !(window as any).L) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      document.head.appendChild(script);
    }
  }, [showMapPicker]);

  useEffect(() => {
    if (isOpen && !prevOpenRef.current) {
      let initialCv = customer?.cv || '';
      if (!initialCv && customers.length > 0) {
        initialCv = calculateNextCv();
      } else if (!initialCv) {
        initialCv = '1001';
      }
      
      const newEditData = { ...customer, cv: initialCv };
      setEditingCustomer(newEditData);

      if (thaiAddressData.length > 0 && newEditData.province) {
        const p = thaiAddressData.find(prov => prov.name_th === newEditData.province);
        if (p) {
          setDistricts(p.amphure.map((a: any) => a.name_th).sort());
          if (newEditData.district) {
            const a = p.amphure.find((amp: any) => amp.name_th === newEditData.district);
            if (a) setSubdistricts(a.tambon.sort((x: any, y: any) => (x.name_th || '').localeCompare(y.name_th || '')));
          }
        }
      }
    }
    prevOpenRef.current = isOpen;
  }, [isOpen, customer, thaiAddressData, customers]);

  const handleProvinceChange = (pName: string) => {
    const p = thaiAddressData.find((prov: any) => prov.name_th === pName);
    setEditingCustomer((prev: any) => ({ ...prev, province: pName, district: '', subdistrict: '', zipcode: '' }));
    if (p) setDistricts(p.amphure.map((a: any) => a.name_th).sort()); else setDistricts([]);
    setSubdistricts([]);
  };

  const handleDistrictChange = (dName: string) => {
    const p = thaiAddressData.find((prov: any) => prov.name_th === editingCustomer.province);
    setEditingCustomer((prev: any) => ({ ...prev, district: dName, subdistrict: '', zipcode: '' }));
    if (p) {
      const a = p.amphure.find((amp: any) => amp.name_th === dName);
      if (a) setSubdistricts(a.tambon.sort((x: any, y: any) => (x.name_th||'').localeCompare(y.name_th||''))); else setSubdistricts([]);
    }
  };

  const handleTambonChange = (tName: string) => {
    const t = subdistricts.find(tam => tam.name_th === tName);
    setEditingCustomer((prev: any) => ({ ...prev, subdistrict: tName, zipcode: t ? String(t.zip_code || t.zipcode || '') : '' }));
  };

  const fetchCurrentLocation = () => {
    navigator.geolocation.getCurrentPosition((pos) => {
      setEditingCustomer((prev: any) => ({ ...prev, lat: pos.coords.latitude.toString(), lng: pos.coords.longitude.toString() }));
    }, (err) => { alert("Error: " + err.message); });
  };

  const isCvDuplicate = React.useMemo(() => {
    if (!editingCustomer.cv || !customers) return false;
    return customers.some((c: any) => 
      String(c.cv || c.CV || '').trim() === String(editingCustomer.cv).trim() && 
      (customer?.name ? (c.name !== customer.name) : true)
    );
  }, [editingCustomer.cv, customers, customer?.name]);

  const handleSave = async () => {
    if (!editingCustomer.name || isCvDuplicate) return;
    setLoading(true);
    try {
      await saveCustomer(editingCustomer);
      onSave(editingCustomer);
      onClose();
    } catch (e: any) { alert(e.message); }
    finally { setLoading(false); }
  };

  const calculateNextCv = () => {
    const numericCvs = customers.map(c => {
       const val = c.cv || c.CV || '';
       const numStr = String(val).replace(/\D/g, '');
       const parsed = parseInt(numStr);
       return isNaN(parsed) ? 0 : parsed;
    }).filter(v => v > 0);
    return (numericCvs.length > 0 ? Math.max(...numericCvs) + 1 : 1001).toString();
  };

  if (!isOpen) return null;

  const inputClass = "w-full h-11 bg-slate-50 border border-slate-200 rounded-lg px-3 text-[14px] font-bold text-slate-900 outline-none focus:border-slate-300 transition-colors";
  const labelClass = "text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1 block";

  return (
    <>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
         <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-scale-up border border-slate-100">
            <div className="bg-slate-900 px-6 py-5 text-white flex items-center justify-between">
                <div className="flex flex-col">
                  <h3 className="text-lg font-bold tracking-tight">ข้อมูลลูกค้า (CV)</h3>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em]">Customer Information Management</p>
                </div>
                <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all">
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
            </div>

            <div className="p-6 space-y-4">
               <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>เลข CV {isCvDuplicate && <span className="text-rose-500">(ซ้ำ)</span>}</label>
                    <input className={`${inputClass} ${isCvDuplicate ? 'border-rose-500 bg-rose-50' : ''}`} value={editingCustomer.cv} onChange={(e) => setEditingCustomer((p:any) => ({...p, cv: e.target.value}))} placeholder="รหัส CV..." title="CV" />
                  </div>
                  <div>
                    <label className={labelClass}>เบอร์โทรศัพท์</label>
                    <input className={inputClass} value={editingCustomer.phone} maxLength={10} onChange={(e) => setEditingCustomer((p:any) => ({...p, phone: e.target.value.replace(/\D/g, '')}))} placeholder="08x-xxx-xxxx" title="Phone" />
                  </div>
               </div>

               <div>
                  <label className={labelClass}>ชื่อลูกค้า / ชื่อร้าน <span className="text-rose-500">*</span></label>
                  <input className={inputClass} value={editingCustomer.name} onChange={(e) => setEditingCustomer((p:any) => ({...p, name: e.target.value}))} placeholder="ระบุชื่อจริงหรือชื่อร้าน..." title="Name" />
               </div>

               <div>
                  <label className={labelClass}>ที่อยู่พัสดุ</label>
                  <textarea rows={2} className={inputClass + " h-auto py-2 resize-none"} value={editingCustomer.address} onChange={(e) => setEditingCustomer((p:any) => ({...p, address: e.target.value}))} placeholder="บ้านเลขที่, ถนน, ซอย..." title="Address" />
               </div>

               <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className={labelClass}>จังหวัด</label>
                    <select className={inputClass} value={editingCustomer.province} onChange={(e) => handleProvinceChange(e.target.value)} title="Province">
                       <option value="">-- จังหวัด --</option>
                       {thaiAddressData.map(p => <option key={p.name_th} value={p.name_th}>{p.name_th}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>อำเภอ</label>
                    <select className={inputClass} value={editingCustomer.district} onChange={(e) => handleDistrictChange(e.target.value)} disabled={!editingCustomer.province} title="District">
                       <option value="">-- อำเภอ --</option>
                       {districts.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>ตำบล</label>
                    <select className={inputClass} value={editingCustomer.subdistrict} onChange={(e) => handleTambonChange(e.target.value)} disabled={!editingCustomer.district} title="Subdistrict">
                       <option value="">-- ตำบล --</option>
                       {subdistricts.map((t: any) => <option key={t.name_th} value={t.name_th}>{t.name_th}</option>)}
                    </select>
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-3 pt-2">
                  <button onClick={fetchCurrentLocation} className="h-12 bg-slate-100 text-slate-600 rounded-xl text-[11px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all">
                     <span className="material-symbols-outlined text-[18px]">my_location</span> GPS ปัจจุบัน
                  </button>
                  <button onClick={() => setShowMapPicker(true)} className="h-12 bg-blue-50 text-blue-600 rounded-xl text-[11px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all">
                     <span className="material-symbols-outlined text-[18px]">map</span> เลือกในแผนที่
                  </button>
               </div>

               <div className="pt-4">
                  <button onClick={handleSave} disabled={loading || !editingCustomer.name || isCvDuplicate} className="w-full h-14 bg-emerald-600 text-white rounded-xl text-sm font-bold uppercase tracking-widest active:scale-[0.98] transition-all disabled:opacity-20">
                    {loading ? "SAVING..." : "ยืนยันและบันทึกข้อมูล"}
                  </button>
               </div>
            </div>
         </div>
      </div>

      {showMapPicker && (
        <MapPickerModal 
          initialLat={parseFloat(editingCustomer.lat) || 13.7563} 
          initialLng={parseFloat(editingCustomer.lng) || 100.5018} 
          suggestedAddress={editingCustomer.province || ''}
          onClose={() => setShowMapPicker(false)}
          onSelect={(lt: number, ln: number) => {
            setEditingCustomer((p: any) => ({ ...p, lat: lt.toFixed(6), lng: ln.toFixed(6) }));
            setShowMapPicker(false);
          }}
        />
      )}
    </>
  );
};

interface MapPickerModalProps {
  initialLat: number;
  initialLng: number;
  suggestedAddress: string;
  onClose: () => void;
  onSelect: (lat: number, lng: number) => void;
}

const MapPickerModal: React.FC<MapPickerModalProps> = ({ initialLat, initialLng, suggestedAddress, onClose, onSelect }) => {
  const [lat, setLat] = useState(initialLat);
  const [lng, setLng] = useState(initialLng);
  const [searchText, setSearchText] = useState(suggestedAddress);
  const [isSearching, setIsSearching] = useState(false);
  const mapRef = React.useRef<HTMLDivElement>(null);
  const lMap = React.useRef<any>(null);
  const lMarker = React.useRef<any>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      const L = (window as any).L;
      if (!L || !mapRef.current) return;

      const map = L.map(mapRef.current).setView([initialLat, initialLng], 15);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OSM' }).addTo(map);

      const marker = L.marker([initialLat, initialLng], { draggable: true }).addTo(map);
      marker.on('dragend', (e: any) => { const pos = e.target.getLatLng(); setLat(pos.lat); setLng(pos.lng); });

      map.on('click', (e: any) => { marker.setLatLng(e.latlng); setLat(e.latlng.lat); setLng(e.latlng.lng); });

      lMap.current = map;
      lMarker.current = marker;
    }, 500);
    return () => clearTimeout(timer);
  }, [initialLat, initialLng]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchText.trim() || !lMap.current || !lMarker.current) return;
    setIsSearching(true);
    try {
      const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchText)}`);
      const data = await resp.json();
      if (data && data.length > 0) {
        const { lat: newLat, lon: newLon } = data[0];
        const lNum = parseFloat(newLat); const lnNum = parseFloat(newLon);
        lMap.current.setView([lNum, lnNum], 17);
        lMarker.current.setLatLng([lNum, lnNum]);
        setLat(lNum); setLng(lnNum);
      }
    } catch (err) { console.error(err); } finally { setIsSearching(false); }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden animate-scale-up border border-slate-100">
        <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <h4 className="font-bold text-slate-900">ปักหมุดตำแหน่ง</h4>
            <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-200 transition-all"><span className="material-symbols-outlined text-[18px]">close</span></button>
        </div>
        <div className="p-4 border-b border-slate-100">
           <form onSubmit={handleSearch} className="flex gap-2">
              <input title="Map Search" type="text" value={searchText} onChange={e => setSearchText(e.target.value)} placeholder="ค้นหาสถานที่..." className="flex-1 h-10 bg-slate-50 border border-slate-200 rounded-lg px-3 text-[13px] font-bold outline-none" />
              <button type="submit" disabled={isSearching} className="h-10 px-4 bg-slate-900 text-white rounded-lg text-xs font-bold uppercase disabled:opacity-20">{isSearching ? "..." : "ค้นหา"}</button>
           </form>
        </div>
        <div ref={mapRef} className="h-[300px] w-full bg-slate-50" />
        <div className="p-4 space-y-4">
           <div className="grid grid-cols-2 gap-4 text-center">
              <div className="p-2 bg-slate-50 rounded-lg"><p className="text-[8px] font-bold text-slate-400 uppercase">LAT</p><p className="text-[12px] font-black text-slate-900">{lat.toFixed(6)}</p></div>
              <div className="p-2 bg-slate-50 rounded-lg"><p className="text-[8px] font-bold text-slate-400 uppercase">LNG</p><p className="text-[12px] font-black text-slate-900">{lng.toFixed(6)}</p></div>
           </div>
           <button onClick={() => onSelect(lat, lng)} className="w-full h-12 bg-emerald-600 text-white font-bold rounded-xl text-sm uppercase tracking-widest active:scale-95 transition-all">ยืนยันตำแหน่ง</button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(CustomerQuickEdit);
