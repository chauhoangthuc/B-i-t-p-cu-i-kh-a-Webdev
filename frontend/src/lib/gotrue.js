/**
 * gotrue.js — Backward-compatible re-export.
 *
 * File này được giữ lại để không cần sửa từng chỗ import { gotrue } khắp dự án.
 * Thực tế, `gotrue` bây giờ là `supabase.auth` từ @supabase/supabase-js —
 * tự động inject đúng header apikey + Authorization Bearer vào mọi request Auth.
 *
 * ⚠️  Đừng tạo thêm GoTrueClient thủ công ở đây nữa.
 *     Mọi config Auth tập trung tại: src/lib/supabase.js
 */
export { gotrue } from './supabase.js';