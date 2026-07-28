# ✈️ TripManager - Hệ thống Quản lý Lịch trình & Chi tiêu Nhóm

<p align="center">
  <img src="frontend/src/assets/images/logo.png" alt="TripManager Logo" width="120" />
</p>

<p align="center">
  <a href="https://github.com/chauhoangthuc/B-i-t-p-cu-i-kh-a-Webdev"><img src="https://img.shields.io/github/stars/chauhoangthuc/B-i-t-p-cu-i-kh-a-Webdev?style=for-the-badge&color=0058be" alt="GitHub Stars" /></a>
  <a href="https://github.com/chauhoangthuc/B-i-t-p-cu-i-kh-a-Webdev/blob/main/LICENSE"><img src="https://img.shields.io/github/license/chauhoangthuc/B-i-t-p-cu-i-kh-a-Webdev?style=for-the-badge&color=2170e4" alt="License" /></a>
  <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=for-the-badge" alt="PRs Welcome" />
</p>

---

## 📌 Mục lục
* [📖 Tổng quan](#-tổng-quan)
* [✨ Tính năng nổi bật](#-tính-năng-nổi-bật)
* [💻 Công nghệ sử dụng](#-công-nghệ-sử-dụng)
* [🔗 Link Tài nguyên & Repo](#-link-tài-nguyên--repo)
* [📊 So sánh tính năng với architecture.md](#-so-sánh-tính-năng-so-với-architecturemd)
* [📁 Cấu trúc dự án](#-cấu-trúc-dự-án)
* [🐳 Hướng dẫn cài đặt & sử dụng Docker](#-hướng-dẫn-cài-đặt--sử-dụng-docker)
* [🎨 Tùy chỉnh giao diện](#-tùy-chỉnh-giao-diện)
* [🤝 Hướng dẫn đóng góp](#-hướng-dẫn-đóng-góp)
* [📄 Giấy phép](#-giấy-phép)
* [📧 Liên hệ & tác giả](#-liên-hệ--tác-giả)

---

## 📖 Tổng quan
**TripManager** là một hệ thống ứng dụng Web hoàn chỉnh phục vụ việc lên lịch trình và chia sẻ chi phí cho các hội nhóm đi du lịch. Ứng dụng được thiết kế tối giản, hiện đại, mang lại sự liền mạch thông qua cơ chế đồng bộ thời gian thực (Real-time updates) và hoạt động ngoại tuyến (Offline sync) khi mất kết nối mạng.

> [!NOTE]
> Giao diện được lấy cảm hứng từ các thiết kế Material You và Glassmorphism hiện đại, tối ưu trải nghiệm người dùng với các hiệu ứng chuyển động mượt mà.

---

## ✨ Tính năng nổi bật
* 🧭 **Quản lý đa chuyến đi (Multi-trip):** Tạo mới, cập nhật, tải ảnh bìa tùy chỉnh (Base64) và kéo thả sắp xếp vị trí các chuyến đi trên Dashboard hoặc Sidebar Lịch trình.
* 📅 **Lưới lịch tháng thông minh (Calendar Mapping):** Ánh xạ trực tiếp thời gian diễn ra của toàn bộ các chuyến đi lên ô lịch tháng. Tự động đổi màu trực quan theo mốc thời gian thực tế:
  * 🟨 **Màu Vàng:** Chuyến đi đã qua (Completed/Past).
  * 🟩 **Màu Xanh lá:** Chuyến đi đang diễn ra (Ongoing/Present).
  * 🟥 **Màu Đỏ:** Chuyến đi sắp tới (Upcoming/Future).
* 💰 **Quản lý chi tiêu & Tỷ giá tự động:** 
  * Ghi chép chi tiêu có phân loại chi tiết (Ăn uống, Di chuyển, Lưu trú, Vé tham quan, Khác) giúp biểu đồ tròn tỷ lệ chi tiêu hiển thị chính xác.
  * Tự động khóa và quy đổi tỷ giá USD sang VND cố định (`26.335đ`) giúp loại bỏ hoàn toàn sai sót tính toán của người dùng.
  * Hỗ trợ tự động chia đều nợ (Auto split) hoặc chủ động chỉnh sửa chi tiết số tiền từng người gánh.
* ⚖️ **Thuật toán quyết toán tối giản:** Sử dụng thuật toán rút gọn số giao dịch (`simplifyDebts`) giúp giảm tối thiểu số lượt chuyển khoản qua lại giữa các thành viên.
* 👤 **Cập nhật hồ sơ & Đồng bộ Avatar:** Thay đổi ảnh đại diện cá nhân trực tiếp (Base64), tự động đồng bộ avatar lập tức lên tất cả thanh Sidebar, Header TopBar, và Trang cá nhân của ứng dụng.

---

## 💻 Công nghệ sử dụng
* **Frontend:** React SPA (Vite), Tailwind CSS, dnd-kit (kéo thả sắp xếp), PWA (Service Worker + IndexedDB)
* **Backend REST API:** PostgREST (Tạo REST API tự động trực tiếp từ Postgres CSDL)
* **Dịch vụ xác thực (Auth):** Supabase GoTrue (Hỗ trợ xác thực Email/Password & Google OAuth)
* **Jobs Service (Node.js/Express):** 
  * WebSocket Server đẩy dữ liệu thời gian thực (Real-time).
  * Cron Engine quét lịch trình, cập nhật FSM trạng thái chuyến đi/sự kiện.
  * Tích hợp thời tiết (Open-Meteo) và gửi email mời thành viên qua SMTP.
* **Cơ sở dữ liệu:** PostgreSQL 15 (RLS bảo mật, DB-init migrations).

---

## 🔗 Link Tài nguyên & Repo
* 📁 **Thư mục Google Drive (Giao diện mẫu & Video Demo):** [Google Drive Folder](https://drive.google.com/drive/folders/1nfEWoB8lApeo8INd3jDIP6f10Vs4YR7U?usp=drive_link)
* 🐙 **GitHub Repository (Mã nguồn dự án):** [GitHub Repo](https://github.com/chauhoangthuc/B-i-t-p-cu-i-kh-a-Webdev)

---

## 📊 So sánh tính năng so với architecture.md

Dưới đây là bảng thống kê chi tiết các tính năng đã hoàn thiện và trạng thái thực tế so với bản thiết kế trong [architecture.md](file:///c:/Users/BDPC/Documents/do-an-cuoi-khoa/Architecture/architecture.md):

| Nhóm tính năng | Tính năng chi tiết theo thiết kế | Trạng thái thực tế | Ghi chú kỹ thuật |
| :--- | :--- | :--- | :--- |
| **Xác thực (Auth)** | Đăng nhập/Đăng ký qua Email & Password | 🟢 **Đã hoàn thành** | Chạy thông qua container GoTrue. |
| | Đăng nhập bên thứ ba (Google OAuth) | 🟢 **Đã hoàn thành** | Đã cấu hình biến môi trường và Google API OAuth credentials. |
| **Chuyến đi (Trips)** | CRUD chuyến đi, cài đặt tiền tệ gốc, múi giờ | 🟢 **Đã hoàn thành** | Lưu trữ đầy đủ thông tin chuyến đi. |
| | Sắp xếp thứ tự các chuyến đi | 🟢 **Đã hoàn thành** | Kéo thả mượt mà bằng `@dnd-kit` đồng bộ thứ tự `order_index`. |
| **Lịch trình (Calendar)**| Hiển thị các chuyến đi trên Lưới lịch tháng | 🟢 **Đã hoàn thành** | Ánh xạ chính xác khoảng thời gian đi của các chuyến đi lên ô lịch. |
| | Tô màu trực quan theo trạng thái | 🟢 **Đã hoàn thành** | **Vàng** (Đã đi qua), **Xanh lá** (Đang diễn ra), **Đỏ** (Sắp tới). |
| | Bộ chọn ngày chuyển nhanh | 🟢 **Đã hoàn thành** | Thêm thanh chọn ngày nhảy trực tiếp tháng/năm. |
| **Chi tiêu (Expenses)**| Thêm khoản chi, phân loại chi tiêu | 🟢 **Đã hoàn thành** | Hỗ trợ phân loại chi tiết (Ăn uống, Di chuyển, Lưu trú, Vé, Khác). |
| | Tự động quy đổi ngoại tệ (USD) | 🟢 **Đã hoàn thành** | Cố định tỷ giá USD -> VND là `26.335` và khóa nhập lỗi từ người dùng. |
| | Phân chia nợ & quyết toán nhóm | 🟢 **Đã hoàn thành** | Thuật toán `simplifyDebts` xử lý nợ tối giản tự động. |
| **Hồ sơ (Profile)** | Cập nhật hồ sơ, thay đổi ảnh đại diện | 🟢 **Đã hoàn thành** | Hỗ trợ upload ảnh Base64 đồng nhất avatar toàn bộ website. |
| **Hệ thống ngầm** | Real-time WebSocket Updates | 🟢 **Đã hoàn thành** | Jobs Service lắng nghe `LISTEN/NOTIFY` từ Postgres đẩy về React. |
| | Quản lý hóa đơn trên Object Storage | 🟡 **Chưa triển khai** | Hiện tại ảnh hóa đơn/ảnh đại diện đang được mã hóa **Base64** và lưu trữ trực tiếp vào CSDL thay vì lưu lên MinIO do hạn chế phần cứng khi chạy dev. |
| | Chạy offline PWA hoàn toàn | 🟡 **Hỗ trợ một phần** | Sử dụng IndexedDB để xếp hàng đợi Sync khi mất mạng, tuy nhiên chưa tối ưu hóa tối đa việc offline caching toàn bộ CSDL. |

---

## 📁 Cấu trúc dự án
```text
do-an-cuoi-khoa/
├── Architecture/                       # Tài liệu thiết kế kiến trúc hệ thống
│   └── architecture.md
├── UI-UX/                              # Tài liệu UI-UX và các giao diện mẫu
├── assets/                             # Ảnh tĩnh và biểu tượng dự án
├── backend/                            # Cấu hình môi trường backend (Prisma, Schema, env)
├── db/                                 # Scripts khởi tạo DB và migrations
│   └── migrations/
│       ├── 000_auth_uid.sql            # Tạo schema auth và hàm xác thực uid()
│       ├── 001_initial_schema.sql      # Tạo bảng trips, profiles, events, expenses
│       ├── 002_rls_policies.sql        # Phân quyền bảo mật CSDL (Row-Level Security)
│       └── 003_rpc_functions.sql       # Các Stored Procedures cho phép gọi từ client
├── frontend/                           # Source code Frontend React SPA (PWA)
│   ├── src/
│   │   ├── components/                 # Các component layout chung (Sidebar, TopBar)
│   │   ├── context/                    # Contexts quản lý state (Auth, Trip)
│   │   ├── features/                   # Các trang tính năng chính (calendar, dashboard, expenses, trips, auth)
│   │   ├── lib/                        # Khởi tạo clients kết nối API (postgrest, gotrue)
│   │   └── App.jsx
│   ├── Dockerfile
│   └── package.json
├── jobs-service/                       # Dịch vụ Node.js chạy ngầm, websockets, mailer, cron jobs
│   ├── index.js
│   └── package.json
├── docker-compose.example.yml          # Bản mẫu cấu hình Docker Compose (không chứa thông tin mật)
├── docker-compose.yml                  # File chạy thực tế (chứa secret, đã bị bỏ qua bởi git)
├── README.md                           # Tài liệu hướng dẫn sử dụng dự án
└── backend/.env                        # Lưu trữ biến môi trường (SMTP, Google API key)
```

---

## 🐳 Hướng dẫn cài đặt & sử dụng Docker

Hệ thống được đóng gói hoàn chỉnh bằng Docker Compose giúp bạn khởi chạy toàn bộ dịch vụ (Postgres, GoTrue, PostgREST, Jobs Service, Frontend React) chỉ với một dòng lệnh duy nhất.

### 1. Yêu cầu chuẩn bị
* Máy tính đã cài đặt **Docker Desktop** (hoặc Docker Engine + Docker Compose).
* Các cổng kết nối sau trên máy chủ của bạn phải đang trống: `80` (Cổng web), `3000` (PostgREST), `4000` (Jobs/WebSocket), `9999` (GoTrue).

### 2. Các bước khởi chạy

1. **Chuẩn bị file cấu hình:**
   * Tạo bản sao từ file ví dụ: Copy file `docker-compose.example.yml` và đổi tên thành `docker-compose.yml`.
   * Mở file `docker-compose.yml` và thay thế các thông tin bảo mật của bạn tại các trường tương ứng:
     * `GOTRUE_EXTERNAL_GOOGLE_CLIENT_ID` & `GOTRUE_EXTERNAL_GOOGLE_SECRET` (Mã đăng nhập Google OAuth).
     * `SMTP_USER` & `SMTP_PASS` (Tài khoản gửi email Gmail trong service `jobs-service`).
     * Bạn cũng có thể điều chỉnh JWT secret nếu muốn tăng bảo mật.

2. **Khởi động các dịch vụ bằng Docker Compose:**
   * Mở Terminal/PowerShell tại thư mục gốc của dự án và chạy lệnh:
     ```bash
     docker compose up -d --build
     ```
   * Hệ thống sẽ tự động tải các base image, biên dịch mã nguồn của Frontend và Jobs Service, sau đó thiết lập cơ sở dữ liệu và các migrations tự động.

3. **Truy cập ứng dụng:**
   * Sau khi các container báo trạng thái `Started`, mở trình duyệt và truy cập vào địa chỉ:
     ```text
     http://localhost
     ```

### 3. Một số câu lệnh Docker hữu ích khi phát triển
* **Xem logs của dịch vụ:**
  ```bash
  docker compose logs -f [service_name]
  ```
  *(Ví dụ: `docker compose logs -f jobs-service`)*
* **Dừng toàn bộ hệ thống và xóa dữ liệu tạm:**
  ```bash
  docker compose down -v
  ```
* **Khởi động lại một dịch vụ cụ thể sau khi sửa code:**
  ```bash
  docker compose up -d --build frontend
  ```

---

## 🎨 Tùy chỉnh giao diện
* **Hệ thống CSS & Phông chữ:** Giao diện ứng dụng được cấu hình chuẩn chỉnh bằng CSS Variables tích hợp với Tailwind CSS. Bạn có thể thay đổi các mã màu hex chủ đạo tại cấu hình của Vite/Tailwind để thay đổi chủ đề màu sắc của ứng dụng hoặc tạo giao diện tối (Dark mode) đồng bộ.
* **Cơ chế kéo thả (Drag & Drop):** Các chức năng kéo thả ở trang Lịch trình và Danh sách chuyến đi được quản lý bởi thư viện `@dnd-kit/core` kết hợp `@dnd-kit/sortable` giúp tối ưu hóa hiệu năng render, đem lại chuyển động mượt mà và trực quan.

---

## 🤝 Hướng dẫn đóng góp
Chúng tôi rất hoan nghênh các đóng góp cải thiện dự án! Quy trình đóng góp như sau:
1. **Fork** dự án này về tài khoản GitHub của bạn.
2. Tạo một nhánh (branch) mới để phát triển tính năng: `git checkout -b feature/AmazingFeature`.
3. Tiến hành commit những thay đổi của bạn: `git commit -m 'Add some AmazingFeature'`.
4. Đẩy nhánh của bạn lên GitHub: `git push origin feature/AmazingFeature`.
5. Tạo một bản **Pull Request (PR)** mới để chúng tôi kiểm tra và tích hợp.

---

## 📄 Giấy phép
Dự án này được phân phối dưới giấy phép **MIT License**. Bạn hoàn toàn có quyền sử dụng, sửa đổi và phân phối lại mã nguồn cho cả mục đích thương mại và cá nhân.

---

## 📧 Liên hệ & tác giả
* **Tác giả:** Châu Hoàng Thúc & Senior Fullstack Team
* **Email liên hệ:** chauhoangthuc2018@gmail.com
* **GitHub:** [https://github.com/chauhoangthuc](https://github.com/chauhoangthuc)
