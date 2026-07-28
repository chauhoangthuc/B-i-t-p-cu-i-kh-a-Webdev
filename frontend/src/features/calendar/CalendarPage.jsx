import React, { useState, useEffect, useRef } from 'react';
import { postgrest } from '../../lib/postgrest.js';
import { useTrip } from '../../context/TripContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { io } from 'socket.io-client';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
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

export default function CalendarPage() {
  const { currentTripId, currentTrip } = useTrip();
  const { currentUser, session } = useAuth();
  const { language, t } = useLanguage();
  
  // State for Trips instead of Events
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  // Monthly calendar states
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  // Modal form states for Creating Trip
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

  // Sync calendar view month to the start date of selected trip
  useEffect(() => {
    if (currentTrip?.start_date) {
      const date = new Date(currentTrip.start_date);
      setCurrentMonth(date.getMonth());
      setCurrentYear(date.getFullYear());
    }
  }, [currentTrip]);

  const fetchTrips = async () => {
    try {
      setLoading(true);
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

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleMoveTrip = async (currentIndex, direction) => {
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= trips.length) return;

    try {
      const updatedTrips = arrayMove(trips, currentIndex, targetIndex);
      setTrips(updatedTrips);

      const updatePromises = updatedTrips.map((t, idx) =>
        postgrest.patch(`/trips?id=eq.${t.id}`, { order_index: idx })
      );
      await Promise.all(updatePromises);
    } catch (err) {
      alert('Không thể thay đổi thứ tự chuyến đi: ' + err.message);
      fetchTrips();
    }
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over) return;
    if (active.id === over.id) return;

    const oldIndex = trips.findIndex((t) => t.id === active.id);
    const newIndex = trips.findIndex((t) => t.id === over.id);

    try {
      const updatedTrips = arrayMove(trips, oldIndex, newIndex);
      setTrips(updatedTrips);

      const updatePromises = updatedTrips.map((t, idx) =>
        postgrest.patch(`/trips?id=eq.${t.id}`, { order_index: idx })
      );
      await Promise.all(updatePromises);
    } catch (err) {
      alert('Không thể kéo thả sắp xếp chuyến đi: ' + err.message);
      fetchTrips();
    }
  };

  useEffect(() => {
    fetchTrips();

    const socketUrl = import.meta.env.VITE_WS_URL || 'http://localhost:4000';
    const socket = io(socketUrl);

    socket.on('db_update', (payload) => {
      if (payload.table === 'trips') {
        fetchTrips();
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Calendar month math
  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1; // Mon = 0, Tue = 1, ..., Sun = 6
  };

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
  };

  // Find all trips overlapping with a specific day
  const getTripsForDay = (day, month, year) => {
    const cellDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return trips.filter(trip => cellDateStr >= trip.start_date && cellDateStr <= trip.end_date);
  };

  const handleCustomImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('Kích thước ảnh tối đa 2MB!');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedImage(reader.result);
    };
    reader.readAsDataURL(file);
  };

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
      
      await postgrest.post('/trips', payload);
      setShowCreateModal(false);
      
      setName('');
      setDestination('');
      setDescription('');
      setStartDate('');
      setEndDate('');
      setSelectedImage(COVER_PRESETS[0].url);
      
      alert('Tạo chuyến đi mới thành công!');
      fetchTrips();
    } catch (err) {
      alert('Không thể tạo chuyến đi: ' + err.message);
    } finally {
      setCreateLoading(false);
    }
  };

  // Generate monthly cells
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDayIndex = getFirstDayOfMonth(currentYear, currentMonth);
  
  const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
  const daysInPrevMonth = getDaysInMonth(prevYear, prevMonth);
  
  const cells = [];
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    cells.push({
      day: daysInPrevMonth - i,
      month: prevMonth,
      year: prevYear,
      isCurrentMonth: false,
    });
  }
  
  for (let i = 1; i <= daysInMonth; i++) {
    cells.push({
      day: i,
      month: currentMonth,
      year: currentYear,
      isCurrentMonth: true,
    });
  }
  
  const totalCells = Math.ceil(cells.length / 7) * 7;
  const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
  const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
  const nextDaysCount = totalCells - cells.length;
  for (let i = 1; i <= nextDaysCount; i++) {
    cells.push({
      day: i,
      month: nextMonth,
      year: nextYear,
      isCurrentMonth: false,
    });
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto animate-in fade-in duration-300">
      {/* Page Sub-Header & Actions */}
      <section className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#c2c6d6]">
        <div>
          <h2 className="text-xl font-bold text-[#191c1d]">{language === 'vi' ? 'Lịch trình & Hoạt động' : 'Schedule & Activities'}</h2>
          <div className="flex items-center gap-1.5 mt-1 text-[#727785] text-xs">
            <span className="material-symbols-outlined text-[16px]">calendar_today</span>
            <span>{language === 'vi' ? `Tháng ${currentMonth + 1}, ${currentYear}` : `${new Date(currentYear, currentMonth).toLocaleString('en-US', { month: 'long' })} ${currentYear}`}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Navigation */}
          <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200">
            <button 
              onClick={handleToday}
              className="px-3 py-1.5 text-xs font-semibold text-[#424754] hover:text-[#191c1d] transition-colors"
            >
              {language === 'vi' ? 'Hôm nay' : 'Today'}
            </button>
            <div className="h-4 w-[1px] bg-gray-300 mx-1"></div>
            <button 
              onClick={handlePrevMonth}
              className="p-1 hover:bg-gray-200 rounded-lg text-[#424754] hover:text-[#191c1d] transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>
            <button 
              onClick={handleNextMonth}
              className="p-1 hover:bg-gray-200 rounded-lg text-[#424754] hover:text-[#191c1d] transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>
          
          {/* Specific date selector */}
          <div className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-xl border border-gray-200">
            <span className="text-[10px] font-bold text-[#424754]">{language === 'vi' ? 'Đi tới ngày:' : 'Go to date:'}</span>
            <input
              type="date"
              className="bg-transparent border-none p-0 text-xs focus:ring-0 w-28 text-[#424754] font-medium outline-none cursor-pointer"
              onChange={(e) => {
                if (e.target.value) {
                  const selectedDate = new Date(e.target.value);
                  setCurrentMonth(selectedDate.getMonth());
                  setCurrentYear(selectedDate.getFullYear());
                }
              }}
            />
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 bg-[#0058be] text-white px-4 py-2 rounded-xl font-bold text-xs shadow-sm hover:bg-[#2170e4] active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            {t('create_trip_btn')}
          </button>
        </div>
      </section>

      {/* Main Grid Body */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Column: Month Calendar */}
        <div className="flex-grow bg-white border border-[#c2c6d6] rounded-2xl p-4 shadow-sm">
          <div className="grid grid-cols-7 border-l border-t border-[#c2c6d6] rounded-tl-lg overflow-hidden">
            {(language === 'vi' ? ['THỨ HAI', 'THỨ BA', 'THỨ TƯ', 'THỨ NĂM', 'THỨ SÁU', 'THỨ BẢY', 'CHỦ NHẬT'] : ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']).map((dayName, idx) => (
              <div 
                key={idx}
                className="p-2 text-center text-[10px] font-bold text-[#727785] border-r border-b border-[#c2c6d6] bg-gray-50"
              >
                {dayName}
              </div>
            ))}
            
            {cells.map((cell, idx) => (
              <div 
                key={idx} 
                className={`p-2 border-r border-b border-[#c2c6d6] min-h-[90px] flex flex-col gap-1 ${
                  !cell.isCurrentMonth ? 'bg-gray-50 opacity-40' : 'bg-white'
                }`}
              >
                <span className="text-xs font-bold text-[#191c1d]">{cell.day}</span>
                <div className="flex flex-col gap-1 overflow-y-auto max-h-[70px] custom-scrollbar">
                  {getTripsForDay(cell.day, cell.month, cell.year).map(trip => {
                    const todayStr = new Date().toISOString().split('T')[0];

                    let statusBg = '';
                    let statusIcon = 'flight';

                    if (trip.end_date < todayStr) {
                      // Đã đi qua -> vàng
                      statusBg = 'bg-yellow-400 text-yellow-900 border border-yellow-300';
                      statusIcon = 'check_circle';
                    } else if (trip.start_date <= todayStr && trip.end_date >= todayStr) {
                      // Đang diễn ra -> xanh lá
                      statusBg = 'bg-green-500 text-white border border-green-400';
                      statusIcon = 'play_circle';
                    } else {
                      // Sắp tới -> đỏ
                      statusBg = 'bg-red-500 text-white border border-red-400';
                      statusIcon = 'schedule';
                    }
                    
                    return (
                      <div 
                        key={trip.id} 
                        className={`text-[9px] px-1.5 py-0.5 rounded font-bold flex items-center gap-1 truncate ${statusBg}`}
                        title={`${trip.name} (${trip.start_date} -> ${trip.end_date})`}
                      >
                        <span className="material-symbols-outlined text-[10px] shrink-0">{statusIcon}</span>
                        <span className="truncate">{trip.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Drag and Drop Trips List */}
        <div className="w-full lg:w-[320px] bg-white border border-[#c2c6d6] rounded-2xl p-4 shadow-sm flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-[#f0f1f2] pb-3">
            <h3 className="text-xs font-bold text-[#191c1d] flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[#0058be]">list_alt</span>
              Hoạt động sắp xếp
            </h3>
            <span className="text-[9px] font-bold text-[#727785] bg-gray-100 px-2 py-0.5 rounded-full">
              {trips.length} chuyến đi
            </span>
          </div>

          {loading ? (
            <div className="text-center py-10 text-xs text-[#727785]">Đang tải...</div>
          ) : trips.length === 0 ? (
            <div className="text-center py-10 text-xs text-[#727785]">Chưa có chuyến đi nào.</div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={trips.map((t) => t.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-4">
                  {trips.map((trip, idx) => (
                    <SortableTripItem
                      key={trip.id}
                      trip={trip}
                      idx={idx}
                      handleMoveTrip={handleMoveTrip}
                      isFirst={idx === 0}
                      isLast={idx === trips.length - 1}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>

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
                  <label className="text-xs font-semibold text-[#424754]">Ngày khởi hành *</label>
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
                  <label className="text-xs font-semibold text-[#424754]">Ngày kết thúc *</label>
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
                  Hủy bỏ
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
    </div>
  );
}

function SortableTripItem({ trip, idx, handleMoveTrip, isFirst, isLast }) {
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
    zIndex: isDragging ? 50 : undefined,
    position: 'relative',
    opacity: isDragging ? 0.5 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      <div className="bg-white border border-[#c2c6d6] rounded-xl p-3 shadow-sm flex items-center justify-between gap-3">
        {/* Drag Indicator Grip */}
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab text-[#c2c6d6] hover:text-[#0058be] p-1 flex items-center justify-center transition-colors touch-none"
          title="Kéo thả để sắp xếp lại"
        >
          <span className="material-symbols-outlined text-[18px]">drag_indicator</span>
        </div>

        {/* Trip Cover Image Preview */}
        {trip.image_url && (
          <div className="w-14 h-10 rounded-lg overflow-hidden border border-gray-200 shrink-0">
            <img src={trip.image_url} alt={trip.name} className="w-full h-full object-cover" />
          </div>
        )}

        <div className="space-y-0.5 flex-1 min-w-0">
          <h4 className="text-xs font-bold text-[#191c1d] truncate">{trip.name}</h4>
          <span className="text-[10px] text-[#727785] block truncate">
            {trip.destination || 'N/A'}
          </span>
          <span className="text-[9px] text-gray-500 block">
            {trip.start_date} đến {trip.end_date}
          </span>
        </div>
        
        <div className="flex flex-col gap-1">
          <button
            type="button"
            disabled={isFirst}
            onClick={() => handleMoveTrip(idx, 'up')}
            className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all ${
              isFirst 
                ? 'border-gray-100 text-gray-300 cursor-not-allowed opacity-50' 
                : 'border-[#c2c6d6] text-[#424754] hover:bg-gray-50 active:scale-95'
            }`}
          >
            <span className="material-symbols-outlined text-[14px]">arrow_upward</span>
          </button>
          <button
            type="button"
            disabled={isLast}
            onClick={() => handleMoveTrip(idx, 'down')}
            className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all ${
              isLast 
                ? 'border-gray-100 text-gray-300 cursor-not-allowed opacity-50' 
                : 'border-[#c2c6d6] text-[#424754] hover:bg-gray-50 active:scale-95'
            }`}
          >
            <span className="material-symbols-outlined text-[14px]">arrow_downward</span>
          </button>
        </div>
      </div>
    </div>
  );
}
