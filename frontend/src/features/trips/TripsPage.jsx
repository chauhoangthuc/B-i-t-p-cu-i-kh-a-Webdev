import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTrip } from '../../context/TripContext.jsx';
import { postgrest } from '../../lib/postgrest.js';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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

export default function TripsPage() {
  const { currentUser, session } = useAuth();
  const { setCurrentTripId } = useTrip();
  const navigate = useNavigate();
  const location = useLocation();

  // State
  const [trips, setTrips] = useState([]);
  const [filteredTrips, setFilteredTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // all, upcoming, completed, planned

  const searchParams = new URLSearchParams(location.search);
  const searchVal = searchParams.get('search') || '';

  // Modal form states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [name, setName] = useState('');
  const [destination, setDestination] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [baseCurrency, setBaseCurrency] = useState('VND');
  const [timezone, setTimezone] = useState('Asia/Ho_Chi_Minh');
  const [selectedImage, setSelectedImage] = useState(COVER_PRESETS[0].url);
  const fileInputRef = useRef(null);

  // Fetch all trips
  const fetchTrips = async () => {
    setLoading(true);
    try {
      const res = await postgrest.get('/trips?select=*');
      const allTrips = res.data || [];
      // Sort safely on client side
      allTrips.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
      setTrips(allTrips);
    } catch (err) {
      console.error('Failed to fetch trips:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrips();
  }, []);

  // Filter tabs logic
  useEffect(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    
    let result = [...trips];

    // Apply search filter if query parameter exists
    if (searchVal.trim()) {
      const q = searchVal.toLowerCase();
      result = result.filter(t => 
        t.name.toLowerCase().includes(q) || 
        (t.destination && t.destination.toLowerCase().includes(q))
      );
    }

    if (activeTab === 'upcoming') {
      // Sắp tới / Đang diễn ra
      result = result.filter(t => t.end_date >= todayStr);
    } else if (activeTab === 'completed') {
      // Đã hoàn thành
      result = result.filter(t => t.end_date < todayStr);
    } else if (activeTab === 'planned') {
      // Lên kế hoạch (chưa đi)
      result = result.filter(t => t.start_date > todayStr);
    }
    setFilteredTrips(result);
  }, [trips, activeTab, searchVal]);

  // Reset active tab to 'all' on search to prevent results from being hidden by active tab filter
  useEffect(() => {
    if (searchVal.trim()) {
      setActiveTab('all');
    }
  }, [searchVal]);

  // Handle custom image file upload -> Base64
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

  // Create Trip submit
  const handleCreateTrip = async (e) => {
    e.preventDefault();
    setCreateLoading(true);
    try {
      const payload = {
        name,
        description,
        destination,
        start_date: startDate,
        end_date: endDate,
        base_currency: baseCurrency,
        timezone,
        image_url: selectedImage,
        created_by: currentUser?.id || session?.user?.id
      };
      
      const res = await postgrest.post('/trips', payload);
      setShowCreateModal(false);
      fetchTrips();
      
      // Reset form
      setName('');
      setDestination('');
      setDescription('');
      setStartDate('');
      setEndDate('');
      setSelectedImage(COVER_PRESETS[0].url);
    } catch (err) {
      alert('Không thể tạo chuyến đi: ' + err.message);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleSelectTrip = (tripId) => {
    setCurrentTripId(tripId);
    navigate('/calendar');
  };

  // Sensors for dnd-kit
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Drag Drop handler for trips grid reordering
  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = trips.findIndex(t => t.id === active.id);
    const newIndex = trips.findIndex(t => t.id === over.id);

    const updatedTrips = arrayMove(trips, oldIndex, newIndex);
    // Optimistic UI state update
    setTrips(updatedTrips);

    try {
      const updatePromises = updatedTrips.map((trip, index) =>
        postgrest.patch(`/trips?id=eq.${trip.id}`, { order_index: index })
      );
      await Promise.all(updatePromises);
    } catch (err) {
      console.error('Failed to sync trip order:', err);
      alert('Không thể lưu thứ tự chuyến đi mới: ' + err.message);
      fetchTrips(); // Rollback
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#191c1d] tracking-tight">Danh sách chuyến đi</h1>
          <p className="text-sm text-[#424754]">
            Chào mừng trở lại, {currentUser?.name || 'bạn'}. Bạn có {trips.length} chuyến đi trong hệ thống.
          </p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 bg-[#0058be] text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-md hover:bg-[#2170e4] active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Tạo chuyến đi mới
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-[#c2c6d6]">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'all' 
              ? 'bg-[#0058be] text-white shadow-sm' 
              : 'bg-white border border-[#c2c6d6] text-[#424754] hover:border-[#0058be] hover:text-[#0058be]'
          }`}
        >
          Tất cả
        </button>
        <button
          onClick={() => setActiveTab('upcoming')}
          className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'upcoming' 
              ? 'bg-[#0058be] text-white shadow-sm' 
              : 'bg-white border border-[#c2c6d6] text-[#424754] hover:border-[#0058be] hover:text-[#0058be]'
          }`}
        >
          Sắp tới / Đang diễn ra
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'completed' 
              ? 'bg-[#0058be] text-white shadow-sm' 
              : 'bg-white border border-[#c2c6d6] text-[#424754] hover:border-[#0058be] hover:text-[#0058be]'
          }`}
        >
          Đã hoàn thành
        </button>
        <button
          onClick={() => setActiveTab('planned')}
          className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'planned' 
              ? 'bg-[#0058be] text-white shadow-sm' 
              : 'bg-white border border-[#c2c6d6] text-[#424754] hover:border-[#0058be] hover:text-[#0058be]'
          }`}
        >
          Đã lên kế hoạch
        </button>
      </div>

      {/* Search results banner */}
      {searchVal && (
        <div className="flex items-center justify-between bg-blue-50 border border-blue-100 text-[#0058be] px-4 py-3 rounded-xl text-xs font-semibold animate-in fade-in slide-in-from-top-1 duration-200">
          <span className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[18px]">search</span>
            Kết quả tìm kiếm cho từ khóa: <strong className="text-[#0058be]">"{searchVal}"</strong>
          </span>
          <button 
            onClick={() => navigate('/trips')} 
            className="hover:underline text-[10px] font-extrabold uppercase bg-white border border-blue-200 px-2.5 py-1.5 rounded-lg transition-all"
          >
            Xóa tìm kiếm
          </button>
        </div>
      )}

      {/* Grid of Trips */}
      {loading ? (
        <div className="text-center py-16 text-[#727785] text-sm">Đang tải danh sách chuyến đi...</div>
      ) : filteredTrips.length === 0 ? (
        <div className="bg-white border border-[#c2c6d6] border-dashed rounded-2xl p-12 text-center space-y-4">
          <span className="material-symbols-outlined text-[48px] text-[#c2c6d6]">explore</span>
          <p className="text-sm text-[#727785]">Không tìm thấy chuyến đi nào khớp với bộ lọc.</p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={filteredTrips.map(t => t.id)}
            strategy={rectSortingStrategy}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredTrips.map(trip => (
                <SortableTripItem
                  key={trip.id}
                  trip={trip}
                  handleSelectTrip={handleSelectTrip}
                  currentUser={currentUser}
                  navigate={navigate}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Create Trip Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-[550px] rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar animate-in fade-in zoom-in duration-200">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-[#c2c6d6] pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#0058be]" style={{ fontVariationSettings: "'FILL' 1" }}>flight_takeoff</span>
                <h3 className="text-lg font-bold text-[#191c1d]">Tạo chuyến đi mới</h3>
              </div>
              <button className="text-[#727785] hover:text-[#191c1d]" onClick={() => setShowCreateModal(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateTrip} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#424754]">Tên chuyến đi *</label>
                <input
                  className="w-full h-11 px-3 border border-[#c2c6d6] rounded-xl text-sm focus:ring-2 focus:ring-[#0058be]/20 focus:border-[#0058be] outline-none"
                  placeholder="Ví dụ: Khám phá mùa thu Hà Nội"
                  required
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#424754]">Điểm đến *</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#727785] text-[18px]">location_on</span>
                  <input
                    className="w-full h-11 pl-9 pr-3 border border-[#c2c6d6] rounded-xl text-sm focus:ring-2 focus:ring-[#0058be]/20 focus:border-[#0058be] outline-none"
                    placeholder="Nhập thành phố hoặc quốc gia..."
                    required
                    type="text"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#424754]">Mô tả hành trình</label>
                <textarea
                  className="w-full p-3 border border-[#c2c6d6] rounded-xl text-sm focus:ring-2 focus:ring-[#0058be]/20 focus:border-[#0058be] outline-none"
                  placeholder="Mô tả hành trình..."
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#424754]">Ngày khởi hành</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#727785] text-[18px]">calendar_month</span>
                    <input
                      className="w-full h-11 pl-9 pr-3 border border-[#c2c6d6] rounded-xl text-sm outline-none"
                      required
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#424754]">Ngày kết thúc</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#727785] text-[18px]">calendar_month</span>
                    <input
                      className="w-full h-11 pl-9 pr-3 border border-[#c2c6d6] rounded-xl text-sm outline-none"
                      required
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Cover Image Gallery Section */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-[#424754]">Ảnh bìa</label>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs font-bold text-[#0058be] hover:underline flex items-center gap-0.5"
                  >
                    <span className="material-symbols-outlined text-[14px]">upload</span>
                    Tải ảnh lên
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

              {/* Currency & Timezone */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#424754]">Tiền tệ chính</label>
                  <select
                    className="w-full h-11 px-3 border border-[#c2c6d6] rounded-xl text-sm"
                    value={baseCurrency}
                    onChange={(e) => setBaseCurrency(e.target.value)}
                  >
                    <option value="VND">VND</option>
                    <option value="USD">USD</option>
                    <option value="JPY">JPY</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#424754]">Múi giờ</label>
                  <select
                    className="w-full h-11 px-3 border border-[#c2c6d6] rounded-xl text-sm"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                  >
                    <option value="Asia/Ho_Chi_Minh">Asia/Ho_Chi_Minh (GMT+7)</option>
                    <option value="Asia/Tokyo">Asia/Tokyo (GMT+9)</option>
                    <option value="Asia/Singapore">Asia/Singapore (GMT+8)</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#f0f1f2]">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-5 py-2.5 rounded-xl font-bold text-xs border border-[#c2c6d6] hover:bg-gray-50 transition-all"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-5 py-2.5 bg-[#0058be] hover:bg-[#2170e4] text-white font-bold text-xs rounded-xl shadow-md hover:shadow-[#0058be]/20 transition-all flex items-center gap-1"
                >
                  {createLoading ? 'Đang tạo...' : 'Tạo chuyến đi'}
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Action Button */}
      <button 
        onClick={() => setShowCreateModal(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-[#0058be] to-[#2170e4] text-white rounded-full flex items-center justify-center shadow-xl shadow-[#0058be]/20 hover:scale-105 active:scale-95 transition-all z-40 group"
        title="Tạo chuyến đi mới"
      >
        <span className="material-symbols-outlined text-[28px] group-hover:rotate-90 transition-transform duration-300">add</span>
      </button>

    </div>
  );
}

function SortableTripItem({ trip, handleSelectTrip, currentUser, navigate }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: trip.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 20 : 1,
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const isCompleted = trip.end_date < todayStr;
  const isUpcoming = trip.start_date > todayStr;
  
  let statusText = 'Đang diễn ra';
  let statusBg = 'bg-[#d5e0f8] text-[#0058be]';
  if (isCompleted) {
    statusText = 'Đã hoàn thành';
    statusBg = 'bg-[#e2e2e3] text-[#424754]';
  } else if (isUpcoming) {
    statusText = 'Sắp tới';
    statusBg = 'bg-blue-50 text-[#2170e4] border border-blue-100';
  }

  const isCreator = trip.created_by === currentUser?.id;

  return (
    <div 
      ref={setNodeRef}
      style={style}
      onClick={() => handleSelectTrip(trip.id)}
      className="group cursor-pointer bg-white border border-[#c2c6d6] hover:border-[#0058be] hover:shadow-lg rounded-2xl overflow-hidden flex flex-col sm:flex-row transition-all duration-300 h-auto sm:h-48"
    >
      {/* Trip Cover Image (left side) */}
      <div className="relative w-full sm:w-2/5 h-40 sm:h-full bg-gray-100 overflow-hidden">
        <img 
          src={trip.image_url || COVER_PRESETS[0].url} 
          alt={trip.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
        />
        <div className="absolute top-3 left-3">
          <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-lg backdrop-blur-md shadow-sm ${statusBg}`}>
            {statusText}
          </span>
        </div>
      </div>

      {/* Details side (right side) */}
      <div className="p-5 flex flex-col justify-between flex-grow sm:w-3/5">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
              isCreator ? 'bg-[#0058be]/10 text-[#0058be]' : 'bg-gray-100 text-[#424754]'
            }`}>
              {isCreator ? 'Trưởng nhóm' : 'Thành viên'}
            </span>
            <span 
              onClick={(e) => {
                e.stopPropagation();
                navigate('/edit-trip/' + trip.id);
              }}
              title="Chỉnh sửa chuyến đi"
              className="material-symbols-outlined text-[#c2c6d6] hover:text-[#0058be] text-[18px] cursor-pointer"
            >
              edit
            </span>
          </div>

          <h3 className="font-bold text-[#191c1d] group-hover:text-[#0058be] line-clamp-1 transition-colors text-base">
            {trip.name}
          </h3>

          <div className="space-y-1 text-xs text-[#727785]">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px]">calendar_month</span>
              <span>{trip.start_date} - {trip.end_date}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px]">location_on</span>
              <span>{trip.destination || 'Chưa cập nhật'}</span>
            </div>
          </div>
        </div>

        {/* Footer (Avatars + drag indicator handle) */}
        <div className="flex justify-between items-center pt-3 border-t border-[#f0f1f2] mt-2">
          <div className="flex -space-x-1.5">
            <div className="w-6 h-6 rounded-full border border-white bg-blue-100 text-[9px] font-extrabold flex items-center justify-center">U</div>
            <div className="w-6 h-6 rounded-full border border-white bg-gray-200 text-[9px] font-extrabold flex items-center justify-center">+1</div>
          </div>
          
          {/* Drag handle instead of Details button */}
          <div 
            {...attributes} 
            {...listeners} 
            className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-[#0058be] p-1.5 hover:bg-gray-100 rounded-lg flex items-center justify-center transition-all touch-none"
            title="Kéo thả để sắp xếp"
            onClick={(e) => e.stopPropagation()} // Prevent selecting trip
          >
            <span className="material-symbols-outlined text-[20px]">drag_indicator</span>
          </div>
        </div>
      </div>
    </div>
  );
}
