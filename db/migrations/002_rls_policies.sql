-- Enable Row-Level Security (RLS) on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE change_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE weather_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_shares ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 1. PROFILES POLICIES
-- ==========================================
CREATE POLICY profiles_select_all ON profiles FOR SELECT TO authenticated
  USING (true);

CREATE POLICY profiles_update_self ON profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- =========================================================================
-- Helper Functions to break RLS recursion (SECURITY DEFINER bypasses RLS)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.check_user_in_trip(p_trip_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.trip_members 
    WHERE trip_id = p_trip_id AND user_id = p_user_id
  );
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.check_user_is_leader(p_trip_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.trip_members 
    WHERE trip_id = p_trip_id AND user_id = p_user_id AND role = 'leader'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- ==========================================
-- 2. TRIPS POLICIES
-- ==========================================
CREATE POLICY trips_select_member ON trips FOR SELECT TO authenticated
  USING (
    public.check_user_in_trip(id, auth.uid())
  );

CREATE POLICY trips_insert ON trips FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY trips_update_leader ON trips FOR UPDATE TO authenticated
  USING (
    public.check_user_is_leader(id, auth.uid())
  );

CREATE POLICY trips_delete_leader ON trips FOR DELETE TO authenticated
  USING (
    public.check_user_is_leader(id, auth.uid())
  );

-- ==========================================
-- 3. TRIP MEMBERS POLICIES
-- ==========================================
CREATE POLICY trip_members_select ON trip_members FOR SELECT TO authenticated
  USING (
    public.check_user_in_trip(trip_id, auth.uid())
  );

CREATE POLICY trip_members_insert_leader ON trip_members FOR INSERT TO authenticated
  WITH CHECK (
    public.check_user_is_leader(trip_id, auth.uid())
  );

CREATE POLICY trip_members_update_leader ON trip_members FOR UPDATE TO authenticated
  USING (
    public.check_user_is_leader(trip_id, auth.uid())
  );

CREATE POLICY trip_members_delete_leader ON trip_members FOR DELETE TO authenticated
  USING (
    public.check_user_is_leader(trip_id, auth.uid())
  );

-- ==========================================
-- 4. TRIP INVITATIONS POLICIES
-- ==========================================
CREATE POLICY trip_invitations_select ON trip_invitations FOR SELECT TO authenticated
  USING (
    invited_email = (SELECT email FROM profiles WHERE id = auth.uid())
    OR public.check_user_is_leader(trip_id, auth.uid())
  );

CREATE POLICY trip_invitations_insert_leader ON trip_invitations FOR INSERT TO authenticated
  WITH CHECK (
    public.check_user_is_leader(trip_id, auth.uid())
  );

CREATE POLICY trip_invitations_update ON trip_invitations FOR UPDATE TO authenticated
  USING (
    invited_email = (SELECT email FROM profiles WHERE id = auth.uid())
    OR public.check_user_is_leader(trip_id, auth.uid())
  );

-- ==========================================
-- 5. EVENTS POLICIES
-- ==========================================
CREATE POLICY events_select ON events FOR SELECT TO authenticated
  USING (
    trip_id IN (SELECT trip_id FROM trip_members WHERE user_id = auth.uid())
  );

CREATE POLICY events_insert_leader ON events FOR INSERT TO authenticated
  WITH CHECK (
    trip_id IN (SELECT trip_id FROM trip_members WHERE user_id = auth.uid() AND role = 'leader')
  );

CREATE POLICY events_update_leader ON events FOR UPDATE TO authenticated
  USING (
    trip_id IN (SELECT trip_id FROM trip_members WHERE user_id = auth.uid() AND role = 'leader')
  );

CREATE POLICY events_delete_leader ON events FOR DELETE TO authenticated
  USING (
    trip_id IN (SELECT trip_id FROM trip_members WHERE user_id = auth.uid() AND role = 'leader')
  );

-- ==========================================
-- 6. CHANGE REQUESTS POLICIES
-- ==========================================
CREATE POLICY change_requests_select ON change_requests FOR SELECT TO authenticated
  USING (
    event_id IN (SELECT id FROM events WHERE trip_id IN (SELECT trip_id FROM trip_members WHERE user_id = auth.uid()))
  );

CREATE POLICY change_requests_insert_member ON change_requests FOR INSERT TO authenticated
  WITH CHECK (
    event_id IN (SELECT id FROM events WHERE trip_id IN (SELECT trip_id FROM trip_members WHERE user_id = auth.uid()))
  );

CREATE POLICY change_requests_update_leader ON change_requests FOR UPDATE TO authenticated
  USING (
    event_id IN (SELECT id FROM events WHERE trip_id IN (SELECT trip_id FROM trip_members WHERE user_id = auth.uid() AND role = 'leader'))
  );

-- ==========================================
-- 7. WEATHER SNAPSHOTS POLICIES
-- ==========================================
CREATE POLICY weather_snapshots_select ON weather_snapshots FOR SELECT TO authenticated
  USING (
    event_id IN (SELECT id FROM events WHERE trip_id IN (SELECT trip_id FROM trip_members WHERE user_id = auth.uid()))
  );

-- ==========================================
-- 8. EXPENSES POLICIES (Soft Delete & RLS)
-- ==========================================
CREATE POLICY expenses_select ON expenses FOR SELECT TO authenticated
  USING (
    trip_id IN (SELECT trip_id FROM trip_members WHERE user_id = auth.uid())
    AND deleted_at IS NULL
  );

CREATE POLICY expenses_insert ON expenses FOR INSERT TO authenticated
  WITH CHECK (
    trip_id IN (SELECT trip_id FROM trip_members WHERE user_id = auth.uid())
  );

CREATE POLICY expenses_update ON expenses FOR UPDATE TO authenticated
  USING (
    trip_id IN (SELECT trip_id FROM trip_members WHERE user_id = auth.uid())
    AND deleted_at IS NULL
  );

-- Deny physical deletes
CREATE POLICY expenses_delete_deny ON expenses FOR DELETE TO authenticated
  USING (false);

-- ==========================================
-- 9. EXPENSE SHARES POLICIES (Soft Delete & RLS)
-- ==========================================
CREATE POLICY expense_shares_select ON expense_shares FOR SELECT TO authenticated
  USING (
    expense_id IN (SELECT id FROM expenses WHERE trip_id IN (SELECT trip_id FROM trip_members WHERE user_id = auth.uid()))
    AND deleted_at IS NULL
  );

CREATE POLICY expense_shares_insert ON expense_shares FOR INSERT TO authenticated
  WITH CHECK (
    expense_id IN (SELECT id FROM expenses WHERE trip_id IN (SELECT trip_id FROM trip_members WHERE user_id = auth.uid()))
  );

CREATE POLICY expense_shares_update ON expense_shares FOR UPDATE TO authenticated
  USING (
    expense_id IN (SELECT id FROM expenses WHERE trip_id IN (SELECT trip_id FROM trip_members WHERE user_id = auth.uid()))
    AND deleted_at IS NULL
  );

-- Deny physical deletes
CREATE POLICY expense_shares_delete_deny ON expense_shares FOR DELETE TO authenticated
  USING (false);

-- ==========================================
-- 10. GRANTS & ROLES PRIVILEGES FOR POSTGREST
-- ==========================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated;
