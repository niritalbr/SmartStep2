/**
 * Numbers in Shapes Generator (מספרים בצורות)
 * Based on the real Israeli Gifted Students Test (מבחן מחוננים שלב ב').
 *
 * Question types from the actual test:
 * - Circle with center number = operation on surrounding numbers
 * - Triangle with numbers at vertices and a rule
 * - Butterfly (פרפר) shapes: two circles connected by operation
 * - Arrow pairs: input → output with consistent rule
 * - Paired shapes with consistent multiplier/adder
 * - Cross/plus shapes with opposite-sum rule
 */

import {
  GeneratedQuestion,
  makeOptions,
  randInt,
  shuffle,
  pick,
} from "./utils.js";

// Use plain numbers (not hebrewNum) for clarity in math context
const n = (v: number | null) => (v === null ? "?" : String(v));

// ── Pattern generators ──

interface PatternResult {
  questionText: string;
  answer: number;
  explanation: string;
}

/**
 * Circle pattern: center = sum/product of surrounding numbers
 * Like the real test: a circle with numbers around it, center = operation result
 */
function circleSum(difficulty: number): PatternResult {
  const count = difficulty <= 2 ? 3 : 4;
  const max = difficulty <= 2 ? 12 : 20;
  const nums: number[] = [];
  for (let i = 0; i < count; i++) nums.push(randInt(1, max));
  const center = nums.reduce((a, b) => a + b, 0);

  // Decide what to hide
  const hideCenter = Math.random() < 0.4;
  const answer = hideCenter ? center : nums[randInt(0, count - 1)];
  const hideIdx = hideCenter ? -1 : nums.indexOf(answer);

  const displayed = nums.map((v, i) => (i === hideIdx ? "?" : String(v)));
  const centerStr = hideCenter ? "?" : String(center);

  const surrounding = displayed.join(" , ");
  const questionText = `בעיגול כתובים המספרים ${surrounding} סביב המרכז.\nבמרכז העיגול: ${centerStr}\n\nהחוקיות: סכום המספרים סביב העיגול שווה למספר שבמרכז.\nמהו המספר החסר?`;

  const nums_str = nums.join(" + ");
  const explanation = `סכום המספרים: ${nums_str} = ${center}. המספר החסר הוא ${answer}.`;

  return { questionText, answer, explanation };
}

/**
 * Circle product: center = product of two surrounding numbers
 */
function circleProduct(difficulty: number): PatternResult {
  const a = randInt(2, difficulty <= 2 ? 9 : 12);
  const b = randInt(2, difficulty <= 2 ? 9 : 12);
  const product = a * b;

  const hideType = randInt(1, 3); // 1=hide a, 2=hide b, 3=hide product
  const answer = hideType === 1 ? a : hideType === 2 ? b : product;
  const aStr = hideType === 1 ? "?" : String(a);
  const bStr = hideType === 2 ? "?" : String(b);
  const pStr = hideType === 3 ? "?" : String(product);

  const questionText = `בעיגול כתובים שני מספרים: ${aStr} ו-${bStr}\nבמרכז העיגול: ${pStr}\n\nהחוקיות: המספר במרכז שווה למכפלת שני המספרים.\nמהו המספר החסר?`;

  const explanation = `${a} × ${b} = ${product}. המספר החסר הוא ${answer}.`;

  return { questionText, answer, explanation };
}

/**
 * Triangle pattern: three numbers at vertices with arithmetic relationship
 * Common in the real test
 */
function trianglePattern(difficulty: number): PatternResult {
  const type = randInt(1, 3);
  let a: number, b: number, c: number, rule: string;

  if (type === 1) {
    // a + b = c
    a = randInt(2, difficulty <= 2 ? 15 : 30);
    b = randInt(2, difficulty <= 2 ? 15 : 30);
    c = a + b;
    rule = "סכום שני המספרים למעלה שווה למספר למטה";
  } else if (type === 2) {
    // a × b = c
    a = randInt(2, difficulty <= 2 ? 8 : 12);
    b = randInt(2, difficulty <= 2 ? 8 : 12);
    c = a * b;
    rule = "מכפלת שני המספרים למעלה שווה למספר למטה";
  } else {
    // a - b = c
    a = randInt(10, difficulty <= 2 ? 30 : 50);
    b = randInt(1, a - 1);
    c = a - b;
    rule = "ההפרש בין שני המספרים למעלה שווה למספר למטה";
  }

  const nums = [a, b, c];
  const hideIdx = randInt(0, 2);
  const answer = nums[hideIdx];

  const labels = [n(hideIdx === 0 ? null : a), n(hideIdx === 1 ? null : b), n(hideIdx === 2 ? null : c)];

  const questionText = `במשולש כתובים שלושה מספרים:\n\n      ${labels[0]}\n     ╱  ╲\n   ${labels[1]}  ──  ${labels[2]}\n\nהחוקיות: ${rule}.\nמהו המספר החסר?`;

  const opStr = type === 1 ? `${a} + ${b} = ${c}` : type === 2 ? `${a} × ${b} = ${c}` : `${a} - ${b} = ${c}`;
  const explanation = `${opStr}. המספר החסר הוא ${answer}.`;

  return { questionText, answer, explanation };
}

/**
 * Butterfly pattern (פרפר) - unique to the Israeli gifted test
 * Two circles connected, with operation between them
 * Example: left circle has 24, right has 12, bottom has 12 (24 - 12 = 12)
 */
function butterflyPattern(difficulty: number): PatternResult {
  const op = randInt(1, 2);
  let left: number, right: number, bottom: number, rule: string;

  if (op === 1) {
    // subtraction: left - right = bottom
    left = randInt(10, difficulty <= 2 ? 30 : 60);
    right = randInt(1, left - 1);
    bottom = left - right;
    rule = "המספר למטה שווה להפרש בין שני המספרים למעלה";
  } else {
    // addition: left + right = bottom
    left = randInt(5, difficulty <= 2 ? 20 : 40);
    right = randInt(5, difficulty <= 2 ? 20 : 40);
    bottom = left + right;
    rule = "המספר למטה שווה לסכום שני המספרים למעלה";
  }

  const nums = [left, right, bottom];
  const hideIdx = randInt(0, 2);
  const answer = nums[hideIdx];

  const labels = [n(hideIdx === 0 ? null : left), n(hideIdx === 1 ? null : right), n(hideIdx === 2 ? null : bottom)];

  const questionText = `בצורת פרפר כתובים מספרים:\n\n  (${labels[0]})     (${labels[1]})\n      ╲   ╱\n      (${labels[2]})\n\nהחוקיות: ${rule}.\nמהו המספר החסר?`;

  const opStr = op === 1 ? `${left} - ${right} = ${bottom}` : `${left} + ${right} = ${bottom}`;
  const explanation = `${opStr}. המספר החסר הוא ${answer}.`;

  return { questionText, answer, explanation };
}

/**
 * Arrow pairs: consistent function (×N, +N, etc)
 * input → output, find the missing value
 */
function arrowPairs(difficulty: number): PatternResult {
  const opType = randInt(1, 4);
  let factor: number;
  let fn: (x: number) => number;
  let ruleText: string;

  if (opType === 1) {
    factor = randInt(2, difficulty <= 2 ? 4 : 6);
    fn = (x) => x * factor;
    ruleText = `כל מספר מוכפל ב-${factor}`;
  } else if (opType === 2) {
    factor = randInt(3, difficulty <= 2 ? 10 : 20);
    fn = (x) => x + factor;
    ruleText = `לכל מספר מוסיפים ${factor}`;
  } else if (opType === 3) {
    factor = randInt(2, difficulty <= 2 ? 5 : 10);
    fn = (x) => x - factor;
    ruleText = `מכל מספר מחסירים ${factor}`;
  } else {
    factor = randInt(2, 3);
    fn = (x) => x * x;
    ruleText = "כל מספר מוכפל בעצמו";
  }

  const pairCount = difficulty <= 2 ? 3 : 4;
  const inputs: number[] = [];
  for (let i = 0; i < pairCount; i++) {
    inputs.push(randInt(2, difficulty <= 2 ? 10 : 15));
  }
  const outputs = inputs.map(fn);

  // Hide one output (prefer the last pair)
  const hideIdx = pairCount - 1;
  const answer = outputs[hideIdx];

  const lines = inputs.map((inp, i) =>
    `${inp} → ${i === hideIdx ? "?" : outputs[i]}`
  );

  const questionText = `בכל זוג חיצים יש חוקיות:\n\n${lines.join("\n")}\n\nמהו המספר החסר?`;

  const explanation = `החוקיות: ${ruleText}. לכן ${inputs[hideIdx]} → ${answer}.`;

  return { questionText, answer, explanation };
}

/**
 * Three example shapes with same rule, find missing in the last one
 * E.g.: ○[3,5]=8  ○[7,2]=9  ○[4,6]=?  → 10
 */
function threeShapesSameRule(difficulty: number): PatternResult {
  const shape = pick(["עיגול", "ריבוע", "משולש"]);
  const shapeChar = shape === "עיגול" ? "○" : shape === "ריבוע" ? "□" : "△";
  const op = randInt(1, 3);

  let fn: (a: number, b: number) => number;
  let ruleText: string;

  if (op === 1) {
    fn = (a, b) => a + b;
    ruleText = "סכום שני המספרים שווה למספר השלישי";
  } else if (op === 2) {
    fn = (a, b) => a * b;
    ruleText = "מכפלת שני המספרים שווה למספר השלישי";
  } else {
    fn = (a, b) => Math.abs(a - b);
    ruleText = "ההפרש בין שני המספרים שווה למספר השלישי";
  }

  const max = op === 2 ? (difficulty <= 2 ? 6 : 9) : (difficulty <= 2 ? 15 : 25);
  const examples: { a: number; b: number; c: number }[] = [];
  for (let i = 0; i < 3; i++) {
    const a = randInt(2, max);
    const b = randInt(2, max);
    examples.push({ a, b, c: fn(a, b) });
  }

  const answer = examples[2].c;

  const lines = examples.map((ex, i) =>
    `${shapeChar}  ${ex.a} , ${ex.b}  →  ${i === 2 ? "?" : ex.c}`
  );

  const questionText = `בכל ${shape} כתובים שלושה מספרים לפי אותה חוקיות:\n\n${lines.join("\n")}\n\nמהו המספר החסר?`;

  const sig = op === 1 ? "+" : op === 2 ? "×" : "|-|";
  const explanation = `החוקיות: ${ruleText}.\n${examples[2].a} ${sig} ${examples[2].b} = ${answer}.`;

  return { questionText, answer, explanation };
}

/**
 * Cross/plus pattern: 4 numbers where opposite pairs sum to the same value
 */
function crossPattern(difficulty: number): PatternResult {
  const target = randInt(10, difficulty <= 2 ? 20 : 40);
  const a = randInt(1, target - 1);
  const b = target - a;
  const c = randInt(1, target - 1);
  const d = target - c;

  const nums = [a, b, c, d];
  const hideIdx = randInt(0, 3);
  const answer = nums[hideIdx];

  const labels = nums.map((v, i) => (i === hideIdx ? "?" : String(v)));

  const questionText = `בצורת פלוס (+) כתובים ארבעה מספרים:\n\n         ${labels[0]}\n         |\n  ${labels[2]} ── + ── ${labels[3]}\n         |\n         ${labels[1]}\n\nהחוקיות: כל זוג מספרים מנוגדים (למעלה+למטה, שמאל+ימין) סוכם ל-${target}.\nמהו המספר החסר?`;

  const explanation = `${a} + ${b} = ${target}, ${c} + ${d} = ${target}. המספר החסר הוא ${answer}.`;

  return { questionText, answer, explanation };
}

/**
 * Paired shapes: each shape has two numbers with same multiplier
 * E.g.: (3→9) (5→15) (7→?)  rule: ×3
 */
function pairedMultiplier(difficulty: number): PatternResult {
  const multiplier = randInt(2, difficulty <= 2 ? 5 : 8);
  const count = 3;
  const inputs: number[] = [];
  for (let i = 0; i < count; i++) {
    inputs.push(randInt(2, difficulty <= 2 ? 10 : 15));
  }
  const outputs = inputs.map((x) => x * multiplier);
  const answer = outputs[count - 1];

  const lines = inputs.map((inp, i) =>
    `○ ${inp} → ${i === count - 1 ? "?" : outputs[i]}`
  );

  const questionText = `בכל עיגול יש זוג מספרים עם אותה חוקיות:\n\n${lines.join("\n")}\n\nמהו המספר החסר?`;

  const explanation = `החוקיות: כל מספר מוכפל ב-${multiplier}.\n${inputs[count - 1]} × ${multiplier} = ${answer}.`;

  return { questionText, answer, explanation };
}

// ── Distractor generation ──

function generateDistractors(correct: number, count: number): number[] {
  const result = new Set<number>();
  // Close plausible values
  for (const delta of [1, -1, 2, -2, 3, -3, 5, -5]) {
    const v = correct + delta;
    if (v > 0 && v !== correct && result.size < count) result.add(v);
  }
  // Fallback: slightly further away
  while (result.size < count) {
    const d = randInt(Math.max(1, correct - 8), correct + 8);
    if (d !== correct && d > 0) result.add(d);
  }
  return [...result].slice(0, count);
}

// ── Main export ──

const GENERATORS = [
  circleSum,
  circleProduct,
  trianglePattern,
  butterflyPattern,
  arrowPairs,
  threeShapesSameRule,
  crossPattern,
  pairedMultiplier,
];

export function generateNumbersInShapes(difficulty: number): GeneratedQuestion {
  const gen = pick(GENERATORS);
  const result = gen(difficulty);

  const distractors = generateDistractors(result.answer, 3);
  const allOptions = shuffle([result.answer, ...distractors]);
  const correctIndex = allOptions.indexOf(result.answer);

  const { options, correctAnswer } = makeOptions(
    allOptions.map(String),
    correctIndex
  );

  return {
    category: "numbers_in_shapes",
    difficulty,
    questionText: result.questionText,
    options,
    correctAnswer,
    explanation: result.explanation,
    tags: "numbers_in_shapes,מספרים_בצורות",
    timeLimitSec: difficulty <= 2 ? 60 : 90,
  };
}

export function generateNumbersInShapesBatch(count: number, difficulty?: number): GeneratedQuestion[] {
  const results: GeneratedQuestion[] = [];
  for (let i = 0; i < count; i++) {
    const diff = difficulty ?? randInt(1, 5);
    results.push(generateNumbersInShapes(diff));
  }
  return results;
}
