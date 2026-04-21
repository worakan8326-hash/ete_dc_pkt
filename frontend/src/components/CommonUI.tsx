import React from 'react';

// --- BUTTONS ---
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'ghost' | 'outline';
  isLoading?: boolean;
  leftIcon?: string;
  rightIcon?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  isLoading = false,
  leftIcon,
  rightIcon,
  size = 'md',
  children,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = "inline-flex items-center justify-center gap-2 font-black uppercase tracking-widest transition-opacity active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none rounded-2xl";

  const sizeStyles = {
    sm: "h-9 px-4 text-[13px]",
    md: "h-12 px-6 text-[15px]",
    lg: "h-14 px-8 text-[16px]",
    xl: "h-16 px-10 text-[18px]"
  };

  const variants = {
    primary: "bg-primary text-white shadow-lg shadow-primary/20 hover:bg-primary/90",
    secondary: "bg-secondary text-white shadow-lg shadow-secondary/20 hover:bg-secondary/90",
    success: "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-500",
    danger: "bg-error text-white shadow-lg shadow-error/20 hover:bg-rose-500",
    ghost: "bg-transparent text-slate-600 hover:bg-slate-100",
    outline: "bg-transparent border-2 border-slate-200 text-slate-700 hover:border-primary/30 hover:text-primary"
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variants[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
      ) : (
        <>
          {leftIcon && <span className="material-symbols-outlined text-[20px]">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="material-symbols-outlined text-[20px]">{rightIcon}</span>}
        </>
      )}
    </button>
  );
};

// --- ICONS ---
export const Icon: React.FC<{ name: string; className?: string; size?: 'sm' | 'md' | 'lg' | 'xl' }> = ({ name, className = '', size = 'md' }) => {
  const sizes = {
    sm: "text-[18px]",
    md: "text-[24px]",
    lg: "text-[32px]",
    xl: "text-[48px]"
  };
  return (
    <span className={`material-symbols-outlined ${sizes[size]} ${className}`}>
      {name}
    </span>
  );
};

// --- LOADING ---
import { motion, AnimatePresence } from 'framer-motion';

export const LoadingOverlay: React.FC<{ message?: string }> = ({ message = "กำลังโหลดข้อมูล..." }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[9999] flex items-center justify-center p-6"
  >
    <motion.div
      initial={{ scale: 0.9, opacity: 0, y: 20 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-6 bg-white p-10 rounded-[2.5rem] shadow-2xl border border-white/20 relative overflow-hidden"
    >
      <div className="absolute top-0 left-0 w-full h-1 bg-slate-100">
        <motion.div
          className="h-full bg-primary"
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div className="relative w-20 h-20">
        <div className="absolute inset-0 border-[6px] border-slate-50 rounded-full"></div>
        <motion.div
          className="absolute inset-0 border-[6px] border-t-primary rounded-full shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)]"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="material-symbols-outlined text-primary/30 text-[32px] animate-pulse">database</span>
        </div>
      </div>

      <div className="text-center space-y-1">
        <p className="text-[14px] font-black uppercase tracking-[0.2em] text-slate-900">{message}</p>
        <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">Please wait while we process</p>
      </div>
    </motion.div>
  </motion.div>
);

export const InlineSpinner: React.FC<{ className?: string }> = ({ className = '' }) => (
  <span className={`material-symbols-outlined animate-spin ${className}`}>progress_activity</span>
);

// --- NOTIFICATIONS (TOAST) ---
export const Toast: React.FC<{
  type?: 'success' | 'error' | 'info' | 'warning';
  message: string;
  onClose?: () => void
}> = ({ type = 'info', message, onClose }) => {
  const styles = {
    success: "bg-emerald-50 border-emerald-100 text-emerald-700 icon-check_circle",
    error: "bg-rose-50 border-rose-100 text-rose-700 icon-error",
    info: "bg-blue-50 border-blue-100 text-blue-700 icon-info",
    warning: "bg-amber-50 border-amber-100 text-amber-700 icon-warning"
  };

  const icons = {
    success: "check_circle",
    error: "error",
    info: "info",
    warning: "warning"
  };

  return (
    <div className={`p-4 rounded-2xl border flex items-center gap-3 shadow-xl shadow-black/5 min-w-[280px] max-w-md ${styles[type]}`}>
      <span className="material-symbols-outlined text-[20px]">{icons[type]}</span>
      <span className="text-[15px] font-bold flex-1">{message}</span>
      {onClose && (
        <button onClick={onClose} className="opacity-40 hover:opacity-100 transition-opacity">
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>
      )}
    </div>
  );
};

// --- INPUTS & SELECTS ---
export const FormInput: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string }> = ({ label, error, className = '', id, ...props }) => {
  const generatedId = id || Math.random().toString(36).substr(2, 9);
  return (
    <div className="space-y-2 w-full">
      {label && <label htmlFor={generatedId} className="text-[13px] font-bold text-slate-500 uppercase tracking-wider ml-1">{label}</label>}
      <div className="relative">
        <input
          id={generatedId}
          className={`w-full h-12 bg-slate-50 border border-slate-100 rounded-2xl px-4 text-[15px] font-bold text-slate-900 outline-none focus:bg-white focus:border-primary/30 focus:ring-4 focus:ring-secondary/5 transition-colors ${error ? 'border-rose-300 bg-rose-50' : ''} ${className}`}
          {...props}
        />
      </div>
      {error && <p className="text-[10px] font-bold text-rose-500 ml-1">{error}</p>}
    </div>
  );
};

export const FormCheckbox: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string }> = ({ label, className = '', id, ...props }) => {
  const generatedId = id || Math.random().toString(36).substr(2, 9);
  return (
    <label htmlFor={generatedId} className={`flex items-center gap-3 p-4 bg-emerald-50/10 rounded-2xl border border-emerald-500/10 cursor-pointer group transition-colors active:scale-[0.99] ${className}`}>
      <div className="relative flex items-center justify-center w-6 h-6 border-2 border-emerald-500/30 rounded-lg bg-white group-hover:border-emerald-500 transition-colors">
        <input
          id={generatedId}
          type="checkbox"
          className="peer absolute inset-0 opacity-0 cursor-pointer"
          {...props}
        />
        <span className="material-symbols-outlined text-[18px] text-emerald-600 scale-0 peer-checked:scale-100 transition-transform font-bold">check</span>
      </div>
      <span className="text-[14px] font-bold text-emerald-700 uppercase tracking-tight">{label}</span>
    </label>
  );
};

export const FormSelect: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string; error?: string }> = ({ label, error, className = '', id, children, ...props }) => {
  const generatedId = id || Math.random().toString(36).substr(2, 9);
  return (
    <div className="space-y-2 w-full">
      {label && <label htmlFor={generatedId} className="text-[13px] font-bold text-slate-500 uppercase tracking-wider ml-1">{label}</label>}
      <div className="relative">
        <select
          id={generatedId}
          className={`w-full h-12 bg-slate-50 border border-slate-100 rounded-2xl px-4 text-[15px] font-bold text-slate-900 outline-none focus:bg-white focus:border-primary/30 focus:ring-4 focus:ring-secondary/5 transition-colors cursor-pointer appearance-none ${error ? 'border-rose-300 bg-rose-50' : ''} ${className}`}
          {...props}
        >
          {children}
        </select>
        <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</span>
      </div>
      {error && <p className="text-[10px] font-bold text-rose-500 ml-1">{error}</p>}
    </div>
  );
};

// --- IMAGE LIGHTBOX (FULLSCREEN VIEW) ---
export const ImageLightbox: React.FC<{
  isOpen: boolean;
  imageUrl: string;
  onClose: () => void;
}> = ({ isOpen, imageUrl, onClose }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[10000] bg-black/95 flex items-center justify-center p-4 md:p-12 cursor-pointer"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="relative max-w-full max-h-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img 
              src={imageUrl} 
              alt="Preview" 
              className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl border border-white/10"
            />
            
            <button
              onClick={onClose}
              className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-14 h-14 bg-white/10 hover:bg-rose-500/20 text-white rounded-full flex items-center justify-center transition-all border border-white/20 backdrop-blur-md active:scale-90"
            >
              <span className="material-symbols-outlined text-[32px]">close</span>
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
