import { describe, it, expect } from 'vitest';
import { parseReceiptResponse } from '../../utils/geminiParser';

describe('Gemini OCR Response Parser', () => {
    it('Dọn dẹp thành công markdown block và parse JSON', () => {
        const aiResponse = "```json\n{\n  \"amount\": 1500,\n  \"currency\": \"USD\"\n}\n```";
        const result = parseReceiptResponse(aiResponse);
        expect(result).toEqual({ amount: 1500, currency: 'USD' });
    });

    it('Trả về object rỗng an toàn nếu AI ảo giác (Hallucination)', () => {
        const badResponse = "Ảnh mờ quá tôi không đọc được.";
        const result = parseReceiptResponse(badResponse); // Try-catch nội bộ
        expect(result).toEqual({});
    });
});