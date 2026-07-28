# TripManager — UI/UX Specification

> Tài liệu này mô tả thiết kế giao diện chi tiết cho từng trang, tách riêng khỏi `architecture.md` (kiến trúc kỹ thuật/dữ liệu) và `ke-hoach-trip-scheduler.md` (lộ trình). Đây là nguồn tham chiếu duy nhất cho phần UI/UX.

---

## 1. Nguyên tắc thiết kế tổng thể (đã chốt ở mockup Home)

- **Phong cách**: Modern Utility / Clean Minimalist — Bento Grid, card bo góc mềm, không rối mắt.
- **Sidebar**: Icon-rail thu gọn mặc định, hover-to-expand hiện chữ, logo Globe+máy bay + tên "TRIPMANAGER" + slogan.
- **Font**: Inter. **Icon**: Material Symbols Outlined.
- **Bảng màu chính**: hệ xanh dương (`primary #0058be` family) — theo đúng config Tailwind đã dùng ở mockup Home.
- **Bảng màu trạng thái (FSM)**: upcoming = xám nhạt, ongoing = xanh lá/neon, done = xanh dương, cancelled = đỏ + gạch ngang, postponed = vàng cam.

> ⚠️ **Điểm cần thống nhất:** 3 file mẫu bạn upload (login/register/edit-profile) dùng bảng màu **cam** (`primary #9d4300`, `primary-container #f97316`) + hiệu ứng **glassmorphism/blob nền động** — khác hệ màu xanh dương đã chốt ở Home. Khuyến nghị: **giữ layout/cấu trúc form** của 3 trang mẫu (rất tốt, không cần vẽ lại), nhưng **đổi toàn bộ token màu sang bảng xanh dương của TripManager**, và cân nhắc bỏ hiệu ứng blob (hợp với phong cách Notion/Linear tối giản hơn là hiệu ứng động). Nếu bạn muốn giữ cam làm màu nhận diện phụ (accent) thì cần nói rõ, mặc định tài liệu này áp dụng theo hướng đồng bộ 1 bảng màu duy nhất.

---

## 2. Header

Bố cục từ trái sang phải:

```
[Trip Switcher ▾]  ············  [🔍 Search]  [🌐 VI ▾]  [🔔 3]  [🟢]  [Avatar ▾]
   (đã có, không đổi)              (mới)       (mới)      (mới)  (mới)   (mới)
```

### 2.1. Search 🔍
Ô tìm kiếm nhanh (hoặc icon mở modal search) — tìm event/khoản chi/trip mà không cần nhớ nó thuộc ngày nào, trip nào.

### 2.2. Language switcher 🌐 (VI)
Dropdown chọn ngôn ngữ, chỉ 2 lựa chọn: Tiếng Việt / English. Hiện cờ quốc gia tương ứng khi chọn (giữ đúng pattern trong ảnh mẫu bạn gửi, chỉ bỏ phần tiền tệ).

### 2.3. Chuông thông báo 🔔
Gộp chung 2 nguồn đã thiết kế ở `architecture.md`: lời mời trip (`TripInvitation`, mục 4.3) và đề xuất đổi lịch do thời tiết (`ChangeRequest`, mục 4.4), sắp theo thời gian mới nhất trước. Mỗi item có nút hành động ngay tại chỗ (Accept/Decline, Review). Badge đỏ đếm số `pending` gộp từ cả 2 nguồn.

### 2.4. Chỉ báo trạng thái 🟢
> **Giả định cần bạn xác nhận:** hiểu đây là 1 đèn báo trạng thái hệ thống (xanh lá = đang kết nối/đồng bộ real-time bình thường — tức status engine và weather engine ở `architecture.md` mục 4.1/4.4 đang chạy đúng), không phải nút bật/tắt do người dùng điều khiển. Nếu ý bạn là thứ khác (vd trạng thái online của bản thân user kiểu mạng xã hội), báo lại để mình sửa.
- Xanh lá: đang đồng bộ real-time bình thường.
- Có thể đổi màu xám/đỏ nếu mất kết nối tới PostgREST (best-effort, không bắt buộc phải làm ở bản đầu).

### 2.5. Avatar dropdown 👤 — thay thế hoàn toàn cho "Settings" trong sidebar
Bấm vào avatar mở dropdown nhỏ gồm:
- Tên + email (không click được, chỉ hiển thị thông tin)
- **"Xem hồ sơ"** → `ProfilePage` (trang xem, hiển thị avatar/tên/SĐT — dùng chung layout với cách hiển thị thành viên ở `TripDetailPage`)
- **"Chỉnh sửa hồ sơ"** → `EditProfilePage` (mục 4.3 bên dưới)

**Hệ quả kiến trúc:** vì Profile/Edit Profile giờ truy cập qua avatar dropdown, **bỏ hẳn mục "Settings" khỏi sidebar** — sidebar giờ chỉ còn các trang nghiệp vụ (Dashboard/Events/Calendar/Trips/Finance) + Logout cố định cuối (mục 4.4 cập nhật bên dưới). Các cấu hình từng dự định để trong SettingsPage (bật/tắt email thông báo) chuyển vào gộp chung trong `EditProfilePage`, thành 1 section nhỏ "Tuỳ chọn thông báo" ở cuối form — không cần 1 trang Settings riêng nữa.

--- — chỉ Google + truyền thống, dùng PostgREST

**Quyết định:** bỏ đăng nhập GitHub (có trong mẫu cũ), chỉ giữ **2 phương thức**: đăng nhập/đăng ký bằng email-mật khẩu thông thường, hoặc bằng Google.

**Vì sao cần lưu ý riêng khi dùng PostgREST (khác với mẫu cũ dùng Firebase Auth):**
- PostgREST **không tự xử lý đăng nhập** — nó chỉ nhận 1 JWT trong header `Authorization`, đọc claim trong đó (`role`, `sub` = user id) rồi đối chiếu với **Row-Level Security (RLS) policy** trên PostgreSQL để quyết định query nào được phép chạy.
- Vậy cần 1 lớp xử lý đăng nhập đứng trước PostgREST, chịu trách nhiệm: xác thực Google ID token / so khớp mật khẩu (bcrypt), rồi **phát hành JWT** ký cùng secret mà PostgREST được cấu hình để verify.
- **Khuyến nghị dùng GoTrue** (chính là engine đứng sau Supabase Auth) — hỗ trợ sẵn cả email/password lẫn Google OAuth, sinh JWT tương thích PostgREST ngay lập tức, không cần tự viết server xác thực từ đầu. Đây là lựa chọn hợp lý nhất để "chỉ Google + truyền thống" hoạt động đúng với PostgREST mà không tốn công viết auth service riêng.
- **RLS Policy** trên các bảng `trip_members`, `events`, `expenses`... sẽ đọc `current_setting('request.jwt.claims')::json ->> 'sub'` (chính là `userId`) để enforce đúng luật RBAC-theo-trip đã thiết kế ở `architecture.md` mục 4.2 — nghĩa là phần phân quyền không cần code lại ở tầng ứng dụng, PostgreSQL tự chặn ngay ở tầng dữ liệu.
- **Ảnh hưởng tới UI:** nút "Đăng nhập với Google" gọi endpoint dạng `{GOTRUE_URL}/authorize?provider=google&redirect_to=...` (redirect chuẩn OAuth), khác hoàn toàn cách gọi Firebase SDK (`loginWithSocial('google')`) trong mẫu cũ — cần viết lại phần script tương ứng, không phải chỉ đổi màu.

---

## 3. Danh sách trang Auth & nội dung chi tiết

### 3.1. LoginPage

Kế thừa cấu trúc từ mẫu cũ, điều chỉnh:

| Giữ nguyên từ mẫu cũ | Thay đổi |
|---|---|
| Glass-card căn giữa, layout 1 cột | Đổi màu theo hệ xanh dương TripManager |
| Form email + password, validate inline | Bỏ nút GitHub, chỉ còn 1 nút "Đăng nhập với Google" (full-width thay vì grid 2 cột) |
| Modal "Quên mật khẩu" (nhập email, gửi link reset) | Giữ nguyên logic, chỉ đổi endpoint gọi GoTrue thay vì Firebase |
| Link "Chưa có tài khoản? Đăng ký" | Giữ nguyên |
| Trạng thái loading trên nút submit | Giữ nguyên |

**Fields:** email, password.
**Actions:** Đăng nhập · Đăng nhập với Google · Quên mật khẩu (modal) · Link sang Đăng ký.

**Trường hợp đặc biệt — tới từ link mời trip** (`?redirect=/invite/:token`): sau khi login thành công, điều hướng thẳng tới trang xác nhận lời mời tương ứng thay vì về Home.

### 3.2. SignupPage

| Giữ nguyên từ mẫu cũ | Thay đổi |
|---|---|
| Fields: họ tên, email, password, confirm password, checkbox điều khoản | Giữ nguyên |
| Nút Google + GitHub dạng grid 2 cột | Bỏ GitHub, chỉ còn Google (full-width) |
| Validate inline từng field | Giữ nguyên |

**Trường hợp đặc biệt — tới từ link mời trip** (`?invite=token`): field email **bị khoá, prefill sẵn** = `invitedEmail` (đã thống nhất ở phần thiết kế Invitation trước đó, để đảm bảo đúng người được mời là người tạo tài khoản). Sau khi đăng ký xong, tự động xử lý tiếp lời mời đó, không bắt người dùng tìm lại.

### 3.3. ProfilePage & EditProfilePage — **truy cập qua avatar dropdown, không có trong sidebar chính**

Đây là thay đổi so với bản trước (lúc đó dự định gộp vào SettingsPage): giờ **Settings bị bỏ khỏi sidebar hoàn toàn** (mục 2.5), 2 trang này chỉ truy cập qua dropdown avatar ở header.

- **ProfilePage**: trang chỉ xem (read-only) — avatar, tên, số điện thoại, email, hiển thị đơn giản, có nút "Chỉnh sửa" dẫn sang EditProfilePage.
- **EditProfilePage**: form chỉnh sửa, kế thừa từ mẫu cũ, đã lọc lại cho đúng domain TripManager:

| Field trong mẫu cũ | Giữ hay bỏ | Lý do |
|---|---|---|
| Avatar (upload file hoặc dán URL) | ✅ Giữ | Hữu ích, hiển thị avatar trong header/sidebar/thành viên trip |
| Họ và tên | ✅ Giữ | Hiển thị ở TripDetailPage (danh sách thành viên) |
| Số điện thoại | ✅ Giữ | Hữu ích để liên lạc khi đi chung trip |
| Email (khoá, không sửa) | ✅ Giữ | Đúng — email là định danh dùng để match `TripInvitation`, không nên cho tự sửa tuỳ tiện |
| Địa chỉ | ⚠️ Tuỳ chọn | Không phục vụ mục tiêu app trực tiếp, có thể bỏ nếu muốn gọn |
| Nghề nghiệp | ❌ Bỏ | Field của domain "portfolio/freelancer" ở dự án cũ, không liên quan TripManager |
| Số lượng dự án | ❌ Bỏ | Tương tự — thuộc dự án cũ khác domain |
| Số năm kinh nghiệm | ❌ Bỏ | Tương tự |
| Ngày sinh | ⚠️ Tuỳ chọn | Có thể giữ nếu muốn, không bắt buộc |

**★ Thêm mới (do bỏ SettingsPage riêng — mục 2.5):** 1 section nhỏ cuối form "Tuỳ chọn thông báo" — toggle bật/tắt email cho lời mời trip và weather alert.

**Modal chọn avatar** (upload file kéo-thả hoặc dán URL) — giữ nguyên pattern từ mẫu cũ, hoạt động tốt, không cần thiết kế lại.

### 3.4. Sidebar — vị trí nút Logout (đã bỏ Settings, xem mục 2.5)

Theo yêu cầu: nút Logout **nằm trên sidebar**, không phải trong menu thả xuống ở avatar (khác với thói quen phổ biến nhưng đây là quyết định của bạn, tôn trọng — avatar dropdown giờ chỉ dùng cho Profile/Edit Profile, mục 2.5).

- Đặt ở khối `mt-auto` cuối sidebar — **giờ là item cuối cùng duy nhất**, vì Settings đã bị bỏ khỏi sidebar (mục 2.5).
- Icon: `logout`.
- Khi bấm: hiện 1 confirm nhỏ (popover hoặc modal ngắn "Bạn có chắc muốn đăng xuất?") trước khi thực sự logout.

```
┌ Sidebar (thu gọn) ┐        ┌ Sidebar (hover mở rộng) ┐
│ [Logo]             │        │ [Logo]  TRIPMANAGER      │
│ [≡] Dashboard       │        │ [≡] Dashboard             │
│ [≡] Events          │        │ [≡] Events                │
│ [≡] Calendar        │        │ [≡] Calendar              │
│ [≡] Trips           │        │ [≡] Trips                 │
│ [≡] Finance         │        │ [≡] Finance                │
│        ...          │        │        ...                 │
│ [⎋] Logout           │        │ [⎋] Đăng xuất              │  ← cố định cuối, không còn Settings ở trên
└────────────────────┘        └───────────────────────────┘
```

### 3.5. ForgotPassword / ResetPassword

Giữ nguyên pattern modal từ mẫu cũ (nhập email → thông báo đã gửi → link trong email dẫn tới form đặt mật khẩu mới), chỉ đổi lời gọi API sang endpoint GoTrue (`/recover`, `/verify`) thay vì Firebase (`sendPasswordResetEmail`).

---

## 4. Bảng tổng hợp thay đổi so với 3 file mẫu gốc

| Trang | Thay đổi chính |
|---|---|
| login.html | Bỏ nút GitHub · đổi màu cam→xanh dương · đổi API Firebase→GoTrue · thêm xử lý redirect từ link mời |
| register.html | Bỏ nút GitHub · đổi màu · đổi API · thêm xử lý prefill email khi tới từ link mời |
| edit-profile.html | Bỏ field Nghề nghiệp/Số dự án/Số năm kinh nghiệm · tách thành 2 trang Profile (xem) + Edit Profile (sửa) · truy cập qua avatar dropdown ở header thay vì trang Settings độc lập · thêm section "Tuỳ chọn thông báo" · đổi màu |
| *(mới)* Sidebar | Thêm nút Logout cố định cuối sidebar, **bỏ hẳn mục Settings** (chuyển sang avatar dropdown) |
| *(mới)* Header | Thêm Search, Language switcher (VI/EN), chuông thông báo, chỉ báo trạng thái, avatar dropdown (mục 2) |

---

## 5. Việc cần đồng bộ ngược lại `architecture.md`

Nếu chốt theo tài liệu này, nên bổ sung vào `architecture.md` mục 2 (Kiến trúc tổng thể):
- PostgREST thay thế lớp "Backend API tự viết" đã mô tả trước đó cho phần CRUD cơ bản (auto-generate REST từ schema Postgres).
- Thêm GoTrue làm lớp Auth (Google OAuth + email/password), đứng trước PostgREST.
- RLS Policy thay thế 1 phần logic RBAC lẽ ra định viết ở tầng Express (`usePermission` phía client vẫn giữ để ẩn/hiện UI, nhưng chốt chặn thật sự nằm ở RLS).
- Các logic **không** thể làm bằng REST thuần (cron status engine, weather engine, settlement algorithm `simplifyDebts`) vẫn cần 1 service Node nhỏ riêng gọi vào Postgres qua PostgREST hoặc kết nối trực tiếp — không phải mọi thứ đều thay được bằng PostgREST.

Bạn có muốn mình cập nhật luôn phần này vào `architecture.md` không, hay để đó cho lần chốt sau?