CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, phone, gender, birthdate)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    COALESCE(NEW.phone, NEW.raw_user_meta_data ->> 'phone'),
    NEW.raw_user_meta_data ->> 'gender',
    CASE
      WHEN NEW.raw_user_meta_data ->> 'birthdate' IS NOT NULL
        AND NEW.raw_user_meta_data ->> 'birthdate' != ''
      THEN (NEW.raw_user_meta_data ->> 'birthdate')::date
      ELSE NULL
    END
  )
  ON CONFLICT (user_id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    phone = COALESCE(EXCLUDED.phone, profiles.phone),
    gender = COALESCE(EXCLUDED.gender, profiles.gender),
    birthdate = COALESCE(EXCLUDED.birthdate, profiles.birthdate);
  RETURN NEW;
END;
$function$;