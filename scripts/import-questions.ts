/** Run from the project root: node --env-file=.env.import --import tsx scripts/import-questions.ts */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

type Question = {
  id: string;
  type: 'choice' | 'input' | 'order';
  topic: 'negation' | 'modal' | 'verbs' | 'vocab' | 'situations' | 'order' | 'translation' | 'general';
  level: 'A1' | 'A2';
  prompt: string;
  options?: string[] | null;
  answers: string[];
  explanation: string;
  hint: string;
};

const url = process.env.SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
if (!url || !secret) throw new Error('Missing SUPABASE_URL or SUPABASE_SECRET_KEY in .env.import');
const client = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
const file = resolve(process.cwd(), 'questions_1000_final.json');
const questions = JSON.parse(readFileSync(file, 'utf8')) as Question[];
const ids = new Set<string>();
const types = new Set(['choice', 'input', 'order']);
const levels = new Set(['A1', 'A2']);
const topics = new Set(['negation', 'modal', 'verbs', 'vocab', 'situations', 'order', 'translation', 'general']);
if (!Array.isArray(questions) || questions.length !== 1000) throw new Error('Expected exactly 1000 questions');
for (const q of questions) {
  if (!q.id || ids.has(q.id)) throw new Error(`Missing/duplicate id: ${q.id}`);
  ids.add(q.id);
  if (!types.has(q.type) || !levels.has(q.level) || !topics.has(q.topic)) throw new Error(`Invalid type/level/topic: ${q.id}`);
  if (!q.prompt?.trim() || !q.explanation?.trim() || !q.hint?.trim() || !Array.isArray(q.answers) || !q.answers.length || q.answers.some(a => !a?.trim())) throw new Error(`Missing required content: ${q.id}`);
  if (q.type === 'choice' && (!Array.isArray(q.options) || !q.answers.every(a => q.options!.includes(a)))) throw new Error(`Invalid choice options: ${q.id}`);
}
console.log(`Validated ${questions.length} questions. Beginning import...`);
const batchSize = 100;
for (let i = 0; i < questions.length; i += batchSize) {
  const batch = questions.slice(i, i + batchSize);
  const rows = batch.map(q => ({
    id: q.id, type: q.type, topic: q.topic, level: q.level,
    prompt: q.prompt, options: q.options ?? null, config: {}, is_active: true,
  }));
  const { error: questionError } = await client.from('questions').upsert(rows, { onConflict: 'id' });
  if (questionError) throw new Error(`questions batch ${i}: ${questionError.message}`);

  const answers = batch.flatMap(q => [...new Set(q.answers)].map(answer => ({ question_id: q.id, answer })));
  const { error: answerError } = await client.from('question_answers').upsert(answers, { onConflict: 'question_id,answer', ignoreDuplicates: true });
  if (answerError) throw new Error(`question_answers batch ${i}: ${answerError.message}`);

  const translations = batch.map(q => ({ question_id: q.id, language: 'ro', explanation: q.explanation, hint: q.hint }));
  const { error: translationError } = await client.from('question_translations').upsert(translations, { onConflict: 'question_id,language' });
  if (translationError) throw new Error(`question_translations batch ${i}: ${translationError.message}`);
  console.log(`Imported ${Math.min(i + batchSize, questions.length)}/${questions.length}`);
}
// Verify every expected ID, not just the overall table count.
for (let i = 0; i < questions.length; i += batchSize) {
  const batchIds = questions.slice(i, i + batchSize).map(q => q.id);
  const { data, error } = await client.from('questions').select('id').in('id', batchIds);
  if (error || data?.length !== batchIds.length) throw new Error(`Verification failed at batch ${i}: ${error?.message ?? 'missing rows'}`);
}
console.log('SUCCESS: All 1000 question IDs verified in Supabase.');
console.log('Note: existing answer variants no longer present in JSON are not deleted by this safe upsert.');
