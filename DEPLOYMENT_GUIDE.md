# Hướng dẫn Deploy hệ thống TripManager

Tài liệu này hướng dẫn chi tiết cách deploy dự án **TripManager** lên môi trường Production sử dụng các dịch vụ Cloud miễn phí:
*   **Supabase (Free Tier):** Thay thế PostgreSQL và GoTrue Auth local.
*   **Render (Free Tier):** Deploy REST API Backend (Node.js/Express) và Jobs Service (WebSocket/Cron).
*   **Vercel (Free Tier):** Deploy Single Page Application Frontend (React/Vite).

---

## 🛠️ Bước 1: Thiết lập cơ sở dữ liệu Supabase (Thay thế PostgreSQL & Auth)

### 1.1. Tạo Project mới trên Supabase
1. Truy cập [Supabase](https://supabase.com/) và đăng nhập/đăng ký tài khoản.
2. Click **New Project**, chọn một Organization của bạn.
3. Điền các thông tin:
    *   **Name:** `TripManager`
    *   **Database Password:** Nhập mật khẩu bảo mật (Lưu lại mật khẩu này để cấu hình Connection String).
    *   **Region:** Chọn vùng gần nhất (ví dụ: `Singapore - ap-southeast-1` để có độ trễ thấp).
    *   **Pricing Plan:** Chọn **Free**.
4. Click **Create new project** và đợi vài phút để Supabase thiết lập database.

### 1.2. Lấy chuỗi kết nối Database Connection String
Sau khi Project được tạo thành công:
1. Vào mục **Project Settings** (icon răng cưa phía góc dưới bên trái) -> Chọn tab **Database**.
2. Cuộn xuống phần **Connection string** và chọn tab **URI**:
    *   **Transaction Mode (Port 6543 - Dùng khi chạy ứng dụng):**
        *   Dạng: `postgres://postgres.[Ref-ID]:[Mật-khẩu]@aws-0-[Vùng].pooler.supabase.com:6543/postgres?pgbouncer=true`
        *   Chuỗi này dùng để gán vào biến môi trường `DATABASE_URL` trong app.
    *   **Session Mode / Direct Connection (Port 5432 - Dùng cho Migration):**
        *   Dạng: `postgres://postgres.[Ref-ID]:[Mật-khẩu]@aws-0-[Vùng].pooler.supabase.com:5432/postgres`
        *   Chuỗi này dùng cho các thao tác Schema Migration trực tiếp từ Prisma (`DIRECT_URL`).

### 1.3. Lấy Supabase Auth Credentials
1. Vào **Project Settings** -> tab **API**.
2. Lưu lại các giá trị:
    *   **Project URL:** (ví dụ: `https://xxxx.supabase.co`) -> Dùng làm `VITE_GOTRUE_URL`.
    *   **API Keys (anon / public):** -> Dùng làm `VITE_SUPABASE_ANON_KEY`.

---

## 🚀 Bước 2: Đồng bộ Schema Database (Prisma Migration)

Trước khi khởi chạy Backend, chúng ta cần khởi tạo cấu trúc bảng trên CSDL Supabase mới.

1. Mở terminal tại thư mục [backend](file:///c:/Users/BDPC/Documents/do-an-cuoi-khoa/backend).
2. Tạo file `.env` hoặc cập nhật tạm thời các biến môi trường sau:
   ```env
   DATABASE_URL="postgres://postgres.[Ref-ID]:[Mật-khẩu]@aws-0-[Vùng].pooler.supabase.com:6543/postgres?pgbouncer=true"
   # Một số phiên bản Prisma yêu cầu cấu hình thêm DIRECT_URL trực tiếp để migrate
   DIRECT_URL="postgres://postgres.[Ref-ID]:[Mật-khẩu]@aws-0-[Vùng].pooler.supabase.com:5432/postgres"
   ```
3. Nếu bạn muốn dùng trực tiếp cơ chế config của Prisma, chỉnh sửa file [prisma/schema.prisma](file:///c:/Users/BDPC/Documents/do-an-cuoi-khoa/backend/prisma/schema.prisma) để hỗ trợ cả Direct Connection:
   ```prisma
   datasource db {
     provider  = "postgresql"
     url       = env("DATABASE_URL")
     directUrl = env("DIRECT_URL")
   }
   ```
4. Chạy câu lệnh migrate để tạo các table trên Supabase:
   ```bash
   npx prisma migrate deploy
   ```

---

## 🖥️ Bước 3: Deploy REST API Backend lên Render

Render cực kỳ thích hợp để chạy ứng dụng Node.js Express có kết nối Database bền vững.

### 3.1. Tạo Web Service mới trên Render
1. Đăng nhập vào [Render](https://render.com/).
2. Click **New +** -> Chọn **Web Service**.
3. Kết nối với tài khoản GitHub của bạn và chọn Repository chứa dự án `TripManager`.
4. Cấu hình thông tin Web Service:
    *   **Name:** `trip-manager-backend`
    *   **Language:** `Node`
    *   **Branch:** `main` (hoặc branch deploy của bạn)
    *   **Root Directory:** `backend`
    *   **Build Command:** `npm install`
    *   **Start Command:** `node src/server.js` (hoặc script khởi chạy backend của bạn, kiểm tra lại [package.json](file:///c:/Users/BDPC/Documents/do-an-cuoi-khoa/backend/package.json))
    *   **Instance Type:** **Free**

### 3.2. Cấu hình biến môi trường (Environment Variables)
Trong tab **Environment** của Web Service trên Render, thêm các biến:
*   `DATABASE_URL`: *Chuỗi URI từ Supabase (Transaction mode - cổng 6543)*
*   `DIRECT_URL`: *Chuỗi URI từ Supabase (Direct mode - cổng 5432)*
*   `PORT`: `10000` (Render tự động gán cổng nhưng ta nên đặt để đồng bộ)
*   `SMTP_HOST`: `smtp.gmail.com`
*   `SMTP_PORT`: `465`
*   `SMTP_USER`: *Email gửi thông báo của bạn*
*   `SMTP_PASS`: *Google App Password (16 ký tự)*
*   `WEATHER_API_URL`: `https://api.open-meteo.com/v1/forecast`
*   `GOTRUE_EXTERNAL_GOOGLE_ENABLED`: `true` (nếu có sử dụng Google OAuth)
*   `GOTRUE_EXTERNAL_GOOGLE_CLIENT_ID`: *Google Client ID của bạn*
*   `GOTRUE_EXTERNAL_GOOGLE_SECRET`: *Google Client Secret của bạn*

---

## ⚙️ Bước 4: Deploy Jobs Service lên Render

Jobs Service chạy WebSocket và Cron Engine nên cũng cần deploy dạng **Web Service** trên Render để giữ kết nối WebSocket hoạt động ổn định.

1. Click **New +** -> Chọn **Web Service**.
2. Chọn repo và điền cấu hình:
    *   **Name:** `trip-manager-jobs`
    *   **Root Directory:** `jobs-service`
    *   **Build Command:** `npm install`
    *   **Start Command:** `node src/index.js` (hoặc command tương ứng trong [package.json](file:///c:/Users/BDPC/Documents/do-an-cuoi-khoa/jobs-service/package.json))
    *   **Instance Type:** **Free**
3. Cấu hình biến môi trường (Environment Variables):
    *   `DATABASE_URL`: *Chuỗi URI từ Supabase*
    *   `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` tương tự như Backend.
    *   `WEATHER_API_URL`: `https://api.open-meteo.com/v1/forecast`
    *   `LOG_LEVEL`: `info`

---

## 🌐 Bước 5: Deploy Frontend lên Vercel

Vercel là lựa chọn tối ưu nhất để host ứng dụng SPA xây dựng bằng Vite với tốc độ tải trang cực nhanh qua CDN toàn cầu.

### 5.1. Tạo Project trên Vercel
1. Đăng nhập vào [Vercel](https://vercel.com/).
2. Click **Add New** -> Chọn **Project**.
3. Import Repo chứa mã nguồn dự án.
4. Cấu hình Framework và Thư mục gốc:
    *   **Framework Preset:** Chọn **Vite** (Vercel thường tự phát hiện).
    *   **Root Directory:** Điền `frontend`.
    *   **Build and Output Settings:** Giữ nguyên mặc định.

### 5.2. Cấu hình biến môi trường trên Vercel
Thêm các biến môi trường sau vào phần **Environment Variables**:
*   `VITE_API_URL`: `https://trip-manager-backend.onrender.com` (Đường dẫn URL của Render Backend Web Service vừa tạo ở Bước 3).
*   `VITE_WS_URL`: `wss://trip-manager-jobs.onrender.com` (Đường dẫn WebSocket URL của Jobs Service vừa tạo ở Bước 4, lưu ý giao thức là `wss://`).
*   `VITE_GEMINI_API_KEY`: *Khóa API Gemini của bạn để phục vụ quét hóa đơn OCR*.
*   `VITE_GOTRUE_URL`: `https://your-supabase-project-ref.supabase.co` (Project URL từ Supabase Auth ở Bước 1).
*   `VITE_SUPABASE_ANON_KEY`: *Anon/public API key lấy từ Supabase Auth*.

### 5.3. Deploy
Click **Deploy** và đợi quá trình build hoàn tất. Vercel sẽ cung cấp cho bạn một domain `.vercel.app` miễn phí để truy cập trực tiếp ứng dụng.
