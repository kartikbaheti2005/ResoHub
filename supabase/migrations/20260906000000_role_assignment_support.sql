CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requested public.app_role;
BEGIN
  requested := COALESCE((NEW.raw_user_meta_data ->> 'role')::public.app_role, 'STUDENT');

  IF requested NOT IN ('MANAGER', 'TEACHER', 'STUDENT', 'CR') THEN
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
  VALUES (NEW.id, requested)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN invalid_text_representation THEN
    INSERT INTO public.profiles (id, name, email, department)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1)),
      COALESCE(NEW.email, ''),
      COALESCE(NEW.raw_user_meta_data ->> 'department', 'General')
    )
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'STUDENT')
    ON CONFLICT (user_id, role) DO NOTHING;

    RETURN NEW;
END;
$$;
