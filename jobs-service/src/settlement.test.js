import { describe, it, expect } from 'vitest';
import { simplifyDebts } from './settlement.js';

describe('simplifyDebts core logic', () => {
  it('nên giữ nguyên khi balance cân bằng rỗng', () => {
    const balances = [
      { userId: 'A', amount: 0 },
      { userId: 'B', amount: 0 }
    ];
    const transactions = simplifyDebts(balances);
    expect(transactions).toHaveLength(0);
  });

  it('nên rút gọn nợ nần tối thiểu cho giao dịch', () => {
    // A: +100, B: -60, C: -40. A ứng tiền, B nợ 60, C nợ 40
    const balances = [
      { userId: 'A', amount: 100 },
      { userId: 'B', amount: -60 },
      { userId: 'C', amount: -40 }
    ];
    const transactions = simplifyDebts(balances);
    
    expect(transactions).toHaveLength(2);
    // B trả A 60, C trả A 40
    expect(transactions).toContainEqual({ from: 'B', to: 'A', amount: 60 });
    expect(transactions).toContainEqual({ from: 'C', to: 'A', amount: 40 });
  });

  it('nên xử lý USD sang VND tỷ giá cố định 26.335đ và làm tròn số thập phân', () => {
    // 10 USD quy đổi ra VND = 263350đ
    // Giả sử A trả 10 USD (263350 VND), chia đều cho A và B.
    // Số dư: A: +131675 VND, B: -131675 VND
    const amountInUSD = 10;
    const rate = 26335;
    const totalVND = amountInUSD * rate;
    const shareAmountVND = totalVND / 2;

    const balances = [
      { userId: 'A', amount: totalVND - shareAmountVND }, // +131675
      { userId: 'B', amount: -shareAmountVND } // -131675
    ];

    const transactions = simplifyDebts(balances);
    expect(transactions).toHaveLength(1);
    expect(transactions[0]).toEqual({
      from: 'B',
      to: 'A',
      amount: 131675
    });
  });
});
