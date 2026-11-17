import type { Question } from '../types';
export function normalize(s: string) {
  return s
    .trim()
    .toLocaleLowerCase('nl-NL')
    .replace(/[.!?]+$/g, '')
    .replace(/\s+/g, ' ');
}
function distance(a: string, b: string) {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const old = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonal = old;
    }
  }
  return prev[b.length];
}
export type Evaluation = {
  score: number;
  status: 'correct' | 'spelling' | 'partial' | 'incorrect';
  suggested: string;
};
export function evaluate(q: Question, answer: string): Evaluation {
  const value = normalize(answer);
  const answers = q.answers.map(normalize);
  if (answers.includes(value))
    return {
      score: 100,
      status: 'correct',
      suggested: q.answers[answers.indexOf(value)],
    };
  const best = q.answers
    .map((a) => ({ original: a, d: distance(value, normalize(a)) }))
    .sort((a, b) => a.d - b.d)[0];
  if (q.type === 'choice') return { score: 0, status: 'incorrect', suggested: best.original };
  const len = Math.max(value.length, normalize(best.original).length);
  const wordsA = value.split(' '),
    wordsB = normalize(best.original).split(' ');
  // Conservative spelling tolerance: only 1-2 edits, no short one-word guesses.
  if (best.d <= (len >= 18 ? 2 : 1) && (len >= 6 || best.d === 0))
    return { score: 80, status: 'spelling', suggested: best.original };
  const overlap =
    wordsA.filter((w) => wordsB.includes(w)).length / Math.max(wordsA.length, wordsB.length);
  if (wordsA.length > 1 && overlap >= 0.65)
    return { score: 50, status: 'partial', suggested: best.original };
  return { score: 0, status: 'incorrect', suggested: best.original };
}
