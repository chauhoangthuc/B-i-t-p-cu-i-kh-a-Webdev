import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useNavigate, Link } from 'react-router-dom';
import logoImg from '../../assets/images/logo.png';

export default function RegisterPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const triggerToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setErrorMsg('Mật khẩu xác nhận không khớp.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      await signup(email, password, name);
      triggerToast('Đăng ký thành công! Hãy đăng nhập.');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setErrorMsg(err.message || 'Đăng ký tài khoản thất bại.');
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#f8f9fa] min-h-screen flex flex-col items-center justify-center relative overflow-x-hidden w-full">
      {/* Header */}
      <header className="w-full h-16 fixed top-0 flex justify-between items-center px-6 z-40 backdrop-blur-md bg-white/80 border-b border-[#c2c6d6]">
        <div className="flex items-center gap-2">
          <img src={logoImg} alt="Logo" className="w-8 h-8 object-contain" />
          <span className="text-lg font-bold text-[#191c1d]">TripManager</span>
        </div>
        <div className="flex items-center gap-4">
          <a className="text-xs font-semibold text-[#0058be] hover:underline transition-all" href="#">Trợ giúp</a>
        </div>
      </header>

      {/* Main Content Canvas */}
      <main className="flex-grow w-full flex items-center justify-center p-4 relative pt-20">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#0058be]/5 rounded-full blur-[120px] pointer-events-none"></div>

        {/* Main Registration Card */}
        <div className="bg-white/70 backdrop-blur-xl border border-white/30 shadow-lg w-full max-w-[480px] rounded-xl p-6 md:p-8 z-10 flex flex-col gap-6">
          <div className="text-center">
            <h2 className="text-3xl font-semibold text-[#191c1d] mb-1 tracking-tight">Tạo tài khoản mới</h2>
            <p className="text-sm text-[#424754]">Tham gia cùng chúng tôi ngay hôm nay</p>
          </div>

          {errorMsg && (
            <div className="bg-red-50 text-[#ba1a1a] text-xs p-3 rounded-lg border border-red-200">
              {errorMsg}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleRegisterSubmit}>
            {/* Full Name Field */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-[#424754] ml-1" htmlFor="fullName">Họ và tên</label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3 text-[20px] text-[#727785]">person</span>
                <input
                  className="w-full h-12 pl-10 pr-4 bg-white/50 border border-[#c2c6d6] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0058be]/20 focus:border-[#0058be] transition-all"
                  id="fullName"
                  placeholder="Nguyễn Văn A"
                  required
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>

            {/* Email Field */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-[#424754] ml-1" htmlFor="email">Email</label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3 text-[20px] text-[#727785]">mail</span>
                <input
                  className="w-full h-12 pl-10 pr-4 bg-white/50 border border-[#c2c6d6] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0058be]/20 focus:border-[#0058be] transition-all"
                  id="email"
                  placeholder="email@example.com"
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-[#424754] ml-1" htmlFor="password">Mật khẩu</label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3 text-[20px] text-[#727785]">lock</span>
                <input
                  className="w-full h-12 pl-10 pr-10 bg-white/50 border border-[#c2c6d6] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0058be]/20 focus:border-[#0058be] transition-all"
                  id="password"
                  placeholder="••••••••"
                  required
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  className="absolute right-3 text-[#727785] hover:text-[#0058be] transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                  type="button"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-[#424754] ml-1" htmlFor="confirmPassword">Xác nhận mật khẩu</label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3 text-[20px] text-[#727785]">verified_user</span>
                <input
                  className="w-full h-12 pl-10 pr-4 bg-white/50 border border-[#c2c6d6] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0058be]/20 focus:border-[#0058be] transition-all"
                  id="confirmPassword"
                  placeholder="••••••••"
                  required
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              className="bg-gradient-to-r from-[#0058be] to-[#2170e4] text-white hover:shadow-lg hover:shadow-[#0058be]/20 hover:-translate-y-0.5 transition-all w-full h-12 rounded-lg font-semibold flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
              disabled={loading}
              type="submit"
            >
              <span>{loading ? 'ĐANG TẠO TÀI KHOẢN...' : 'ĐĂNG KÝ'}</span>
              {loading && <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>}
            </button>
          </form>

          <footer className="text-center mt-2">
            <p className="text-sm text-[#424754]">
              Đã có tài khoản? <Link className="text-[#0058be] font-bold hover:underline" to="/login">Đăng nhập</Link>
            </p>
          </footer>
        </div>
      </main>

      {/* Notification Toast */}
      {toastMsg && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] px-6 py-2.5 bg-[#2e3132] text-[#f0f1f2] rounded-full text-xs shadow-lg transition-all duration-300">
          {toastMsg}
        </div>
      )}
    </div>
  );
}
