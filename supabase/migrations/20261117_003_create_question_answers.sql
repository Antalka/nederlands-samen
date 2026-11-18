CREATE TABLE IF NOT EXISTS public.question_answers (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    question_id TEXT NOT NULL
        REFERENCES public.questions(id)
        ON DELETE CASCADE,

    answer TEXT NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (question_id, answer)
);

CREATE INDEX IF NOT EXISTS idx_question_answers_question_id
ON public.question_answers(question_id);

ALTER TABLE public.question_answers
ENABLE ROW LEVEL SECURITY;
