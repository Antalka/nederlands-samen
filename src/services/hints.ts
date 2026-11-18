import { supabase } from '../lib/supabase';

interface HintResponse { questionId: string; hint: string }

export async function getHint(questionId: string): Promise<string> {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session) throw new Error('Nu există o sesiune activă. Reîncarcă pagina.');
  const { data, error } = await supabase.functions.invoke<HintResponse>('get-hint', {
    body: { questionId },
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (error) throw new Error('Indiciul nu a putut fi încărcat. Încearcă din nou.');
  if (!data || data.questionId !== questionId || typeof data.hint !== 'string') {
    throw new Error('Răspuns invalid de la server.');
  }
  return data.hint;
}
