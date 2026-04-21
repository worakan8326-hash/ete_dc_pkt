import React, { useState, useCallback, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';


interface ToastContextType {
  showToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' | 'warning' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' | 'warning' = 'success') => {
    setToast({ message, type });
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999]"
          >
            <div className={`
               px-6 py-3.5 rounded-2xl shadow-2xl backdrop-blur-xl border flex items-center gap-3 min-w-[280px]
               ${toast.type === 'success' ? 'bg-emerald-500/95 border-emerald-400 text-white' : ''}
               ${toast.type === 'error' ? 'bg-rose-500/95 border-rose-400 text-white' : ''}
               ${toast.type === 'info' ? 'bg-indigo-500/95 border-indigo-400 text-white' : ''}
               ${toast.type === 'warning' ? 'bg-amber-500/95 border-amber-400 text-white' : ''}
            `}>
               <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                 <span className="material-symbols-outlined text-[20px] font-black">
                   {toast.type === 'success' ? 'done_all' : toast.type === 'error' ? 'error' : toast.type === 'warning' ? 'warning' : 'info'}
                 </span>
               </div>
               <div className="flex flex-col">
                  <span className="text-[13px] font-black leading-tight tracking-tight">{toast.message}</span>
                  <span className="text-[8px] font-black uppercase opacity-60 tracking-[0.1em] mt-0.5">System Notification · ETE DC</span>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </ToastContext.Provider>
  );
};
