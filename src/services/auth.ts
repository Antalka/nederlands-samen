import { supabase } from '../lib/supabase';

export async function signInAnonymously(): Promise<string> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

  if (sessionError) {
    throw new Error(sessionError.message);
  }

  if (sessionData.session?.user) {
    return sessionData.session.user.id;
  }

  const { data, error } = await supabase.auth.signInAnonymously();

  if (error) {
    throw new Error(`Anonymous sign-in failed: ${error.message}`);
  }

  if (!data.user) {
    throw new Error('No user returned after sign-in.');
  }

  return data.user.id;
}
