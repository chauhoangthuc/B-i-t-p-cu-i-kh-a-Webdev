-- =========================================================================
-- 1. Function: resolve_change_request
-- =========================================================================
CREATE OR REPLACE FUNCTION resolve_change_request(
  request_id UUID,
  decision request_status,
  resolver_id UUID
)
RETURNS VOID AS $$
DECLARE
  v_event_id UUID;
  v_payload JSONB;
  v_status request_status;
BEGIN
  -- Get change request details
  SELECT event_id, suggested_payload, status 
  INTO v_event_id, v_payload, v_status
  FROM change_requests
  WHERE id = request_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Change request not found.';
  END IF;

  IF v_status != 'pending' THEN
    RAISE EXCEPTION 'Change request has already been resolved.';
  END IF;

  -- Update change request status
  UPDATE change_requests
  SET status = decision,
      resolved_by = resolver_id,
      resolved_at = now()
  WHERE id = request_id;

  -- If approved, apply payload to event
  IF decision = 'approved' AND v_payload IS NOT NULL THEN
    UPDATE events
    SET 
      title = COALESCE(v_payload->>'title', title),
      description = COALESCE(v_payload->>'description', description),
      start_time = COALESCE((v_payload->>'start_time')::TIMESTAMPTZ, start_time),
      end_time = COALESCE((v_payload->>'end_time')::TIMESTAMPTZ, end_time),
      location = COALESCE(v_payload->>'location', location),
      lat = COALESCE((v_payload->>'lat')::DOUBLE PRECISION, lat),
      lng = COALESCE((v_payload->>'lng')::DOUBLE PRECISION, lng),
      category = COALESCE((v_payload->>'category')::event_category, category),
      status = COALESCE((v_payload->>'status')::event_status, status),
      is_completed = COALESCE((v_payload->>'is_completed')::BOOLEAN, is_completed),
      "order" = COALESCE((v_payload->>'order')::INTEGER, "order"),
      updated_at = now()
    WHERE id = v_event_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================================================
-- 2. Function: create_expense_with_shares
-- =========================================================================
CREATE OR REPLACE FUNCTION create_expense_with_shares(
  p_trip_id UUID,
  p_event_id UUID,
  p_amount NUMERIC,
  p_currency TEXT,
  p_exchange_rate NUMERIC,
  p_category expense_category,
  p_description TEXT,
  p_receipt_url TEXT,
  p_paid_by UUID,
  p_spent_at DATE,
  p_shares JSONB -- Format: [{"userId": "uuid", "shareAmount": numeric}]
)
RETURNS UUID AS $$
DECLARE
  v_expense_id UUID;
  v_share_sum NUMERIC := 0;
  v_share_item JSONB;
BEGIN
  -- Validate inputs
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Expense amount must be greater than 0.';
  END IF;

  IF p_exchange_rate <= 0 THEN
    RAISE EXCEPTION 'Exchange rate must be greater than 0.';
  END IF;

  -- Compute sum of shares and validate
  FOR v_share_item IN SELECT * FROM jsonb_array_elements(p_shares)
  LOOP
    v_share_sum := v_share_sum + (v_share_item->>'shareAmount')::NUMERIC;
  END LOOP;

  -- Allow for small rounding error (tolerance 0.02)
  IF ABS(v_share_sum - p_amount) > 0.02 THEN
    RAISE EXCEPTION 'Sum of shares (%) must equal the total expense amount (%).', v_share_sum, p_amount;
  END IF;

  -- Insert expense record
  INSERT INTO expenses (
    trip_id, event_id, amount, currency, exchange_rate, category, description, receipt_url, paid_by, spent_at
  ) VALUES (
    p_trip_id, p_event_id, p_amount, p_currency, p_exchange_rate, p_category, p_description, p_receipt_url, p_paid_by, p_spent_at
  ) RETURNING id INTO v_expense_id;

  -- Insert share records
  FOR v_share_item IN SELECT * FROM jsonb_array_elements(p_shares)
  LOOP
    INSERT INTO expense_shares (expense_id, user_id, share_amount)
    VALUES (v_expense_id, (v_share_item->>'userId')::UUID, (v_share_item->>'shareAmount')::NUMERIC);
  END LOOP;

  RETURN v_expense_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================================================
-- 3. Function: accept_invitation
-- =========================================================================
CREATE OR REPLACE FUNCTION accept_invitation(
  invitation_token TEXT,
  p_user_id UUID
)
RETURNS VOID AS $$
DECLARE
  v_invite_id UUID;
  v_trip_id UUID;
  v_role trip_role;
  v_invited_email TEXT;
  v_user_email TEXT;
  v_status invitation_status;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- Get user email
  SELECT email INTO v_user_email FROM profiles WHERE id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found.';
  END IF;

  -- Get invitation details
  SELECT id, trip_id, role, invited_email, status, expires_at
  INTO v_invite_id, v_trip_id, v_role, v_invited_email, v_status, v_expires_at
  FROM trip_invitations
  WHERE token = invitation_token;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid invitation token.';
  END IF;

  IF v_status != 'pending' THEN
    RAISE EXCEPTION 'Invitation is no longer pending.';
  END IF;

  IF v_expires_at < now() THEN
    UPDATE trip_invitations SET status = 'expired' WHERE id = v_invite_id;
    RAISE EXCEPTION 'Invitation has expired.';
  END IF;

  IF LOWER(v_invited_email) != LOWER(v_user_email) THEN
    RAISE EXCEPTION 'Invitation email does not match registered user email.';
  END IF;

  -- Join trip member
  INSERT INTO trip_members (trip_id, user_id, role)
  VALUES (v_trip_id, p_user_id, v_role)
  ON CONFLICT (trip_id, user_id) DO NOTHING;

  -- Update invitation status
  UPDATE trip_invitations
  SET status = 'accepted',
      responded_at = now()
  WHERE id = v_invite_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================================================
-- 4. Function: get_settlement
-- =========================================================================
CREATE OR REPLACE FUNCTION get_settlement(p_trip_id UUID)
RETURNS TABLE(user_id UUID, balance NUMERIC) AS $$
BEGIN
  RETURN QUERY
  WITH paid AS (
    SELECT 
      paid_by AS u_id, 
      SUM(amount * exchange_rate) AS total_paid
    FROM expenses 
    WHERE trip_id = p_trip_id AND deleted_at IS NULL 
    GROUP BY paid_by
  ),
  owed AS (
    SELECT 
      es.user_id AS u_id, 
      SUM(es.share_amount * e.exchange_rate) AS total_owed
    FROM expense_shares es
    JOIN expenses e ON es.expense_id = e.id
    WHERE e.trip_id = p_trip_id AND es.deleted_at IS NULL AND e.deleted_at IS NULL
    GROUP BY es.user_id
  )
  SELECT
    COALESCE(paid.u_id, owed.u_id) AS user_id,
    COALESCE(total_paid, 0) - COALESCE(total_owed, 0) AS balance
  FROM paid FULL OUTER JOIN owed ON paid.u_id = owed.u_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
