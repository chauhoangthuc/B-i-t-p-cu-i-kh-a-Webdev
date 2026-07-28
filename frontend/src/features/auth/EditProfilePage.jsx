import React, { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { postgrest } from '../../lib/postgrest.js';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/layout/Sidebar.jsx';

export default function EditProfilePage() {
  const { currentUser, session, fetchUserProfile } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState(currentUser?.name || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatar_url || '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  
  const avatarInputRef = useRef(null);

  const handleAvatarUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setMessage('Kích thước ảnh tối đa 2MB!');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarUrl(reader.result); // Base64 representation
    };
    reader.readAsDataURL(file);
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      await postgrest.patch(`/profiles?id=eq.${currentUser.id}`, {
        name,
        phone,
        avatar_url: avatarUrl
      });
      await fetchUserProfile(currentUser.id);
      setMessage('Cập nhật hồ sơ thành công!');
      setTimeout(() => navigate('/profile'), 1500);
    } catch (err) {
      setMessage('Cập nhật thất bại: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
        {/* Page Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/profile')}
            className="flex items-center gap-2 text-[#0058be] font-semibold hover:gap-3 transition-all mb-4"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            <span className="text-sm">Quay lại Hồ sơ</span>
          </button>
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-bold text-[#191c1d]">Chỉnh sửa hồ sơ</h1>
            <p className="text-sm text-[#424754]">Cập nhật thông tin cá nhân và hình đại diện của bạn</p>
          </div>
        </div>

        {message && (
          <div className={`p-3 rounded-lg text-xs border ${
            message.includes('thành công') ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-[#ba1a1a] border-red-200'
          }`}>
            {message}
          </div>
        )}

        {/* Bento Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Avatar Management */}
          <div className="col-span-12 md:col-span-4 bg-white/70 backdrop-blur-xl border border-white/30 p-6 rounded-xl flex flex-col items-center text-center">
            <div className="relative group cursor-pointer mb-6 animate-all duration-300" onClick={() => avatarInputRef.current?.click()}>
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg relative group-hover:scale-105 transition-all">
                <img 
                  className="w-full h-full object-cover"
                  src={avatarUrl || 'https://lh3.googleusercontent.com/aida-public/AB6AXuD2zmfbKWSlAcx_td_hJZl8iNmhAs7y8FKAxuOPLG26KSrSMiFXoW6nkH1F6IWO8drFb2N8kFab4dRbGiI_yET8eDyjAQlivRwXv9IKH1WUJfubQ7MUXFeXay9EpEmy4Ua5QkJLt6E4ohCqDOki7FdVjxrnS7DnwqZuWh6z3sQWp3LcLB2fqKu-TN3kAbJ_-xwGtvrNk3ocbDHd9jou2xDNjOohii6VD9eLzxYvIrDyqOy462jmc0dKWaiWEW8UpmH5ZaH8v-JE9-I'}
                  alt="Avatar"
                />
                <div className="absolute inset-0 bg-black/45 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="material-symbols-outlined text-white text-[24px]">photo_camera</span>
                </div>
              </div>
              <input 
                type="file"
                ref={avatarInputRef}
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>
            <h3 className="text-lg font-bold mb-2">Ảnh đại diện</h3>
            <p className="text-xs text-[#727785] mb-6">Định dạng JPG, PNG hoặc GIF. Tối đa 2MB.</p>
            <button 
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              className="text-xs font-bold text-[#0058be] hover:underline"
            >
              Chọn ảnh mới
            </button>
          </div>

          {/* Profile Form */}
          <div className="col-span-12 md:col-span-8 bg-white border border-[#c2c6d6] p-6 rounded-xl shadow-sm">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#0058be]">person</span>
              Thông tin cá nhân
            </h3>
            <form onSubmit={handleUpdateProfile} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-[#424754]">Họ và tên</label>
                <input
                  className="border border-[#c2c6d6] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#0058be]"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-[#424754]">Số điện thoại</label>
                <input
                  className="border border-[#c2c6d6] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#0058be]"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-2 col-span-1 md:col-span-2">
                <label className="text-xs font-semibold text-[#424754]">Email (Không thể thay đổi)</label>
                <input
                  className="border border-[#c2c6d6] rounded-lg px-4 py-3 text-sm bg-gray-100 cursor-not-allowed"
                  type="email"
                  disabled
                  value={currentUser?.email || ''}
                />
              </div>

              <div className="col-span-1 md:col-span-2 flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-gradient-to-r from-[#0058be] to-[#2170e4] text-white px-6 py-2.5 rounded-lg font-semibold hover:shadow-lg transition-all"
                >
                  {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
    </div>
  );
}
