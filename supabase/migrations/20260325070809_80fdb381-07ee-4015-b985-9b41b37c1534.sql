
-- Fix hash_warehouse_password to use extensions schema for pgcrypto
CREATE OR REPLACE FUNCTION public.hash_warehouse_password(_plain_password text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT crypt(_plain_password, gen_salt('bf'));
$$;

-- Also fix validate_warehouse_login search_path
CREATE OR REPLACE FUNCTION public.validate_warehouse_login(_username text, _password text DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  _user record;
BEGIN
  SELECT id, username, full_name, warehouse_id, password_hash, is_active
  INTO _user
  FROM warehouse_users
  WHERE username = _username;

  IF _user IS NULL THEN
    RETURN json_build_object('valid', false);
  END IF;

  IF NOT _user.is_active THEN
    RETURN json_build_object('valid', false);
  END IF;

  IF _password IS NOT NULL THEN
    IF _user.password_hash IS NULL OR crypt(_password, _user.password_hash) != _user.password_hash THEN
      RETURN json_build_object('valid', false);
    END IF;
  END IF;

  RETURN json_build_object(
    'valid', true,
    'id', _user.id,
    'username', _user.username,
    'full_name', _user.full_name,
    'warehouse_id', _user.warehouse_id
  );
END;
$$;

-- Re-hash existing plaintext passwords now that extensions path is available
-- We need a DO block with proper search path
DO $$
BEGIN
  SET search_path = public, extensions;
  
  UPDATE warehouse_users
  SET password_hash = crypt(password_hash, gen_salt('bf'))
  WHERE password_hash IS NOT NULL 
    AND password_hash NOT LIKE '$2a$%' 
    AND password_hash NOT LIKE '$2b$%';

  UPDATE prep_access_tokens
  SET password_hash = crypt(password_hash, gen_salt('bf'))
  WHERE password_hash IS NOT NULL 
    AND password_hash NOT LIKE '$2a$%' 
    AND password_hash NOT LIKE '$2b$%';
END;
$$;
