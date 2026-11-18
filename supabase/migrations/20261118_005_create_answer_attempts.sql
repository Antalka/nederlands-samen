CREATE TABLE IF NOT EXISTS public.answer_attempts (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL REFERENCES public.questions(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_answer_attempts_user_created
ON public.answer_attempts (user_id, created_at DESC);

ALTER TABLE public.answer_attempts ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.answer_attempts
FROM anon, authenticated;
