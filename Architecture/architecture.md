# Trip Schedule Manager — Kiến trúc hệ thống (Phiên bản 2.0)

> Tài liệu này là bản **chốt kiến trúc** sau toàn bộ quá trình thiết kế: từ đề bài gốc (CRUD event + localStorage) mở rộng thành hệ thống multi-trip, multi-user, có backend/DB, phân quyền theo trip, tích hợp thời tiết, mời thành viên, và quyết toán chi tiêu nhóm.
> Tài liệu song song `ke-hoach-trip-scheduler.md` (lộ trình theo buổi, checklist nộp bài) — file này là **bản thiết kế kỹ thuật**, không phải lịch làm việc.

---

## 1. Tổng quan

### 1.1. Mục tiêu hệ thống
Ứng dụng quản lý lịch trình cho nhiều chuyến đi (trip), nhiều thành viên mỗi trip, với:
- Quản lý event (CRUD, FSM trạng thái theo thời gian thực)
- Phân quyền theo từng trip (Trưởng nhóm / Thành viên)
- Mời thành viên qua email (kể cả người chưa có tài khoản)
- Tích hợp thời tiết thời gian thực, đề xuất thay đổi lịch trình cho Trưởng nhóm duyệt
- Ghi nhận & quyết toán chi tiêu nhóm (ai nợ ai, không cần chia đều)
- Dashboard nhóm (theo trip) và Dashboard cá nhân (theo tài khoản)

### 1.2. Nguyên tắc kiến trúc cốt lõi (rút ra xuyên suốt quá trình thiết kế)
1. **1 nguồn sự thật duy nhất** — PostgreSQL, không phải localStorage (localStorage chỉ là cache).
2. **Không để 2 "cỗ máy tự động" cùng sửa 1 dữ liệu** — status engine và weather engine tách biệt, weather chỉ *đề xuất*, không tự sửa.
3. **Role gắn với quan hệ (trip, user), không gắn với user toàn cục** — vì 1 người có vai trò khác nhau ở mỗi trip.
4. **Để DB làm việc DB giỏi nhất** — tổng hợp/group-by chạy bằng SQL, thuật toán nghiệp vụ (FSM, quyết toán nợ) chạy ở tầng ứng dụng.
5. **Tách business logic khỏi UI** — mọi FSM/thuật toán nằm trong module thuần (`utils/`), test được độc lập, UI chỉ gọi và hiển thị.
6. **Mọi thay đổi trạng thái đi qua đúng 1 con đường (reducer/API), không bypass** — kể cả thay đổi tự động.
7. **Phân quyền chốt chặn thật sự ở tầng database (RLS), không chỉ ở UI** — vì dùng PostgREST (mục 2), UI chỉ ẩn/hiện cho trải nghiệm mượt, còn quyền truy cập dữ liệu thật sự do PostgreSQL Row-Level Security quyết định — kể cả khi có ai đó gọi thẳng API mà không qua UI.

---

## 2. Kiến trúc tổng thể

> **Cập nhật quan trọng:** thay vì tự viết 1 backend Express xử lý toàn bộ API, dự án dùng **PostgREST** (auto-generate REST API trực tiếp từ schema PostgreSQL) làm lớp CRUD chính, kèm **GoTrue** làm lớp Auth (Google OAuth + email/mật khẩu), và **Jobs Service** (Node.js) đảm nhiệm các tác vụ ngầm (cron job, thời tiết, gửi email, WebSocket Server). 
> Hệ thống tích hợp thêm **Object Storage (MinIO/S3)** cho việc lưu trữ tài liệu hóa đơn (receipts), ảnh avatar và luồng cập nhật thời gian thực qua **Real-time WebSocket** dựa trên cơ chế `LISTEN/NOTIFY` của PostgreSQL.

```
┌─────────────────┐             HTTPS/JSON             ┌───────────────┐   SQL (PostgREST)  ┌──────────────┐
│    React PWA    │ ──────────────────────────────────▶│   PostgREST   │───────────────────▶│  PostgreSQL  │
│ (Vite, IndexedDB│◀────────────────────────────────── │(auto REST API)│◀────────────────── │ + RLS Policy │
│  Service Worker)│             JWT Bearer             └───────────────┘                    └──────────────┘
└─────────────────┘                                            ▲                                   ▲
      │    ▲   │                                               │                                   │
      │    │   │                                               │                                   │
      │    │   └──────────────── WebSocket (Push) ─────────────┼───────────────┐                   │
      │    │                                                   │               │                   │
      ▼    │                                                   │               ▼                   │
┌──────────────┐                                       ┌───────────────┐┌──────────────┐           │
│    GoTrue    │ ─────────────────────────────────────▶│  (verify JWT  ││ Jobs Service │           │
│(Google OAuth │              phát hành JWT            │  secret dùng  ││   (Node.js)  │◀──LISTEN──┘
│ + email/pwd) │                                       │   chung)      ││ - WS Server  │   NOTIFY
└──────────────┘                                       └───────────────┘│ - Cron Jobs  │
                                                                        │ - SMTP Email │
                                                                        └──────────────┘
                                                                           │        │
                                                                           ▼        ▼
                                                                     MinIO/S3    Open-Meteo
                                                                     (Storage)  (Weather API)
```

- **Client (React PWA)**: React + Vite + React Router. Ứng dụng nâng cấp lên PWA, sử dụng Service Worker để chạy offline, cache tài nguyên và sử dụng **IndexedDB** làm local database tạm thời khi mất mạng. Gọi trực tiếp PostgREST cho các tác vụ CRUD, GoTrue cho Auth, kết nối tới WebSocket Server của Jobs Service để nhận cập nhật thời gian thực.
- **GoTrue**: Xử lý toàn bộ vòng đời tài khoản (signup, login, Google OAuth, quên mật khẩu), phát hành **JWT** chứa `sub` (userId) và `role`.
- **PostgREST**: Nhận JWT ở header `Authorization: Bearer <token>`, set `role`/`request.jwt.claims` cho phiên kết nối Postgres, mọi quyền truy cập do **RLS Policy** (mục 5.1) quyết định.
- **PostgreSQL**: Nguồn dữ liệu trung tâm, tích hợp cơ chế `LISTEN/NOTIFY` để phát tín hiệu khi có thay đổi dữ liệu (trạng thái event, nhắc nợ, thay đổi trip).
- **Jobs Service (Node.js)**: 
  - **WebSocket Server**: Kết nối trực tiếp PostgreSQL nhận tín hiệu `LISTEN/NOTIFY` và chuyển tiếp (push) dữ liệu xuống React PWA qua WebSocket.
  - **Cron Engine**: Chạy FSM cập nhật trạng thái chuyến đi/event theo múi giờ (`timezone`) của từng trip, đồng bộ thông tin thời tiết định kỳ qua weather engine.
  - **Nghiệp vụ bổ trợ**: Tính toán quyết toán nợ (`simplifyDebts`), xử lý lưu trữ file lên **MinIO/S3** thông qua Pre-signed URL, gửi email qua SMTP.
  - **Observability**: Tích hợp Sentry/Winston để giám sát hệ thống và log lỗi tập trung.
- **Object Storage (MinIO/S3)**: Lưu trữ tệp tin tĩnh (ảnh avatar người dùng, ảnh chụp hóa đơn/receipt của các Expense) giúp giảm tải dung lượng lưu trữ cho Database PostgreSQL.

---

## 3. Data model (đầy đủ)

```ts
// LƯU Ý: GoTrue tự quản lý bảng auth.users (email, password hash, liên kết Google...)
// Bảng `users` dưới đây thuộc schema public, chỉ lưu PROFILE, id trùng với auth.users.id
// (do GoTrue cấp khi signup/Google OAuth) — không lưu password ở đây.
interface User {
  id: string;                  // = auth.users.id
  name: string;
  email: string;               // đồng bộ 1 chiều từ auth.users, dùng match invitation
  phone?: string;
  avatarUrl?: string;          // Đường dẫn ảnh lưu trên Object Storage (MinIO/S3)
  createdAt: string;
}

interface Trip {
  id: string;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  budget?: number;
  baseCurrency: string;        // Đồng tiền gốc quy đổi cho chuyến đi (ví dụ: 'VND', 'USD')
  timezone: string;            // Múi giờ của chuyến đi để chạy chính xác cron job (ví dụ: 'Asia/Tokyo')
  createdBy: string;           // userId
  createdAt: string;
}

// Bảng trung gian many-to-many User <-> Trip — nơi role thực sự "sống"
interface TripMember {
  tripId: string;
  userId: string;
  role: 'leader' | 'member';
  joinedAt: string;
}

// Lời mời — tách riêng khỏi TripMember vì người được mời có thể chưa có tài khoản
interface TripInvitation {
  id: string;
  tripId: string;
  invitedEmail: string;
  invitedBy: string;           // userId leader
  role: 'leader' | 'member';   // vai trò gán khi accept
  token: string;               // random, không đoán được, dùng 1 lần
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  createdAt: string;
  expiresAt: string;
  respondedAt?: string;
}

interface TripEvent {
  id: string;
  tripId: string;
  title: string;
  description?: string;
  startTime: string;            // ISO datetime
  endTime: string;
  location?: string;
  lat?: number;
  lng?: number;
  category: 'food' | 'sightseeing' | 'bonding' | 'other';
  status: 'upcoming' | 'ongoing' | 'done' | 'cancelled' | 'postponed';
  isCompleted: boolean;
  order: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface ChangeRequest {
  id: string;
  eventId: string;
  source: 'weather' | 'member';
  reason: string;
  suggestedAction: 'postpone' | 'cancel' | 'change_location' | 'keep';
  suggestedPayload?: Partial<TripEvent>;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  resolvedBy?: string;
  resolvedAt?: string;
}

interface WeatherSnapshot {
  id: string;
  eventId: string;
  fetchedAt: string;
  condition: 'clear' | 'rain' | 'storm' | 'extreme_heat' | 'other';
  temperatureC: number;
}

// Khoản chi — Hủy bỏ ON DELETE CASCADE, tích hợp Soft Delete và tỷ giá quy đổi ngoại tệ
interface Expense {
  id: string;
  tripId: string;
  eventId?: string;             // optional, có thể không gắn event cụ thể
  amount: number;               // Số tiền chi tiêu thực tế (theo currency gốc của hóa đơn)
  currency: string;             // Đồng tiền giao dịch tại hóa đơn (ví dụ: 'JPY', 'USD')
  exchangeRate: number;         // Tỷ giá quy đổi ra base_currency tại thời điểm chi tiêu (base_currency = amount * exchangeRate)
  category: 'food' | 'transport' | 'accommodation' | 'ticket' | 'other';
  description?: string;
  receiptUrl?: string;          // Ảnh chụp hóa đơn lưu trữ trên Object Storage (MinIO/S3)
  paidBy: string;               // userId người ỨNG tiền
  spentAt: string;              // date, dùng group-by-ngày
  createdAt: string;
  deletedAt?: string;           // Soft Delete: Lưu thời điểm xóa, null nếu dữ liệu đang hoạt động
}

// Bảng chi tiết thành viên chịu phí khoản chi — Hủy bỏ ON DELETE CASCADE, tích hợp Soft Delete
interface ExpenseShare {
  expenseId: string;
  userId: string;               // người phải chịu phần chi phí này
  shareAmount: number;          // số tiền người này phải trả (chưa nhân tỷ giá, tính theo currency của Expense)
  deletedAt?: string;           // Soft Delete
}
```

---

## 4. Business logic modules

### 4.1. FSM trạng thái event
```
upcoming ──(now ≥ startTime)──▶ ongoing ──(now ≥ endTime)──▶ done
```
- `cancelled`/`postponed`: absorbing state đối với auto-engine — engine bỏ qua hoàn toàn.
- `cancelled` vẫn chiếm khung giờ khi validate overlap (2 pipeline độc lập: validate-overlap vs auto-transition).
- Engine chạy bằng cron trên server (không phải client `setInterval`). Cron job sẽ quét định kỳ dựa theo múi giờ `timezone` được cấu hình trên từng chuyến đi (`Trip.timezone`) để đảm bảo các thay đổi trạng thái event chạy đúng giờ địa phương của chuyến đi đó.

### 4.2. RBAC theo trip
- Role không nằm trên `User`, nằm trên `TripMember`. Tính lại mỗi khi đổi `currentTripId` ở client.
- Ma trận quyền tóm tắt: Trưởng nhóm — tạo/sửa/xoá event, mời thành viên, duyệt ChangeRequest, quản lý trip; Thành viên — xem, đánh dấu hoàn thành, đề xuất thay đổi, **ghi Expense** (ai chi tiền cũng tự ghi được, không giới hạn ở leader).
- `usePermission(action)` đọc `currentTripRole`, tập trung logic 1 chỗ, không rải `if role===...` khắp code.

### 4.3. Mời thành viên (Invitation)
- Mời bằng **email dạng text tự do**, không cần người đó đã có tài khoản.
- `TripInvitation` độc lập với `TripMember` — chỉ tạo `TripMember` khi `status='accepted'`.
- Token ngẫu nhiên (`crypto.randomBytes(32)`), dùng 1 lần, có hạn (`expiresAt`).
- 2 kênh song song: email (Gmail SMTP + Nodemailer, link `/invite/{token}`) và in-app panel (chỉ hiện nếu email khớp user đã tồn tại).
- Link mời dẫn tới đúng luồng dù người nhận: chưa có tài khoản (signup) → có tài khoản chưa đăng nhập (login) → đã đăng nhập (hiện thẳng màn accept/decline).

### 4.4. Weather engine + ChangeRequest
- Cron riêng (chu kỳ ~10 phút, khác chu kỳ status engine).
- Chỉ kiểm tra event có category "nhạy thời tiết" (`sightseeing`) và đang ở status upcoming/ongoing.
- Thời tiết xấu → tạo `ChangeRequest(source='weather')`, KHÔNG tự sửa event.
- Trưởng nhóm duyệt (approve áp dụng `suggestedPayload` qua đúng API sửa event, không bypass FSM) hoặc từ chối.

### 4.5. Chi tiêu & Quyết toán (Settlement)

**Bước 1 — Ghi nhận:** Tạo `Expense` (kèm thông tin `currency` và tỷ giá `exchange_rate` so với `base_currency` của chuyến đi) + chọn tập thành viên tham gia → tự tính chia đều, hoặc cho nhập tay từng phần (custom split) → sinh ra các dòng `ExpenseShare`.

**Bước 2 — Tính số dư (balance) mỗi người quy đổi về base_currency:**
Để đảm bảo tính chính xác cho các hóa đơn đa ngoại tệ, câu SQL tổng hợp `balance` phải nhân số tiền với `exchange_rate` để quy về cùng loại `base_currency` của chuyến đi trước khi thực hiện cộng trừ rút gọn. Đồng thời chỉ tính toán trên các bản ghi chưa bị xóa mềm (`deleted_at IS NULL`).
```sql
WITH paid AS (
  SELECT 
    paid_by AS user_id, 
    SUM(amount * exchange_rate) AS total_paid
  FROM expenses 
  WHERE trip_id = $1 AND deleted_at IS NULL 
  GROUP BY paid_by
),
owed AS (
  SELECT 
    es.user_id, 
    SUM(es.share_amount * e.exchange_rate) AS total_owed
  FROM expense_shares es
  JOIN expenses e ON es.expense_id = e.id
  WHERE e.trip_id = $1 AND es.deleted_at IS NULL AND e.deleted_at IS NULL
  GROUP BY es.user_id
)
SELECT
  COALESCE(paid.user_id, owed.user_id) AS user_id,
  COALESCE(total_paid, 0) - COALESCE(total_owed, 0) AS balance
FROM paid FULL OUTER JOIN owed ON paid.user_id = owed.user_id;
```
`balance > 0` → người đó đang được nợ (đã ứng nhiều hơn phần mình chịu). `balance < 0` → người đó đang nợ nhóm.

**Bước 3 — Rút gọn thành số giao dịch tối thiểu (Tính theo base_currency):**
Thuật toán `simplifyDebts` nhận đầu vào là mảng các `balances` đã được quy đổi hoàn toàn sang `base_currency`.
```js
// utils/settlement.js
function simplifyDebts(balances) {
  // balances: [{ userId, amount }], amount>0 = được nợ, amount<0 = đang nợ (đều quy về base_currency)
  const creditors = balances.filter(b => b.amount > 0).sort((a, b) => b.amount - a.amount);
  const debtors   = balances.filter(b => b.amount < 0).sort((a, b) => a.amount - b.amount);
  const transactions = [];
  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i], creditor = creditors[j];
    const amount = Math.min(-debtor.amount, creditor.amount);
    if (amount > 0.01) {
      transactions.push({ from: debtor.userId, to: creditor.userId, amount });
    }
    debtor.amount += amount;
    creditor.amount -= amount;
    if (Math.abs(debtor.amount) < 0.01) i++;
    if (Math.abs(creditor.amount) < 0.01) j++;
  }
  return transactions; // Các giao dịch thanh toán quy chuẩn theo base_currency
}
```

### 4.6. Dashboard nhóm vs Dashboard cá nhân

| | Dashboard nhóm (theo trip) | Dashboard cá nhân (theo tài khoản) |
|---|---|---|
| Phạm vi dữ liệu | 1 trip đang chọn | Toàn bộ (có thể lọc theo trip) của riêng user đang đăng nhập |
| Nội dung chính | Tổng chi cả nhóm (quy đổi về `base_currency`), biểu đồ theo ngày/category, **bảng quyết toán "ai nợ ai"** (kết quả `simplifyDebts`) | Tổng mình đã **chi thực tế** và tổng mình **phải chịu** (đã nhân `exchange_rate` quy về `base_currency`), so sánh 2 số này chính là số dư cá nhân |
| API | `GET /api/trips/:id/expenses/stats`, `GET /api/trips/:id/settlement` | `GET /api/users/me/expenses/stats?tripId=` (tripId optional) |
| Quyền xem | Mọi thành viên trip đều xem được toàn bộ (minh bạch tài chính nhóm) | Chỉ chủ tài khoản xem được dữ liệu của chính mình |

### 4.7. Authentication (GoTrue + PostgREST)
- Chỉ 2 phương thức: **email/mật khẩu truyền thống** hoặc **Google OAuth**.
- Client lưu JWT (memory + refresh token), đính kèm `Authorization: Bearer <jwt>` cho mọi request tới PostgREST.
- **Trigger đồng bộ profile**: khi GoTrue tạo 1 dòng mới ở `auth.users`, 1 Postgres trigger tự tạo dòng tương ứng ở `public.users` (lấy `id`, `email`, và `name` từ Google profile).

---

## 5. Database schema (PostgreSQL, bản đầy đủ cuối cùng)

```sql
CREATE TYPE trip_role AS ENUM ('leader', 'member');
CREATE TYPE event_status AS ENUM ('upcoming', 'ongoing', 'done', 'cancelled', 'postponed');
CREATE TYPE event_category AS ENUM ('food', 'sightseeing', 'bonding', 'other');
CREATE TYPE request_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE request_source AS ENUM ('weather', 'member');
CREATE TYPE expense_category AS ENUM ('food', 'transport', 'accommodation', 'ticket', 'other');
CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'declined', 'expired');

CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  avatar_url TEXT, -- Link ảnh lưu trên MinIO/S3
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger đồng bộ auth.users -> public.users
CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, name, email, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_auth_user();

CREATE TABLE trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  budget NUMERIC,
  base_currency TEXT NOT NULL DEFAULT 'VND', -- Đồng tiền cơ sở của trip
  timezone TEXT NOT NULL DEFAULT 'Asia/Ho_Chi_Minh', -- Múi giờ phục vụ chạy FSM
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date)
);

CREATE TABLE trip_members (
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role trip_role NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (trip_id, user_id)
);

CREATE TABLE trip_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  invited_email TEXT NOT NULL,
  invited_by UUID REFERENCES users(id),
  role trip_role NOT NULL DEFAULT 'member',
  token TEXT NOT NULL UNIQUE,
  status invitation_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  responded_at TIMESTAMPTZ
);

CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  location TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  category event_category NOT NULL DEFAULT 'other',
  status event_status NOT NULL DEFAULT 'upcoming',
  is_completed BOOLEAN NOT NULL DEFAULT false,
  "order" INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_time > start_time)
);

CREATE TABLE change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  source request_source NOT NULL,
  reason TEXT NOT NULL,
  suggested_action TEXT NOT NULL,
  suggested_payload JSONB,
  status request_status NOT NULL DEFAULT 'pending',
  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE weather_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  condition TEXT NOT NULL,
  temperature_c NUMERIC
);

-- Hủy bỏ ON DELETE CASCADE, thay thế bằng Soft Delete (deleted_at)
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE RESTRICT, -- Ngăn xóa cứng trip khi còn expense
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'VND',
  exchange_rate NUMERIC NOT NULL DEFAULT 1.0 CHECK (exchange_rate > 0), -- Tỷ giá quy đổi ra base_currency
  category expense_category NOT NULL DEFAULT 'other',
  description TEXT,
  receipt_url TEXT, -- Đường dẫn ảnh hóa đơn lưu trên MinIO/S3
  paid_by UUID REFERENCES users(id) ON DELETE RESTRICT,
  spent_at DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ DEFAULT NULL -- Trường dùng cho Soft Delete
);

-- Hủy bỏ ON DELETE CASCADE, thay thế bằng Soft Delete (deleted_at)
CREATE TABLE expense_shares (
  expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  share_amount NUMERIC NOT NULL CHECK (share_amount >= 0),
  deleted_at TIMESTAMPTZ DEFAULT NULL, -- Trường dùng cho Soft Delete
  PRIMARY KEY (expense_id, user_id)
);

-- Index phục vụ truy vấn thường xuyên nhất
CREATE INDEX idx_events_trip ON events(trip_id);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_category ON events(category);
CREATE INDEX idx_change_requests_status ON change_requests(status);
CREATE INDEX idx_expenses_trip_date ON expenses(trip_id, spent_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_expense_shares_user ON expense_shares(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_trip_members_user ON trip_members(user_id);
CREATE INDEX idx_trip_invitations_email ON trip_invitations(invited_email);
CREATE INDEX idx_trip_invitations_token ON trip_invitations(token);
```

### 5.1. Row-Level Security (RLS) — bổ sung kiểm tra Soft Delete (`deleted_at IS NULL`)

Bật RLS trên mọi bảng nghiệp vụ và chèn điều kiện lọc `deleted_at IS NULL` cho các bảng tài chính.

```sql
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_members ENABLE ROW LEVEL SECURITY;

-- Quyền SELECT trên events
CREATE POLICY events_select ON events FOR SELECT
  USING (
    trip_id IN (
      SELECT trip_id FROM trip_members
      WHERE user_id = auth.uid()
    )
  );

-- Quyền thay đổi trên events (chỉ leader)
CREATE POLICY events_write ON events FOR INSERT WITH CHECK (
  trip_id IN (SELECT trip_id FROM trip_members WHERE user_id = auth.uid() AND role = 'leader')
);
CREATE POLICY events_update ON events FOR UPDATE USING (
  trip_id IN (SELECT trip_id FROM trip_members WHERE user_id = auth.uid() AND role = 'leader')
);
CREATE POLICY events_delete ON events FOR DELETE USING (
  trip_id IN (SELECT trip_id FROM trip_members WHERE user_id = auth.uid() AND role = 'leader')
);

-- Quyền SELECT trên expenses (Chỉ hiện các record chưa bị Soft Delete)
CREATE POLICY expenses_select ON expenses FOR SELECT USING (
  trip_id IN (SELECT trip_id FROM trip_members WHERE user_id = auth.uid()) AND deleted_at IS NULL
);

-- Quyền INSERT/UPDATE trên expenses
CREATE POLICY expenses_insert ON expenses FOR INSERT WITH CHECK (
  trip_id IN (SELECT trip_id FROM trip_members WHERE user_id = auth.uid())
);
CREATE POLICY expenses_update ON expenses FOR UPDATE USING (
  trip_id IN (SELECT trip_id FROM trip_members WHERE user_id = auth.uid()) AND deleted_at IS NULL
);
-- Không cấp quyền DELETE vật lý (FOR DELETE USING (false)) để bảo vệ Audit Trail
CREATE POLICY expenses_delete ON expenses FOR DELETE USING (false);

-- Quyền SELECT trên expense_shares (Chỉ hiện các record chưa bị Soft Delete)
CREATE POLICY expense_shares_select ON expense_shares FOR SELECT USING (
  expense_id IN (
    SELECT id FROM expenses WHERE trip_id IN (
      SELECT trip_id FROM trip_members WHERE user_id = auth.uid()
    )
  ) AND deleted_at IS NULL
);

CREATE POLICY expense_shares_write ON expense_shares FOR ALL USING (
  expense_id IN (
    SELECT id FROM expenses WHERE trip_id IN (
      SELECT trip_id FROM trip_members WHERE user_id = auth.uid()
    )
  )
);
```

### 5.2. PostgreSQL LISTEN/NOTIFY Trigger
Thiết lập trigger thông báo tự động cho các thay đổi sự kiện hoặc cập nhật nợ nần để Jobs Service push realtime qua WebSocket:
```sql
CREATE OR REPLACE FUNCTION notify_data_changes()
RETURNS TRIGGER AS $$
DECLARE
  payload JSONB;
BEGIN
  payload = jsonb_build_object(
    'table', TG_TABLE_NAME,
    'action', TG_OP,
    'data', COALESCE(row_to_json(NEW)::jsonb, row_to_json(OLD)::jsonb)
  );
  PERFORM pg_notify('data_updates', payload::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_events_change
  AFTER INSERT OR UPDATE OR DELETE ON events
  FOR EACH ROW EXECUTE FUNCTION notify_data_changes();

CREATE TRIGGER on_expenses_change
  AFTER INSERT OR UPDATE OR DELETE ON expenses
  FOR EACH ROW EXECUTE FUNCTION notify_data_changes();
```

---

## 6. API reference (đầy đủ)

### 6.1. PostgREST — auto-generated (CRUD trực tiếp trên bảng, chốt quyền bằng RLS)

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/trips?select=*,trip_members(*)` | Danh sách trip của user hiện tại |
| POST | `/trips` | Tạo trip |
| GET | `/events?trip_id=eq.{tripId}&order=start_time` | Danh sách event của 1 trip |
| POST | `/events` | Tạo event |
| PATCH | `/events?id=eq.{eventId}` | Sửa event / đổi `order` |
| DELETE | `/events?id=eq.{eventId}` | Xoá event |
| GET | `/change_requests?event_id=eq.{eventId}&status=eq.pending` | Đề xuất chờ duyệt |
| PATCH | `/change_requests?id=eq.{id}` | Approve/Reject qua RPC |
| GET | `/expenses?trip_id=eq.{tripId}` | Danh sách chi tiêu (RLS tự lọc `deleted_at IS NULL`) |
| PATCH | `/expenses?id=eq.{expenseId}` | Cập nhật hoặc thực hiện Soft Delete bằng cách set `deleted_at = now()` |
| GET | `/trip_invitations?invited_email=eq.{email}&status=eq.pending` | Lời mời đang chờ |

### 6.2. GoTrue — Authentication

| Method | Endpoint | Mô tả |
|---|---|---|
| POST | `/auth/v1/signup` | Đăng ký email/mật khẩu |
| POST | `/auth/v1/token?grant_type=password` | Đăng nhập email/mật khẩu |
| GET | `/auth/v1/authorize?provider=google` | Bắt đầu luồng Google OAuth |
| POST | `/auth/v1/recover` | Gửi email quên mật khẩu |
| PUT | `/auth/v1/user` | Cập nhật thông tin auth |

### 6.3. Postgres Functions (RPC qua PostgREST)

| RPC | Mô tả |
|---|---|
| `POST /rpc/resolve_change_request` | Approve/reject 1 `ChangeRequest`, nếu approve thì áp dụng `suggested_payload` vào `events` trong 1 transaction |
| `POST /rpc/create_expense_with_shares` | Nhận `amount` + danh sách `(userId, shareAmount)`, insert `expenses` + `expense_shares` trong 1 transaction |
| `POST /rpc/accept_invitation` | Nhận `token`, kiểm tra hạn + email khớp `auth.uid()`, insert `trip_members` + update `trip_invitations.status` |

### 6.4. Jobs Service & Dịch vụ ngoài (Node.js)

| Việc | Cách chạy | Lý do & Giải pháp kỹ thuật |
|---|---|---|
| **Real-time WebSocket Push** | Socket.io / WebSocket Server | Lắng nghe kênh `data_updates` từ PostgreSQL bằng lệnh `LISTEN` của client pg. Khi nhận được notify, chuyển tiếp data cập nhật xuống React PWA. |
| **Object Storage Upload** | S3 API (MinIO / AWS SDK) | Cung cấp Pre-signed URL cho Client tải ảnh hóa đơn (receipt) hoặc avatar trực tiếp lên MinIO/S3 mà không cần đi qua băng thông của node server. |
| Cron tick FSM trạng thái event (15-30s) | `node-cron` chạy theo múi giờ `Trip.timezone` | Cập nhật `status` của các event đang diễn ra theo đúng múi giờ địa phương của từng chuyến đi. |
| Cron weather engine (~10 phút) | `node-cron` + gọi Open-Meteo | Quét thời tiết và sinh các ChangeRequest đề xuất đổi lịch trình. |
| `simplifyDebts` | JS logic | Tính toán rút gọn nợ dựa trên balance quy đổi ra base_currency của chuyến đi. |
| Gửi email | Nodemailer + Gmail SMTP | Gửi email xác thực, link mời tham gia chuyến đi. |

---

## 7. Cấu trúc thư mục & routing frontend (Nâng cấp PWA)

```
trip-scheduler/
├── src/                            (React PWA — gọi PostgREST + GoTrue + WS)
│   ├── pages/
│   │   ├── LoginPage.jsx / SignupPage.jsx / ForgotPasswordPage.jsx
│   │   ├── EventsPage.jsx
│   │   ├── CalendarPage.jsx
│   │   ├── TripDashboardPage.jsx      (Dashboard nhóm quy đổi base_currency)
│   │   ├── PersonalDashboardPage.jsx  (Dashboard cá nhân quy đổi base_currency)
│   │   ├── TripsPage.jsx / TripDetailPage.jsx
│   │   ├── InvitationsPage.jsx
│   │   └── SettingsPage.jsx
│   ├── components/
│   │   ├── EventForm/ EventCard/ EventList/
│   │   ├── StatsPanel/ OngoingBanner/
│   │   ├── TripSwitcher/
│   │   ├── ExpenseForm/ SettlementBoard/
│   │   ├── ChangeRequestPanel/
│   │   └── InviteMemberModal/
│   ├── context/
│   │   ├── AuthContext.jsx
│   │   ├── TripContext.jsx
│   │   ├── EventContext.jsx
│   │   └── WebSocketContext.jsx    (Kết nối WS nhận thông báo từ Jobs Service)
│   ├── lib/
│   │   ├── postgrest.js
│   │   ├── gotrue.js
│   │   └── db.js                   (IndexedDB helper sử dụng idb/Dexie.js)
│   ├── hooks/
│   │   ├── usePermission.js
│   │   └── useLocalStorage.js
│   ├── utils/
│   │   ├── validators.js / dateHelpers.js / statusMachine.js
│   │   └── settlement.js
│   ├── sw.js                       (Service Worker: Caching assets, Background Sync)
│   ├── manifest.json               (Cấu hình PWA để cài đặt ứng dụng)
│   ├── App.jsx
│   └── main.jsx
├── db/
│   ├── migrations/              (Schema SQL có múi giờ, tỷ giá, soft delete)
│   └── functions/               (Postgres Functions & Triggers LISTEN/NOTIFY)
├── jobs-service/                (Node.js Service)
│   ├── cron/                    (status-engine.js, weather-engine.js)
│   ├── socket/                  (websocket-server.js kết nối LISTEN/NOTIFY)
│   ├── settlement.js            (Hàm simplifyDebts xử lý tỷ giá ngoại tệ)
│   ├── storage.js               (MinIO/S3 Pre-signed URL generator)
│   ├── email.js                 (SMTP Mailer)
│   └── logger.js                (Winston + Sentry tracking lỗi)
├── docker-compose.yml           (postgres + postgrest + gotrue + minio + jobs-service)
├── README.md
└── package.json
```

---

## 8. Tính năng PWA & Offline Mode

Để đáp ứng nhu cầu sử dụng tại các khu vực mất kết nối mạng khi đi du lịch, ứng dụng được thiết kế theo mô hình **Offline-First**:

1. **Service Worker (sw.js)**:
   - Cache các tài nguyên tĩnh của Frontend (HTML, CSS, JS, Fonts, Icons) bằng chiến duyệt *Cache-First* hoặc *Stale-While-Revalidate*.
   - Đăng ký lắng nghe sự kiện `sync` (Background Sync API) để tự động đẩy dữ liệu từ hàng đợi đồng bộ lên server khi có mạng trở lại.

2. **Cơ chế lưu trữ IndexedDB (lib/db.js)**:
   - Cache danh sách lịch trình chuyến đi, danh sách event và thông tin chi tiêu để hiển thị tức thì khi người dùng mở app ở trạng thái offline.
   - Thiết lập một bảng hàng đợi đồng bộ (`sync_queue`):
     ```ts
     interface SyncQueueItem {
       id: string;
       action: 'CREATE_EXPENSE' | 'UPDATE_EXPENSE' | 'SOFT_DELETE_EXPENSE';
       payload: any;
       createdAt: number;
     }
     ```

3. **Luồng hoạt động khi offline**:
   - Khi tạo mới một `Expense` trong điều kiện không có mạng, client sẽ:
     - Tạo một ID tạm thời và ghi trực tiếp Expense đó vào IndexedDB để cập nhật UI ngay lập tức.
     - Đóng gói dữ liệu và đẩy vào `sync_queue` trong IndexedDB.
     - Đăng ký một tag sync với Service Worker (ví dụ: `sync-expenses`).
   - Khi thiết bị khôi phục kết nối Internet:
     - Service Worker nhận sự kiện `sync` từ trình duyệt, đọc toàn bộ `sync_queue` từ IndexedDB.
     - Gửi tuần tự các request đồng bộ lên PostgREST (ưu tiên sử dụng RPC `create_expense_with_shares` để đảm bảo tính toàn vẹn dữ liệu).
     - Xóa các bản ghi đã đồng bộ thành công khỏi `sync_queue` và phát tín hiệu qua WebSocket/BroadcastChannel để cập nhật lại UI Client.

---

## 9. Vận hành & Observability

Để đảm bảo hệ thống vận hành trơn tru ở môi trường Production-ready, **Jobs Service** bắt buộc phải tích hợp hệ thống tracking lỗi và log giám sát toàn diện:

1. **Giám sát lỗi ứng dụng (Sentry)**:
   - Tích hợp Sentry SDK vào Node.js Jobs Service để capture tất cả các uncaught exception và các lỗi logic nghiệp vụ nghiêm trọng.
   - Giám sát đặc biệt cho các luồng:
     - Cron job FSM chuyển trạng thái event thất bại.
     - Tiện ích dự báo thời tiết Open-Meteo bị sập hoặc trả về payload sai định dạng.
     - Gửi email mời thành viên/reset mật khẩu qua SMTP bị từ chối hoặc timeout.
     - Lỗi kết nối Socket.io / WebSocket hoặc gián đoạn luồng `LISTEN/NOTIFY` từ PostgreSQL.

2. **Ghi nhật ký hệ thống (Winston)**:
   - Sử dụng Winston log với định dạng JSON để dễ dàng thu thập bởi các hệ thống Log Aggregator (Elasticsearch/Grafana Loki).
   - Thiết lập các level log rõ ràng:
     - `error`: Lỗi hỏng hóc gây dừng hệ thống hoặc lỗi nghiệp vụ nghiêm trọng (ví dụ: hỏng kết nối DB, S3 Storage từ chối truy cập).
     - `warn`: Cảnh báo lỗi phục hồi được (ví dụ: gọi API thời tiết thất bại nhưng đã có cơ chế retry).
     - `info`: Ghi lại lịch sử hoạt động chính (ví dụ: hoàn tất chạy cron chuyển trạng thái, gửi email thành công cho user X).

---

## 10. Rủi ro & lưu ý kỹ thuật tổng hợp

1. **`ExpenseShare` phải luôn khớp tổng với `Expense.amount`** — validate cả 2 tầng (client UX + server defensive), tránh lệch số khi tính settlement.
2. **Thuật toán `simplifyDebts` chạy ở tầng ứng dụng, không chạy trong SQL** — SQL chỉ tổng hợp balance thô đã quy đổi ngoại tệ; đừng cố viết thuật toán tham lam bằng SQL thuần, sẽ rất khó đọc/maintain.
3. **Múi giờ của chuyến đi (`Trip.timezone`)** — Việc xử lý ngày giờ ở Backend Jobs Service phải căn cứ theo múi giờ này của chuyến đi để trigger FSM đúng thời điểm thực tế, không dùng múi giờ local của máy chủ (UTC).
4. **Bảo toàn Audit Trail tài chính** — Tuyệt đối không xóa vật lý các bản ghi trong `expenses` và `expense_shares`. Mọi thao tác xóa từ phía người dùng đều là cập nhật `deleted_at = now()`. Các câu lệnh SELECT/RPC phải kiểm tra kỹ điều kiện `deleted_at IS NULL` để tránh tính toán sai số tiền.
5. **Giới hạn kích thước file và bảo mật Object Storage** — Khi tải ảnh hóa đơn (receipt) hoặc avatar lên MinIO/S3, Frontend bắt buộc phải xin Pre-signed URL từ Jobs Service để kiểm soát thời gian hiệu lực (expire trong 5-15 phút) và giới hạn dung lượng file tải lên (ví dụ: tối đa 5MB) nhằm tránh tấn công DOS bộ nhớ lưu trữ.
6. **Xử lý xung đột ID khi đồng bộ Offline PWA** — Khi offline, ứng dụng sinh UUID tạm thời ở client. Khi có mạng và đồng bộ, Service Worker cần gửi đúng UUID tạm đó làm ID chính thức lên database (do database dùng UUID nên client có thể tạo UUID v4 an toàn mà không sợ trùng lặp).
7. **Bảo mật và duy trì kết nối WebSocket** — WebSocket Server của Jobs Service cần verify JWT token tại thời điểm handshake. Đồng thời, cấu hình cơ chế Ping/Pong để phát hiện kết nối chết và tự động reconnect ở phía Client React PWA.

---

*Hết tài liệu. Đây là bản chốt kiến trúc kỹ thuật phiên bản 2.0 — mọi thay đổi phạm vi sau này nên cập nhật lại tài liệu này trước khi code.*