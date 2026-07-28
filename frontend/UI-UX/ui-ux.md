# UI/UX & Conversion Guidelines

## 1. Design System & Theme
- Sử dụng cấu hình màu sắc Tailwind đã được định nghĩa sẵn trong các file Stitch (hệ thống màu chuẩn light/dark mode, các biến màu `surface`, `primary`, `secondary`, v.v.).
- Đảm bảo font chữ mặc định là **Inter**.

## 2. Component Architecture
- Mỗi file HTML trong `stitches-raw/` khi dịch sang React phải được bóc tách thành các component nhỏ gọn, tái sử dụng được (đặt trong thư mục `src/features/[feature-name]/components/`).
- Giữ nguyên các hiệu ứng tương tác (micro-interactions) như chuyển đổi trạng thái nút, modal, hiệu ứng hover/active của Tailwind.

## 3. Layout Consistency
- File `dashboard.home.html` là chuẩn gốc về bố cục Sidebar + TopNavBar + Main Content Area. Các trang khác phải tuân thủ nghiêm ngặt chuẩn layout này để tạo sự đồng bộ trải nghiệm người dùng.

## 4. Data Mocking & API Mapping
- Trong quá trình chuyển đổi, các dữ liệu tĩnh trên HTML mẫu cần được chuyển thành các TypeScript interface và chuẩn bị sẵn cấu trúc gọi service (theo Rule 03) để kết nối với Backend API.