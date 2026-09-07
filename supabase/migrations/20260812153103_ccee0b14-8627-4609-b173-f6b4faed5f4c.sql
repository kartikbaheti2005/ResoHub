-- ROLES ---------------------------------------------------------------
CREATE TYPE public.app_role AS ENUM ('MANAGER', 'TEACHER', 'STUDENT', 'CR');
CREATE TYPE public.resource_status AS ENUM ('AVAILABLE', 'UNAVAILABLE', 'MAINTENANCE');
CREATE TYPE public.booking_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'COMPLETED');
CREATE TYPE public.notification_type AS ENUM ('APPROVAL', 'REJECTION', 'REQUEST_CREATED', 'MAINTENANCE', 'SYSTEM');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  department TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_roles_select_authenticated" ON public.user_roles FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  requested TEXT := COALESCE(NEW.raw_user_meta_data ->> 'role', 'STUDENT');
BEGIN
  IF requested NOT IN ('TEACHER', 'STUDENT', 'CR') THEN
    requested := 'STUDENT';
  END IF;

  INSERT INTO public.profiles (id, name, email, department)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data ->> 'department', 'General')
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, requested::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- CATALOG -------------------------------------------------------------
CREATE TABLE public.categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  icon TEXT NOT NULL DEFAULT 'Building2'
);
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories_public_read" ON public.categories FOR SELECT USING (true);
CREATE POLICY "categories_manager_write" ON public.categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'MANAGER')) WITH CHECK (public.has_role(auth.uid(), 'MANAGER'));

CREATE TABLE public.resources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category_id TEXT NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  category_name TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  capacity INTEGER NOT NULL DEFAULT 1 CHECK (capacity > 0),
  status public.resource_status NOT NULL DEFAULT 'AVAILABLE',
  description TEXT NOT NULL DEFAULT '',
  specifications JSONB NOT NULL DEFAULT '{}'::jsonb,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.resources TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.resources TO authenticated;
GRANT ALL ON public.resources TO service_role;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "resources_public_read" ON public.resources FOR SELECT USING (true);
CREATE POLICY "resources_manager_write" ON public.resources FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'MANAGER')) WITH CHECK (public.has_role(auth.uid(), 'MANAGER'));
CREATE INDEX idx_resources_category ON public.resources(category_id);

CREATE TABLE public.timetable_entries (
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
GRANT SELECT ON public.timetable_entries TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.timetable_entries TO authenticated;
GRANT ALL ON public.timetable_entries TO service_role;
ALTER TABLE public.timetable_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "timetable_public_read" ON public.timetable_entries FOR SELECT USING (true);
CREATE POLICY "timetable_manager_write" ON public.timetable_entries FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'MANAGER')) WITH CHECK (public.has_role(auth.uid(), 'MANAGER'));
CREATE INDEX idx_timetable_resource_day ON public.timetable_entries(resource_id, day_of_week);

CREATE TABLE public.maintenance_schedules (
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
GRANT SELECT ON public.maintenance_schedules TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.maintenance_schedules TO authenticated;
GRANT ALL ON public.maintenance_schedules TO service_role;
ALTER TABLE public.maintenance_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "maintenance_public_read" ON public.maintenance_schedules FOR SELECT USING (true);
CREATE POLICY "maintenance_manager_write" ON public.maintenance_schedules FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'MANAGER')) WITH CHECK (public.has_role(auth.uid(), 'MANAGER'));
CREATE INDEX idx_maintenance_resource ON public.maintenance_schedules(resource_id, start_date, end_date);

-- BOOKINGS ------------------------------------------------------------
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id TEXT NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  resource_name TEXT NOT NULL DEFAULT '',
  resource_location TEXT NOT NULL DEFAULT '',
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL DEFAULT '',
  user_role public.app_role NOT NULL DEFAULT 'STUDENT',
  user_email TEXT NOT NULL DEFAULT '',
  user_department TEXT NOT NULL DEFAULT '',
  date DATE NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  purpose TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  expected_count INTEGER NOT NULL DEFAULT 1,
  required_equipment TEXT[] NOT NULL DEFAULT '{}',
  status public.booking_status NOT NULL DEFAULT 'PENDING',
  rejection_reason TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT
);
GRANT SELECT, INSERT, UPDATE ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bookings_select_own_or_manager" ON public.bookings FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'MANAGER'));
CREATE POLICY "bookings_insert_own" ON public.bookings FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "bookings_update_own_or_manager" ON public.bookings FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'MANAGER'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'MANAGER'));
CREATE INDEX idx_bookings_resource_date ON public.bookings(resource_id, date, status);
CREATE INDEX idx_bookings_user ON public.bookings(user_id);

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  type public.notification_type NOT NULL DEFAULT 'SYSTEM',
  is_read BOOLEAN NOT NULL DEFAULT false,
  booking_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications_select_own" ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "notifications_insert" ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'MANAGER'));
CREATE POLICY "notifications_update_own" ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE INDEX idx_notifications_user ON public.notifications(user_id, is_read);

-- SEED ----------------------------------------------------------------
INSERT INTO public.categories (id, name, description, icon) VALUES
  ('cat_lab', 'Laboratories', 'Computer labs, electronics labs, and research facilities', 'Laptop'),
  ('cat_aud', 'Auditoriums & Halls', 'Large venues for conferences, symposiums, and college events', 'Users'),
  ('cat_cls', 'Smart Classrooms', 'Lecture halls equipped with projectors and audio systems', 'GraduationCap'),
  ('cat_eqp', 'Portable Equipment', 'Projectors, PA systems, cameras, and laptops for checkout', 'Projector'),
  ('cat_mtg', 'Conference Rooms', 'Meeting rooms for departmental discussions and faculty meets', 'Briefcase');

INSERT INTO public.resources (id, name, category_id, category_name, location, capacity, status, description, specifications, image_url) VALUES
  ('res_lab_3', 'Computer Lab 3 (Advanced AI & Web Dev)', 'cat_lab', 'Laboratories', 'Building A - 2nd Floor (Room A-204)', 60, 'AVAILABLE', 'High-performance workstation lab equipped with GPU machines and dual monitors for software development and AI labs.', '{"systemCount":60,"laptopCount":10,"hasProjector":true,"hasScreen":true,"hasAC":true,"hasInternet":true,"installedSoftware":["VSCode","Python 3.11","CUDA Toolkit","Docker","MySQL Workbench","MATLAB"],"otherNotes":"Dual monitors"}', 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&auto=format&fit=crop&q=60'),
  ('res_aud_main', 'Dr. APJ Abdul Kalam Main Auditorium', 'cat_aud', 'Auditoriums & Halls', 'Central Campus - Administrative Block', 500, 'AVAILABLE', 'Grand auditorium with state-of-the-art acoustic design, central AC, stage lighting, and professional sound system.', '{"hasProjector":true,"hasScreen":true,"hasAC":true,"hasInternet":true,"hasAudioSystem":true,"hasMicrophones":true,"otherNotes":"Podium mic, 4 cordless mics, Dolby 7.1 audio."}', 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=800&auto=format&fit=crop&q=60'),
  ('res_sem_1', 'Aryabhata Seminar Hall', 'cat_aud', 'Auditoriums & Halls', 'Building B - 1st Floor', 150, 'AVAILABLE', 'Tiered seating seminar hall ideal for guest lectures, workshops, and project presentations.', '{"hasProjector":true,"hasScreen":true,"hasAC":true,"hasInternet":true,"hasAudioSystem":true,"hasMicrophones":true,"hasSmartBoard":true,"otherNotes":"Tiered seating."}', 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=800&auto=format&fit=crop&q=60'),
  ('res_cls_201', 'Smart Classroom A-201', 'cat_cls', 'Smart Classrooms', 'Building A - 2nd Floor', 75, 'AVAILABLE', 'Interactive digital classroom with smart touchscreen display, lecture recording setup, and ergonomic seating.', '{"hasProjector":true,"hasScreen":true,"hasAC":true,"hasInternet":true,"hasSmartBoard":true,"otherNotes":"Lecture recording setup."}', 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800&auto=format&fit=crop&q=60'),
  ('res_lab_ece', 'Embedded Systems & Robotics Lab', 'cat_lab', 'Laboratories', 'Building C - Ground Floor', 45, 'MAINTENANCE', 'Specialized lab for IoT, microcontroller development, FPGA boards, and signal processing experiments.', '{"systemCount":30,"hasProjector":true,"hasAC":true,"hasInternet":true,"otherNotes":"Oscilloscopes, Soldering Stations, Kits on site."}', 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=60'),
  ('res_proj_portable', 'Mobile 4K Laser Projector Unit #2', 'cat_eqp', 'Portable Equipment', 'Equipment Store Room (Admin Office)', 1, 'AVAILABLE', 'Ultra-portable 4000 lumens laser projector with portable 120-inch tripod screen and wireless HDMI receiver.', '{"hasProjector":true,"hasScreen":true,"hasInternet":true,"otherNotes":"Includes HDMI cable, wireless dongle, carrying case."}', 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=800&auto=format&fit=crop&q=60');

INSERT INTO public.timetable_entries (resource_id, resource_name, day_of_week, start_time, end_time, class_section, subject, faculty, academic_year) VALUES
  ('res_lab_3', 'Computer Lab 3 (Advanced AI & Web Dev)', 'Monday', '09:00', '11:00', 'CSE-3A', 'Data Structures Lab (CS301L)', 'Prof. Sunita Sharma', '2026-2027 (Sem V)'),
  ('res_lab_3', 'Computer Lab 3 (Advanced AI & Web Dev)', 'Monday', '11:30', '13:30', 'CSE-3B', 'Database Management Systems Lab (CS304L)', 'Dr. Rajesh Gupta', '2026-2027 (Sem V)'),
  ('res_lab_3', 'Computer Lab 3 (Advanced AI & Web Dev)', 'Tuesday', '10:00', '12:00', 'IT-2A', 'Object Oriented Programming Lab (IT202L)', 'Prof. Meenakshi Sundaram', '2026-2027 (Sem III)'),
  ('res_lab_3', 'Computer Lab 3 (Advanced AI & Web Dev)', 'Wednesday', '14:00', '16:00', 'CSE-4A', 'Machine Learning & AI Lab (CS402L)', 'Dr. Sunita Sharma', '2026-2027 (Sem VII)'),
  ('res_lab_3', 'Computer Lab 3 (Advanced AI & Web Dev)', 'Thursday', '09:00', '11:00', 'CSE-3A', 'Web Technologies Lab (CS308L)', 'Prof. Vikas Nanda', '2026-2027 (Sem V)'),
  ('res_cls_201', 'Smart Classroom A-201', 'Monday', '09:00', '10:00', 'CSE-3A', 'Operating Systems (CS303)', 'Dr. Rajesh Gupta', '2026-2027 (Sem V)'),
  ('res_cls_201', 'Smart Classroom A-201', 'Wednesday', '10:00', '11:00', 'CSE-3B', 'Computer Networks (CS305)', 'Prof. Vikas Nanda', '2026-2027 (Sem V)');