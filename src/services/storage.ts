import type { Progress } from '../types';
const KEY = 'nederlands-samen-v2';
export function load(): Progress {
  try {
    const x = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (x && Array.isArray(x.attempts) && typeof x.name === 'string') return x;
  } catch {}
  return { attempts: [], name: '' };
}
export function save(p: Progress) {
  localStorage.setItem(KEY, JSON.stringify(p));
}
