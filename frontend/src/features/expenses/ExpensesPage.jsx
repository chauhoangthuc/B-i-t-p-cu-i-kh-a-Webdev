import React, { useState, useEffect } from 'react';
import { postgrest } from '../../lib/postgrest.js';
import { db } from '../../lib/db.js';
import { useTrip } from '../../context/TripContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useLanguage } from '../../context/LanguageContext.jsx';
import axios from 'axios';
import { useLocation } from 'react-router-dom';

export default function ExpensesPage() {
  const { currentTripId, setCurrentTripId } = useTrip();
  const { currentUser } = useAuth();
  const { t } = useLanguage();

  const [trips, setTrips] = useState([]);
  const [selectedTripId, setSelectedTripId] = useState('');
  const [expenses, setExpenses] = useState([]);
  const [members, setMembers] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [tripsLoading, setTripsLoading] = useState(true);

  // Form states
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('VND');
  const [exchangeRate, setExchangeRate] = useState(1);
  const [category, setCategory] = useState('food');
  const [description, setDescription] = useState('');
  const [spentAt, setSpentAt] = useState(new Date().toISOString().split('T')[0]);
  const [selectedShares, setSelectedShares] = useState({}); // userId -> shareAmount

  // Consume routing state from scanned receipt
  const location = useLocation();
  useEffect(() => {
    if (location.state?.scannedData) {
      const data = location.state.scannedData;
      if (data.amount) setAmount(data.amount.toString());
      if (data.currency) {
        setCurrency(data.currency);
        if (data.currency === 'VND') setExchangeRate(1);
        else if (data.currency === 'USD') setExchangeRate(26335);
        else if (data.currency === 'JPY') setExchangeRate(165);
      }
      if (data.category) setCategory(data.category.toLowerCase());
      if (data.description) setDescription(data.description);
      if (data.date) setSpentAt(data.date);

      alert('Dữ liệu hóa đơn đã được điền tự động!');
    }
  }, [location.state]);

  // 1. Fetch all trips current user is part of
  useEffect(() => {
    const fetchTrips = async () => {
      try {
        setTripsLoading(true);
        // Query trips that the user is a member of
        const res = await postgrest.get('/trips?select=id,name');
        const availableTrips = res.data || [];
        setTrips(availableTrips);

        // Set default selected trip
        if (currentTripId && availableTrips.some(t => t.id === currentTripId)) {
          setSelectedTripId(currentTripId);
        } else if (availableTrips.length > 0) {
          setSelectedTripId(availableTrips[0].id);
        }
      } catch (err) {
        console.error('Failed to fetch user trips:', err);
      } finally {
        setTripsLoading(false);
      }
    };

    if (currentUser) {
      fetchTrips();
    }
  }, [currentUser, currentTripId]);

  // Fetch trip members for selected trip
  const fetchTripMembers = async () => {
    if (!selectedTripId) return;
    try {
      const res = await postgrest.get(`/trip_members?trip_id=eq.${selectedTripId}&select=*,profiles(*)`);
      setMembers(res.data || []);
      // Initialize equal shares
      const initialShares = {};
      (res.data || []).forEach(m => {
        initialShares[m.user_id] = 0;
      });
      setSelectedShares(initialShares);
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch expenses list (using dashboard currentTripId to display active view)
  const fetchExpenses = async () => {
    if (!currentTripId) return;
    try {
      setLoading(true);
      const res = await postgrest.get(`/expenses?trip_id=eq.${currentTripId}&order=spent_at.desc`);
      setExpenses(res.data || []);
    } catch (err) {
      console.error('Failed fetching expenses, reading offline:', err);
      const cached = await db.expenses.where('tripId').equals(currentTripId).toArray();
      setExpenses(cached);
    } finally {
      setLoading(false);
    }
  };

  // Fetch settlement list (using dashboard currentTripId)
  const fetchSettlement = async () => {
    if (!currentTripId) return;
    try {
      const jobsUrl = import.meta.env.VITE_WS_URL || 'http://localhost:4000';
      const res = await axios.get(`${jobsUrl}/api/trips/${currentTripId}/settlement`);
      if (res.data?.success) {
        setSettlements(res.data.data);
      }
    } catch (err) {
      console.error('Failed fetching settlement:', err);
    }
  };

  // Sync offline queue to server
  const syncOfflineQueue = async () => {
    const queue = await db.syncQueue.toArray();
    if (queue.length === 0) return;

    setSyncing(true);
    try {
      for (const item of queue) {
        if (item.action === 'CREATE_EXPENSE') {
          await postgrest.post('/rpc/create_expense_with_shares', item.payload);
          await db.syncQueue.delete(item.id);
          // Remove local temporary values cached offline
          await db.expenses.where('tripId').equals(item.payload.p_trip_id).and(x => x.id.toString().startsWith('temp-')).delete();
        }
      }
      fetchExpenses();
      fetchSettlement();
    } catch (err) {
      console.error('Failed to sync queue items:', err);
    } finally {
      setSyncing(false);
    }
  };

  // Trigger loading when selectedTripId changes
  useEffect(() => {
    fetchTripMembers();
  }, [selectedTripId]);

  // Trigger loading when active dashboard trip changes
  useEffect(() => {
    fetchExpenses();
    fetchSettlement();

    // Listen to network status online to auto sync
    window.addEventListener('online', syncOfflineQueue);
    // Trigger initial sync attempt
    if (navigator.onLine) {
      syncOfflineQueue();
    }

    return () => {
      window.removeEventListener('online', syncOfflineQueue);
    };
  }, [currentTripId]);

  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!selectedTripId) {
      alert('Vui lòng chọn một chuyến đi trước!');
      return;
    }

    const parsedAmount = parseFloat(amount);
    const sharesList = Object.keys(selectedShares)
      .filter(uId => selectedShares[uId] > 0)
      .map(uId => ({
        userId: uId,
        shareAmount: parseFloat(selectedShares[uId])
      }));

    const payload = {
      p_trip_id: selectedTripId,
      p_event_id: null,
      p_amount: parsedAmount,
      p_currency: currency,
      p_exchange_rate: parseFloat(exchangeRate),
      p_category: category,
      p_description: description,
      p_receipt_url: null,
      p_paid_by: currentUser.id,
      p_spent_at: spentAt,
      p_shares: sharesList
    };

    if (!navigator.onLine) {
      // Offline mode: Put to local sync queue and local IndexedDB
      await db.syncQueue.add({
        action: 'CREATE_EXPENSE',
        payload,
        createdAt: Date.now()
      });

      // Insert fake local expense only if it matches current active dashboard trip
      const localExpense = {
        id: 'temp-' + Date.now(),
        tripId: selectedTripId,
        amount: parsedAmount,
        currency,
        category,
        description,
        spentAt: payload.p_spent_at,
        paidBy: currentUser.id
      };
      
      await db.expenses.add(localExpense);

      if (selectedTripId === currentTripId) {
        setExpenses(prev => [localExpense, ...prev]);
      }
      alert('Ứng dụng đang offline. Chi phí đã được lưu tạm vào hàng đợi và sẽ đồng bộ khi có mạng lại!');
      return;
    }

    try {
      await postgrest.post('/rpc/create_expense_with_shares', payload);
      
      // If matches active dashboard trip, update lists instantly
      if (selectedTripId === currentTripId) {
        fetchExpenses();
        fetchSettlement();
      } else {
        // Show switch prompt or toast
        if (window.confirm('Tạo khoản chi thành công! Bạn có muốn chuyển sang xem chi phí của chuyến đi này không?')) {
          setCurrentTripId(selectedTripId);
        }
      }

      // Clear form
      setAmount('');
      setDescription('');
    } catch (err) {
      alert('Lỗi tạo khoản chi: ' + err.message);
    }
  };

  const handleAutoSplit = () => {
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0 || members.length === 0) return;

    const splitShare = parseFloat((parsedAmount / members.length).toFixed(2));
    const newShares = {};
    members.forEach(m => {
      newShares[m.user_id] = splitShare;
    });
    setSelectedShares(newShares);
  };

  if (tripsLoading) {
    return <div className="text-center py-16 text-sm text-[#727785]">Đang tải danh sách chuyến đi...</div>;
  }

  if (trips.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] bg-white rounded-xl border border-[#c2c6d6] p-8 max-w-2xl mx-auto shadow-sm text-center">
        <div className="w-16 h-16 bg-[#e8def8] rounded-full flex items-center justify-center mb-4">
          <span className="material-symbols-outlined text-[32px] text-[#6750a4]">receipt_long</span>
        </div>
        <h2 className="text-xl font-bold text-[#191c1d] mb-2">Chưa có chuyến đi nào</h2>
        <p className="text-sm text-gray-500 mb-6 max-w-sm">
          Vui lòng tạo hoặc tham gia một chuyến đi trước khi thêm các khoản chi tiêu.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
      {/* Left Columns - Form & List */}
      <div className="lg:col-span-2 space-y-6">
        <h1 className="text-2xl font-bold text-[#191c1d]">{t('expenses_title')}</h1>

        {/* Create Expense Form */}
        <form onSubmit={handleAddExpense} className="bg-white border border-[#c2c6d6] rounded-xl p-5 shadow-sm space-y-4">
          <h2 className="text-lg font-bold"> {t('add_expense_title')}</h2>
          
          {/* Trip Selector Field */}
          <div>
            <label className="text-xs font-semibold text-[#424754] block mb-1">Chọn chuyến đi *</label>
            <select
              className="w-full h-11 px-3 border border-[#c2c6d6] rounded-lg focus:ring-2 focus:ring-[#0058be]/20 focus:border-[#0058be] outline-none"
              required
              value={selectedTripId}
              onChange={(e) => setSelectedTripId(e.target.value)}
            >
              {trips.map(trip => (
                <option key={trip.id} value={trip.id}>{trip.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium">{t('amount')}</label>
              <input
                className="w-full h-11 px-3 border border-[#c2c6d6] rounded-lg"
                required
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-medium">{t('currency')}</label>
              <select
                className="w-full h-11 px-3 border border-[#c2c6d6] rounded-lg"
                value={currency}
                onChange={(e) => {
                  const curr = e.target.value;
                  setCurrency(curr);
                  if (curr === 'VND') {
                    setExchangeRate(1);
                  } else if (curr === 'USD') {
                    setExchangeRate(26335);
                  } else if (curr === 'JPY') {
                    setExchangeRate(165);
                  }
                }}
              >
                <option value="VND">VND</option>
                <option value="USD">USD</option>
                <option value="JPY">JPY</option>
              </select>
            </div>
          </div>

          {currency !== 'VND' && (
            <div>
              <label className="text-xs font-medium">{t('exchange_rate')}</label>
              <input
                className="w-full h-11 px-3 border border-[#c2c6d6] rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed font-semibold"
                required
                type="number"
                disabled
                value={exchangeRate}
              />
              <p className="text-[10px] text-gray-500 mt-1">
                Tỷ giá chuyển đổi cố định (1 {currency} = {exchangeRate.toLocaleString()} VND)
              </p>
            </div>
          )}

          <div>
            <label className="text-xs font-medium">{t('category')}</label>
            <select
              className="w-full h-11 px-3 border border-[#c2c6d6] rounded-lg"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="food">{t('category_food')}</option>
              <option value="transport">{t('category_transport')}</option>
              <option value="accommodation">{t('category_accommodation')}</option>
              <option value="ticket">{t('category_ticket')}</option>
              <option value="other">{t('category_other')}</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium">Ngày chi tiêu *</label>
            <input
              className="w-full h-11 px-3 border border-[#c2c6d6] rounded-lg"
              required
              type="date"
              value={spentAt}
              onChange={(e) => setSpentAt(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-medium">{t('description')}</label>
            <input
              className="w-full h-11 px-3 border border-[#c2c6d6] rounded-lg"
              placeholder="Ví dụ: Vé máy bay Hà Nội - TP.HCM hoặc Ăn trưa tại nhà hàng"
              required
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-medium">{t('split_expense')}</label>
              <button 
                type="button" 
                onClick={handleAutoSplit}
                className="text-xs text-[#0058be] font-bold hover:underline"
              >
                {t('split_all')}
              </button>
            </div>
             <div className="space-y-2 border border-[#edeeef] p-3 rounded-lg max-h-[150px] overflow-y-auto">
               {members.map(member => (
                 <div key={member.user_id} className="flex justify-between items-center gap-2 py-1">
                   <span className="text-xs truncate flex-1 min-w-0 font-medium text-[#191c1d]">
                     {member.profiles?.name || member.user_id}
                   </span>
                   <input
                     type="number"
                     step="any"
                     placeholder="0"
                     className="w-24 h-8 px-2 border border-[#c2c6d6] rounded text-right text-xs flex-shrink-0 focus:outline-none focus:border-[#0058be]"
                     value={selectedShares[member.user_id] || ''}
                     onChange={(e) => {
                       const val = e.target.value;
                       setSelectedShares(prev => ({
                         ...prev,
                         [member.user_id]: val ? parseFloat(val) : 0
                       }));
                     }}
                   />
                 </div>
               ))}
             </div>
          </div>

          <button
            type="submit"
            className="w-full h-11 bg-gradient-to-r from-[#0058be] to-[#2170e4] text-white rounded-lg font-semibold"
          >
            {t('add_expense_btn')}
          </button>
        </form>

        {/* Expenses List */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold">Danh sách khoản chi</h2>
            {currentTripId && (
              <span className="text-xs text-[#727785]">
                Đang hiển thị chuyến đi hiện tại
              </span>
            )}
          </div>
          {loading ? (
            <div>Đang tải danh sách chi tiêu...</div>
          ) : !currentTripId ? (
            <div className="bg-white border border-[#c2c6d6] rounded-xl p-8 text-center text-sm text-[#727785]">
              Vui lòng chọn chuyến đi trên thanh điều hướng để xem danh sách chi tiêu.
            </div>
          ) : expenses.length === 0 ? (
            <div className="bg-white border border-[#c2c6d6] rounded-xl p-8 text-center text-sm text-[#727785]">
              Chưa ghi nhận chi phí nào cho chuyến đi này.
            </div>
          ) : (
            <div className="space-y-3">
              {expenses.map(expense => (
                <div key={expense.id} className="bg-white border border-[#c2c6d6] rounded-xl p-4 shadow-sm flex justify-between items-center">
                  <div>
                    <p className="font-bold text-[#191c1d]">{expense.description}</p>
                    <p className="text-xs text-[#727785]">Ngày chi: {expense.spent_at} | Danh mục: {expense.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-[#0058be]">
                      {expense.amount.toLocaleString()} {expense.currency}
                    </p>
                    {expense.currency !== 'VND' && (
                      <p className="text-[10px] text-[#727785]">
                        ~{(expense.amount * expense.exchange_rate).toLocaleString()} VND
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Column - Settlement Board */}
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-[#191c1d]">{t('settlement_title')}</h2>

        <div className="bg-white border border-[#c2c6d6] rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold border-b border-[#edeeef] pb-2">{t('simplify_debts')}</h3>
          
          {!currentTripId ? (
            <div className="text-xs text-[#727785] text-center py-4">Chọn một chuyến đi để xem quyết toán</div>
          ) : settlements.length === 0 ? (
            <div className="text-xs text-[#727785] text-center py-4">{t('no_settlements')}</div>
          ) : (
            <div className="space-y-3">
              {settlements.map((s, idx) => (
                <div key={idx} className="flex justify-between items-center bg-[#f3f4f5] p-3 rounded-lg text-xs">
                  <div className="space-y-1">
                    <p>
                      <strong>Thành viên (ID: {s.from.substring(0, 8)})</strong> trả cho
                    </p>
                    <p>
                      <strong>Thành viên (ID: {s.to.substring(0, 8)})</strong>
                    </p>
                  </div>
                  <div className="font-bold text-[#ba1a1a] text-right">
                    {s.amount.toLocaleString()} VND
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
