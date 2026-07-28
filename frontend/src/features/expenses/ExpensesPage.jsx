import React, { useState, useEffect } from 'react';
import { postgrest } from '../../lib/postgrest.js';
import { db } from '../../lib/db.js';
import { useTrip } from '../../context/TripContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import axios from 'axios';

export default function ExpensesPage() {
  const { currentTripId } = useTrip();
  const { currentUser } = useAuth();

  const [expenses, setExpenses] = useState([]);
  const [members, setMembers] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Form states
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('VND');
  const [exchangeRate, setExchangeRate] = useState(1);
  const [category, setCategory] = useState('food');
  const [description, setDescription] = useState('');
  const [selectedShares, setSelectedShares] = useState({}); // userId -> shareAmount

  const fetchTripMembers = async () => {
    if (!currentTripId) return;
    try {
      const res = await postgrest.get(`/trip_members?trip_id=eq.${currentTripId}&select=*,profiles(*)`);
      setMembers(res.data || []);
      // Initialize equal shares
      const initialShares = {};
      res.data.forEach(m => {
        initialShares[m.user_id] = 0;
      });
      setSelectedShares(initialShares);
    } catch (err) {
      console.error(err);
    }
  };

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

  useEffect(() => {
    fetchTripMembers();
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
    const parsedAmount = parseFloat(amount);
    const sharesList = Object.keys(selectedShares)
      .filter(uId => selectedShares[uId] > 0)
      .map(uId => ({
        userId: uId,
        shareAmount: parseFloat(selectedShares[uId])
      }));

    const payload = {
      p_trip_id: currentTripId,
      p_event_id: null,
      p_amount: parsedAmount,
      p_currency: currency,
      p_exchange_rate: parseFloat(exchangeRate),
      p_category: category,
      p_description: description,
      p_receipt_url: null,
      p_paid_by: currentUser.id,
      p_spent_at: new Date().toISOString().split('T')[0],
      p_shares: sharesList
    };

    if (!navigator.onLine) {
      // Offline mode: Put to local sync queue and local IndexedDB
      await db.syncQueue.add({
        action: 'CREATE_EXPENSE',
        payload,
        createdAt: Date.now()
      });

      // Insert fake local expense to update UI instantly
      const localExpense = {
        id: 'temp-' + Date.now(),
        trip_id: currentTripId,
        amount: parsedAmount,
        currency,
        category,
        description,
        spent_at: payload.p_spent_at,
        paid_by: currentUser.id
      };
      setExpenses(prev => [localExpense, ...prev]);
      alert('Ứng dụng đang offline. Chi phí đã được lưu tạm vào hàng đợi và sẽ đồng bộ khi có mạng lại!');
      return;
    }

    try {
      await postgrest.post('/rpc/create_expense_with_shares', payload);
      fetchExpenses();
      fetchSettlement();
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

  if (!currentTripId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] bg-white rounded-xl border border-[#c2c6d6] p-8 max-w-2xl mx-auto shadow-sm text-center">
        <div className="w-16 h-16 bg-[#e8def8] rounded-full flex items-center justify-center mb-4">
          <span className="material-symbols-outlined text-[32px] text-[#6750a4]">receipt_long</span>
        </div>
        <h2 className="text-xl font-bold text-[#191c1d] mb-2">Chưa chọn chuyến đi</h2>
        <p className="text-sm text-gray-500 mb-6 max-w-sm">
          Vui lòng tạo một chuyến đi mới hoặc chọn một chuyến đi có sẵn ở thanh tiêu đề phía trên để bắt đầu quản lý chi tiêu.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
      {/* Left Columns - Form & List */}
      <div className="lg:col-span-2 space-y-6">
        <h1 className="text-2xl font-bold text-[#191c1d]">Quản lý Chi tiêu</h1>

        {/* Create Expense Form */}
        <form onSubmit={handleAddExpense} className="bg-white border border-[#c2c6d6] rounded-xl p-5 shadow-sm space-y-4">
          <h2 className="text-lg font-bold">Thêm khoản chi tiêu mới</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium">Số tiền chi</label>
              <input
                className="w-full h-11 px-3 border border-[#c2c6d6] rounded-lg"
                required
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-medium">Đơn vị tiền tệ</label>
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
              <label className="text-xs font-medium">Tỷ giá quy đổi (sang VND)</label>
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
            <label className="text-xs font-medium">Phân loại chi tiêu</label>
            <select
              className="w-full h-11 px-3 border border-[#c2c6d6] rounded-lg"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="food">Ăn uống 🍔</option>
              <option value="transport">Di chuyển 🚗</option>
              <option value="accommodation">Lưu trú 🏨</option>
              <option value="ticket">Vé tham quan 🎟️</option>
              <option value="other">Khác ⚙️</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium">Mô tả / Nội dung chi</label>
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
              <label className="text-xs font-medium">Phân chia chi phí cho các thành viên</label>
              <button 
                type="button" 
                onClick={handleAutoSplit}
                className="text-xs text-[#0058be] font-bold hover:underline"
              >
                Chia đều cho tất cả
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
            Thêm chi tiêu
          </button>
        </form>

        {/* Expenses List */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold">Danh sách khoản chi</h2>
          {loading ? (
            <div>Đang tải danh sách chi tiêu...</div>
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
        <h2 className="text-xl font-bold text-[#191c1d]">Quyết toán & Phân nợ</h2>

        <div className="bg-white border border-[#c2c6d6] rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold border-b border-[#edeeef] pb-2">Rút gọn số giao dịch (simplifyDebts)</h3>
          
          {settlements.length === 0 ? (
            <div className="text-xs text-[#727785] text-center py-4">Chưa có giao dịch quyết toán nào.</div>
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
