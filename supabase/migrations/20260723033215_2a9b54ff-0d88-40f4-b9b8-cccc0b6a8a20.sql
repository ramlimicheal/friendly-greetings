
-- Stage A: Prevent platform-role escalation via profiles table.

-- 1) Drop unsafe policies.
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- 2) Minimal SELECT: users see own row; super_admin sees all.
CREATE POLICY "profiles_select_self" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "profiles_select_super_admin" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- 3) Column-guard trigger: block client-side changes to privileged columns.
--    Safe columns: full_name, avatar_url, updated_at. Anything else must go
--    through a SECURITY DEFINER function (service_role bypasses triggers via
--    session_user check).
CREATE OR REPLACE FUNCTION public.profiles_guard_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Bypass when running as service_role or postgres (server-side admin paths).
  IF current_setting('request.jwt.claims', true) IS NULL
     OR (current_setting('request.jwt.claims', true)::jsonb->>'role') = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'profiles.id is immutable';
  END IF;
  IF NEW.platform_role IS DISTINCT FROM OLD.platform_role THEN
    RAISE EXCEPTION 'platform_role can only be changed by a platform operation';
  END IF;
  IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
    RAISE EXCEPTION 'is_active can only be changed by an authorized staff operation';
  END IF;
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    RAISE EXCEPTION 'email is managed by auth and cannot be changed via profiles';
  END IF;
  IF NEW.active_clinic_id IS DISTINCT FROM OLD.active_clinic_id THEN
    RAISE EXCEPTION 'active_clinic_id must be changed via public.switch_active_clinic()';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_guard_privileged ON public.profiles;
CREATE TRIGGER trg_profiles_guard_privileged
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_guard_privileged_columns();

-- 4) Re-grant self UPDATE (guarded by trigger to only allow safe columns).
CREATE POLICY "profiles_update_self_safe" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- 5) Validated active-clinic switch RPC.
CREATE OR REPLACE FUNCTION public.switch_active_clinic(_clinic_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF _clinic_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.clinic_members m
    JOIN public.clinics c ON c.id = m.clinic_id
    WHERE m.user_id = _uid
      AND m.clinic_id = _clinic_id
      AND m.is_active = true
      AND COALESCE(c.is_suspended, false) = false
  ) AND NOT public.is_super_admin(_uid) THEN
    RAISE EXCEPTION 'not a member of the requested clinic';
  END IF;

  UPDATE public.profiles
     SET active_clinic_id = _clinic_id, updated_at = now()
   WHERE id = _uid;
END;
$$;

REVOKE ALL ON FUNCTION public.switch_active_clinic(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.switch_active_clinic(uuid) TO authenticated;

-- 6) Platform-role management RPC (super_admin only).
CREATE OR REPLACE FUNCTION public.set_platform_role(_target_user uuid, _role platform_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden: super_admin required';
  END IF;
  IF _target_user = auth.uid() AND _role IS DISTINCT FROM 'super_admin'::platform_role THEN
    -- Prevent last super_admin from demoting themselves accidentally.
    IF (SELECT COUNT(*) FROM public.profiles WHERE platform_role = 'super_admin' AND id <> auth.uid()) = 0 THEN
      RAISE EXCEPTION 'cannot demote the last super_admin';
    END IF;
  END IF;
  UPDATE public.profiles SET platform_role = _role, updated_at = now() WHERE id = _target_user;
END;
$$;

REVOKE ALL ON FUNCTION public.set_platform_role(uuid, platform_role) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_platform_role(uuid, platform_role) TO service_role;

-- 7) Ensure grants remain correct.
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
REVOKE INSERT, DELETE ON public.profiles FROM authenticated;
GRANT ALL ON public.profiles TO service_role;
