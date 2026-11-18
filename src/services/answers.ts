import { supabase } from '../lib/supabase';

export interface AnswerResult {
  questionId: string;
  correct: boolean;
  score: number;
  explanation: string;
  hint: string;
  suggested: string;
}

export async function checkAnswer(questionId: string, answer: string): Promise<AnswerResult> {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session) throw new Error('Nu există o sesiune activă. Reîncarcă pagina.');
  const { data, error } = await supabase.functions.invoke<AnswerResult>('check-answer', {
    body: { questionId, answer },
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (error) {
    // A Supabase FunctionsHttpError body-ja tartalmazhatja a szerver hibaüzenetét.
    const context = 'context' in error ? error.context : undefined;
    let message = 'Verificarea răspunsului a eșuat. Încearcă din nou.';
    if (context instanceof Response) {
      const body = await context.clone().json().catch(() => null) as { error?: string } | null;
      if (context.status === 429) message = 'Prea multe răspunsuri. Așteaptă un minut și încearcă din nou.';
      else if (context.status === 401) message = 'Sesiunea a expirat. Reîncarcă pagina.';
      else if (body?.error === 'Question not found') message = 'Întrebarea nu mai este disponibilă.';
    }
    throw new Error(message);
  }
  if (!data || data.questionId !== questionId || typeof data.score !== 'number') {
    throw new Error('Răspuns invalid de la server.');
  }
  return data;
}
