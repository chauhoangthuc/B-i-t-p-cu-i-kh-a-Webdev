import React, { useState } from 'react';
import { gotrue } from '../../lib/gotrue.js';
import { Link } from 'react-router-dom';
import logoImg from '../../assets/images/logo.png';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setErrorMsg('');

    try {
      const { error } = await gotrue.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });
      if (error) throw error;
      setMessage('Yêu cầu đặt lại mật khẩu đã được gửi! Vui lòng kiểm tra email.');
    } catch (err) {
      setErrorMsg(err.message || 'Gửi yêu cầu thất bại.');
    } finally {
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
      </header>

      {/* Main Content Canvas */}
      <main className="flex-grow w-full flex items-center justify-center p-4 relative pt-20">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#0058be]/5 rounded-full blur-[120px] pointer-events-none"></div>

        {/* Glass Card */}
        <div className="bg-white/70 backdrop-blur-xl border border-white/30 shadow-lg w-full max-w-[440px] p-6 rounded-xl z-10 flex flex-col gap-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-semibold text-[#191c1d] tracking-tight">Quên mật khẩu?</h1>
            <p className="text-sm text-[#424754]">Nhập email của bạn để nhận liên kết khôi phục mật khẩu</p>
          </div>

          {message && (
            <div className="bg-green-50 text-green-700 text-xs p-3 rounded-lg border border-green-200">
              {message}
            </div>
          )}

          {errorMsg && (
            <div className="bg-red-50 text-[#ba1a1a] text-xs p-3 rounded-lg border border-red-200">
              {errorMsg}
            </div>
          )}

          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
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

            <button
              className="bg-gradient-to-r from-[#0058be] to-[#2170e4] text-white hover:shadow-lg hover:shadow-[#0058be]/20 hover:-translate-y-0.5 transition-all w-full h-12 rounded-lg font-semibold flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
              disabled={loading}
              type="submit"
            >
              <span>{loading ? 'ĐANG GỬI...' : 'GỬI LINK KHÔI PHỤC'}</span>
              {loading && <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>}
            </button>
          </form>

          <footer className="text-center mt-2">
            <p className="text-sm text-[#424754]">
              Nhớ mật khẩu? <Link className="text-[#0058be] font-bold hover:underline" to="/login">Đăng nhập</Link>
            </p>
          </footer>
        </div>
      </main>
    </div>
  );
}
