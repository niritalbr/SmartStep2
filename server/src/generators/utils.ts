/**
 * Shared utilities for all question generators.
 */

export interface GeneratedQuestion {
  category: string;
  difficulty: number;
  questionText: string;
  options: { id: string; text: string }[];
  correctAnswer: string;
  explanation: string;
  tags: string;
  timeLimitSec: number;
  visualData?: any;
}

const HEBREW_LETTERS = ["א", "ב", "ג", "ד"];

export function makeOptions(
  texts: string[],
  correctIndex: number
): { options: { id: string; text: string }[]; correctAnswer: string } {
  const options = texts.map((text, i) => ({ id: HEBREW_LETTERS[i], text }));
  return { options, correctAnswer: HEBREW_LETTERS[correctIndex] };
}

/** Pick a random element from an array */
export function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Pick n unique random elements */
export function pickN<T>(arr: readonly T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

/** Random integer between min and max (inclusive) */
export function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Shuffle array in-place */
export function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Hebrew number formatting */
export function hebrewNum(n: number): string {
  return n.toLocaleString("he-IL");
}

/** Generate a unique external ID */
export function genExternalId(category: string): string {
  return `${category}_gen_${Date.now()}_${randInt(1000, 9999)}`;
}
