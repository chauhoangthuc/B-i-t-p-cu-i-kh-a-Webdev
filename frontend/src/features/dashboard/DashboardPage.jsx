import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTrip } from '../../context/TripContext.jsx';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { postgrest } from '../../lib/postgrest.js';
import { useNavigate, Link } from 'react-router-dom';
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

function SortableTripCard({ trip, isSelected, setCurrentTripId, navigate }) {
  const { t } = useLanguage();
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

  const today = new Date().toISOString().split('T')[0];
  const isOngoing = today >= trip.start_date && today <= trip.end_date;
  const isCompleted = today > trip.end_date;
  const isUpcoming = today < trip.start_date;

  let statusText = t('status_planned');
  let statusBg = 'bg-[#edeeef] text-[#424754]';
  if (isOngoing) {
    statusText = t('status_ongoing');
    statusBg = 'bg-[#d5e0f8] text-[#0058be]';
  } else if (isCompleted) {
    statusText = t('status_completed');
    statusBg = 'bg-gray-100 text-gray-500';
  } else if (isUpcoming) {
    statusText = t('status_upcoming');
    statusBg = 'bg-blue-50 text-blue-600 border border-blue-100';
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => setCurrentTripId(trip.id)}
      className={`relative group bg-white border rounded-2xl overflow-hidden flex flex-col justify-between transition-all duration-300 shadow-sm hover:shadow-md cursor-pointer ${
        isSelected ? 'border-[#0058be] ring-1 ring-[#0058be]' : 'border-[#c2c6d6] hover:border-[#0058be]/70'
      }`}
    >
      <div 
        {...attributes} 
        {...listeners} 
        onClick={(e) => e.stopPropagation()} // Prevent card selection when dragging
        className="absolute top-3 right-3 w-7 h-7 bg-white/95 hover:bg-white border border-[#c2c6d6] rounded-lg flex items-center justify-center cursor-grab active:cursor-grabbing text-gray-400 hover:text-[#0058be] z-10 opacity-0 group-hover:opacity-100 transition-all duration-200"
        title={t('drag_to_sort')}
      >
        <span className="material-symbols-outlined text-[18px]">drag_indicator</span>
      </div>

      <div className="p-4 space-y-3">
        <div className="relative aspect-video rounded-xl bg-gray-100 overflow-hidden">
          <img 
            src={trip.image_url || 'https://lh3.googleusercontent.com/aida-public/AB6AXuDPdib7AiZ2Sy43Pjezo_oWHqRdKVglrS6eMpWOid88R1v_Ni3qWnE-r7743VD3tET5VmYb0I-pqpy3zi05kuiB-L6TatB8rEObWL-KMR2QKnuXq8zTzd_bQPq2ie-m6KRyP2WWb-3VRfncaFNo-6Us38RPRblGLxF7KWmJR1uhxaMHJur5vn40oq9RR_kKn3yKqKm-eg7aKQt5aPPpAZHG3ZV2iIh93Hm43SqwF4C8XSuFXTuUwcpaiH3VSdllfqrevRukGpib-Ug'} 
            alt={trip.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute top-2 left-2">
            <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-md ${statusBg}`}>
              {statusText}
            </span>
          </div>
        </div>

        <div className="space-y-1.5">
          <h4 className="font-bold text-sm text-[#191c1d] line-clamp-1">{trip.name}</h4>
          {trip.destination && (
            <p className="text-[10px] text-[#727785] flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">location_on</span>
              {trip.destination}
            </p>
          )}
          <p className="text-[10px] text-[#727785] flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">calendar_month</span>
            {trip.start_date} - {trip.end_date}
          </p>
        </div>
      </div>

      <div className="px-4 pb-4 pt-2 border-t border-[#f0f1f2] flex justify-between items-center bg-gray-50/50">
        <div className="flex -space-x-1.5">
          <div className="w-5 h-5 rounded-full border border-white bg-blue-100 text-[8px] font-bold flex items-center justify-center">U</div>
          <div className="w-5 h-5 rounded-full border border-white bg-gray-200 text-[8px] font-bold flex items-center justify-center">+1</div>
        </div>

        <div className="flex gap-2">
          <button 
              onClick={(e) => {
                e.stopPropagation(); // Avoid double toggling
                navigate('/trips/' + trip.id);
              }}
              className="text-[10px] font-bold bg-[#0058be] text-white px-2.5 py-1 rounded-lg hover:bg-[#2170e4] transition-all"
            >
              Chi tiết
            </button>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { currentUser } = useAuth();
  const { currentTripId, setCurrentTripId, currentTrip } = useTrip();
  const { language, t } = useLanguage();
  const navigate = useNavigate();

  // Trips lists
  const [trips, setTrips] = useState([]);
  const [tripsLoading, setTripsLoading] = useState(false);

  // Active Trip stats
  const [stats, setStats] = useState({
    eventsCount: 0,
    totalExpenses: 0,
    personalExpenses: 0,
    categoryBreakdown: {}
  });

  // Weather warning state
  const [weatherAlert, setWeatherAlert] = useState(null);

  // Invitations state
  const [invitations, setInvitations] = useState([]);
  const [invitationsLoading, setInvitationsLoading] = useState(false);

  // Helper to determine time of day greeting
  const getGreeting = () => {
    const hr = new Date().getHours();
    if (hr < 12) return t('welcome_morning');
    if (hr < 18) return language === 'vi' ? 'Chào buổi chiều' : 'Good afternoon';
    return language === 'vi' ? 'Chào buổi tối' : 'Good evening';
  };

  // Sensors for dnd-kit
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require dragging at least 8px to start, allowing regular button click operations
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Fetch initial data
  const fetchData = async () => {
    if (!currentUser) return;
    
    setTripsLoading(true);
    setInvitationsLoading(true);

    try {
      // 1. Fetch all trips
      const tripsRes = await postgrest.get('/trips?select=*');
      const allTrips = tripsRes.data || [];
      // Sort safely on client side
      allTrips.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
      setTrips(allTrips);

      // If no active trip is selected but there are trips, auto-select the first one
      if (!currentTripId && allTrips.length > 0) {
        setCurrentTripId(allTrips[0].id);
      }

      // 2. Fetch pending invitations
      const invRes = await postgrest.get(`/trip_invitations?invited_email=eq.${currentUser.email}&status=eq.pending&select=*,trip:trips(name),inviter:profiles!trip_invitations_invited_by_fkey(name,avatar_url)`);
      setInvitations(invRes.data || []);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setTripsLoading(false);
      setInvitationsLoading(false);
    }
  };

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
      fetchData(); // Rollback
    }
  };

  // Fetch active trip details (stats, weather alert)
  useEffect(() => {
    fetchData();
  }, [currentUser]);

  useEffect(() => {
    if (!currentTripId || !currentUser) return;

    const fetchTripStats = async () => {
      try {
        // Fetch events, expenses, shares
        const [eventsRes, expensesRes, sharesRes, weatherAlertRes] = await Promise.all([
          postgrest.get(`/events?trip_id=eq.${currentTripId}&order=order.asc,start_time.asc`),
          postgrest.get(`/expenses?trip_id=eq.${currentTripId}&deleted_at=is.null`),
          postgrest.get(`/expense_shares?user_id=eq.${currentUser.id}&deleted_at=is.null`),
          postgrest.get(`/change_requests?status=eq.pending&source=eq.weather&select=*,event:events!change_requests_event_id_fkey(title,trip_id)`)
        ]);

        const events = eventsRes.data || [];
        const expenses = expensesRes.data || [];
        const shares = sharesRes.data || [];
        const weatherAlerts = weatherAlertRes.data || [];

        // Filter weather alerts for this trip
        const activeAlert = weatherAlerts.find(alert => alert.event?.trip_id === currentTripId);
        setWeatherAlert(activeAlert || null);

        // Group total expenses
        const total = expenses.reduce((acc, exp) => acc + parseFloat(exp.amount * exp.exchange_rate), 0) || 0;

        // Personal expenses on this trip (sum of shares belonging to this trip's expenses)
        const tripExpenseIds = new Set(expenses.map(e => e.id));
        const personal = shares
          .filter(share => tripExpenseIds.has(share.expense_id))
          .reduce((acc, share) => {
            const exp = expenses.find(e => e.id === share.expense_id);
            return acc + parseFloat(share.share_amount * (exp?.exchange_rate || 1.0));
          }, 0) || 0;

        // Category breakdown
        const breakdown = {};
        expenses.forEach(exp => {
          const cat = exp.category || 'other';
          const amt = parseFloat(exp.amount * exp.exchange_rate);
          breakdown[cat] = (breakdown[cat] || 0) + amt;
        });

        setStats({
          eventsCount: events.length,
          totalExpenses: total,
          personalExpenses: personal,
          categoryBreakdown: breakdown
        });
      } catch (err) {
        console.error('Failed to load trip stats:', err);
      }
    };

    fetchTripStats();
  }, [currentTripId, currentUser]);

  // Handle invitation action
  const handleInvitation = async (inv, action) => {
    try {
      if (action === 'accept') {
        await postgrest.post('/rpc/accept_invitation', {
          invitation_token: inv.token,
          p_user_id: currentUser.id
        });
      } else {
        await postgrest.patch(`/trip_invitations?id=eq.${inv.id}`, {
          status: 'declined',
          responded_at: new Date()
        });
      }
      // Refresh
      fetchData();
    } catch (err) {
      console.error(`Failed to ${action} invitation:`, err);
    }
  };

  // Generate category chart items
  const totalCatAmt = Object.values(stats.categoryBreakdown).reduce((a, b) => a + b, 0) || 1;
  const categoriesList = [
    { key: 'transport', label: t('category_transport'), color: '#0058be', bg: 'bg-[#0058be]' },
    { key: 'accommodation', label: t('category_accommodation'), color: '#2170e4', bg: 'bg-[#2170e4]' },
    { key: 'food', label: t('category_food'), color: '#727785', bg: 'bg-[#727785]' },
    { key: 'ticket', label: t('category_ticket'), color: '#c2c6d6', bg: 'bg-[#c2c6d6]' },
    { key: 'other', label: t('category_other'), color: '#e0e2ec', bg: 'bg-[#e0e2ec]' }
  ];

  return (
    <div className="space-y-6">
      {/* 1. Header Greeting Section */}
      <div className="space-y-1">
        <h1 className="text-3xl font-extrabold text-[#191c1d] tracking-tight">
          {getGreeting()}, {currentUser?.name || (language === 'vi' ? 'Bạn' : 'User')}! 👋
        </h1>
        <p className="text-sm text-[#424754]">
          {currentTrip 
            ? `${t('ready_adventure')} ${currentTrip.name}?`
            : t('ready_adventure_none')}
        </p>
      </div>

      {/* 2. Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left Column: Upcoming Trips & Stats (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Card: Chuyến đi sắp tới */}
          <div className="bg-white border border-[#c2c6d6] rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-[#191c1d]">{t('upcoming_trips')}</h2>
              <Link to="/trips" className="text-xs font-semibold text-[#0058be] hover:underline">
                {t('view_all')}
              </Link>
            </div>

            {tripsLoading ? (
              <div className="text-center py-12 text-sm text-[#727785]">{t('loading_trips')}</div>
            ) : trips.length === 0 ? (
              <div className="bg-[#f8f9fa] border border-[#c2c6d6] border-dashed rounded-xl p-8 text-center text-sm text-[#727785]">
                {t('no_trips_created')}
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={trips.map(t => t.id)}
                  strategy={rectSortingStrategy}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {trips.map(t => (
                      <SortableTripCard
                        key={t.id}
                        trip={t}
                        isSelected={t.id === currentTripId}
                        setCurrentTripId={setCurrentTripId}
                        navigate={navigate}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>

          {/* Bottom Row: Expenses Breakdown & Donut chart */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Widget: Tổng chi phí */}
            <div className="bg-white border border-[#c2c6d6] rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex justify-between items-center text-[#727785]">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[20px] text-[#0058be]">payments</span>
                  <span className="text-sm font-bold text-[#191c1d]">{t('total_expenses')}</span>
                </div>
              </div>
              
              <div className="space-y-1">
                <p className="text-3xl font-extrabold text-[#191c1d]">
                  {stats.totalExpenses.toLocaleString()}đ
                </p>
                <p className="text-xs text-[#34a853] font-semibold flex items-center gap-1">
                  📈 ~-12% {language === 'vi' ? 'so với tháng trước' : 'vs last month'}
                </p>
              </div>

              {/* Progress bars */}
              <div className="space-y-3 pt-2">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-[#424754]">
                    <span>{t('personal')}</span>
                    <span className="font-semibold">{stats.personalExpenses.toLocaleString()}đ</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#0058be] rounded-full"
                      style={{ width: `${stats.totalExpenses > 0 ? (stats.personalExpenses / stats.totalExpenses) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-[#424754]">
                    <span>{t('group')}</span>
                    <span className="font-semibold">{(stats.totalExpenses - stats.personalExpenses).toLocaleString()}đ</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#2170e4] rounded-full"
                      style={{ width: `${stats.totalExpenses > 0 ? ((stats.totalExpenses - stats.personalExpenses) / stats.totalExpenses) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Widget: Tỷ lệ chi tiêu (Doughnut representations) */}
            <div className="bg-white border border-[#c2c6d6] rounded-2xl p-6 shadow-sm flex flex-col justify-between">
              <div className="flex items-center gap-1.5 text-[#191c1d]">
                <span className="material-symbols-outlined text-[20px] text-[#0058be]">donut_large</span>
                <span className="text-sm font-bold">{t('expense_ratio')}</span>
              </div>

              <div className="flex items-center justify-between gap-4 py-2">
                {/* Legend list */}
                <div className="space-y-2 flex-grow">
                  {categoriesList.map(c => {
                    const amt = stats.categoryBreakdown[c.key] || 0;
                    const pct = Math.round((amt / totalCatAmt) * 100) || 0;
                    return (
                      <div key={c.key} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${c.bg}`}></span>
                          <span className="text-[#424754]">{c.label}</span>
                        </div>
                        <span className="font-semibold text-[#191c1d]">{pct}%</span>
                      </div>
                    );
                  })}
                </div>

                {/* Doughnut representation */}
                <div className="w-20 h-20 rounded-full border-8 border-gray-100 flex items-center justify-center relative">
                  <div className="absolute inset-0 rounded-full border-8 border-t-[#0058be] border-r-[#2170e4] border-b-gray-200 border-l-gray-200 rotate-45"></div>
                  <span className="text-[10px] font-bold text-[#727785]">VND</span>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Right Column: Weather Alerts & Invitations (1/3 width) */}
        <div className="space-y-6">
          
          {/* Card: Weather Warning */}
          {weatherAlert ? (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-6 shadow-sm space-y-4 relative overflow-hidden">
              <div className="absolute -top-4 -right-4 text-red-100">
                <span className="material-symbols-outlined text-[80px] opacity-30">warning</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-red-100 text-[#ba1a1a] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">severe_cold</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-[#ba1a1a] tracking-wider block">{t('weather_warning')}</span>
                  <h3 className="text-sm font-bold text-[#ba1a1a] line-clamp-1">{weatherAlert.reason}</h3>
                </div>
              </div>

              <p className="text-xs text-[#ba1a1a] leading-relaxed">
                {t('weather_warning_desc').replace('{action}', weatherAlert.suggested_action)}
              </p>

              <div className="space-y-2 pt-1">
                <button 
                  onClick={() => navigate('/calendar')}
                  className="w-full bg-[#ba1a1a] text-white hover:bg-[#961212] py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1"
                >
                  <span className="material-symbols-outlined text-[16px]">schedule_send</span>
                  {t('change_request_btn')}
                </button>
                <button 
                  onClick={() => setWeatherAlert(null)}
                  className="w-full bg-transparent hover:bg-red-100 text-[#ba1a1a] py-2 rounded-xl text-xs font-bold transition-all"
                >
                  {t('dismiss_warning')}
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6 shadow-sm space-y-3 relative overflow-hidden">
              <div className="absolute -top-4 -right-4 text-blue-100">
                <span className="material-symbols-outlined text-[80px] opacity-30">wb_sunny</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-500">wb_sunny</span>
                <span className="text-xs font-bold text-[#0058be]">{t('weather_today')}</span>
              </div>
              <h4 className="font-bold text-sm text-[#191c1d]">{t('weather_stable')}</h4>
              <p className="text-xs text-[#424754] leading-relaxed">{t('weather_stable_desc')}</p>
            </div>
          )}

          {/* Card: Lời mời mới nhất */}
          <div className="bg-white border border-[#c2c6d6] rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[#0058be]">group_add</span>
                <h2 className="text-sm font-bold text-[#191c1d]">{t('latest_invitations')}</h2>
              </div>
              <span className="bg-[#0058be] text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                {invitations.length} {t('new_invitation_badge')}
              </span>
            </div>

            {invitationsLoading ? (
              <div className="text-center py-6 text-xs text-[#727785]">{language === 'vi' ? 'Đang tải lời mời...' : 'Loading invitations...'}</div>
            ) : invitations.length === 0 ? (
              <div className="bg-[#f8f9fa] border border-[#c2c6d6] border-dashed rounded-xl p-6 text-center text-xs text-[#727785]">
                {t('no_new_invitations')}
              </div>
            ) : (
              <div className="space-y-4 max-h-64 overflow-y-auto pr-1">
                {invitations.map(inv => (
                  <div key={inv.id} className="p-3 border border-[#c2c6d6] rounded-xl space-y-3 bg-[#f8f9fa]/50">
                    <div className="flex gap-2">
                      {/* Avatar */}
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-[#0058be] flex items-center justify-center text-xs font-bold">
                        {inv.inviter?.name?.charAt(0) || 'U'}
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold text-[#191c1d] leading-snug">
                          {inv.inviter?.name || 'Ai đó'} <span className="font-normal text-[#727785]">mời bạn tham gia</span> {inv.trip?.name}
                        </p>
                        <p className="text-[10px] text-[#727785]">
                          Vai trò đề xuất: {inv.role === 'leader' ? 'Trưởng nhóm' : 'Thành viên'}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button 
                        onClick={() => handleInvitation(inv, 'accept')}
                        className="bg-[#0058be] hover:bg-[#2170e4] text-white py-1.5 rounded-lg text-xs font-bold transition-all"
                      >
                        Chấp nhận
                      </button>
                      <button 
                        onClick={() => handleInvitation(inv, 'decline')}
                        className="bg-white border border-[#c2c6d6] hover:bg-gray-100 text-[#ba1a1a] py-1.5 rounded-lg text-xs font-bold transition-all"
                      >
                        Từ chối
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Floating Action Button for New Trip creation */}
      <button 
        onClick={() => navigate('/trips?create=true')}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-[#0058be] to-[#2170e4] text-white rounded-full flex items-center justify-center shadow-xl shadow-[#0058be]/20 hover:scale-105 active:scale-95 transition-all z-40 group"
        title="Tạo chuyến đi mới"
      >
        <span className="material-symbols-outlined text-[28px] group-hover:rotate-90 transition-transform duration-300">add</span>
      </button>

    </div>
  );
}
