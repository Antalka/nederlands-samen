ALTER TABLE public.questions
RENAME COLUMN category TO topic;

ALTER TABLE public.questions
RENAME COLUMN difficulty TO level;

ALTER TABLE public.questions
ADD COLUMN IF NOT EXISTS options JSONB;

ALTER TABLE public.questions
ADD CONSTRAINT questions_type_check
CHECK (type IN ('choice', 'input', 'order'));

ALTER TABLE public.questions
ADD CONSTRAINT questions_topic_check
CHECK (
  topic IN (
    'negation',
    'modal',
    'verbs',
    'vocab',
    'situations',
    'order',
    'translation',
    'general'
  )
);
