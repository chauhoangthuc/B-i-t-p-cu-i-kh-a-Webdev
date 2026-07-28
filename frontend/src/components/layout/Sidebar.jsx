import React from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { Link, useLocation } from 'react-router-dom';
import logoImg from '../../assets/images/logo.png';
import { useLanguage } from '../../context/LanguageContext.jsx';

export default function Sidebar() {
  const { currentUser, logout } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();

  const menuItems = [
    { path: '/dashboard', name: t('menu_dashboard'), icon: 'dashboard' },
    { path: '/trips', name: t('menu_trips'), icon: 'flight_takeoff' },
    { path: '/calendar', name: t('menu_calendar'), icon: 'calendar_month' },
    { path: '/expenses', name: t('menu_expenses'), icon: 'payments' },
    { path: '/profile', name: t('menu_profile'), icon: 'person' }
  ];

  return (
    <aside 
      id="sidebar" 
      className="fixed left-0 top-0 h-screen w-[72px] hover:w-[240px] transition-all duration-300 ease-in-out z-50 bg-[#f3f4f5] border-r border-[#c2c6d6] flex flex-col group"
    >
      {/* Logo Section */}
      <div className="h-16 flex items-center px-6 overflow-hidden">
        <img src={logoImg} alt="Logo" className="w-8 h-8 shrink-0 object-contain" />
        <span className="ml-4 font-semibold text-lg text-[#0058be] font-black opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          TripManager
        </span>
      </div>

      {/* Profile Section */}
      <div className="px-3 py-6 overflow-hidden border-b border-[#c2c6d6]">
        <div className="flex items-center group-hover:bg-[#e7e8e9] p-2 rounded-xl transition-colors duration-200">
          <div className="w-10 h-10 rounded-full bg-[#adc6ff] flex-shrink-0 flex items-center justify-center overflow-hidden border-2 border-[#0058be]/20">
            <img 
              className="w-full h-full object-cover" 
              src={currentUser?.avatar_url || 'https://lh3.googleusercontent.com/aida-public/AB6AXuAxnDk9gO35spxMRbVbdzIjd2ZskJKKCvcAPIJnOlmeQyoj3Fa-3fLYyVAHjxLFQhQKJdtcW_GChilERHGu10j8Ig-HTnfA9ePyTipt6uJkbxePmSm-Lq5PcCEGyB43nUCzteSc4EpseJPfD_6gIiNk6lV3NR8_kEWLGi8GBPwbC7mxZxRsRgr2sSw5girL0_eTmlOokMVnKUHTFaRzYrRoP7raHm9URlASSrf1JwDnsMBKvW7eJzyfilygcQwAZfd6-VWSbn3n3m4'} 
              alt="Avatar"
            />
          </div>
          <div className="ml-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <p className="text-xs font-bold whitespace-nowrap text-[#191c1d]">{currentUser?.name || 'Chưa đặt tên'}</p>
            <p className="text-[10px] text-[#424754] uppercase tracking-wider font-bold">Pro Member</p>
            <div className="flex items-center mt-1">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5"></div>
              <span className="text-[10px] text-[#424754] font-medium">Trực tuyến</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-grow py-4 px-3 space-y-2">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center p-3 rounded-xl transition-all duration-300 ${
                isActive
                  ? 'bg-[#d5e0f8] text-[#0058be] font-bold border-r-4 border-[#0058be]'
                  : 'text-[#424754] hover:bg-[#e7e8e9] hover:text-[#191c1d]'
              }`}
            >
              <span className="material-symbols-outlined shrink-0">{item.icon}</span>
              <span className="ml-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap text-xs font-semibold">
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-3 mt-auto">
        <button 
          onClick={logout}
          className="w-full flex items-center p-3 rounded-xl text-[#424754] hover:bg-red-50 hover:text-[#ba1a1a] transition-all duration-300"
        >
          <span className="material-symbols-outlined shrink-0">logout</span>
          <span className="ml-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap text-xs font-semibold">
            {t('dropdown_logout')}
          </span>
        </button>
      </div>
    </aside>
  );
}
