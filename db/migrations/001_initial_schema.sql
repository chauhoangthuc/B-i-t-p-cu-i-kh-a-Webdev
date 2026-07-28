
-- Create custom roles for PostgREST
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
END
$$;

-- Create Enums
CREATE TYPE trip_role AS ENUM ('leader', 'member');
CREATE TYPE event_status AS ENUM ('upcoming', 'ongoing', 'done', 'cancelled', 'postponed');
CREATE TYPE event_category AS ENUM ('food', 'sightseeing', 'bonding', 'other');
CREATE TYPE request_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE request_source AS ENUM ('weather', 'member');
CREATE TYPE expense_category AS ENUM ('food', 'transport', 'accommodation', 'ticket', 'other');
CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'declined', 'expired');

-- 1. Profiles Table
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  full_name TEXT,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Trigger to sync auth.users to public.profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, name, phone, avatar_url, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.phone,
    NEW.raw_user_meta_data->>'avatar_url',
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    name = EXCLUDED.name,
    phone = EXCLUDED.phone,
    avatar_url = EXCLUDED.avatar_url,
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Trips Table
CREATE TABLE trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  budget NUMERIC,
  base_currency TEXT NOT NULL DEFAULT 'VND',
  timezone TEXT NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
  image_url TEXT,
  destination TEXT,
  order_index INTEGER DEFAULT 0,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date)
);

-- 3. Trip Members Table
CREATE TABLE trip_members (
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role trip_role NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (trip_id, user_id)
);

-- Trigger to auto-add trip creator as member 'leader'
CREATE OR REPLACE FUNCTION handle_new_trip_creator_member()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.created_by IS NOT NULL THEN
    INSERT INTO public.trip_members (trip_id, user_id, role)
    VALUES (NEW.id, NEW.created_by, 'leader');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_trip_created
  AFTER INSERT ON trips
  FOR EACH ROW EXECUTE FUNCTION handle_new_trip_creator_member();

-- 4. Trip Invitations Table
CREATE TABLE trip_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  invited_email TEXT NOT NULL,
  invited_by UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role trip_role NOT NULL DEFAULT 'member',
  token TEXT NOT NULL UNIQUE,
  status invitation_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  responded_at TIMESTAMPTZ
);

-- 5. Events Table
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
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_time > start_time)
);

-- 6. Change Requests Table
CREATE TABLE change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  source request_source NOT NULL,
  reason TEXT NOT NULL,
  suggested_action TEXT NOT NULL,
  suggested_payload JSONB,
  status request_status NOT NULL DEFAULT 'pending',
  resolved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Weather Snapshots Table
CREATE TABLE weather_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  condition TEXT NOT NULL,
  temperature_c NUMERIC
);

-- 8. Expenses Table (Soft Delete, Multicurrency, Object Storage)
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'VND',
  exchange_rate NUMERIC NOT NULL DEFAULT 1.0 CHECK (exchange_rate > 0),
  category expense_category NOT NULL DEFAULT 'other',
  description TEXT,
  receipt_url TEXT,
  paid_by UUID REFERENCES profiles(id) ON DELETE RESTRICT,
  spent_at DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ DEFAULT NULL
);

-- 9. Expense Shares Table (Soft Delete)
CREATE TABLE expense_shares (
  expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  share_amount NUMERIC NOT NULL CHECK (share_amount >= 0),
  deleted_at TIMESTAMPTZ DEFAULT NULL,
  PRIMARY KEY (expense_id, user_id)
);

-- Indexes for performance
CREATE INDEX idx_events_trip ON events(trip_id);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_category ON events(category);
CREATE INDEX idx_change_requests_status ON change_requests(status);
CREATE INDEX idx_expenses_trip_date ON expenses(trip_id, spent_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_expense_shares_user ON expense_shares(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_trip_members_user ON trip_members(user_id);
CREATE INDEX idx_trip_invitations_email ON trip_invitations(invited_email);
CREATE INDEX idx_trip_invitations_token ON trip_invitations(token);
