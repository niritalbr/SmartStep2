/**
 * Question Generator – barrel export
 * Unified API for generating questions across all 5 categories.
 */

import { GeneratedQuestion } from "./utils.js";
import { generateMathProblems } from "./mathProblems.js";
import { generateNumbersInShapesBatch } from "./numbersInShapes.js";
import { generateShapesBatch } from "./shapes.js";
import { generateWordRelationsBatch } from "./wordRelations.js";
import { generateSentenceCompletionBatch } from "./sentenceCompletion.js";
import { generateVocabularyBatch } from "./vocabulary.js";

export type { GeneratedQuestion } from "./utils.js";

export type Category =
  | "word_relations"
  | "sentence_completion"
  | "numbers_in_shapes"
  | "math_problems"
  | "shapes"
  | "vocabulary";

const ALL_CATEGORIES: Category[] = [
  "word_relations",
  "sentence_completion",
  "numbers_in_shapes",
  "math_problems",
  "shapes",
  "vocabulary",
];

/**
 * Generate questions for a specific category.
 * Includes within-batch deduplication to avoid repeated question texts.
 * @param category - One of the 5 categories
 * @param count    - How many questions to generate
 * @param difficulty - Optional difficulty 1-5; random if omitted
 */
export function generateQuestions(
  category: Category,
  count: number,
  difficulty?: number,
  subType?: string,
): GeneratedQuestion[] {
  const gen = (c: Category, n: number, d?: number, st?: string): GeneratedQuestion[] => {
    switch (c) {
      case "math_problems":
        return generateMathProblems(n, d);
      case "numbers_in_shapes":
        return generateNumbersInShapesBatch(n, d, st);
      case "shapes":
        return generateShapesBatch(n, d, st);
      case "word_relations":
        return generateWordRelationsBatch(n, d);
      case "sentence_completion":
        return generateSentenceCompletionBatch(n, d);
      case "vocabulary":
        return generateVocabularyBatch(n, d);
      default:
        throw new Error(`Unknown category: ${c}`);
    }
  };

  // Generate extra and deduplicate by questionText
  const overgenerate = Math.min(count * 3, 50);
  const raw = gen(category, overgenerate, difficulty, subType);
  const seen = new Set<string>();
  const unique: GeneratedQuestion[] = [];
  for (const q of raw) {
    const key = q.questionText.trim();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(q);
    }
    if (unique.length >= count) break;
  }
  return unique.slice(0, count);
}

/**
 * Generate a mixed batch of questions across all categories.
 * @param count      - Total number of questions
 * @param difficulty - Optional difficulty 1-5
 */
export function generateMixedQuestions(
  count: number,
  difficulty?: number
): GeneratedQuestion[] {
  const perCategory = Math.max(1, Math.floor(count / ALL_CATEGORIES.length));
  const remainder = count - perCategory * ALL_CATEGORIES.length;
  const results: GeneratedQuestion[] = [];

  for (const cat of ALL_CATEGORIES) {
    results.push(...generateQuestions(cat, perCategory, difficulty));
  }

  // Distribute remainder
  for (let i = 0; i < remainder; i++) {
    const cat = ALL_CATEGORIES[i % ALL_CATEGORIES.length];
    results.push(...generateQuestions(cat, 1, difficulty));
  }

  // Shuffle the mixed results
  for (let i = results.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [results[i], results[j]] = [results[j], results[i]];
  }

  return results;
}
