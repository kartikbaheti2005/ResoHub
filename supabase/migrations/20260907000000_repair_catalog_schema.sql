-- Safe repair for projects where the initial migration was partially applied.
-- This file is safe to run from Supabase SQL Editor more than once.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role' AND typnamespace = 'public'::regnamespace) THEN
    CREATE TYPE public.app_role AS ENUM ('MANAGER', 'TEACHER', 'STUDENT', 'CR');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'resource_status' AND typnamespace = 'public'::regnamespace) THEN
    CREATE TYPE public.resource_status AS ENUM ('AVAILABLE', 'UNAVAILABLE', 'MAINTENANCE');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'booking_status' AND typnamespace = 'public'::regnamespace) THEN
    CREATE TYPE public.booking_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'COMPLETED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type' AND typnamespace = 'public'::regnamespace) THEN
    CREATE TYPE public.notification_type AS ENUM ('APPROVAL', 'REJECTION', 'REQUEST_CREATED', 'MAINTENANCE', 'SYSTEM');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  icon TEXT NOT NULL DEFAULT 'Building2'
);

CREATE TABLE IF NOT EXISTS public.resources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category_id TEXT,
  category_name TEXT NOT NULL DEFAULT '',
  resource_type TEXT NOT NULL DEFAULT 'classroom',
  location TEXT NOT NULL DEFAULT '',
  capacity INTEGER NOT NULL DEFAULT 1 CHECK (capacity > 0),
  status public.resource_status NOT NULL DEFAULT 'AVAILABLE',
  description TEXT NOT NULL DEFAULT '',
  specifications JSONB NOT NULL DEFAULT '{}'::jsonb,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS resource_type TEXT;
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS category_id TEXT;
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS category_name TEXT NOT NULL DEFAULT '';
UPDATE public.resources SET resource_type = COALESCE(NULLIF(resource_type, ''), NULLIF(category_id, ''), 'classroom') WHERE resource_type IS NULL OR resource_type = '';
ALTER TABLE public.resources ALTER COLUMN resource_type SET DEFAULT 'classroom';
ALTER TABLE public.resources ALTER COLUMN resource_type SET NOT NULL;
ALTER TABLE public.resources DROP CONSTRAINT IF EXISTS resources_category_id_fkey;

CREATE TABLE IF NOT EXISTS public.timetable_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id TEXT NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  resource_name TEXT NOT NULL DEFAULT '',
  day_of_week TEXT NOT NULL CHECK (day_of_week IN ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday')),
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  class_section TEXT NOT NULL DEFAULT '',
  subject TEXT NOT NULL DEFAULT '',
  faculty TEXT NOT NULL DEFAULT '',
  academic_year TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS public.maintenance_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id TEXT NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  resource_name TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  start_time TEXT NOT NULL DEFAULT '08:00',
  end_time TEXT NOT NULL DEFAULT '18:00',
  reason TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_resources_type ON public.resources(resource_type);
CREATE INDEX IF NOT EXISTS idx_timetable_resource_day ON public.timetable_entries(resource_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_maintenance_resource ON public.maintenance_schedules(resource_id, start_date, end_date);

GRANT SELECT ON public.categories, public.resources, public.timetable_entries, public.maintenance_schedules TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.resources, public.timetable_entries, public.maintenance_schedules TO authenticated;
GRANT ALL ON public.categories, public.resources, public.timetable_entries, public.maintenance_schedules TO service_role;

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS categories_public_read ON public.categories;
CREATE POLICY categories_public_read ON public.categories FOR SELECT USING (true);
DROP POLICY IF EXISTS resources_public_read ON public.resources;
CREATE POLICY resources_public_read ON public.resources FOR SELECT USING (true);
DROP POLICY IF EXISTS timetable_public_read ON public.timetable_entries;
CREATE POLICY timetable_public_read ON public.timetable_entries FOR SELECT USING (true);
DROP POLICY IF EXISTS maintenance_public_read ON public.maintenance_schedules;
CREATE POLICY maintenance_public_read ON public.maintenance_schedules FOR SELECT USING (true);

DROP POLICY IF EXISTS resources_manager_write ON public.resources;
CREATE POLICY resources_manager_write ON public.resources FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'MANAGER')) WITH CHECK (public.has_role(auth.uid(), 'MANAGER'));
DROP POLICY IF EXISTS timetable_manager_write ON public.timetable_entries;
CREATE POLICY timetable_manager_write ON public.timetable_entries FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'MANAGER')) WITH CHECK (public.has_role(auth.uid(), 'MANAGER'));
DROP POLICY IF EXISTS maintenance_manager_write ON public.maintenance_schedules;
CREATE POLICY maintenance_manager_write ON public.maintenance_schedules FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'MANAGER')) WITH CHECK (public.has_role(auth.uid(), 'MANAGER'));
