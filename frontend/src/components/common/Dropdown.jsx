import React, { useState, useRef, useEffect } from 'react';

export default function Dropdown({ trigger, children, className = '' }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
        {trigger}
      </div>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white border border-[#c2c6d6] rounded-lg shadow-lg z-50 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="py-1" onClick={() => setIsOpen(false)}>
            {children}
          </div>
        </div>
      )}
    </div>
  );
}
