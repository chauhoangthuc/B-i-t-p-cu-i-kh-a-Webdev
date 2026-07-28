import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useNavigate, Link } from 'react-router-dom';
import { gotrue } from '../../lib/gotrue.js';
import logoImg from '../../assets/images/logo.png';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  const triggerToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      await login(email, password);
      triggerToast('Đăng nhập thành công! Đang chuyển hướng...');
      setTimeout(() => navigate('/dashboard'), 1000);
    } catch (err) {
      setErrorMsg(err.message || 'Email hoặc mật khẩu không chính xác.');
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    if (!forgotEmail) return;
    try {
      // In a real flow, call GoTrue to send reset link
      triggerToast('Link khôi phục mật khẩu đã được gửi!');
      setShowForgotModal(false);
    } catch (err) {
      triggerToast('Gửi link khôi phục thất bại.');
    }
  };

  const handleGoogleLogin = async () => {
    try {
      triggerToast('Đang kết nối Google...');
      const redirectTo = window.location.origin + '/dashboard';
      const { data, error } = await gotrue.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectTo
        }
      });
      if (error) throw error;
    } catch (err) {
      triggerToast('Đăng nhập Google thất bại: ' + err.message);
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
        <a className="text-sm font-medium text-[#0058be] hover:underline transition-all" href="#">Trợ giúp</a>
      </header>

      {/* Main Content Canvas */}
      <main className="flex-grow w-full flex items-center justify-center p-4 relative pt-20">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#0058be]/5 rounded-full blur-[120px] pointer-events-none"></div>
        
        {/* Glass Login Card */}
        <div className="bg-white/70 backdrop-blur-xl border border-white/30 shadow-lg w-full max-w-[440px] p-6 rounded-xl z-10 flex flex-col gap-6" id="loginCard">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-semibold text-[#191c1d] tracking-tight">Chào mừng trở lại</h1>
            <p className="text-sm text-[#424754]">Vui lòng đăng nhập để tiếp tục</p>
          </div>

          {errorMsg && (
            <div className="bg-red-50 text-[#ba1a1a] text-xs p-3 rounded-lg border border-red-200">
              {errorMsg}
            </div>
          )}

          <form className="flex flex-col gap-4" onSubmit={handleLoginSubmit}>
            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#424754] px-1" htmlFor="email">Email</label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3 text-[20px] text-[#727785]">mail</span>
                <input
                  className="w-full h-12 pl-10 pr-4 bg-white/50 border border-[#c2c6d6] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0058be]/20 focus:border-[#0058be] transition-all"
                  id="email"
                  placeholder="your@email.com"
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center px-1">
                <label className="text-xs font-medium text-[#424754]" htmlFor="password">Mật khẩu</label>
                <button
                  className="text-xs text-[#0058be] font-semibold hover:underline"
                  onClick={() => setShowForgotModal(true)}
                  type="button"
                >
                  Quên mật khẩu?
                </button>
              </div>
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
                  className="absolute right-3 text-[#727785] hover:text-[#191c1d] transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                  type="button"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            <button
              className="bg-gradient-to-r from-[#0058be] to-[#2170e4] text-white hover:shadow-lg hover:shadow-[#0058be]/20 hover:-translate-y-0.5 transition-all w-full h-12 rounded-lg font-semibold flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
              disabled={loading}
              type="submit"
            >
              <span>{loading ? 'ĐANG XỬ LÝ...' : 'ĐĂNG NHẬP'}</span>
              {loading && <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>}
            </button>
          </form>

          <div className="flex items-center gap-4 py-2">
            <div className="h-[1px] flex-grow bg-[#c2c6d6]"></div>
            <span className="text-xs text-[#424754] whitespace-nowrap">Hoặc đăng nhập với</span>
            <div className="h-[1px] flex-grow bg-[#c2c6d6]"></div>
          </div>

          <button
            className="w-full h-12 bg-white border border-[#c2c6d6] rounded-lg flex items-center justify-center gap-3 hover:bg-[#edeeef] transition-colors group"
            onClick={handleGoogleLogin}
            type="button"
          >
            <svg height="20" viewBox="0 0 24 24" width="20">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"></path>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"></path>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path>
            </svg>
            <span className="text-sm font-medium text-[#191c1d]">Đăng nhập với Google</span>
          </button>

          <footer className="text-center mt-2">
            <p className="text-sm text-[#424754]">
              Chưa có tài khoản? <Link className="text-[#0058be] font-bold hover:underline" to="/register">Đăng ký ngay</Link>
            </p>
          </footer>
        </div>
      </main>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-[#f8f9fa] w-full max-w-[400px] rounded-xl p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-[#191c1d]">Quên mật khẩu?</h3>
                <p className="text-sm text-[#424754]">Chúng tôi sẽ gửi link khôi phục tới email của bạn.</p>
              </div>
              <button className="text-[#727785] hover:text-[#191c1d]" onClick={() => setShowForgotModal(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleForgotSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#424754]">Nhập Email</label>
                <input
                  className="w-full h-12 px-4 bg-[#f3f4f5] border border-[#c2c6d6] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0058be]/20 focus:border-[#0058be] transition-all"
                  placeholder="name@company.com"
                  required
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                />
              </div>
              <button className="bg-gradient-to-r from-[#0058be] to-[#2170e4] text-white w-full h-12 rounded-lg font-semibold" type="submit">
                GỬI LINK KHÔI PHỤC
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Notification Toast */}
      {toastMsg && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] px-6 py-2.5 bg-[#2e3132] text-[#f0f1f2] rounded-full text-xs shadow-lg transition-all duration-300">
          {toastMsg}
        </div>
      )}
    </div>
  );
}
