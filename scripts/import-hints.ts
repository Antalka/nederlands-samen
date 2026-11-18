import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const url = process.env.SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
if (!url || !secret) throw new Error('Missing SUPABASE_URL or SUPABASE_SECRET_KEY in .env.import');
const questions: Array<{id:string;hint:string;explanation:string}> = JSON.parse(
  readFileSync(resolve(process.cwd(), 'questions_1000_improved.json'), 'utf8')
);
if (questions.length !== 1000 || new Set(questions.map(q=>q.id)).size !== 1000 ||
    questions.some(q=>!q.id || !q.hint?.trim() || !q.explanation?.trim())) {
  throw new Error('Invalid question bank: expected 1000 unique IDs with hint/explanation');
}
const client = createClient(url, secret, {auth:{persistSession:false,autoRefreshToken:false}});
// Update only translation records. Do not touch questions, answers, progress or attempts.
for (let i=0;i<questions.length;i+=100) {
  const batch=questions.slice(i,i+100);
  const ids=batch.map(q=>q.id);
  const {data:existing,error:readError}=await client.from('questions').select('id').in('id',ids);
  if (readError || existing?.length!==batch.length) throw new Error(`Missing question IDs in batch ${i}: ${readError?.message ?? 'count mismatch'}`);
  const rows=batch.map(q=>({question_id:q.id,language:'ro',hint:q.hint,explanation:q.explanation}));
  const {error}=await client.from('question_translations').upsert(rows,{onConflict:'question_id,language'});
  if (error) throw new Error(`Import failed at ${i}: ${error.message}`);
  console.log(`Updated ${Math.min(i+100,questions.length)}/1000 explanations and hints`);
}
console.log('SUCCESS: 1000 Romanian hints and explanations updated.');
