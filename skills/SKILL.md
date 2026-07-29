---
name: trip-schedule-unit-test
description: Kỹ năng viết Unit Test và Integration Test cho dự án Trip Schedule Manager v2.1. Đảm bảo độ phủ test cho các logic nghiệp vụ phức tạp (quyết toán nợ, máy trạng thái sự kiện), tôn trọng RLS database, cơ chế Soft Delete và kiến trúc PWA Offline-First.
---

# Hướng dẫn thực thi (Execution Guide)

Khi được yêu cầu viết hoặc kiểm tra mã nguồn (test code) cho dự án Trip Schedule Manager, hãy tuân thủ nghiêm ngặt các quy tắc và các bước dưới đây.

## Quy tắc xử lý (Core Rules)
1. **1 Nguồn sự thật (Single Source of Truth):** Frontend test không kết nối DB thật. Dùng `fake-indexeddb` để mock môi trường Offline-First, dùng MSW để mock API PostgREST.
2. **Không Bypass Business Logic:** FSM (Trạng thái) và Thuật toán quyết toán (`simplifyDebts`) phải được test thuần túy bằng Jest/Vitest, không dính dáng đến UI (React components).
3. **Timezone is King:** Khi test Cronjob hoặc FSM, BẮT BUỘC dùng hàm giả lập thời gian (`vi.useFakeTimers()`) để set đúng Timezone của chuyến đi (ví dụ: `Asia/Tokyo`), không dùng UTC mặc định.
4. **Bảo vệ Audit Trail:** Mọi test case liên quan đến chi tiêu (Expense) phải kiểm tra điều kiện `deleted_at IS NULL` (Soft Delete). Tuyệt đối không viết test expect lệnh DELETE vật lý thành công.

## Các bước thực hiện (Step-by-step)
- **Bước 1 (Phân tích):** Đọc kỹ module cần test. Xác định module thuộc nhóm nào (Logic thuần, PWA Offline, Node.js Jobs, hay Database RLS).
- **Bước 2 (Setup Mocking):** Thiết lập các mock cần thiết (Giả lập thời gian, mock API, mock IndexedDB).
- **Bước 3 (Viết Test Cases):** Viết các blocks `it()` hoặc `test()`. Bao phủ cả Happy Path (luồng chuẩn) và Edge Cases (lỗi AI trả về sai, rớt mạng, sai số thập phân tỷ giá).
- **Bước 4 (Cleanup):** Reset mock (`vi.restoreAllMocks()`, clear DB tạm) sau mỗi bài test để không ảnh hưởng test khác.

## Ví dụ Đầu vào / Đầu ra (Input/Output Examples)

**Input từ User:** 
> "Viết test cho hàm getNextEventStatus trong statusMachine.js"

**Output kỳ vọng từ Agent:**
(Agent sinh ra mã code tương tự như file `references/statusMachine.test.js`, có sử dụng `vi.useFakeTimers()` để giả lập thời gian và kiểm tra các trạng thái `upcoming -> ongoing`).