/**
 * Shapes Generator (צורות)
 * Based on the real Israeli Gifted Students Test (מבחן מחוננים שלב ב') 2026.
 *
 * The real test "shapes" section is PURELY VISUAL/FIGURAL reasoning:
 *  - Matrix completion (3×3 grid, find the missing cell)
 *  - Visual sequences (find the next element)
 *  - Visual analogies (A:B = C:?)
 *
 * No number sequences belong here — those are a different section.
 * This module delegates to visualPatterns.ts for SVG-rendered questions,
 * and adds supplementary emoji-based pattern questions for variety.
 */

import {
  GeneratedQuestion,
  makeOptions,
  randInt,
  shuffle,
  pick,
} from "./utils.js";
import { generateVisualPatterns } from "./visualPatterns.js";

// ── Shape symbols for emoji-based patterns ──
const FILLED_SHAPES = ["●", "■", "▲", "◆", "★"] as const;
const EMPTY_SHAPES = ["○", "□", "△", "◇", "☆"] as const;
const ALL_SHAPES = [...FILLED_SHAPES, ...EMPTY_SHAPES] as const;

// ── Emoji-based visual pattern questions ──

/**
 * Shape sequence: repeating cycle of shapes, predict next
 * E.g.: ○ □ △ ○ □ △ ○ □ ?  → △
 */
function shapeRepeatCycle(difficulty: number): GeneratedQuestion {
  const cycleLen = difficulty <= 2 ? 2 : 3;
  const shapes = shuffle([...ALL_SHAPES]).slice(0, cycleLen);
  const repeats = difficulty <= 2 ? 3 : 4;
  const totalShown = cycleLen * repeats - 1;
  const fullSeq: string[] = [];
  for (let r = 0; r < repeats; r++) {
    for (const s of shapes) fullSeq.push(s);
  }
  const answer = fullSeq[totalShown];
  const shown = fullSeq.slice(0, totalShown);

  const questionText = `מהי הצורה הבאה בסדרה?\n\n${shown.join("  ")}  ?`;

  const distractor = pick(ALL_SHAPES.filter((s) => !shapes.includes(s)));
  const allOpts = shuffle([answer, ...shapes.filter((s) => s !== answer).slice(0, 2), distractor]);
  const correctIndex = allOpts.indexOf(answer);
  const { options, correctAnswer } = makeOptions(allOpts, correctIndex);

  return {
    category: "shapes",
    difficulty,
    questionText,
    options,
    correctAnswer,
    explanation: `הסדרה חוזרת כל ${cycleLen} צורות: ${shapes.join(" ")}. הצורה הבאה היא ${answer}.`,
    tags: "shape_sequence,סדרת_צורות",
    timeLimitSec: 60,
  };
}

/**
 * Filled/empty alternating pattern
 * E.g.: ● ○ ● ○ ● ?  → ○
 */
function filledEmptyPattern(difficulty: number): GeneratedQuestion {
  const shapeIdx = randInt(0, FILLED_SHAPES.length - 1);
  const filled = FILLED_SHAPES[shapeIdx];
  const empty = EMPTY_SHAPES[shapeIdx];
  const len = difficulty <= 2 ? 6 : 8;

  const patternType = randInt(1, 3);
  let seq: string[];
  let rule: string;

  if (patternType === 1) {
    seq = [];
    for (let i = 0; i < len; i++) seq.push(i % 2 === 0 ? filled : empty);
    rule = `צורות מתחלפות: ${filled} ${empty} ${filled} ${empty}...`;
  } else if (patternType === 2) {
    seq = [];
    for (let i = 0; i < len; i++) seq.push(Math.floor(i / 2) % 2 === 0 ? filled : empty);
    rule = `צורות מתחלפות בזוגות: ${filled}${filled} ${empty}${empty}...`;
  } else {
    seq = [];
    let count = 1;
    let useFilled = true;
    while (seq.length < len) {
      for (let j = 0; j < count && seq.length < len; j++) {
        seq.push(useFilled ? filled : empty);
      }
      count++;
      useFilled = !useFilled;
    }
    rule = `מספר הצורות גדל: 1, 2, 3, 4... ומתחלף בין ${filled} ל-${empty}`;
  }

  const answer = seq[len - 1];
  const shown = seq.slice(0, len - 1);

  const questionText = `מהי הצורה הבאה בסדרה?\n\n${shown.join("  ")}  ?`;

  const distractor1 = answer === filled ? empty : filled;
  const otherShape = pick(ALL_SHAPES.filter((s) => s !== filled && s !== empty));
  const allOpts = shuffle([answer, distractor1, otherShape, pick(ALL_SHAPES.filter((s) => s !== answer && s !== distractor1 && s !== otherShape))]);
  const correctIndex = allOpts.indexOf(answer);
  const { options, correctAnswer } = makeOptions(allOpts, correctIndex);

  return {
    category: "shapes",
    difficulty,
    questionText,
    options,
    correctAnswer,
    explanation: rule,
    tags: "fill_pattern,דפוס_מילוי",
    timeLimitSec: 60,
  };
}

/**
 * Shape grid pattern (3×3 where each row has the same 3 shapes)
 */
function shapeGridPattern(difficulty: number): GeneratedQuestion {
  const shapeSet = shuffle([...ALL_SHAPES]).slice(0, 3);
  const rows = [
    shuffle([...shapeSet]),
    shuffle([...shapeSet]),
    shuffle([...shapeSet]),
  ];

  const answer = rows[2][2];
  const lines = [
    `${rows[0][0]}  ${rows[0][1]}  ${rows[0][2]}`,
    `${rows[1][0]}  ${rows[1][1]}  ${rows[1][2]}`,
    `${rows[2][0]}  ${rows[2][1]}  ?`,
  ];

  const questionText = `בכל שורה מופיעות אותן 3 צורות בסדר שונה. מהי הצורה החסרה?\n\n${lines.join("\n")}`;

  const otherShapes = ALL_SHAPES.filter((s) => s !== rows[2][0] && s !== rows[2][1] && s !== answer);
  const allOpts = shuffle([answer, ...shuffle([...otherShapes]).slice(0, 3)]);
  const correctIndex = allOpts.indexOf(answer);
  const { options, correctAnswer } = makeOptions(allOpts, correctIndex);

  return {
    category: "shapes",
    difficulty,
    questionText,
    options,
    correctAnswer,
    explanation: `בכל שורה מופיעות הצורות ${shapeSet.join(" ")}. בשורה האחרונה חסרה ${answer}.`,
    tags: "grid_pattern,מטריצת_צורות",
    timeLimitSec: 90,
  };
}

/**
 * Counting shapes pattern — how many shapes in the next step
 */
function shapeCountingPattern(difficulty: number): GeneratedQuestion {
  const shape = pick(FILLED_SHAPES);
  const start = randInt(1, 3);
  const step = randInt(1, difficulty <= 2 ? 2 : 3);
  const steps = 4;
  const counts: number[] = [];
  for (let i = 0; i < steps; i++) counts.push(start + step * i);
  const answer = start + step * steps;

  const lines = counts.map((c, i) =>
    `שלב ${i + 1}: ${shape.repeat(c)}`
  );

  const questionText = `בכל שלב מופיעות צורות. כמה צורות יהיו בשלב ${steps + 1}?\n\n${lines.join("\n")}\nשלב ${steps + 1}: ?`;

  const distractors = [answer + 1, answer - 1, answer + step].filter(d => d !== answer && d > 0);
  while (distractors.length < 3) distractors.push(answer + randInt(2, 5));
  const allOpts = shuffle([answer, ...distractors.slice(0, 3)]);
  const correctIndex = allOpts.indexOf(answer);
  const { options, correctAnswer } = makeOptions(allOpts.map(String), correctIndex);

  return {
    category: "shapes",
    difficulty,
    questionText,
    options,
    correctAnswer,
    explanation: `בכל שלב מתווספות ${step} צורות. שלב ${steps + 1}: ${answer} צורות.`,
    tags: "counting,ספירת_צורות",
    timeLimitSec: 60,
  };
}

// ── Main export ──

const EMOJI_GENERATORS = [
  shapeRepeatCycle,
  filledEmptyPattern,
  shapeGridPattern,
  shapeCountingPattern,
];

export function generateShapesQuestion(difficulty: number): GeneratedQuestion {
  return pick(EMOJI_GENERATORS)(difficulty);
}

export function generateShapesBatch(count: number, difficulty?: number): GeneratedQuestion[] {
  // 80% SVG visual patterns (more accurate to real test), 20% emoji-based
  const visualCount = Math.max(1, Math.ceil(count * 0.8));
  const emojiCount = count - visualCount;

  const visual = generateVisualPatterns(visualCount, difficulty);
  const emoji: GeneratedQuestion[] = [];
  for (let i = 0; i < emojiCount; i++) {
    emoji.push(generateShapesQuestion(difficulty ?? randInt(1, 5)));
  }

  return shuffle([...visual, ...emoji]);
}
