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

  // Members list
  const [members, setMembers] = useState([]);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [addMemberLoading, setAddMemberLoading] = useState(false);

  // Delete trip modal
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Load trip info
  useEffect(() => {
    if (!tripId) return;

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
      } catch (err) {
        console.error('Failed to load trip detail:', err);
      } finally {
        setLoading(false);
      }
    };

    loadTripData();
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

  // Add new member
  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!newMemberEmail.trim()) return;

    setAddMemberLoading(true);
    try {
      // Find profile by email
      const res = await postgrest.get(`/profiles?email=eq.${newMemberEmail.trim().toLowerCase()}`);
      if (!res.data || res.data.length === 0) {
        alert('Không tìm thấy tài khoản người dùng với email này!');
        return;
      }

      const targetProfile = res.data[0];

      // Check if already member
      const isExist = members.some(m => m.user_id === targetProfile.id);
      if (isExist) {
        alert('Người dùng này đã tham gia chuyến đi!');
        return;
      }

      // Add member record
      await postgrest.post('/trip_members', {
        trip_id: tripId,
        user_id: targetProfile.id,
        role: 'member'
      });

      // Reload members list
      const membersRes = await postgrest.get(`/trip_members?trip_id=eq.${tripId}&select=*,profiles(*)`);
      setMembers(membersRes.data || []);
      setNewMemberEmail('');
    } catch (err) {
      alert('Lỗi thêm thành viên: ' + err.message);
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
      
      // Clear active trip ID if deleting current trip
      setCurrentTripId(null);
      
      alert('Xóa chuyến đi thành công!');
      navigate('/trips');
    } catch (err) {
      alert('Lỗi xóa chuyến đi: ' + err.message);
    } finally {
      setDeleteLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-[#727785] text-sm">
        Đang tải thông tin chuyến đi...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* 1. Header Area */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/trips')}
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100 border border-[#c2c6d6] transition-all"
          >
            <span className="material-symbols-outlined text-[#424754]">arrow_back</span>
          </button>
          <h1 className="text-xl font-bold text-[#191c1d]">Chỉnh sửa chuyến đi</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/trips')}
            className="px-4 py-2 border border-[#c2c6d6] text-xs font-bold text-[#424754] rounded-xl hover:bg-gray-50 transition-all"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSaveChanges}
            disabled={saveLoading}
            className="px-4 py-2 bg-[#0058be] text-white hover:bg-[#2170e4] text-xs font-bold rounded-xl shadow-md transition-all"
          >
            {saveLoading ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </div>
      </div>

      {/* 2. Main Bento Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left Columns: Basic info and cover photo (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Card: Thông tin cơ bản */}
          <div className="bg-white border border-[#c2c6d6] rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-[#191c1d] flex items-center gap-1.5 border-b border-[#f0f1f2] pb-3">
              <span className="material-symbols-outlined text-[#0058be] text-[18px]">info</span>
              Thông tin cơ bản
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#424754]">Tên chuyến đi *</label>
                <input
                  type="text"
                  required
                  className="w-full h-11 px-3 border border-[#c2c6d6] rounded-xl text-sm focus:ring-2 focus:ring-[#0058be]/20 focus:border-[#0058be] outline-none"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#424754]">Điểm đến *</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#727785] text-[18px]">location_on</span>
                  <input
                    type="text"
                    required
                    className="w-full h-11 pl-9 pr-3 border border-[#c2c6d6] rounded-xl text-sm focus:ring-2 focus:ring-[#0058be]/20 focus:border-[#0058be] outline-none"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#424754]">Ngày khởi hành</label>
                <input
                  type="date"
                  required
                  className="w-full h-11 px-3 border border-[#c2c6d6] rounded-xl text-sm outline-none"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#424754]">Ngày kết thúc</label>
                <input
                  type="date"
                  required
                  className="w-full h-11 px-3 border border-[#c2c6d6] rounded-xl text-sm outline-none"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>

              <div className="col-span-full space-y-1">
                <label className="text-xs font-semibold text-[#424754]">Mô tả chuyến đi</label>
                <textarea
                  rows={3}
                  className="w-full p-3 border border-[#c2c6d6] rounded-xl text-sm focus:ring-2 focus:ring-[#0058be]/20 focus:border-[#0058be] outline-none"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Card: Ảnh bìa chuyến đi */}
          <div className="bg-white border border-[#c2c6d6] rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-[#f0f1f2] pb-3">
              <h3 className="text-sm font-bold text-[#191c1d] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[#0058be] text-[18px]">image</span>
                Ảnh bìa chuyến đi
              </h3>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs font-bold text-[#0058be] hover:underline flex items-center gap-0.5"
              >
                <span className="material-symbols-outlined text-[14px]">upload</span>
                Tải lên ảnh mới
              </button>
              <input 
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleCustomImageUpload}
                className="hidden"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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

        </div>

        {/* Right Columns: Settings and Members list (1/3 width) */}
        <div className="space-y-6">
          
          {/* Card: Thiết lập */}
          <div className="bg-white border border-[#c2c6d6] rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-[#191c1d] flex items-center gap-1.5 border-b border-[#f0f1f2] pb-3">
              <span className="material-symbols-outlined text-[#0058be] text-[18px]">settings</span>
              Thiết lập
            </h3>

            <div className="space-y-4">
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

          {/* Card: Thành viên */}
          <div className="bg-white border border-[#c2c6d6] rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-[#191c1d] flex items-center gap-1.5 border-b border-[#f0f1f2] pb-3">
              <span className="material-symbols-outlined text-[#0058be] text-[18px]">group</span>
              Thành viên ({members.length})
            </h3>

            {/* Invite Form */}
            <form onSubmit={handleAddMember} className="flex gap-2">
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
                className="bg-[#0058be] hover:bg-[#2170e4] text-white text-xs font-bold px-3 py-1 rounded-lg transition-all"
              >
                + Mới
              </button>
            </form>

            {/* Members List */}
            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {members.map(member => {
                const isCreator = member.role === 'leader';
                return (
                  <div key={member.user_id} className="flex items-center justify-between gap-2 p-2 border border-[#c2c6d6] rounded-xl bg-gray-50/50">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-[#0058be] flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {member.profiles?.name?.charAt(0) || 'U'}
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-[#191c1d] truncate block">{member.profiles?.name || 'Thành viên'}</span>
                        <span className="text-[10px] text-[#727785] truncate block">{isCreator ? 'Chủ sở hữu' : 'Thành viên'}</span>
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
