export type Topic =
  'negation' | 'modal' | 'verbs' | 'vocab' | 'situations' | 'order' | 'translation' | 'general';
export type QuestionType = 'choice' | 'input' | 'order';
export interface Question {
  id: string;
  type: QuestionType;
  topic: Topic;
  level: 'A1' | 'A2';
  prompt: string;
  options?: string[];
  answers: string[];
  explanation: string;
  hint: string;
}

/**
 * A Supabase adatbázisból érkező kérdés.
 *
 * Nem tartalmaz helyes válaszokat,
 * magyarázatokat vagy segítségeket.
 */
export interface PublicQuestion {
  id: string;
  type: QuestionType;
  topic: Topic;
  level: 'A1' | 'A2';
  prompt: string;
  options: string[] | null;
}

export type PracticeMode = 'mixed' | 'topic' | 'situations';
export interface Attempt {
  questionId: string;
  score: number;
  answer: string;
  at: string;
}
export interface Progress {
  attempts: Attempt[];
  name: string;
}
