import React from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  itemDisplay?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  itemDisplay,
  confirmText = "ยืนยันดำเนินการ",
  cancelText = "ยกเลิก",
  isLoading = false
}: Props) {
  if (!isOpen) return null;

  const isDelete = title.includes('ลบ');

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop - Darker for better focus */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-fade-in"
        onClick={onClose}
      ></div>

      {/* Modal Container */}
      <div className="relative bg-white w-full max-w-[500px] rounded-[2.5rem] p-8 md:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.2)] animate-scale-up text-center border border-slate-100 flex flex-col items-center">
        
        {/* Icon */}
        <div className={`w-20 h-20 ${isDelete ? 'bg-red-50 text-red-500' : 'bg-primary/10 text-primary'} rounded-full flex items-center justify-center mb-6`}>
           <span className="material-symbols-outlined text-[42px]">
              {isDelete ? 'delete_forever' : 'info'}
           </span>
        </div>

        {/* Text Section */}
        <h3 className="text-2xl font-black text-secondary mb-3 leading-tight tracking-tight">{title}</h3>
        <p className="text-secondary/50 font-bold mb-6 text-sm px-2">{message}</p>
        
        {itemDisplay && (
          <div className="w-full mb-8 text-left bg-slate-50/80 rounded-2xl p-4 border border-slate-100 max-h-[250px] overflow-y-auto">
            {typeof itemDisplay === 'string' ? (
              <div className="text-secondary text-center font-black text-lg py-2">"{itemDisplay}"</div>
            ) : itemDisplay}
          </div>
        )}
        
        {/* Buttons Section */}
        <div className="flex flex-col gap-4 w-full mt-6 items-center">
          <button
            disabled={isLoading}
            onClick={onConfirm}
            className={`w-[70%] h-24 rounded-[2.5rem] font-black text-xl transition-all active:scale-95 flex items-center justify-center ${
              isLoading 
                ? 'bg-slate-300 cursor-not-allowed text-white' 
                : isDelete 
                  ? 'bg-red-500 shadow-2xl shadow-red-200 text-white' 
                  : 'bg-primary shadow-2xl shadow-primary/30 text-white'
            }`}
          >
            {isLoading ? (
              <svg className="animate-spin h-10 w-10 text-white" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              confirmText
            )}
          </button>
          
          <button
            onClick={onClose}
            className="w-[70%] h-18 bg-slate-100 text-secondary/40 rounded-[2rem] font-black text-lg hover:bg-slate-200 transition-all active:scale-95"
          >
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  );
}
