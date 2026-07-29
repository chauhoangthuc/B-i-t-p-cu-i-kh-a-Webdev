import { describe, it, expect } from 'vitest';
import { simplifyDebts } from '../../utils/settlement';

describe('simplifyDebts - Thuật toán quyết toán chi tiêu nhóm', () => {
    it('Bù trừ chính xác (đã quy đổi base_currency)', () => {
        const balances = [
            { userId: 'user-a', amount: 150000 },  // Được nợ
            { userId: 'user-b', amount: -150000 }  // Đang nợ
        ];
        const transactions = simplifyDebts(balances);
        expect(transactions).toHaveLength(1);
        expect(transactions[0]).toEqual({ from: 'user-b', to: 'user-a', amount: 150000 });
    });

    it('Bỏ qua các khoản nợ cực nhỏ (sai số tỷ giá < 0.01)', () => {
        const balances = [
            { userId: 'user-a', amount: 0.005 },
            { userId: 'user-b', amount: -0.005 }
        ];
        const transactions = simplifyDebts(balances);
        expect(transactions).toHaveLength(0);
    });
});