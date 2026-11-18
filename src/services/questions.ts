import { supabase } from '../lib/supabase';
import type { PublicQuestion } from '../types';

export interface QuestionFilters {
  level?: 'A1' | 'A2';
  topic?: PublicQuestion['topic'];
  limit?: number;
  offset?: number;
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export async function getQuestions(filters: QuestionFilters = {}): Promise<PublicQuestion[]> {
  const { level, topic, limit = DEFAULT_LIMIT, offset = 0 } = filters;

  const pageSize = Math.min(MAX_LIMIT, Math.max(1, Math.trunc(limit)));

  const start = Math.max(0, Math.trunc(offset));

  let query = supabase
    .from('questions')
    .select('id, type, topic, level, prompt, options')
    .eq('is_active', true);

  if (level) {
    query = query.eq('level', level);
  }

  if (topic) {
    query = query.eq('topic', topic);
  }

  const { data, error } = await query
    .order('id', { ascending: true })
    .range(start, start + pageSize - 1);

  if (error) {
    throw new Error(`Failed to fetch questions: ${error.message}`);
  }

  return (data ?? []) as PublicQuestion[];
}

export async function getQuestionCount(filters: Pick<QuestionFilters, 'level' | 'topic'> = {}): Promise<number> {
  let query = supabase.from('questions').select('id', { count: 'exact', head: true }).eq('is_active', true);
  if (filters.level) query = query.eq('level', filters.level);
  if (filters.topic) query = query.eq('topic', filters.topic);
  const { count, error } = await query;

  if (error) {
    throw new Error(`Failed to count questions: ${error.message}`);
  }

  return count ?? 0;
}
