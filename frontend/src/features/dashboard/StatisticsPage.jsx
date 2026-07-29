import React, { useState, useEffect } from 'react';
import { postgrest } from '../../lib/postgrest.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useLanguage } from '../../context/LanguageContext.jsx';

export default function StatisticsPage() {
  const { currentUser } = useAuth();
  const { language, t } = useLanguage();
  const [timeFilter, setTimeFilter] = useState('month'); // month, quarter, year
  const [loading, setLoading] = useState(true);

  // States for calculated stats
  const [metrics, setMetrics] = useState({
    totalSpending: 0,
    refundOwed: 0,
    amountOwed: 0,
    remainingBudget: 5000000 // default budget pool
  });

  const [categoryData, setCategoryData] = useState([]);
  const [cashflowData, setCashflowData] = useState({ incoming: 0, outgoing: 0 });
  const [recentTransactions, setRecentTransactions] = useState([]);
  
  // Real data aggregated chart state
  const [chartData, setChartData] = useState([]);
  const [zoomRange, setZoomRange] = useState({ start: 0, end: 11 }); // Drag range index for timeline slider

  useEffect(() => {
    const fetchStatistics = async () => {
      if (!currentUser) return;
      try {
        setLoading(true);

        // Fetch user expenses
        const expensesRes = await postgrest.get('/expenses?order=spent_at.desc');
        const expenses = expensesRes.data || [];

        // Fetch user shares
        const sharesRes = await postgrest.get('/expense_shares');
        const shares = sharesRes.data || [];

        // Filter data according to TimeFilter
        const now = new Date();
        const filteredExpenses = expenses.filter(exp => {
          const spentDate = new Date(exp.spent_at);
          if (timeFilter === 'month') {
            return spentDate.getMonth() === now.getMonth() && spentDate.getFullYear() === now.getFullYear();
          } else if (timeFilter === 'quarter') {
            const currentQuarter = Math.floor(now.getMonth() / 3);
            const expQuarter = Math.floor(spentDate.getMonth() / 3);
            return currentQuarter === expQuarter && spentDate.getFullYear() === now.getFullYear();
          } else {
            return spentDate.getFullYear() === now.getFullYear();
          }
        });

        // 1. Calculate Total Spending (paid by user or owed via shares)
        const userPaid = filteredExpenses
          .filter(e => e.paid_by === currentUser.id)
          .reduce((sum, e) => sum + parseFloat(e.amount * e.exchange_rate), 0);

        // Calculate refund/debts based on shares
        let refundOwed = 0;
        let amountOwed = 0;

        // Group shares by expense to find who owes what
        const userShares = shares.filter(s => s.user_id === currentUser.id);
        const userOwedShares = userShares.reduce((sum, s) => {
          const exp = expenses.find(e => e.id === s.expense_id);
          if (exp && exp.paid_by !== currentUser.id) {
            // User owes money to someone else
            return sum + parseFloat(s.share_amount * exp.exchange_rate);
          }
          return sum;
        }, 0);

        amountOwed = userOwedShares;

        // Calculate what others owe to user
        const otherSharesForUserExpenses = shares.filter(s => {
          const exp = expenses.find(e => e.id === s.expense_id);
          return exp && exp.paid_by === currentUser.id && s.user_id !== currentUser.id;
        });

        refundOwed = otherSharesForUserExpenses.reduce((sum, s) => {
          const exp = expenses.find(e => e.id === s.expense_id);
          return sum + parseFloat(s.share_amount * (exp ? exp.exchange_rate : 1));
        }, 0);

        const totalSpending = userPaid - refundOwed + amountOwed;
        const budget = 12000000; // static budget limit
        const remainingBudget = Math.max(budget - totalSpending, 0);

        setMetrics({
          totalSpending,
          refundOwed,
          amountOwed,
          remainingBudget
        });

        // 2. Category Breakdowns
        const categories = {};
        filteredExpenses.forEach(exp => {
          const cat = exp.category || 'other';
          const amt = parseFloat(exp.amount * exp.exchange_rate);
          categories[cat] = (categories[cat] || 0) + amt;
        });

        const totalCatSpending = Object.values(categories).reduce((a, b) => a + b, 0) || 1;
        const formattedCats = Object.keys(categories).map(cat => ({
          name: cat,
          value: categories[cat],
          percentage: Math.round((categories[cat] / totalCatSpending) * 100)
        }));
        setCategoryData(formattedCats);

        // 3. Cashflow Incoming vs Outgoing
        setCashflowData({
          incoming: refundOwed,
          outgoing: totalSpending
        });

        // 4. Recent Transactions
        const formattedTx = filteredExpenses.slice(0, 5).map(e => ({
          id: e.id,
          description: e.description,
          date: e.spent_at,
          amount: parseFloat(e.amount * e.exchange_rate),
          category: e.category || 'other',
          status: t('stats_status_paid')
        }));
        setRecentTransactions(formattedTx);

        // 5. Dynamic Chart Data Aggregation
        let aggregatedData = [];
        
        if (timeFilter === 'month') {
          // Group by DAY for the current month
          const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
          for (let d = 1; d <= daysInMonth; d++) {
            const label = `${String(d).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}`;
            aggregatedData.push({ name: label, total: 0, day: d });
          }

          filteredExpenses.forEach(e => {
            const d = new Date(e.spent_at);
            const target = aggregatedData.find(item => item.day === d.getDate());
            if (target) {
              target.total += parseFloat(e.amount * e.exchange_rate);
            }
          });
        } else if (timeFilter === 'quarter') {
          // Group by MONTH for current quarter (3 months)
          const currentQuarter = Math.floor(now.getMonth() / 3);
          const startMonth = currentQuarter * 3;
          for (let m = startMonth; m < startMonth + 3; m++) {
            const label = `T.${m + 1}/${now.getFullYear()}`;
            aggregatedData.push({ name: label, total: 0, month: m });
          }

          filteredExpenses.forEach(e => {
            const d = new Date(e.spent_at);
            const target = aggregatedData.find(item => item.month === d.getMonth());
            if (target) {
              target.total += parseFloat(e.amount * e.exchange_rate);
            }
          });
        } else {
          // Group by MONTH for the current year (12 months)
          for (let m = 0; m < 12; m++) {
            const label = `${String(m + 1).padStart(2, '0')}/${now.getFullYear()}`;
            aggregatedData.push({ name: label, total: 0, month: m });
          }

          filteredExpenses.forEach(e => {
            const d = new Date(e.spent_at);
            const target = aggregatedData.find(item => item.month === d.getMonth());
            if (target) {
              target.total += parseFloat(e.amount * e.exchange_rate);
            }
          });
        }

        setChartData(aggregatedData);
        setZoomRange({ start: 0, end: aggregatedData.length - 1 });

      } catch (err) {
        console.error('Failed to load statistics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStatistics();
  }, [currentUser, timeFilter]);

  const formatVND = (num) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
  };

  const getCategoryLabel = (cat) => {
    const labels = {
      food: language === 'vi' ? 'Ăn uống' : 'Food',
      transport: language === 'vi' ? 'Vận chuyển' : 'Transport',
      accommodation: language === 'vi' ? 'Lưu trú' : 'Accommodation',
      ticket: language === 'vi' ? 'Vé tham quan' : 'Tickets',
      other: language === 'vi' ? 'Khác' : 'Other'
    };
    return labels[cat] || cat;
  };

  const getCategoryColor = (cat) => {
    const colors = {
      food: 'bg-amber-500',
      transport: 'bg-blue-500',
      accommodation: 'bg-indigo-500',
      ticket: 'bg-purple-500',
      other: 'bg-gray-400'
    };
    return colors[cat] || 'bg-gray-400';
  };

  // Sliced data based on timeline slider brush range
  const visibleChartData = chartData.slice(zoomRange.start, zoomRange.end + 1);
  const maxVal = Math.max(...visibleChartData.map(d => d.total), 1);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#191c1d]">
            {language === 'vi' ? 'Quản lý Chi phí' : 'Statistics'}
          </h1>
          <p className="text-sm text-[#727785]">
            {language === 'vi' ? 'Theo dõi và tối ưu hóa ngân sách của bạn' : 'Track and optimize your budget pool'}
          </p>
        </div>

        {/* Time Filters */}
        <div className="flex bg-[#f3f4f5] border border-[#c2c6d6] rounded-xl p-1 shrink-0 self-start md:self-auto">
          <button
            onClick={() => setTimeFilter('month')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              timeFilter === 'month' ? 'bg-[#0058be] text-white shadow-sm' : 'text-[#424754] hover:text-[#191c1d]'
            }`}
          >
            {language === 'vi' ? 'Tháng' : 'Month'}
          </button>
          <button
            onClick={() => setTimeFilter('quarter')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              timeFilter === 'quarter' ? 'bg-[#0058be] text-white shadow-sm' : 'text-[#424754] hover:text-[#191c1d]'
            }`}
          >
            {language === 'vi' ? 'Quý' : 'Quarter'}
          </button>
          <button
            onClick={() => setTimeFilter('year')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              timeFilter === 'year' ? 'bg-[#0058be] text-white shadow-sm' : 'text-[#424754] hover:text-[#191c1d]'
            }`}
          >
            {language === 'vi' ? 'Năm' : 'Year'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-sm text-[#727785]">Đang phân tích báo cáo chi tiêu...</div>
      ) : (
        <>
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1 */}
            <div className="bg-white border border-[#c2c6d6] rounded-2xl p-5 shadow-sm space-y-2">
              <span className="text-xs font-semibold text-[#727785] block">{t('stats_total_spending')}</span>
              <h3 className="text-2xl font-black text-[#191c1d]">{formatVND(metrics.totalSpending)}</h3>
              <span className="text-[10px] text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded-md">
                📉 -12% {t('stats_vs_last_month')}
              </span>
            </div>

            {/* Card 2 */}
            <div className="bg-white border border-[#c2c6d6] rounded-2xl p-5 shadow-sm space-y-2">
              <span className="text-xs font-semibold text-[#727785] block">{t('stats_refund_owed')}</span>
              <h3 className="text-2xl font-black text-green-600">+{formatVND(metrics.refundOwed)}</h3>
              <span className="text-[10px] text-gray-500 block">{t('stats_refund_desc')}</span>
            </div>

            {/* Card 3 */}
            <div className="bg-white border border-[#c2c6d6] rounded-2xl p-5 shadow-sm space-y-2">
              <span className="text-xs font-semibold text-[#727785] block">{t('stats_amount_owed')}</span>
              <h3 className="text-2xl font-black text-red-500">-{formatVND(metrics.amountOwed)}</h3>
              <span className="text-[10px] text-gray-500 block">{t('stats_owed_desc')}</span>
            </div>

            {/* Card 4 (Highlighted primary blue style) */}
            <div className="bg-gradient-to-r from-[#0058be] to-[#2170e4] text-white rounded-2xl p-5 shadow-md space-y-2">
              <span className="text-xs font-semibold text-blue-100 block">{t('stats_remaining_budget')}</span>
              <h3 className="text-2xl font-black">{formatVND(metrics.remainingBudget)}</h3>
              <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-white h-full"
                  style={{ width: `${Math.min((metrics.remainingBudget / 12000000) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Bar Chart representing timeline aggregator (2/3 width) */}
            <div className="lg:col-span-2 bg-white border border-[#c2c6d6] rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-[#191c1d]">{t('stats_chart_title')}</h3>
              
              {/* Responsive custom bar chart using flex & CSS */}
              <div className="h-64 flex items-end justify-between gap-1 pt-6 relative border-b border-gray-250 pb-6 overflow-x-auto min-h-[250px]">
                {visibleChartData.map((item, idx) => {
                  const barH = item.total > 0 ? Math.max((item.total / maxVal) * 100, 3) : 0;
                  return (
                    <div key={idx} className="flex-grow flex-shrink flex flex-col items-center justify-end gap-2 group relative min-w-[22px] h-full">
                      <div 
                        className="w-full max-w-[24px] bg-[#0058be] hover:bg-[#2170e4] rounded-t-sm transition-all duration-300 relative cursor-pointer"
                        style={{ height: `${barH}%` }}
                      >
                        {/* Tooltip */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-gray-900 text-white text-[9px] px-2 py-1 rounded shadow-lg pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-30">
                          {formatVND(item.total)}
                        </div>
                      </div>
                      <span className="text-[8px] font-bold text-[#727785] truncate w-full text-center rotate-45 md:rotate-0 mt-2 block h-3">
                        {item.name}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Timeline Slider Brush Logic */}
              {chartData.length > 4 && (
                <div className="pt-6 space-y-2">
                  <div className="flex justify-between text-[10px] font-bold text-[#727785]">
                    <span>{t('stats_chart_desc')}</span>
                    <span>{chartData[zoomRange.start]?.name} - {chartData[zoomRange.end]?.name}</span>
                  </div>
                  
                  <div className="flex gap-4 items-center">
                    <input
                      type="range"
                      min="0"
                      max={zoomRange.end - 1}
                      value={zoomRange.start}
                      onChange={(e) => setZoomRange(prev => ({ ...prev, start: parseInt(e.target.value) }))}
                      className="w-1/2 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#0058be]"
                    />
                    <input
                      type="range"
                      min={zoomRange.start + 1}
                      max={chartData.length - 1}
                      value={zoomRange.end}
                      onChange={(e) => setZoomRange(prev => ({ ...prev, end: parseInt(e.target.value) }))}
                      className="w-1/2 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#0058be]"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Donut Chart Categories (1/3 width) */}
            <div className="bg-white border border-[#c2c6d6] rounded-2xl p-6 shadow-sm space-y-4 flex flex-col justify-between">
              <h3 className="text-sm font-bold text-[#191c1d]">{t('stats_category_breakdown')}</h3>
              
              {categoryData.length === 0 ? (
                <div className="text-xs text-gray-400 text-center py-12">{t('stats_no_transactions')}</div>
              ) : (
                <div className="space-y-4">
                  {/* Category bars representing Pie */}
                  <div className="space-y-3">
                    {categoryData.map(cat => (
                      <div key={cat.name} className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold text-gray-600">
                          <span>{getCategoryLabel(cat.name)}</span>
                          <span>{cat.percentage}%</span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${getCategoryColor(cat.name)}`}
                            style={{ width: `${cat.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Cashflow Widget */}
            <div className="bg-white border border-[#c2c6d6] rounded-2xl p-6 shadow-sm space-y-4 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#191c1d]">{t('stats_cashflow_title')}</h3>
                <span className="text-[10px] text-green-600 bg-green-50 px-2 py-0.5 rounded-md font-bold inline-block mt-1">
                  {t('stats_growth_badge')}
                </span>
              </div>

              <div className="space-y-3 py-4">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#727785]">{t('stats_outgoing')}</span>
                  <strong className="text-red-500 font-bold">-{formatVND(cashflowData.outgoing)}</strong>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#727785]">{t('stats_incoming')}</span>
                  <strong className="text-green-600 font-bold">+{formatVND(cashflowData.incoming)}</strong>
                </div>
              </div>

              <div className="w-full bg-gray-100 h-1 rounded-full overflow-hidden">
                <div className="bg-[#0058be] h-full" style={{ width: '65%' }} />
              </div>
            </div>

            {/* Recent Transactions List (2/3 width) */}
            <div className="lg:col-span-2 bg-white border border-[#c2c6d6] rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-[#191c1d]">{t('stats_recent_transactions')}</h3>
                <button className="text-xs font-semibold text-[#0058be] hover:underline">{t('view_all')}</button>
              </div>

              {recentTransactions.length === 0 ? (
                <div className="text-xs text-gray-400 text-center py-8">{t('stats_no_transactions')}</div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {recentTransactions.map(tx => (
                    <div key={tx.id} className="py-3 flex justify-between items-center text-xs">
                      <div className="space-y-1">
                        <p className="font-bold text-[#191c1d]">{tx.description}</p>
                        <p className="text-[10px] text-[#727785]">{tx.date} · {getCategoryLabel(tx.category)}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="bg-green-50 text-green-700 border border-green-200 text-[10px] font-bold px-2 py-0.5 rounded-md">
                          {tx.status}
                        </span>
                        <strong className="font-black text-red-500">-{formatVND(tx.amount)}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
