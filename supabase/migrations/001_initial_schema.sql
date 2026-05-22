-- ============================================================
-- StashTag Initial Schema
-- ============================================================

-- Enable UUID extension (already enabled in Supabase by default)
-- CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABLES
-- ============================================================

-- Profiles: one per auth.users row
CREATE TABLE IF NOT EXISTS public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name     TEXT NOT NULL DEFAULT '',
  avatar_url    TEXT,
  is_pro        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Households: the top-level grouping (e.g., "Smith Family")
CREATE TABLE IF NOT EXISTS public.households (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  created_by    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Household Members: many-to-many with roles
CREATE TABLE IF NOT EXISTS public.household_members (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id  UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  -- NULL until the invited person signs up and accepts
  user_id       UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  role          TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('head', 'editor', 'viewer')),
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'pending', 'removed')),
  invited_email TEXT,
  invited_by    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  joined_at     TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- only enforce uniqueness when user_id is not null
  UNIQUE NULLS NOT DISTINCT (household_id, user_id)
);

-- Boxes: the core entity
CREATE TABLE IF NOT EXISTS public.boxes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id  UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  created_by    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  name          TEXT NOT NULL,
  description   TEXT,
  location      TEXT,
  photo_url     TEXT,
  qr_code       TEXT UNIQUE,
  tags          TEXT[] NOT NULL DEFAULT '{}',
  is_archived   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tags: reusable tags per household for autocomplete / filtering
CREATE TABLE IF NOT EXISTS public.tags (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id  UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  label         TEXT NOT NULL,
  created_by    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (household_id, label)
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_household_members_household_id  ON public.household_members(household_id);
CREATE INDEX IF NOT EXISTS idx_household_members_user_id       ON public.household_members(user_id);
CREATE INDEX IF NOT EXISTS idx_boxes_household_id              ON public.boxes(household_id);
CREATE INDEX IF NOT EXISTS idx_boxes_qr_code                   ON public.boxes(qr_code);
CREATE INDEX IF NOT EXISTS idx_boxes_created_by                ON public.boxes(created_by);
CREATE INDEX IF NOT EXISTS idx_tags_household_id               ON public.tags(household_id);

-- ============================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_households_updated_at
  BEFORE UPDATE ON public.households
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_household_members_updated_at
  BEFORE UPDATE ON public.household_members
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_boxes_updated_at
  BEFORE UPDATE ON public.boxes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.households         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.household_members  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boxes              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags               ENABLE ROW LEVEL SECURITY;

-- Helper function: is the calling user a member of a given household?
CREATE OR REPLACE FUNCTION public.is_household_member(hh_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.household_members
    WHERE household_id = hh_id
      AND user_id = auth.uid()
      AND status = 'active'
  );
$$;

-- Helper function: does the calling user have edit rights in a household?
CREATE OR REPLACE FUNCTION public.is_household_editor(hh_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.household_members
    WHERE household_id = hh_id
      AND user_id = auth.uid()
      AND status = 'active'
      AND role IN ('head', 'editor')
  );
$$;

-- Helper function: is the calling user the head of a household?
CREATE OR REPLACE FUNCTION public.is_household_head(hh_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.household_members
    WHERE household_id = hh_id
      AND user_id = auth.uid()
      AND status = 'active'
      AND role = 'head'
  );
$$;

-- ---- Profiles ----
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Allow viewing profiles of household members
CREATE POLICY "profiles_select_household_members"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.household_members hm1
      JOIN public.household_members hm2 ON hm1.household_id = hm2.household_id
      WHERE hm1.user_id = auth.uid()
        AND hm2.user_id = profiles.id
        AND hm1.status = 'active'
        AND hm2.status = 'active'
    )
  );

-- ---- Households ----
CREATE POLICY "households_select"
  ON public.households FOR SELECT
  USING (public.is_household_member(id));

CREATE POLICY "households_insert"
  ON public.households FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "households_update"
  ON public.households FOR UPDATE
  USING (public.is_household_head(id))
  WITH CHECK (public.is_household_head(id));

CREATE POLICY "households_delete"
  ON public.households FOR DELETE
  USING (public.is_household_head(id));

-- ---- Household Members ----
CREATE POLICY "hm_select"
  ON public.household_members FOR SELECT
  USING (public.is_household_member(household_id) OR user_id = auth.uid());

CREATE POLICY "hm_insert"
  ON public.household_members FOR INSERT
  WITH CHECK (public.is_household_head(household_id) OR user_id = auth.uid());

CREATE POLICY "hm_update"
  ON public.household_members FOR UPDATE
  USING (public.is_household_head(household_id) OR user_id = auth.uid());

CREATE POLICY "hm_delete"
  ON public.household_members FOR DELETE
  USING (public.is_household_head(household_id) OR user_id = auth.uid());

-- ---- Boxes ----
CREATE POLICY "boxes_select"
  ON public.boxes FOR SELECT
  USING (public.is_household_member(household_id));

CREATE POLICY "boxes_insert"
  ON public.boxes FOR INSERT
  WITH CHECK (public.is_household_editor(household_id) AND created_by = auth.uid());

CREATE POLICY "boxes_update"
  ON public.boxes FOR UPDATE
  USING (public.is_household_editor(household_id))
  WITH CHECK (public.is_household_editor(household_id));

CREATE POLICY "boxes_delete"
  ON public.boxes FOR DELETE
  USING (public.is_household_editor(household_id));

-- ---- Tags ----
CREATE POLICY "tags_select"
  ON public.tags FOR SELECT
  USING (public.is_household_member(household_id));

CREATE POLICY "tags_insert"
  ON public.tags FOR INSERT
  WITH CHECK (public.is_household_editor(household_id));

CREATE POLICY "tags_delete"
  ON public.tags FOR DELETE
  USING (public.is_household_editor(household_id));
