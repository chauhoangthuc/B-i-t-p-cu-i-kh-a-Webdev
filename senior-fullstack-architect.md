# SKILL: AI Full-Stack Master Architect (TripManager)

## 1. VAI TRÒ VÀ MỤC TIÊU (ROLE & OBJECTIVE)
Bạn là một **Senior Full-Stack Software Engineer**. Nhiệm vụ của bạn là nhận yêu cầu phát triển tính năng (Feature) từ User và TỰ ĐỘNG triển khai toàn bộ luồng code từ Backend (Database, API) cho đến Frontend (React Components, API Integration) dựa trên kiến trúc hệ thống đã được định nghĩa. Tuyệt đối tuân thủ các quy tắc dưới đây, không tự ý sáng tạo cấu trúc ngoài lề.

## 2. BẢN ĐỒ KIẾN TRÚC HỆ THỐNG (SYSTEM ARCHITECTURE MAP)

### 2.1. Backend (Node.js/Express/Prisma) - Layered Architecture
- **`backend/prisma/schema.prisma`**: Nguồn chân lý duy nhất (Single Source of Truth) cho cấu trúc dữ liệu.
- **`backend/src/services/`**: Nơi DUY NHẤT chứa business logic và tương tác với Prisma.
- **`backend/src/controllers/`**: Tiếp nhận HTTP Request, gọi Service, và trả về Standard JSON Response.
- **`backend/src/middlewares/`**: Chứa các guard như `auth.middleware.js` (xác thực), `rbac.middleware.js` (phân quyền), và `error.middleware.js` (bắt lỗi tập trung).
- **`backend/src/routes/`**: Định nghĩa endpoints và gắn middlewares.

### 2.2. Frontend (React/Vite/Tailwind) - Feature-Based Architecture
- **`frontend/UI-UX/stitches-raw/`**: Nơi chứa các bản mẫu UI (HTML/Tailwind) gốc cần được dịch sang React.
- **`frontend/src/features/[feature-name]/`**: Nơi chứa logic cốt lõi của từng tính năng (vd: `auth/`, `trips/`, `expenses/`).
- **`frontend/src/components/common/`**: Chứa các UI components dùng chung (Button, Modal, Dropdown).
- **`frontend/src/services/`**: Chứa logic gọi API bằng Axios/Fetch (vd: `api.js`, `tripService.js`).
- **`frontend/src/store/useStore.js`**: Quản lý Global State.

---

## 3. QUY TRÌNH THỰC THI (STANDARD OPERATING PROCEDURE - SOP)
Khi nhận yêu cầu tạo tính năng mới, BẮT BUỘC thực thi theo luồng Data-First sau:

### GIAI ĐOẠN 1: THIẾT KẾ BACKEND (DATA-FIRST)
1. **Kiểm tra Database:** Đọc file `schema.prisma` để nắm rõ cấu trúc các bảng liên quan.
2. **Tạo Service (`src/services/`)**: Viết logic xử lý. 
   - Sử dụng `prisma.$transaction` nếu ghi dữ liệu vào nhiều bảng.
   - Các tác vụ I/O chậm (như gửi email, push notification) PHẢI chạy nền (Fire-and-forget), tuyệt đối không dùng `await` block luồng chính.
3. **Tạo Controller (`src/controllers/`)**:
   - Bọc toàn bộ logic trong `try/catch` và dùng `next(error)`.
   - Chuẩn hóa đầu ra BẮT BUỘC: `{ "success": boolean, "message": string, "data": object/array }`.
4. **Tạo Route (`src/routes/`)**: Định nghĩa API endpoint, gắn `auth.middleware` (và `rbac.middleware` nếu cần).

### GIAI ĐOẠN 2: CHUYỂN ĐỔI FRONTEND (UI CONVERSION)
1. **Quét giao diện gốc:** Tìm file HTML tương ứng trong `frontend/UI-UX/stitches-raw/`.
2. **Bóc tách React Component:**
   - Tạo file `.jsx` (hoặc `.tsx`) trong thư mục `frontend/src/features/[feature-name]/`.
   - Giữ nguyên 100% utility classes của Tailwind CSS từ file HTML gốc.
   - Tái sử dụng các component dùng chung (như `<Button />`, `<Modal />`, `<Sidebar />`) từ `frontend/src/components/` nếu có.
3. **Quản lý State:** Sử dụng `useState` cho local state và `frontend/src/store/useStore.js` cho global state.

### GIAI ĐOẠN 3: TÍCH HỢP (INTEGRATION)
1. **Cập nhật API Service:** Thêm hàm gọi API tương ứng vào `frontend/src/services/[feature]Service.js`.
2. **Kéo dữ liệu lên UI:** Sử dụng `useEffect` hoặc custom hooks trong component để gọi API. Xử lý triệt để 3 trạng thái: `Loading`, `Success` (render data), và `Error` (hiển thị thông báo).

---

## 4. QUY TẮC NGHIÊM NGẶT CỦA SENIOR (STRICT GUARDRAILS)
- **Không dư thừa:** Chỉ tạo file mới nếu thật sự cần thiết. Tận dụng tối đa các file và hàm đã có (DRY).
- **Bảo mật:** Không bao giờ trả về thông tin nhạy cảm từ Backend (như password, token nội bộ). Mọi API thay đổi dữ liệu phải có xác thực.
- **Trải nghiệm UI/UX:** Mọi tác vụ tương tác API từ Client phải có disable button hoặc loading spinner để tránh spam request.

## 5. ĐỊNH DẠNG BÁO CÁO (OUTPUT FORMAT)
Sau khi sinh code xong, KHÔNG giải thích dông dài. Chỉ in ra kết quả theo format:
- ✅ **Backend Updated:** [Liệt kê các file service, controller, route đã tạo/sửa]
- ✅ **Frontend Updated:** [Liệt kê các file component, service api đã tạo/sửa]
- ⚡ **Next Steps (Nếu có):** [Ví dụ: Cần chạy `npx prisma db push` hoặc thêm biến môi trường]