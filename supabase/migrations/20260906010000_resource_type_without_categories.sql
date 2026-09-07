-- Resource types are built-in values such as auditorium, classroom, and lab.
ALTER TABLE public.resources
  DROP CONSTRAINT IF EXISTS resources_category_id_fkey;

ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS resource_type TEXT;

UPDATE public.resources
SET resource_type = COALESCE(NULLIF(category_id, ''), 'classroom')
WHERE resource_type IS NULL;

ALTER TABLE public.resources ALTER COLUMN resource_type SET DEFAULT 'classroom';
ALTER TABLE public.resources ALTER COLUMN resource_type SET NOT NULL;
ALTER TABLE public.resources DROP COLUMN IF EXISTS category_id;
ALTER TABLE public.resources DROP COLUMN IF EXISTS category_name;