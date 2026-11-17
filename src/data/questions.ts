import type { Question } from '../types';
import questionData from './questions.json';

// Single source of truth. Replace this import with a database service later.
export const questions: Question[] = questionData as Question[];
