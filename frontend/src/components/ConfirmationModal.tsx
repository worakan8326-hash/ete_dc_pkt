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

  const isDelete = title.includes('ลบ') || title.includes('ยกเลิก');

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Simple Backdrop - No Blur for Performance */}
      <div 
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      ></div>

      {/* Modal Container - Simple Shadows & No Scale Animation */}
      <div className="relative bg-white w-full max-w-[400px] rounded-[2.5rem] p-8 md:p-10 shadow-xl text-center border border-slate-100 flex flex-col items-center">
        
        {/* Simple Icon Container */}
        <div className={`w-20 h-20 ${isDelete ? 'bg-rose-50 text-rose-500' : 'bg-blue-50 text-blue-600'} rounded-full flex items-center justify-center mb-6 border border-slate-50`}>
           <span className="material-symbols-outlined text-[40px] font-bold">
              info
           </span>
        </div>

        {/* Text Content */}
        <div className="space-y-2 mb-6">
          <h3 className="text-[24px] font-black text-[#002d5b] leading-tight tracking-tight uppercase">{title}</h3>
          <p className="text-slate-400 font-bold text-[13px] leading-relaxed px-2">{message}</p>
        </div>
        
        {itemDisplay && (
          <div className="w-full mb-8 bg-slate-50 rounded-2xl p-5 border border-slate-100">
            {typeof itemDisplay === 'string' ? (
              <div className="text-[#002d5b] text-center font-black text-[22px] tracking-tight">"{itemDisplay}"</div>
            ) : itemDisplay}
          </div>
        )}
        
        {/* Actions - Pill Style Buttons */}
        <div className="flex flex-col gap-3 w-full items-center">
          <button
            disabled={isLoading}
            onClick={onConfirm}
            className={`w-full h-14 rounded-full font-black text-[16px] transition-colors flex items-center justify-center ${
              isLoading 
                ? 'bg-slate-200 cursor-not-allowed text-white' 
                : isDelete 
                  ? 'bg-[#0052cc] text-white' 
                  : 'bg-[#002d5b] text-white'
            }`}
          >
            {isLoading ? (
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              confirmText
            )}
          </button>
          
          <button
            onClick={onClose}
            className="w-full h-12 bg-slate-50 text-slate-300 rounded-full font-black text-[14px] hover:bg-slate-100 transition-colors uppercase tracking-wider"
          >
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  );
}
