CREATE SCHEMA IF NOT EXISTS auth;
CREATE OR REPLACE FUNCTION auth.uid()
RETURNS UUID AS $$
  SELECT COALESCE(
    NULLIF(current_setting('request.jwt.claim.sub', true), ''),
    NULLIF(current_setting('request.jwt.claims', true)::jsonb->>'sub', '')
  )::uuid;
$$ LANGUAGE sql STABLE;
ALTER DATABASE tripmanager SET search_path TO public, auth;