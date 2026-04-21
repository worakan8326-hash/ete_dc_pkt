import React, { useEffect, useRef } from 'react';
import { X, Navigation, MapPin, Store } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ResultsMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: any[];
  userLocation: { lat: number, lng: number } | null;
  onSelectCustomer: (customer: any) => void;
}

const ResultsMapModal: React.FC<ResultsMapModalProps> = ({ 
  isOpen, onClose, customers, userLocation, onSelectCustomer 
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const lMap = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    if (!isOpen) return;

    // Load Leaflet if not already loaded
    if (!(window as any).L) {
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }
      if (!document.getElementById('leaflet-js')) {
        const script = document.createElement('script');
        script.id = 'leaflet-js';
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        document.head.appendChild(script);
      }
    }

    const timer = setTimeout(() => {
      const L = (window as any).L;
      if (!L || !mapRef.current) return;

      // Initialize map
      const center = userLocation ? [userLocation.lat, userLocation.lng] : [7.8804, 98.3923]; // Default Phuket or User
      const map = L.map(mapRef.current, { zoomControl: false }).setView(center, 14);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OSM' }).addTo(map);
      L.control.zoom({ position: 'topleft' }).addTo(map);

      // Add User Location Marker
      if (userLocation) {
        const userIcon = L.divIcon({
           className: 'custom-div-icon',
           html: `<div style="background-color: #3b82f6; width: 15px; height: 15px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);"></div>`,
           iconSize: [15, 15],
           iconAnchor: [7, 7]
        });
        L.marker([userLocation.lat, userLocation.lng], { icon: userIcon }).addTo(map).bindPopup("คุณอยู่ที่นี่", { closeButton: false });
      }

      // Add Customer Markers
      const bounds = L.latLngBounds([]);
      if (userLocation) bounds.extend([userLocation.lat, userLocation.lng]);

      customers.forEach((c) => {
        const cLat = parseFloat(c.lat);
        const cLng = parseFloat(c.lng);
        if (isNaN(cLat) || isNaN(cLng)) return;

        const shopIcon = L.divIcon({
           className: 'shop-div-icon',
           html: `<div style="background-color: #10b981; width: 30px; height: 30px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 2px solid white; display: flex; items-center; justify-center; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
                    <div style="transform: rotate(45deg); color: white; display: flex;"><span class="material-symbols-outlined" style="font-size: 16px;">store</span></div>
                  </div>`,
           iconSize: [30, 30],
           iconAnchor: [15, 30]
        });

        const marker = L.marker([cLat, cLng], { icon: shopIcon }).addTo(map);
        
        const popupContent = document.createElement('div');
        popupContent.innerHTML = `
          <div style="padding: 10px; min-width: 150px;">
            <p style="margin: 0 0 8px 0; font-weight: 900; color: #1e293b; font-size: 14px;">${c.name}</p>
            <button id="select-shop-${c.cv}" style="width: 100%; padding: 8px; background: #0b1b32; color: white; border: none; border-radius: 12px; font-weight: 800; cursor: pointer; font-size: 11px;">เลือกเพื่อสำรวจ</button>
          </div>
        `;

        marker.bindPopup(popupContent, { closeButton: false });
        
        // Handle Select inside Popup
        marker.on('popupopen', () => {
           const btn = document.getElementById(`select-shop-${c.cv}`);
           if (btn) {
              btn.onclick = () => {
                 onSelectCustomer(c);
                 onClose();
              };
           }
        });

        bounds.extend([cLat, cLng]);
        markersRef.current.push(marker);
      });

      // Fit bounds if more than 1 point
      if (customers.length > 0 || userLocation) {
         map.fitBounds(bounds, { padding: [50, 50] });
      }

      lMap.current = map;
    }, 500);

    return () => {
       clearTimeout(timer);
       if (lMap.current) {
          lMap.current.remove();
          lMap.current = null;
       }
       markersRef.current = [];
    };
  }, [isOpen, customers, userLocation]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-0 md:p-6 animate-fade-in">
       <div className="bg-white w-full h-full md:max-w-4xl md:h-[80vh] md:rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden border border-white/20">
          {/* Header */}
          <div className="bg-[#0b1b32] p-6 text-white flex items-center justify-between shrink-0">
             <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-400 border border-blue-500/20">
                   <MapPin size={24} />
                </div>
                <div>
                   <h2 className="text-xl font-black tracking-tight leading-none uppercase">Nearby Shops Map</h2>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 opacity-60">Visualizing {customers.length} shops in your area</p>
                </div>
             </div>
             <button 
               onClick={onClose}
               className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-rose-500 transition-all active:scale-90"
             >
                <X size={20} />
             </button>
          </div>

          {/* Map Area */}
          <div ref={mapRef} className="flex-1 w-full bg-slate-50 relative">
             {/* Map Overlay Loading */}
             {!lMap.current && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 z-10">
                   <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">กำลังโหลดพิกัดร้านค้า...</p>
                </div>
             )}
          </div>

          {/* Footer Info */}
          <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
             <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                   <div className="w-3 h-3 bg-blue-500 rounded-full border-2 border-white shadow-sm" />
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ตำแหน่งของคุณ</span>
                </div>
                <div className="flex items-center gap-2">
                   <div className="w-3 h-3 bg-[#10b981] rounded-full border-2 border-white shadow-sm" />
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">พิกัดร้านค้า</span>
                </div>
             </div>
             <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm text-[10px] font-black text-slate-600 uppercase tracking-widest">
                รวม {customers.length} ร้าน
             </div>
          </div>
       </div>
    </div>
  );
};

export default React.memo(ResultsMapModal);
