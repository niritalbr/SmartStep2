/**
 * Shapes & Sequences Generator (צורות וסדרות)
 * Based on the real Israeli Gifted Students Test (מבחן מחוננים שלב ב').
 *
 * Question types:
 * - Number sequences (arithmetic, geometric, fibonacci, etc.)
 * - Visual shape sequences using Unicode characters
 * - Grid/matrix pattern completion
 * - Shape counting patterns
 */

import {
  GeneratedQuestion,
  makeOptions,
  randInt,
  shuffle,
  pick,
} from "./utils.js";
import { generateVisualPatterns } from "./visualPatterns.js";

// ── Shape symbols for visual patterns ──
const FILLED_SHAPES = ["●", "■", "▲", "◆", "★"] as const;
const EMPTY_SHAPES = ["○", "□", "△", "◇", "☆"] as const;
const ALL_SHAPES = [...FILLED_SHAPES, ...EMPTY_SHAPES] as const;

// ── Sequence generators ──

interface SequenceResult {
  visible: number[];
  answer: number;
  rule: string;
}

function arithmeticSeq(difficulty: number): SequenceResult {
  const step = randInt(2, difficulty <= 2 ? 5 : difficulty <= 3 ? 10 : 15);
  const start = randInt(1, 20);
  const len = 5;
  const seq: number[] = [];
  for (let i = 0; i < len; i++) seq.push(start + step * i);
  return { visible: seq.slice(0, -1), answer: seq[len - 1], rule: `סדרה עולה: כל פעם מוסיפים ${step}` };
}

function decreasingSeq(difficulty: number): SequenceResult {
  const step = randInt(2, difficulty <= 2 ? 5 : 10);
  const start = randInt(30, 80);
  const len = 5;
  const seq: number[] = [];
  for (let i = 0; i < len; i++) seq.push(start - step * i);
  if (seq[len - 1] <= 0) return arithmeticSeq(difficulty);
  return { visible: seq.slice(0, -1), answer: seq[len - 1], rule: `סדרה יורדת: כל פעם מחסירים ${step}` };
}

function geometricSeq(difficulty: number): SequenceResult {
  const ratio = randInt(2, 3);
  const start = randInt(1, 4);
  const len = difficulty <= 2 ? 4 : 5;
  const seq: number[] = [];
  let val = start;
  for (let i = 0; i < len; i++) { seq.push(val); val *= ratio; }
  return { visible: seq.slice(0, -1), answer: seq[len - 1], rule: `כל מספר מוכפל ב-${ratio}` };
}

function fibonacciLike(difficulty: number): SequenceResult {
  const a = randInt(1, 5), b = randInt(1, 5);
  const len = 6;
  const seq = [a, b];
  for (let i = 2; i < len; i++) seq.push(seq[i - 1] + seq[i - 2]);
  return { visible: seq.slice(0, -1), answer: seq[len - 1], rule: `כל מספר = סכום שני המספרים שלפניו` };
}

function changingDiff(difficulty: number): SequenceResult {
  const start = randInt(1, 10);
  const diffStart = randInt(1, 3);
  const len = 5;
  const seq = [start];
  let d = diffStart;
  for (let i = 1; i < len; i++) { seq.push(seq[i - 1] + d); d++; }
  return { visible: seq.slice(0, -1), answer: seq[len - 1], rule: `ההפרשים עולים: +${diffStart}, +${diffStart + 1}, +${diffStart + 2}...` };
}

function squareSeq(_difficulty: number): SequenceResult {
  const offset = randInt(1, 3);
  const len = 5;
  const seq: number[] = [];
  for (let i = 0; i < len; i++) seq.push((i + offset) * (i + offset));
  return { visible: seq.slice(0, -1), answer: seq[len - 1], rule: `מספרים ריבועיים: ${seq.slice(0, -1).map((_, i) => `${i + offset}²`).join(", ")}...` };
}

function powersOf2(_difficulty: number): SequenceResult {
  const len = 6;
  const seq: number[] = [];
  for (let i = 0; i < len; i++) seq.push(Math.pow(2, i));
  return { visible: seq.slice(0, -1), answer: seq[len - 1], rule: `חזקות של 2: כל מספר כפול 2` };
}

function alternatingSeq(_difficulty: number): SequenceResult {
  const step1 = randInt(2, 5), step2 = randInt(3, 6);
  const start1 = randInt(1, 8), start2 = randInt(10, 18);
  const len = 7;
  const seq: number[] = [];
  for (let i = 0; i < len; i++) {
    seq.push(i % 2 === 0 ? start1 + Math.floor(i / 2) * step1 : start2 + Math.floor(i / 2) * step2);
  }
  return { visible: seq.slice(0, -1), answer: seq[len - 1], rule: `שתי סדרות מתחלפות: במקומות אי-זוגיים +${step1}, במקומות זוגיים +${step2}` };
}

// ── Visual shape pattern questions (emoji-based) ──

/**
 * Shape sequence: repeating cycle of shapes, predict next
 * E.g.: ○ □ △ ○ □ △ ○ □ ?  → △
 */
function shapeRepeatCycle(difficulty: number): GeneratedQuestion {
  const cycleLen = difficulty <= 2 ? 2 : 3;
  const shapes = shuffle([...ALL_SHAPES]).slice(0, cycleLen);
  const repeats = difficulty <= 2 ? 3 : difficulty <= 3 ? 3 : 4;
  const totalShown = cycleLen * repeats - 1; // hide the last
  const fullSeq: string[] = [];
  for (let r = 0; r < repeats; r++) {
    for (const s of shapes) fullSeq.push(s);
  }
  const answer = fullSeq[totalShown];
  const shown = fullSeq.slice(0, totalShown);

  const questionText = `מהי הצורה הבאה בסדרה?\n\n${shown.join("  ")}  ?`;

  // Options are the distinct shapes plus one distractor
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
    // Simple alternation: ● ○ ● ○
    seq = [];
    for (let i = 0; i < len; i++) seq.push(i % 2 === 0 ? filled : empty);
    rule = `צורות מתחלפות: ${filled} ${empty} ${filled} ${empty}...`;
  } else if (patternType === 2) {
    // Double: ●● ○○ ●● ○○
    seq = [];
    for (let i = 0; i < len; i++) seq.push(Math.floor(i / 2) % 2 === 0 ? filled : empty);
    rule = `צורות מתחלפות בזוגות: ${filled}${filled} ${empty}${empty}...`;
  } else {
    // Growing: ● ○○ ●●● ○○○○
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
 * Shape grid pattern (2×3 or 3×3 with a rule)
 * Each row has same shapes but different arrangement
 */
function shapeGridPattern(difficulty: number): GeneratedQuestion {
  // 3×3 grid where each row has 3 different shapes
  const shapeSet = shuffle([...ALL_SHAPES]).slice(0, 3);
  const rows = [
    shuffle([...shapeSet]),
    shuffle([...shapeSet]),
    shuffle([...shapeSet]),
  ];

  // Hide the last cell
  const answer = rows[2][2];
  const lines = [
    `${rows[0][0]}  ${rows[0][1]}  ${rows[0][2]}`,
    `${rows[1][0]}  ${rows[1][1]}  ${rows[1][2]}`,
    `${rows[2][0]}  ${rows[2][1]}  ?`,
  ];

  const questionText = `בכל שורה מופיעות אותן 3 צורות בסדר שונה. מהי הצורה החסרה?\n\n${lines.join("\n")}`;

  // The answer must be the shape not yet appearing in the last row's visible cells
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
 * Counting shapes pattern - how many in the next step
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

/**
 * Grid number pattern - 3×3 with row/column sums
 */
function gridNumberPattern(difficulty: number): GeneratedQuestion {
  const targetSum = randInt(10, difficulty <= 2 ? 18 : 30);
  const rows: number[][] = [];

  for (let r = 0; r < 3; r++) {
    const a = randInt(1, targetSum - 4);
    const b = randInt(1, targetSum - a - 2);
    const c = targetSum - a - b;
    rows.push([a, b, c]);
  }

  const answer = rows[2][2];

  const lines = [
    `│ ${rows[0][0]}  │ ${rows[0][1]}  │ ${rows[0][2]}  │`,
    `│ ${rows[1][0]}  │ ${rows[1][1]}  │ ${rows[1][2]}  │`,
    `│ ${rows[2][0]}  │ ${rows[2][1]}  │  ?  │`,
  ];

  const questionText = `בטבלה, סכום כל שורה שווה ל-${targetSum}.\n\n${lines.join("\n")}\n\nמהו המספר החסר?`;

  const distractors = [answer + 1, answer - 1, answer + 2, answer - 2].filter(d => d !== answer && d > 0);
  while (distractors.length < 3) distractors.push(answer + randInt(3, 6));
  const allOpts = shuffle([answer, ...distractors.slice(0, 3)]);
  const correctIndex = allOpts.indexOf(answer);
  const { options, correctAnswer } = makeOptions(allOpts.map(String), correctIndex);

  return {
    category: "shapes",
    difficulty,
    questionText,
    options,
    correctAnswer,
    explanation: `${rows[2][0]} + ${rows[2][1]} + ? = ${targetSum}, לכן ? = ${answer}.`,
    tags: "grid_numbers,טבלת_מספרים",
    timeLimitSec: 90,
  };
}

// ── Main export ──

const SEQ_GENERATORS = [
  arithmeticSeq, decreasingSeq, geometricSeq, fibonacciLike,
  changingDiff, squareSeq, powersOf2, alternatingSeq,
];

function sequenceQuestion(difficulty: number): GeneratedQuestion {
  const gens = difficulty <= 2
    ? [arithmeticSeq, decreasingSeq, powersOf2, changingDiff]
    : difficulty <= 3
    ? [arithmeticSeq, decreasingSeq, geometricSeq, fibonacciLike, changingDiff, squareSeq]
    : SEQ_GENERATORS;

  const gen = pick(gens);
  const result = gen(difficulty);
  const questionText = `מהו המספר הבא בסדרה?\n\n${result.visible.join(" ,  ")} ,  ?`;

  const distractors = [result.answer + 1, result.answer - 1, result.answer + 2, result.answer - 2]
    .filter(d => d !== result.answer && d > 0);
  while (distractors.length < 3) distractors.push(result.answer + randInt(3, 8));
  const allOpts = shuffle([result.answer, ...distractors.slice(0, 3)]);
  const correctIndex = allOpts.indexOf(result.answer);
  const { options, correctAnswer } = makeOptions(allOpts.map(String), correctIndex);

  return {
    category: "shapes",
    difficulty,
    questionText,
    options,
    correctAnswer,
    explanation: result.rule,
    tags: "sequence,סדרה",
    timeLimitSec: difficulty <= 2 ? 60 : 90,
  };
}

const PATTERN_GENERATORS = [
  shapeRepeatCycle,
  filledEmptyPattern,
  shapeGridPattern,
  shapeCountingPattern,
  gridNumberPattern,
];

export function generateShapesQuestion(difficulty: number): GeneratedQuestion {
  // 50% sequences, 50% visual patterns
  if (Math.random() < 0.5) {
    return sequenceQuestion(difficulty);
  }
  return pick(PATTERN_GENERATORS)(difficulty);
}

export function generateShapesBatch(count: number, difficulty?: number): GeneratedQuestion[] {
  // 60% visual pattern questions, 40% text-based
  const visualCount = Math.max(1, Math.ceil(count * 0.6));
  const textCount = count - visualCount;

  const visual = generateVisualPatterns(visualCount, difficulty);
  const text: GeneratedQuestion[] = [];
  for (let i = 0; i < textCount; i++) {
    text.push(generateShapesQuestion(difficulty ?? randInt(1, 5)));
  }

  return shuffle([...visual, ...text]);
}
