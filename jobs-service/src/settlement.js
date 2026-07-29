import pg from 'pg';
import logger from '../utils/logger.js';

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL || 'postgres://postgres:supersecretpassword@localhost:5433/tripmanager';
const pool = new Pool({ connectionString });

/**
 * Thuật toán đơn giản hóa nợ nần
 * Đầu vào balances phải là danh sách số dư đã quy đổi ra base_currency của chuyến đi.
 * balances: [{ userId: string, amount: number }]
 */
export function simplifyDebts(balances) {
  // Lọc chủ nợ (đang được nợ, amount > 0) và con nợ (đang nợ nhóm, amount < 0)
  const creditors = balances
    .filter(b => b.amount > 0)
    .map(b => ({ ...b }))
    .sort((a, b) => b.amount - a.amount);
  
  const debtors = balances
    .filter(b => b.amount < 0)
    .map(b => ({ ...b }))
    .sort((a, b) => a.amount - b.amount); // âm nhiều nhất xếp trước

  const transactions = [];
  let i = 0, j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];

    // Số tiền cần chuyển đổi tối đa giữa con nợ và chủ nợ (làm tròn 2 chữ số thập phân để tránh lỗi float)
    const amount = Math.min(-debtor.amount, creditor.amount);

    if (amount > 0.01) {
      transactions.push({
        from: debtor.userId,
        to: creditor.userId,
        amount: parseFloat(amount.toFixed(2))
      });
    }

    debtor.amount = Math.round((debtor.amount + amount) * 100) / 100;
    creditor.amount = Math.round((creditor.amount - amount) * 100) / 100;

    if (Math.abs(debtor.amount) < 0.01) i++;
    if (Math.abs(creditor.amount) < 0.01) j++;
  }

  return transactions;
}

/**
 * Lấy danh sách giao dịch quyết toán thu gọn cho một chuyến đi
 */
export async function getTripSettlement(tripId) {
  let client;
  try {
    client = await pool.connect();
    
    // Gọi hàm RPC get_settlement đã nhân exchange_rate quy đổi về base_currency
    const res = await client.query('SELECT user_id, balance FROM get_settlement($1)', [tripId]);
    
    const balances = res.rows.map(row => ({
      userId: row.user_id,
      amount: parseFloat(row.balance)
    }));

    return simplifyDebts(balances);
  } catch (err) {
    logger.error(`Error calculating settlement for trip ${tripId}:`, err);
    throw err;
  } finally {
    if (client) client.release();
  }
}
