import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { postgrest } from '../../lib/postgrest.js';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { useTrip } from '../../context/TripContext.jsx';

export default function TripDetailPage() {
  const { tripId } = useParams();
  const { t, language } = useLanguage();
  const { setCurrentTripId } = useTrip();
  const navigate = useNavigate();

  const [trip, setTrip] = useState(null);
  const [members, setMembers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [expenseShares, setExpenseShares] = useState([]);
  const [loading, setLoading] = useState(true);
  const [settlementTransactions, setSettlementTransactions] = useState([]);
  const [showModal, setShowModal] = useState(false);

  // Set this trip as active globally so TopBar/Sidebar updates
  useEffect(() => {
    if (tripId) {
      setCurrentTripId(tripId);
    }
  }, [tripId, setCurrentTripId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch trip details and members first
      const [tripRes, membersRes] = await Promise.all([
        postgrest.get(`/trips?id=eq.${tripId}&select=*`),
        postgrest.get(`/trip_members?trip_id=eq.${tripId}&select=*,profiles(*)`)
      ]);

      if (tripRes.data && tripRes.data.length > 0) {
        setTrip(tripRes.data[0]);
      }
      setMembers(membersRes.data || []);

      // Fetch expenses
      const expensesRes = await postgrest.get(`/expenses?trip_id=eq.${tripId}`);
      const expensesList = expensesRes.data || [];
      setExpenses(expensesList);

      // Fetch shares using expense IDs (avoiding nested promises inside Promise.all)
      let shares = [];
      const expIds = expensesList.map(e => e.id);
      if (expIds.length > 0) {
        try {
          const sharesRes = await postgrest.get(`/expense_shares?expense_id=in.(${expIds.join(',')})`);
          shares = sharesRes.data || [];
        } catch (sharesErr) {
          console.error('Failed to load expense shares:', sharesErr?.response?.data || sharesErr.message);
        }
      }
      setExpenseShares(shares);

    } catch (err) {
      console.error('Failed to load trip details page data:', err?.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tripId) {
      fetchData();
    }
  }, [tripId]);

  // Balance calculation logic
  const memberBalances = members.map(m => {
    const userId = m.user_id;
    const name = m.profiles?.name || 'Thành viên';
    const avatarUrl = m.profiles?.avatar_url;

    // Paid: sum of expense amounts where paid_by matches user
    const paid = expenses
      .filter(e => e.paid_by === userId)
      .reduce((sum, e) => sum + parseFloat(e.amount * e.exchange_rate), 0);

    // Owed: sum of share_amounts for this user
    const owed = expenseShares
      .filter(s => s.user_id === userId)
      .reduce((sum, s) => {
        const exp = expenses.find(e => e.id === s.expense_id);
        const rate = exp ? parseFloat(exp.exchange_rate) : 1;
        return sum + parseFloat(s.share_amount * rate);
      }, 0);

    return {
      userId,
      name,
      avatarUrl,
      paid,
      owed,
      balance: paid - owed
    };
  });

  // Settlement Algorithm (Greedy)
  const handleSettleUp = () => {
    const balances = memberBalances.map(mb => ({
      userId: mb.userId,
      name: mb.name,
      balance: mb.balance
    }));

    const debtors = balances.filter(b => b.balance < -0.01).map(b => ({ ...b, balance: Math.abs(b.balance) }));
    const creditors = balances.filter(b => b.balance > 0.01);

    // Sort descending
    debtors.sort((a, b) => b.balance - a.balance);
    creditors.sort((a, b) => b.balance - a.balance);

    const transactions = [];
    let i = 0; // debtor index
    let j = 0; // creditor index

    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i];
      const creditor = creditors[j];

      const settledAmount = Math.min(debtor.balance, creditor.balance);
      
      transactions.push({
        from: debtor.name,
        to: creditor.name,
        amount: settledAmount
      });

      debtor.balance -= settledAmount;
      creditor.balance -= settledAmount;

      if (debtor.balance < 0.01) i++;
      if (creditor.balance < 0.01) j++;
    }

    setSettlementTransactions(transactions);
    setShowModal(true);
  };

  if (loading) {
    return <div className="text-center py-16 text-sm text-[#727785]">Đang tải thông tin chuyến đi...</div>;
  }

  if (!trip) {
    return (
      <div className="text-center py-16 text-sm text-red-500">
        Không tìm thấy thông tin chuyến đi.
      </div>
    );
  }

  // Find max absolute balance for sizing expense bars
  const maxBalance = Math.max(...memberBalances.map(mb => Math.abs(mb.balance)), 1);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Hero Section */}
      <div className="relative rounded-2xl overflow-hidden h-64 shadow-md bg-gray-900 flex items-end">
        <img
          src={trip.image_url || 'https://lh3.googleusercontent.com/aida-public/AB6AXuDPdib7AiZ2Sy43Pjezo_oWHqRdKVglrS6eMpWOid88R1v_Ni3qWnE-r7743VD3tET5VmYb0I-pqpy3zi05kuiB-L6TatB8rEObWL-KMR2QKnuXq8zTzd_bQPq2ie-m6KRyP2WWb-3VRfncaFNo-6Us38RPRblGLxF7KWmJR1uhxaMHJur5vn40oq9RR_kKn3yKqKm-eg7aKQt5aPPpAZHG3ZV2iIh93Hm43SqwF4C8XSuFXTuUwcpaiH3VSdllfqrevRukGpib-Ug'}
          alt={trip.name}
          className="absolute inset-0 w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
        <div className="relative p-6 text-white space-y-2 w-full">
          <button 
            onClick={() => navigate('/trips')}
            className="flex items-center gap-1 text-xs text-gray-300 hover:text-white mb-2 transition-colors bg-black/35 px-2.5 py-1.5 rounded-lg border border-white/10"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Trở lại danh sách
          </button>
          <h1 className="text-3xl font-extrabold tracking-tight leading-tight">{trip.name}</h1>
          <p className="text-sm text-gray-300 line-clamp-2 max-w-xl">{trip.description || 'Chưa có mô tả hành trình.'}</p>
          <div className="flex gap-4 text-xs text-gray-400 pt-1">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">calendar_month</span>
              {trip.start_date} - {trip.end_date}
            </span>
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">location_on</span>
              {trip.destination}
            </span>
          </div>
        </div>
      </div>

      {/* Member Balances Grid */}
      <div className="bg-white border border-[#c2c6d6] rounded-2xl p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-[#191c1d] flex items-center gap-2">
          <span className="material-symbols-outlined text-[#0058be]">payments</span>
          Bảng cân đối chi tiêu thành viên
        </h2>

        <div className="space-y-4 pt-2">
          {memberBalances.map(mb => {
            const isOwed = mb.balance > 0.01;
            const owes = mb.balance < -0.01;
            const barWidth = Math.min((Math.abs(mb.balance) / maxBalance) * 100, 100);

            return (
              <div key={mb.userId} className="flex items-center gap-4">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-blue-50 border border-gray-200 overflow-hidden flex items-center justify-center flex-shrink-0">
                  {mb.avatarUrl ? (
                    <img src={mb.avatarUrl} alt={mb.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-sm font-bold text-gray-500">{mb.name.charAt(0).toUpperCase()}</span>
                  )}
                </div>

                {/* Name and Progress bar */}
                <div className="flex-grow min-w-0 space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-[#191c1d] truncate">{mb.name}</span>
                    <span className={`font-bold ${
                      isOwed ? 'text-green-600' : owes ? 'text-red-500' : 'text-gray-500'
                    }`}>
                      {isOwed ? `Được nhận: +${mb.balance.toLocaleString()}đ` : owes ? `Cần trả: ${mb.balance.toLocaleString()}đ` : 'Đã cân bằng'}
                    </span>
                  </div>

                  {/* Visual Balance bar */}
                  <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden relative flex items-center">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        isOwed ? 'bg-green-500' : owes ? 'bg-red-400' : 'bg-gray-300'
                      }`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Settle Up Action */}
        <div className="pt-4 border-t border-[#f0f1f2] flex justify-end">
          <button
            onClick={handleSettleUp}
            className="bg-[#0058be] hover:bg-[#2170e4] text-white font-bold text-sm px-6 py-2.5 rounded-xl transition-all shadow-md flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">account_balance_wallet</span>
            Tính phí trong nhóm (Settle Up)
          </button>
        </div>
      </div>

      {/* Settlement Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-gray-150 pb-3">
              <h3 className="text-lg font-bold text-[#191c1d] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[#0058be]">calculate</span>
                Phương án thanh toán tối ưu
              </h3>
              <button className="text-gray-400 hover:text-gray-600" onClick={() => setShowModal(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-3 py-2 max-h-[50vh] overflow-y-auto pr-1">
              {settlementTransactions.length === 0 ? (
                <div className="text-center py-6 text-sm text-gray-500">
                  Mọi người đều đã hoàn thành chi tiêu. Không cần giao dịch quyết toán!
                </div>
              ) : (
                settlementTransactions.map((t, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-gray-50 border border-gray-200 p-3.5 rounded-xl text-xs">
                    <div className="space-y-0.5">
                      <p className="text-gray-600">
                        <strong className="text-red-500 font-bold">{t.from}</strong> chuyển khoản cho
                      </p>
                      <p className="text-gray-800 font-semibold">
                        <strong className="text-green-600 font-bold">{t.to}</strong>
                      </p>
                    </div>
                    <div className="text-sm font-extrabold text-[#0058be]">
                      {t.amount.toLocaleString()} VND
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs px-5 py-2.5 rounded-xl transition-all"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
