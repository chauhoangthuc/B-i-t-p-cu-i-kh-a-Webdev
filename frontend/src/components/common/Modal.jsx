import React from 'react';

export default function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white w-full max-w-[500px] rounded-xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto animate-in zoom-in duration-200">
        <div className="flex justify-between items-start">
          {title && <h3 className="text-lg font-bold text-[#191c1d]">{title}</h3>}
          <button className="text-[#727785] hover:text-[#191c1d] ml-auto" onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div>
          {children}
        </div>
      </div>
    </div>
  );
}
