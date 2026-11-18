-- A beérkező válaszokat felhasználónként, tranzakcióban korlátozzuk.
CREATE OR REPLACE FUNCTION public.register_answer_attempt(p_user_id uuid, p_question_id text)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_count integer;
BEGIN
  IF p_user_id IS NULL OR p_question_id IS NULL THEN
    RAISE EXCEPTION 'Invalid arguments';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text, 0));
  SELECT count(*) INTO v_count FROM public.answer_attempts
  WHERE user_id = p_user_id AND created_at > now() - interval '60 seconds';
  IF v_count >= 30 THEN RETURN false; END IF;
  INSERT INTO public.answer_attempts(user_id, question_id) VALUES (p_user_id, p_question_id);
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.register_answer_attempt(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.register_answer_attempt(uuid, text) TO service_role;
