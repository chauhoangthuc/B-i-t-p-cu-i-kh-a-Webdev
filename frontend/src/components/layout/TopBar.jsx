import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTrip } from '../../context/TripContext.jsx';
import { useNavigate, useLocation } from 'react-router-dom';
import { postgrest } from '../../lib/postgrest.js';
import Dropdown from '../common/Dropdown.jsx';
import { useLanguage } from '../../context/LanguageContext.jsx';
import ReceiptScannerModal from '../common/ReceiptScannerModal.jsx';

export default function TopBar({ tripName }) {
  const { currentUser, logout } = useAuth();
  const { currentTripRole, currentTrip, setCurrentTripId } = useTrip();
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();

  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [allTripsForSearch, setAllTripsForSearch] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Bell notification state
  const [invitations, setInvitations] = useState([]);
  const [showBellDropdown, setShowBellDropdown] = useState(false);
  const [actionLoading, setActionLoading] = useState(null); // invId being processed
  const bellRef = useRef(null);

  // Scan receipt WebRTC states
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [uploadProcessing, setUploadProcessing] = useState(false);
  const topBarFileInputRef = useRef(null);

  // Sync input value with URL search query
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const q = params.get('search') || '';
    setSearchTerm(q);
  }, [location.search]);

  useEffect(() => {
    const fetchTripsForSearch = async () => {
      try {
        const res = await postgrest.get('/trips?select=*');
        setAllTripsForSearch(res.data || []);
      } catch (err) {
        console.error('Failed to fetch trips for search:', err);
      }
    };
    if (currentUser) {
      fetchTripsForSearch();
    }
  }, [currentUser]);

  // Fetch pending invitations for current user
  const fetchInvitations = async () => {
    if (!currentUser?.email) return;
    try {
      const res = await postgrest.get(
        `/trip_invitations?invited_email=eq.${currentUser.email}&status=eq.pending&select=*,trip:trips(name),inviter:profiles!trip_invitations_invited_by_fkey(name,avatar_url)&order=created_at.desc&limit=10`
      );
      setInvitations(res.data || []);
    } catch (err) {
      console.error('Failed to fetch invitations for bell:', err);
    }
  };

  useEffect(() => {
    fetchInvitations();
    // Poll every 60 seconds
    const interval = setInterval(fetchInvitations, 60000);
    return () => clearInterval(interval);
  }, [currentUser]);

  // Close bell dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) {
        setShowBellDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Accept / Decline invitation
  const handleInvitation = async (inv, action) => {
    setActionLoading(inv.id);
    try {
      if (action === 'accept') {
        await postgrest.post('/rpc/accept_invitation', {
          invitation_token: inv.token,
          p_user_id: currentUser.id,
        });
      } else {
        await postgrest.patch(`/trip_invitations?id=eq.${inv.id}`, {
          status: 'declined',
          responded_at: new Date().toISOString(),
        });
      }
      // Optimistic: remove from list immediately
      setInvitations(prev => prev.filter(i => i.id !== inv.id));
    } catch (err) {
      console.error(`Failed to ${action} invitation:`, err);
    } finally {
      setActionLoading(null);
    }
  };

  const filteredSuggestions = allTripsForSearch.filter(trip => 
    trip.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (trip.destination && trip.destination.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSearchSubmit = () => {
    navigate(`/trips?search=${encodeURIComponent(searchTerm.trim())}`);
    setShowSuggestions(false);
  };

  const pendingCount = invitations.length;

  return (
    <header className="w-full h-16 sticky top-0 bg-white/80 backdrop-blur-md border-b border-[#c2c6d6] z-40 px-6 flex items-center justify-between">
      <div className="flex items-center gap-4">
        {/* Trip Switcher Dropdown Button */}
        <button 
          onClick={() => navigate('/trips')}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#f3f4f5] hover:bg-[#e7e8e9] transition-colors border border-[#c2c6d6]"
        >
          <span className="material-symbols-outlined text-[#0058be] text-[20px]">location_on</span>
          <span className="text-xs font-bold text-[#191c1d]">{tripName || currentTrip?.name || t('choose_trip')}</span>
          <span className="material-symbols-outlined text-[18px]">keyboard_arrow_down</span>
        </button>

        {/* Search */}
        <div className="relative flex items-center group">
          <input 
            className="pl-10 pr-4 py-1.5 rounded-lg bg-[#f3f4f5] border-transparent focus:border-[#0058be] focus:ring-0 focus:bg-white w-48 focus:w-64 transition-all duration-300 text-sm" 
            placeholder={t('search_placeholder')} 
            type="text" 
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => {
              // Delay hiding suggestions to allow clicking links
              setTimeout(() => setShowSuggestions(false), 200);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSearchSubmit();
              }
            }}
          />
          <span className="material-symbols-outlined absolute left-3 text-[#424754] group-focus-within:text-[#0058be] transition-colors text-[20px]">search</span>

          {showSuggestions && searchTerm.trim() && (
            <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-[#c2c6d6] rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
              {filteredSuggestions.length > 0 ? (
                filteredSuggestions.map(trip => (
                  <button
                    key={trip.id}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setSearchTerm(trip.name);
                      navigate(`/trips?search=${encodeURIComponent(trip.name)}`);
                      setShowSuggestions(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-[#f3f4f5] transition-colors flex flex-col gap-0.5 border-b border-gray-100 last:border-0"
                  >
                    <span className="font-bold text-[#191c1d] truncate">{trip.name}</span>
                    {trip.destination && (
                      <span className="text-[10px] text-[#727785] truncate flex items-center gap-0.5">
                        <span className="material-symbols-outlined text-[12px]">location_on</span>
                        {trip.destination}
                      </span>
                    )}
                  </button>
                ))
              ) : (
                <div className="px-3 py-2.5 text-xs text-gray-500 text-center">
                  Không tìm thấy chuyến đi nào
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Scan Receipt Button & Logic */}
        {/* Scan Receipt Button & Logic */}
        <div className="flex items-center gap-1">
          {/* Live Camera Scanner */}
          <button
            onClick={() => setIsScannerOpen(true)}
            className="p-2 rounded-full hover:bg-[#f3f4f5] transition-colors text-gray-700 flex items-center justify-center"
            title="Quét hóa đơn qua Camera (OCR)"
          >
            <span className="material-symbols-outlined text-[24px]">photo_camera</span>
          </button>

          {/* Quick Image Upload OCR */}
          <input 
            type="file" 
            accept="image/*" 
            ref={topBarFileInputRef} 
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;

              const mimeType = file.type || 'image/jpeg';
              setUploadProcessing(true);
              const reader = new FileReader();
              reader.onload = async () => {
                const dataUrl = reader.result;
                const base64Data = dataUrl.split(',')[1];
                
                try {
                  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
                  if (!apiKey) {
                    throw new Error('VITE_GEMINI_API_KEY is not defined.');
                  }

                  const response = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
                    {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        contents: [
                          {
                            parts: [
                              { text: `Bạn là một trợ lý ảo phân tích hóa đơn. Hãy đọc hóa đơn tiếng Việt trong ảnh này. Trả về cho tôi duy nhất một object JSON (không dùng markdown, không có text dư thừa, không bao quanh bằng ba dấu nháy ngược \`\`\`) với các trường sau:
{
  "amount": <số tổng tiền cuối cùng, kiểu number>,
  "currency": "VND",
  "date": "<ngày trên hóa đơn, định dạng YYYY-MM-DD>",
  "description": "<Mô tả ngắn gọn bằng tiếng Việt, ví dụ: Ăn trưa tại quán X>",
  "category": "<Chọn 1 trong các từ sau: Food, Transport, Tickets, Accommodation, Other>"
}` },
                              {
                                inlineData: {
                                  mimeType: mimeType,
                                  data: base64Data
                                }
                              }
                            ]
                          }
                        ]
                      })
                    }
                  );

                  if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(`API Error ${response.status}: ${errorData.error?.message || 'Unknown Gemini API error'}`);
                  }
                  
                  const data = await response.json();
                  let rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
                  console.log("TopBar Upload Raw Gemini Response:", rawText);
                  
                  const cleanText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
                  
                  let parsedResult;
                  try {
                    parsedResult = JSON.parse(cleanText);
                  } catch (jsonErr) {
                    throw new Error("Gemini returned invalid JSON. Check console for raw text.");
                  }

                  navigate('/expenses', { state: { scannedData: parsedResult } });
                } catch (err) {
                  console.error(err);
                  alert("Lỗi hệ thống:\n" + err.message);
                } finally {
                  setUploadProcessing(false);
                }
              };
              reader.readAsDataURL(file);
            }}
            className="hidden"
          />
          <button
            onClick={() => topBarFileInputRef.current?.click()}
            className="p-2 rounded-full hover:bg-[#f3f4f5] transition-colors text-gray-700 flex items-center justify-center"
            title="Tải ảnh hóa đơn lên (OCR)"
          >
            <span className="material-symbols-outlined text-[24px]">receipt_long</span>
          </button>
        </div>

        {/* Global Upload OCR Loading Overlay */}
        {uploadProcessing && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-4 text-white animate-in fade-in duration-200">
            <span className="animate-spin text-[48px] text-white material-symbols-outlined">progress_activity</span>
            <p className="text-sm font-bold tracking-wider animate-pulse">Đang tải ảnh và phân tích OCR với Gemini...</p>
          </div>
        )}

        {/* Live Camera Scanner Modal */}
        {isScannerOpen && (
          <ReceiptScannerModal onClose={() => setIsScannerOpen(false)} />
        )}

        {/* Lang Selector Dropdown */}
        <Dropdown 
          trigger={
            <button className="px-3 py-1.5 rounded-lg hover:bg-[#f3f4f5] transition-colors flex items-center gap-1 text-xs font-bold">
              <span>{language.toUpperCase()}</span>
              <span className="material-symbols-outlined text-[16px]">translate</span>
            </button>
          }
        >
          <button 
            onClick={() => setLanguage('vi')} 
            className={`w-full text-left px-3 py-2 text-xs font-medium hover:bg-[#f3f4f5] flex items-center justify-between ${language === 'vi' ? 'text-[#0058be] font-bold' : ''}`}
          >
            <span>Tiếng Việt (VI)</span>
            {language === 'vi' && <span className="material-symbols-outlined text-[14px]">check</span>}
          </button>
          <button 
            onClick={() => setLanguage('en')} 
            className={`w-full text-left px-3 py-2 text-xs font-medium hover:bg-[#f3f4f5] flex items-center justify-between ${language === 'en' ? 'text-[#0058be] font-bold' : ''}`}
          >
            <span>English (EN)</span>
            {language === 'en' && <span className="material-symbols-outlined text-[14px]">check</span>}
          </button>
        </Dropdown>

        {/* Bell Notification */}
        <div className="relative" ref={bellRef}>
          <button
            onClick={() => setShowBellDropdown(prev => !prev)}
            className="relative p-2 rounded-full hover:bg-[#f3f4f5] transition-colors"
            title={pendingCount > 0 ? `${pendingCount} lời mời đang chờ` : 'Không có thông báo mới'}
          >
            <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: pendingCount > 0 ? "'FILL' 1" : "'FILL' 0" }}>
              notifications
            </span>
            {pendingCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-[#ba1a1a] text-white text-[9px] font-extrabold rounded-full flex items-center justify-center px-0.5 border-2 border-white animate-pulse">
                {pendingCount > 9 ? '9+' : pendingCount}
              </span>
            )}
          </button>

          {/* Bell Dropdown */}
          {showBellDropdown && (
            <div className="absolute top-full right-0 mt-2 w-80 bg-white border border-[#c2c6d6] rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
              {/* Header */}
              <div className="px-4 py-3 border-b border-[#f0f1f2] flex items-center justify-between bg-[#f8f9fa]">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#0058be] text-[18px]">notifications</span>
                  <span className="text-sm font-bold text-[#191c1d]">Thông báo</span>
                </div>
                {pendingCount > 0 && (
                  <span className="bg-[#0058be] text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-full">
                    {pendingCount} mới
                  </span>
                )}
              </div>

              {/* Invitations list */}
              <div className="max-h-80 overflow-y-auto">
                {pendingCount === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <span className="material-symbols-outlined text-[36px] text-[#c2c6d6] block mb-2">notifications_off</span>
                    <p className="text-xs text-[#727785]">Không có thông báo mới</p>
                  </div>
                ) : (
                  <div className="divide-y divide-[#f0f1f2]">
                    {invitations.map(inv => (
                      <div key={inv.id} className="px-4 py-3 hover:bg-[#f8f9fa] transition-colors">
                        {/* Inviter info */}
                        <div className="flex items-start gap-2.5 mb-2.5">
                          <div className="w-8 h-8 rounded-full bg-[#0058be]/10 flex items-center justify-center text-[#0058be] text-xs font-bold flex-shrink-0 overflow-hidden">
                            {inv.inviter?.avatar_url ? (
                              <img src={inv.inviter.avatar_url} alt={inv.inviter.name} className="w-full h-full object-cover" />
                            ) : (
                              (inv.inviter?.name || 'U').charAt(0).toUpperCase()
                            )}
                          </div>
                          <div className="flex-grow min-w-0">
                            <p className="text-xs text-[#191c1d] leading-snug">
                              <span className="font-bold">{inv.inviter?.name || 'Ai đó'}</span>
                              <span className="text-[#727785]"> mời bạn tham gia </span>
                              <span className="font-bold text-[#0058be]">{inv.trip?.name}</span>
                            </p>
                            <p className="text-[10px] text-[#727785] mt-0.5">
                              {inv.role === 'leader' ? 'Vai trò: Trưởng nhóm' : 'Vai trò: Thành viên'}
                            </p>
                          </div>
                        </div>
                        {/* Action buttons */}
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => handleInvitation(inv, 'accept')}
                            disabled={actionLoading === inv.id}
                            className="py-1.5 bg-[#0058be] hover:bg-[#2170e4] text-white text-[11px] font-bold rounded-lg transition-all disabled:opacity-60 flex items-center justify-center gap-1"
                          >
                            {actionLoading === inv.id ? (
                              <span className="animate-spin text-[14px] material-symbols-outlined">progress_activity</span>
                            ) : (
                              <>
                                <span className="material-symbols-outlined text-[12px]">check</span>
                                Chấp nhận
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => handleInvitation(inv, 'decline')}
                            disabled={actionLoading === inv.id}
                            className="py-1.5 bg-white border border-[#c2c6d6] hover:bg-red-50 hover:border-red-200 text-[#ba1a1a] text-[11px] font-bold rounded-lg transition-all disabled:opacity-60 flex items-center justify-center gap-1"
                          >
                            <span className="material-symbols-outlined text-[12px]">close</span>
                            Từ chối
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-2.5 border-t border-[#f0f1f2] bg-[#f8f9fa]">
                <button
                  onClick={() => { setShowBellDropdown(false); navigate('/dashboard'); }}
                  className="text-xs font-bold text-[#0058be] hover:underline w-full text-center"
                >
                  Xem tất cả lời mời →
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="h-8 w-[1px] bg-[#c2c6d6]"></div>

        {/* Avatar Dropdown */}
        <Dropdown 
          trigger={
            <button className="flex items-center gap-1 p-1 rounded-full hover:bg-[#f3f4f5] transition-colors">
              <div className="w-8 h-8 rounded-full overflow-hidden border border-[#c2c6d6]">
                <img 
                  className="w-full h-full object-cover" 
                  src={currentUser?.avatar_url || 'https://lh3.googleusercontent.com/aida-public/AB6AXuAxnDk9gO35spxMRbVbdzIjd2ZskJKKCvcAPIJnOlmeQyoj3Fa-3fLYyVAHjxLFQhQKJdtcW_GChilERHGu10j8Ig-HTnfA9ePyTipt6uJkbxePmSm-Lq5PcCEGyB43nUCzteSc4EpseJPfD_6gIiNk6lV3NR8_kEWLGi8GBPwbC7mxZxRsRgr2sSw5girL0_eTmlOokMVnKUHTFaRzYrRoP7raHm9URlASSrf1JwDnsMBKvW7eJzyfilygcQwAZfd6-VWSbn3n3m4'} 
                  alt="User avatar" 
                />
              </div>
              <span className="material-symbols-outlined text-[18px]">expand_more</span>
            </button>
          }
        >
          <button 
            onClick={() => navigate('/profile')} 
            className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-[#f3f4f5] flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">person</span>
            <span>{t('dropdown_profile')}</span>
          </button>
          <button 
            onClick={() => navigate('/edit-profile')} 
            className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-[#f3f4f5] flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">settings</span>
            <span>{t('dropdown_edit')}</span>
          </button>
          <button 
            onClick={logout} 
            className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-red-50 text-red-600 flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            <span>{t('dropdown_logout')}</span>
          </button>
        </Dropdown>
      </div>
    </header>
  );
}
