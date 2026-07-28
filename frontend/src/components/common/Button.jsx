import React from 'react';

export default function Button({ 
  children, 
  onClick, 
  type = 'button', 
  variant = 'primary', 
  loading = false, 
  disabled = false,
  className = '' 
}) {
  const baseStyle = "h-12 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-gradient-to-r from-[#0058be] to-[#2170e4] text-white hover:shadow-lg hover:shadow-[#0058be]/20 hover:-translate-y-0.5",
    outline: "bg-white border border-[#c2c6d6] hover:border-[#0058be] text-[#191c1d]",
    text: "text-[#0058be] hover:underline"
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseStyle} ${variants[variant]} ${className}`}
    >
      <span>{children}</span>
      {loading && (
        <div className="animate-spin w-5 h-5 border-2 border-current border-t-transparent rounded-full"></div>
      )}
    </button>
  );
}
