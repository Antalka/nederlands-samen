CREATE TABLE IF NOT EXISTS public.questions (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    category TEXT NOT NULL,
    difficulty TEXT NOT NULL
        CHECK (difficulty IN ('A1', 'A2')),
    prompt TEXT NOT NULL,
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.questions
ENABLE ROW LEVEL SECURITY;
