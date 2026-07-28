import React from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/layout/Sidebar.jsx';

export default function ProfilePage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#191c1d]">Hồ sơ của bạn</h1>
            <p className="text-sm text-[#424754] mt-1">Quản lý thông tin cá nhân và thiết lập tài khoản TripManager của bạn.</p>
          </div>
          <button
            onClick={() => navigate('/edit-profile')}
            className="flex items-center gap-2 px-4 py-2 bg-[#0058be] text-white rounded-lg hover:brightness-105 transition-all shadow-sm font-semibold"
          >
            <span className="material-symbols-outlined">edit</span>
            <span className="text-sm">Chỉnh sửa hồ sơ</span>
          </button>
        </div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Card 1: Profile Identity */}
          <div className="md:col-span-4 bg-white/70 backdrop-blur-xl border border-white/30 p-6 rounded-xl flex flex-col items-center text-center shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-[#0058be]"></div>
            <div className="relative mb-4">
              <img 
                className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md"
                src={currentUser?.avatar_url || 'https://lh3.googleusercontent.com/aida-public/AB6AXuAxnDk9gO35spxMRbVbdzIjd2ZskJKKCvcAPIJnOlmeQyoj3Fa-3fLYyVAHjxLFQhQKJdtcW_GChilERHGu10j8Ig-HTnfA9ePyTipt6uJkbxePmSm-Lq5PcCEGyB43nUCzteSc4EpseJPfD_6gIiNk6lV3NR8_kEWLGi8GBPwbC7mxZxRsRgr2sSw5girL0_eTmlOokMVnKUHTFaRzYrRoP7raHm9URlASSrf1JwDnsMBKvW7eJzyfilygcQwAZfd6-VWSbn3n3m4'}
                alt="Avatar"
              />
            </div>
            <h2 className="text-xl font-bold text-[#191c1d]">{currentUser?.name || 'Chưa đặt tên'}</h2>
            <p className="text-sm text-[#424754]">{currentUser?.email}</p>
            <div className="mt-4 px-3 py-1 bg-[#d5e0f8] text-[#0058be] rounded-full text-xs font-semibold uppercase tracking-wider">
              Thành viên chính thức
            </div>
          </div>

          {/* Card 2: Personal Info */}
          <div className="md:col-span-8 bg-white border border-[#c2c6d6] p-6 rounded-xl shadow-sm space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-[#0058be]">person_outline</span>
              <h3 className="text-lg font-bold text-[#191c1d]">Thông tin cá nhân</h3>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between pb-3 border-b border-[#edeeef] text-sm">
                <span className="font-medium text-[#424754]">Họ và tên</span>
                <span className="text-[#191c1d]">{currentUser?.name || 'N/A'}</span>
              </div>
              <div className="flex justify-between pb-3 border-b border-[#edeeef] text-sm">
                <span className="font-medium text-[#424754]">Số điện thoại</span>
                <span className="text-[#191c1d]">{currentUser?.phone || 'Chưa cập nhật'}</span>
              </div>
              <div className="flex justify-between pb-3 border-b border-[#edeeef] text-sm">
                <span className="font-medium text-[#424754]">Email liên hệ</span>
                <span className="text-[#191c1d]">{currentUser?.email}</span>
              </div>
            </div>
          </div>
        </div>
    </div>
  );
}
