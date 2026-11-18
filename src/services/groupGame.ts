import { supabase } from '../lib/supabase';
import type { PublicQuestion } from '../types';

export type GameState = {
  code: string;
  status: 'lobby' | 'playing' | 'finished';
  isHost: boolean;
  index: number;
  count: number;
  startedAt: string | null;
  question: PublicQuestion | null;
  players: { nickname: string; score: number; answered: boolean; isHost: boolean }[];
  answered: boolean;
  lastCorrect: boolean | null;
};

async function rpc<T>(name: string, params: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(name, params);
  if (error) throw new Error(error.message);
  return data as T;
}
export const createGame = (nickname: string, topic: string, count: number) =>
  rpc<string>('group_create', { p_nickname: nickname, p_topic: topic, p_count: count });
export const joinGame = (code: string, nickname: string) =>
  rpc<string>('group_join', { p_code: code, p_nickname: nickname });
export const getGameState = (code: string) => rpc<GameState>('group_state', { p_code: code });
export const startGame = (code: string) => rpc<void>('group_start', { p_code: code });
export const advanceGame = (code: string) => rpc<void>('group_advance', { p_code: code });
export const submitGameAnswer = (code: string, answer: string) =>
  rpc<{ correct: boolean; points: number }>('group_submit', { p_code: code, p_answer: answer });
