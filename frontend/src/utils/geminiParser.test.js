import { describe, it, expect } from 'vitest';

export function sanitizeGeminiResponse(rawText) {
  const cleanText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
  try {
    return JSON.parse(cleanText);
  } catch (err) {
    throw new Error("Gemini returned invalid JSON. Check console for raw text.");
  }
}

describe('Gemini OCR Parser Response Sanitization & robust JSON processing', () => {
  it('nên dọn dẹp markdown block ```json và ``` case-insensitively', () => {
    const rawText = `\`\`\`json
{
  "amount": 1450000,
  "currency": "VND",
  "date": "2023-10-27",
  "description": "Ăn tối nhà hàng (Scanned)",
  "category": "Food"
}
\`\`\``;
    const result = sanitizeGeminiResponse(rawText);
    expect(result.amount).toBe(1450000);
    expect(result.category).toBe('Food');
  });

  it('nên dọn dẹp các markdown block không viết thường', () => {
    const rawText = `\`\`\`JSON
{
  "amount": 50000,
  "currency": "VND"
}
\`\`\``;
    const result = sanitizeGeminiResponse(rawText);
    expect(result.amount).toBe(50000);
  });

  it('nên báo lỗi chuẩn nếu chuỗi trả về không thể giải mã JSON', () => {
    const rawText = `Đây là một chuỗi văn bản không phải JSON`;
    expect(() => sanitizeGeminiResponse(rawText)).toThrow("Gemini returned invalid JSON");
  });
});
