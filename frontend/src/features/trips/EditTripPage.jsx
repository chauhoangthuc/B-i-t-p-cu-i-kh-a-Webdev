import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTrip } from '../../context/TripContext.jsx';
import { postgrest } from '../../lib/postgrest.js';
import { useNavigate, useParams } from 'react-router-dom';

const COVER_PRESETS = [
  {
    name: 'Vịnh Hạ Long',
    url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDPdib7AiZ2Sy43Pjezo_oWHqRdKVglrS6eMpWOid88R1v_Ni3qWnE-r7743VD3tET5VmYb0I-pqpy3zi05kuiB-L6TatB8rEObWL-KMR2QKnuXq8zTzd_bQPq2ie-m6KRyP2WWb-3VRfncaFNo-6Us38RPRblGLxF7KWmJR1uhxaMHJur5vn40oq9RR_kKn3yKqKm-eg7aKQt5aPPpAZHG3ZV2iIh93Hm43SqwF4C8XSuFXTuUwcpaiH3VSdllfqrevRukGpib-Ug'
  },
  {
    name: 'Sapa',
    url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA0ox2khXKTCwH22pmPmohXGBzdR4Y2cdPxuBizYIXwrD6OEJqc9Hauf1NJA4G4BTUjpb2SKMjSJBO2YGyXF5vfqciko1iwqNbIA2mU5X9sUjvgeM3wwRUZVLjiRpAndMvYkzZ_A4p3KopwVyQuWDbPJvl5MA2bWmpQ3eKxaLimOuO2segM6Bd7vgjrounEWPVS7FFietdJH4RtBlnzDcqFEEYJJKe7eFC38XvFu7RvTuoeNv5vEPlTgkKwCDRlhiUAXMT_lcMqGnY'
  },
  {
    name: 'Hội An',
    url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDyYiWWROVVeiu4w1djZUIWSgmcwWIWvlMffaMAUotMsQXkIJnA3p7SlDHmk9iCt7CTRuNKX0y_4VFuK41Ls7KjVCFVx01aKJlDPuKClVx3S0rliQfNzPIlMsdCdpgOqscwhOVcmmCklOMK5o-P_WD_3yYpHmRiFzPe96e75dbkopP-cy14NXikalWxK21-UhoPSe5qONqrac1H-o7m1P6UzzGKLRlihEmY6aC7sOSqkru5lkpFkB8HkqWHQNeKNtz0Lhv85ROnm9Y'
  },
  {
    name: 'Hà Nội',
    url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDFprwWeyVhzlXzrpsrUq2hBp8PR5Zn05A1j6RLeEKpy0FuQgl-1e-ob2hG-rybpjyRIZcvF1LQe3rQi1wkKk6rWyiwvTS0GnkT1QsBPEUQUd7F8Ploo4qlc0dbuHbt1Xy5shbWmgsvTj-TakJEUyLmbxKVoCE4dfnB_Pq9gGp_DKMWD5o-NGaipDYP5aOaEG471Z35td0yDPg8wqBl4FG7g0rIIZ9kje7K1DXIGd_6gMfiH2Rclr8jHsI3TZKzFtZ4YSfm5KYT2uM'
  }
];

// ─── Token generator ───────────────────────────────────────────────────────────
function generateInviteToken() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

export default function EditTripPage() {
  const { tripId } = useParams();
  const { currentUser } = useAuth();
  const { setCurrentTripId } = useTrip();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // States
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [name, setName] = useState('');
  const [destination, setDestination] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedImage, setSelectedImage] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [notifications, setNotifications] = useState(true);

  // Members & Invitations lists
  const [members, setMembers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [addMemberLoading, setAddMemberLoading] = useState(false);
  const [toast, setToast] = useState(null); // { type: 'success'|'error', msg }

  // Delete trip modal
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Load trip info, members and invitations
  const loadTripData = async () => {
    try {
      setLoading(true);
      // 1. Fetch trip metadata
      const tripRes = await postgrest.get(`/trips?id=eq.${tripId}`);
      if (tripRes.data && tripRes.data.length > 0) {
        const t = tripRes.data[0];
        setName(t.name);
        setDestination(t.destination || '');
        setDescription(t.description || '');
        setStartDate(t.start_date);
        setEndDate(t.end_date);
        setSelectedImage(t.image_url || COVER_PRESETS[0].url);
      }

      // 2. Fetch members
      const membersRes = await postgrest.get(`/trip_members?trip_id=eq.${tripId}&select=*,profiles(*)`);
      setMembers(membersRes.data || []);

      // 3. Fetch invitations
      const invsRes = await postgrest.get(`/trip_invitations?trip_id=eq.${tripId}&select=*&order=created_at.desc`);
      setInvitations(invsRes.data || []);
    } catch (err) {
      console.error('Failed to load trip detail:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tripId) {
      loadTripData();
    }
  }, [tripId]);

  // Update trip info
  const handleSaveChanges = async (e) => {
    e.preventDefault();
    setSaveLoading(true);
    try {
      const payload = {
        name,
        destination,
        description,
        start_date: startDate,
        end_date: endDate,
        image_url: selectedImage
      };
      await postgrest.patch(`/trips?id=eq.${tripId}`, payload);
      
      alert('Cập nhật chuyến đi thành công!');
      navigate('/trips');
    } catch (err) {
      alert('Không thể lưu thay đổi: ' + err.message);
    } finally {
      setSaveLoading(false);
    }
  };

  // Upload cover image
  const handleCustomImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('Kích thước ảnh tối đa 2MB!');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedImage(reader.result); // Base64 string
    };
    reader.readAsDataURL(file);
  };

  // Add new member (Invite via Email)
  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!newMemberEmail.trim()) return;

    setAddMemberLoading(true);
    setToast(null);

    const normalizedEmail = newMemberEmail.trim().toLowerCase();

    // Check if already a member
    if (members.some(m => m.profiles?.email?.toLowerCase() === normalizedEmail)) {
      setToast({ type: 'error', msg: 'Người này đã là thành viên của chuyến đi.' });
      setAddMemberLoading(false);
      return;
    }

    // Check if pending invitation exists
    if (invitations.some(i => i.invited_email.toLowerCase() === normalizedEmail && i.status === 'pending')) {
      setToast({ type: 'error', msg: 'Đã gửi lời mời tới email này, đang chờ phản hồi.' });
      setAddMemberLoading(false);
      return;
    }

    try {
      const token = generateInviteToken();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      // 1. Create invitation record (PostgREST)
      await postgrest.post('/trip_invitations', {
        trip_id: tripId,
        invited_email: normalizedEmail,
        invited_by: currentUser.id,
        role: inviteRole,
        token,
        expires_at: expiresAt,
      });

      // 2. Send email via Jobs Service (fire-and-forget)
      fetch('/jobs/api/invitations/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: normalizedEmail,
          inviterName: currentUser.name || 'Ai đó',
          tripName: name,
          inviteLink: `${window.location.origin}/invite/${token}`,
        }),
      }).catch(err => console.warn('Email endpoint unreachable (non-blocking):', err.message));

      setToast({ type: 'success', msg: `Đã gửi lời mời tới ${normalizedEmail}!` });
      setNewMemberEmail('');
      
      // Reload invitations list
      const invsRes = await postgrest.get(`/trip_invitations?trip_id=eq.${tripId}&select=*&order=created_at.desc`);
      setInvitations(invsRes.data || []);
    } catch (err) {
      setToast({ type: 'error', msg: 'Lỗi gửi lời mời: ' + err.message });
    } finally {
      setAddMemberLoading(false);
    }
  };

  // Remove member
  const handleRemoveMember = async (userId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa thành viên này khỏi chuyến đi?')) return;

    try {
      await postgrest.delete(`/trip_members?trip_id=eq.${tripId}&user_id=eq.${userId}`);
      setMembers(prev => prev.filter(m => m.user_id !== userId));
    } catch (err) {
      alert('Lỗi xóa thành viên: ' + err.message);
    }
  };

  // Delete Trip completely
  const handleDeleteTrip = async () => {
    setDeleteLoading(true);
    try {
      await postgrest.delete(`/trips?id=eq.${tripId}`);
      alert('Đã xóa chuyến đi thành công!');
      navigate('/trips');
    } catch (err) {
      alert('Lỗi xóa chuyến đi: ' + err.message);
    } finally {
      setDeleteLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const statusConfig = {
    pending:  { cls: 'text-amber-700 bg-amber-50 border border-amber-200', label: 'Đang chờ' },
    accepted: { cls: 'text-green-700 bg-green-50 border border-green-200',  label: 'Đã nhận' },
    declined: { cls: 'text-red-700 bg-red-50 border border-red-200',        label: 'Từ chối' },
    expired:  { cls: 'text-gray-500 bg-gray-50 border border-gray-200',     label: 'Hết hạn' },
  };

  if (loading) {
    return <div className="text-center py-16 text-sm text-[#727785]">Đang tải thông tin chuyến đi...</div>;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-[#c2c6d6] pb-4">
        <div>
          <h1 className="text-2xl font-black text-[#191c1d]">Chỉnh sửa chuyến đi</h1>
          <p className="text-xs text-[#727785]">Thiết lập cài đặt và quản lý thành viên cho hành trình</p>
        </div>
        <button 
          onClick={() => navigate('/trips')}
          className="text-xs font-bold text-[#424754] border border-[#c2c6d6] bg-white hover:bg-gray-50 px-4 py-2 rounded-xl transition-all"
        >
          Quay lại
        </button>
      </div>

      {/* Main layout: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left Column: Form Info (2/3 width) */}
        <form onSubmit={handleSaveChanges} className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-[#c2c6d6] rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-[#191c1d] border-b border-[#f0f1f2] pb-3">Thông tin cơ bản</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#424754]">Tên chuyến đi *</label>
                <input 
                  type="text" 
                  required
                  className="w-full h-11 px-3 border border-[#c2c6d6] rounded-xl text-sm outline-none focus:border-[#0058be]"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#424754]">Điểm đến *</label>
                <input 
                  type="text" 
                  required
                  className="w-full h-11 px-3 border border-[#c2c6d6] rounded-xl text-sm outline-none focus:border-[#0058be]"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#424754]">Ngày khởi hành *</label>
                <input 
                  type="date" 
                  required
                  className="w-full h-11 px-3 border border-[#c2c6d6] rounded-xl text-sm outline-none"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#424754]">Ngày kết thúc *</label>
                <input 
                  type="date" 
                  required
                  className="w-full h-11 px-3 border border-[#c2c6d6] rounded-xl text-sm outline-none"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#424754]">Mô tả chuyến đi</label>
              <textarea 
                className="w-full p-3 border border-[#c2c6d6] rounded-xl text-sm outline-none focus:border-[#0058be]"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Custom Cover Gallery presets */}
            <div className="space-y-2 pt-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-[#424754]">Hình nền hành trình</label>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs font-bold text-[#0058be] hover:underline flex items-center gap-0.5"
                >
                  <span className="material-symbols-outlined text-[14px]">upload</span>
                  Tải ảnh mới
                </button>
                <input 
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleCustomImageUpload}
                  className="hidden"
                />
              </div>

              <div className="grid grid-cols-4 gap-2">
                {COVER_PRESETS.map((preset, idx) => {
                  const isSelected = selectedImage === preset.url;
                  return (
                    <div 
                      key={idx}
                      onClick={() => setSelectedImage(preset.url)}
                      className={`relative aspect-video rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
                        isSelected ? 'border-[#0058be] scale-95 shadow-sm' : 'border-transparent hover:border-gray-300'
                      }`}
                    >
                      <img src={preset.url} alt={preset.name} className="w-full h-full object-cover" />
                      {isSelected && (
                        <div className="absolute inset-0 bg-[#0058be]/10 flex items-center justify-center">
                          <span className="material-symbols-outlined text-white bg-[#0058be] rounded-full p-0.5 text-xs">check</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t border-[#f0f1f2]">
              <button
                type="button"
                onClick={() => navigate('/trips')}
                className="px-5 py-2.5 border border-[#c2c6d6] text-[#424754] text-xs font-bold rounded-xl hover:bg-gray-50 transition-all"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={saveLoading}
                className="px-5 py-2.5 bg-[#0058be] hover:bg-[#2170e4] text-white text-xs font-bold rounded-xl transition-all shadow-md"
              >
                {saveLoading ? 'Đang lưu...' : 'Lưu cài đặt'}
              </button>
            </div>

          </div>
        </form>

        {/* Right Column: Members & Settings (1/3 width) */}
        <div className="space-y-6">
          
          {/* Card: Cài đặt nâng cao */}
          <div className="bg-white border border-[#c2c6d6] rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-[#191c1d] border-b border-[#f0f1f2] pb-3">Cài đặt nâng cao</h3>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-xs font-bold text-[#191c1d] block">Công khai chuyến đi</span>
                  <span className="text-[10px] text-[#727785] block">Cho phép người khác tìm thấy</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                  />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#0058be]"></div>
                </label>
              </div>

              <div className="flex justify-between items-center">
                <div>
                  <span className="text-xs font-bold text-[#191c1d] block">Thông báo</span>
                  <span className="text-[10px] text-[#727785] block">Cập nhật lịch trình qua email</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer"
                    checked={notifications}
                    onChange={(e) => setNotifications(e.target.checked)}
                  />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#0058be]"></div>
                </label>
              </div>

              <div className="pt-4 border-t border-[#f0f1f2] flex justify-center">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-xs font-bold text-[#ba1a1a] hover:underline flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[16px]">delete</span>
                  Xóa chuyến đi
                </button>
              </div>
            </div>
          </div>

          {/* Card: Thành viên & Lời mời */}
          <div className="bg-white border border-[#c2c6d6] rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-[#191c1d] flex items-center gap-1.5 border-b border-[#f0f1f2] pb-3">
              <span className="material-symbols-outlined text-[#0058be] text-[18px]">group</span>
              Thành viên ({members.length})
            </h3>

            {/* Toast feedback */}
            {toast && (
              <div className={`text-[10px] px-3 py-2 rounded-xl flex items-center gap-1.5 ${
                toast.type === 'success'
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                <span className="material-symbols-outlined text-[12px]">
                  {toast.type === 'success' ? 'check_circle' : 'error'}
                </span>
                {toast.msg}
              </div>
            )}

            {/* Invite Form */}
            <form onSubmit={handleAddMember} className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="Nhập email thành viên..."
                  required
                  className="flex-1 h-9 px-3 border border-[#c2c6d6] rounded-lg text-xs outline-none focus:border-[#0058be]"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                />
                <button
                  type="submit"
                  disabled={addMemberLoading}
                  className="bg-[#0058be] hover:bg-[#2170e4] text-white text-xs font-bold px-3 py-1 rounded-lg transition-all flex items-center justify-center shrink-0"
                >
                  {addMemberLoading ? '...' : '+ Mới'}
                </button>
              </div>
              <div className="flex justify-between items-center text-[10px] text-[#727785] px-1">
                <span>Vai trò đề xuất:</span>
                <select 
                  value={inviteRole} 
                  onChange={e => setInviteRole(e.target.value)}
                  className="bg-transparent border-none outline-none font-bold text-[#0058be] cursor-pointer"
                >
                  <option value="member">Thành viên</option>
                  <option value="leader">Trưởng nhóm</option>
                </select>
              </div>
            </form>

            {/* Members List */}
            <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
              {members.map(member => {
                const isCreator = member.role === 'leader';
                return (
                  <div key={member.user_id} className="flex items-center justify-between gap-2 p-2 border border-[#c2c6d6] rounded-xl bg-gray-50/50">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-[#0058be] flex items-center justify-center text-xs font-bold flex-shrink-0 overflow-hidden">
                        {member.profiles?.avatar_url ? (
                          <img src={member.profiles.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          member.profiles?.name?.charAt(0) || 'U'
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-[#191c1d] truncate block">{member.profiles?.name || 'Thành viên'}</span>
                        <span className="text-[10px] text-[#727785] truncate block">
                          {isCreator ? 'Trưởng nhóm' : 'Thành viên'}
                        </span>
                      </div>
                    </div>

                    {!isCreator && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(member.user_id)}
                        className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-red-50 text-[#ba1a1a] transition-all"
                      >
                        <span className="material-symbols-outlined text-[16px]">close</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Pending Invitations list inside Sidebar Card */}
            {invitations.length > 0 && (
              <div className="pt-2 border-t border-[#f0f1f2] space-y-2">
                <span className="text-[10px] font-bold text-[#727785] block uppercase tracking-wider">Lời mời đang chờ ({invitations.length})</span>
                <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                  {invitations.map(inv => {
                    const cfg = statusConfig[inv.status] || statusConfig.pending;
                    return (
                      <div key={inv.id} className="flex items-center justify-between gap-1 p-2 border border-dashed border-[#c2c6d6] rounded-xl bg-gray-50/20 text-[10px]">
                        <span className="font-medium text-[#191c1d] truncate flex-1 pr-1">{inv.invited_email}</span>
                        <span className={`px-1.5 py-0.5 rounded-full font-bold flex-shrink-0 ${cfg.cls}`}>
                          {cfg.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-red-50 text-[#ba1a1a] rounded-full flex items-center justify-center mx-auto">
                <span className="material-symbols-outlined text-[28px]">warning</span>
              </div>
              <h3 className="text-base font-bold text-[#191c1d]">Xác nhận xóa chuyến đi</h3>
              <p className="text-xs text-[#727785] leading-relaxed">
                Bạn có chắc chắn muốn xóa chuyến đi này? Hành động này sẽ xóa vĩnh viễn toàn bộ chi phí và sự kiện liên quan và không thể khôi phục.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="w-full py-2.5 border border-[#c2c6d6] hover:bg-gray-50 text-[#424754] text-xs font-bold rounded-xl transition-all"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleDeleteTrip}
                disabled={deleteLoading}
                className="w-full py-2.5 bg-[#ba1a1a] hover:bg-[#961212] text-white text-xs font-bold rounded-xl transition-all shadow-md"
              >
                {deleteLoading ? 'Đang xóa...' : 'Chắc chắn'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
