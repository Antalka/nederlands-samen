CREATE TABLE IF NOT EXISTS public.question_translations (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    question_id TEXT NOT NULL
        REFERENCES public.questions(id)
        ON DELETE CASCADE,

    language TEXT NOT NULL DEFAULT 'ro',

    explanation TEXT NOT NULL,

    hint TEXT NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (question_id, language)
);

CREATE INDEX IF NOT EXISTS idx_question_translations_question_id
ON public.question_translations(question_id);

ALTER TABLE public.question_translations
ENABLE ROW LEVEL SECURITY;
