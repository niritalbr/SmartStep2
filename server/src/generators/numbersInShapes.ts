/**
 * Numbers in Shapes Generator (מספרים בצורות)
 * Based on the real Israeli Gifted Students Test (מבחן מחוננים שלב ב') 2026.
 *
 * In the real test, numbers are placed inside geometric shapes (circles,
 * triangles, diamonds, rectangles, etc.) and the child must discover the
 * mathematical relationship and find the missing number.
 *
 * Pattern types (12):
 *  1. Circle center = SUM of surrounding
 *  2. Circle center = PRODUCT of two
 *  3. Circle center = AVERAGE of surrounding
 *  4. Triangle vertex rule (+, ×, −)
 *  5. Butterfly (פרפר) two-circle operation
 *  6. Arrow function machine (×N, +N, x²)
 *  7. Three-shape analogy (same rule, find missing)
 *  8. Cross/plus opposite-pair sum
 *  9. Paired multiplier shapes
 * 10. Diamond — top/bottom from left+right
 * 11. Grid/table row sums
 * 12. Two-step function (e.g. ×2 then +1)
 */

import {
  GeneratedQuestion,
  makeOptions,
  randInt,
  shuffle,
  pick,
} from "./utils.js";

const n = (v: number | null) => (v === null ? "?" : String(v));

interface PatternResult {
  questionText: string;
  answer: number;
  explanation: string;
}

// ─── Pattern 1: Circle — center = SUM ───────────────

function circleSum(difficulty: number): PatternResult {
  const count = difficulty <= 2 ? 3 : 4;
  const max = difficulty <= 2 ? 12 : difficulty <= 3 ? 20 : 30;
  const nums: number[] = [];
  for (let i = 0; i < count; i++) nums.push(randInt(2, max));
  const center = nums.reduce((a, b) => a + b, 0);

  // Prefer hiding a surrounding number (more realistic)
  const hideCenter = Math.random() < 0.3;
  let answer: number;
  let hideIdx: number;

  if (hideCenter) {
    answer = center;
    hideIdx = -1;
  } else {
    hideIdx = randInt(0, count - 1);
    answer = nums[hideIdx];
  }

  const displayed = nums.map((v, i) => (i === hideIdx ? "?" : String(v)));
  const centerStr = hideCenter ? "?" : String(center);
  const surrounding = displayed.join(" , ");

  const questionText = `בעיגול כתובים המספרים ${surrounding} סביב המרכז.\nבמרכז העיגול: ${centerStr}\n\nהחוקיות: סכום המספרים סביב העיגול שווה למספר שבמרכז.\nמהו המספר החסר?`;

  const explanation = hideCenter
    ? `סכום המספרים: ${nums.join(" + ")} = ${center}.`
    : `סכום כל המספרים = ${center}. ${nums.filter((_, i) => i !== hideIdx).join(" + ")} = ${center - answer}, לכן החסר הוא ${center} − ${center - answer} = ${answer}.`;

  return { questionText, answer, explanation };
}

// ─── Pattern 2: Circle — center = PRODUCT ────────────

function circleProduct(difficulty: number): PatternResult {
  const a = randInt(2, difficulty <= 2 ? 9 : 12);
  const b = randInt(2, difficulty <= 2 ? 9 : 12);
  const product = a * b;

  const hideType = randInt(1, 3);
  const answer = hideType === 1 ? a : hideType === 2 ? b : product;
  const aStr = hideType === 1 ? "?" : String(a);
  const bStr = hideType === 2 ? "?" : String(b);
  const pStr = hideType === 3 ? "?" : String(product);

  const questionText = `בעיגול כתובים שני מספרים: ${aStr} ו-${bStr}\nבמרכז העיגול: ${pStr}\n\nהחוקיות: המספר במרכז שווה למכפלת שני המספרים.\nמהו המספר החסר?`;

  const explanation = `${a} × ${b} = ${product}. המספר החסר הוא ${answer}.`;

  return { questionText, answer, explanation };
}

// ─── Pattern 3: Circle — center = AVERAGE ─────────

function circleAverage(difficulty: number): PatternResult {
  const count = difficulty <= 2 ? 3 : 4;
  const avg = randInt(5, difficulty <= 2 ? 15 : 25);
  // Build numbers that average to `avg`
  const nums: number[] = [];
  let remaining = avg * count;
  for (let i = 0; i < count - 1; i++) {
    const lo = Math.max(1, remaining - (count - i - 1) * avg * 2);
    const hi = Math.min(avg * 2, remaining - (count - i - 1));
    const v = randInt(lo, hi);
    nums.push(v);
    remaining -= v;
  }
  nums.push(remaining);
  if (nums.some((v) => v <= 0)) return circleSum(difficulty);

  const hideCenter = Math.random() < 0.3;
  let answer: number;
  let hideIdx: number;

  if (hideCenter) {
    answer = avg;
    hideIdx = -1;
  } else {
    hideIdx = randInt(0, count - 1);
    answer = nums[hideIdx];
  }

  const displayed = nums.map((v, i) => (i === hideIdx ? "?" : String(v)));
  const centerStr = hideCenter ? "?" : String(avg);

  const questionText = `בעיגול כתובים ${count} מספרים סביב המרכז: ${displayed.join(" , ")}\nבמרכז: ${centerStr}\n\nהחוקיות: המספר במרכז שווה לממוצע של המספרים סביבו.\nמהו המספר החסר?`;

  const explanation = hideCenter
    ? `ממוצע: (${nums.join(" + ")}) ÷ ${count} = ${avg}.`
    : `ממוצע = ${avg}, סכום = ${avg * count}. ${nums.filter((_, i) => i !== hideIdx).join(" + ")} = ${avg * count - answer}, לכן החסר = ${answer}.`;

  return { questionText, answer, explanation };
}

// ─── Pattern 4: Triangle vertex rule ──────────────

function trianglePattern(difficulty: number): PatternResult {
  const type = randInt(1, 3);
  let a: number, b: number, c: number, rule: string;

  if (type === 1) {
    a = randInt(3, difficulty <= 2 ? 15 : 30);
    b = randInt(3, difficulty <= 2 ? 15 : 30);
    c = a + b;
    rule = "סכום שני המספרים למעלה שווה למספר למטה";
  } else if (type === 2) {
    a = randInt(2, difficulty <= 2 ? 8 : 12);
    b = randInt(2, difficulty <= 2 ? 8 : 12);
    c = a * b;
    rule = "מכפלת שני המספרים למעלה שווה למספר למטה";
  } else {
    a = randInt(10, difficulty <= 2 ? 30 : 50);
    b = randInt(2, a - 2);
    c = a - b;
    rule = "ההפרש בין המספר הגדול למספר הקטן למעלה שווה למספר למטה";
  }

  const nums = [a, b, c];
  const hideIdx = randInt(0, 2);
  const answer = nums[hideIdx];
  const labels = [n(hideIdx === 0 ? null : a), n(hideIdx === 1 ? null : b), n(hideIdx === 2 ? null : c)];

  const questionText = `במשולש כתובים שלושה מספרים:\n\n      ${labels[0]}\n     ╱  ╲\n   ${labels[1]}  ──  ${labels[2]}\n\nהחוקיות: ${rule}.\nמהו המספר החסר?`;

  const opStr = type === 1 ? `${a} + ${b} = ${c}` : type === 2 ? `${a} × ${b} = ${c}` : `${a} − ${b} = ${c}`;
  const explanation = `${opStr}. המספר החסר הוא ${answer}.`;

  return { questionText, answer, explanation };
}

// ─── Pattern 5: Butterfly (פרפר) ─────────────────

function butterflyPattern(difficulty: number): PatternResult {
  const op = randInt(1, 3);
  let left: number, right: number, bottom: number, rule: string;

  if (op === 1) {
    left = randInt(10, difficulty <= 2 ? 30 : 60);
    right = randInt(2, left - 2);
    bottom = left - right;
    rule = "המספר למטה שווה להפרש בין שני המספרים למעלה";
  } else if (op === 2) {
    left = randInt(5, difficulty <= 2 ? 20 : 40);
    right = randInt(5, difficulty <= 2 ? 20 : 40);
    bottom = left + right;
    rule = "המספר למטה שווה לסכום שני המספרים למעלה";
  } else {
    left = randInt(2, difficulty <= 2 ? 8 : 12);
    right = randInt(2, difficulty <= 2 ? 8 : 12);
    bottom = left * right;
    rule = "המספר למטה שווה למכפלת שני המספרים למעלה";
  }

  const nums = [left, right, bottom];
  const hideIdx = randInt(0, 2);
  const answer = nums[hideIdx];
  const labels = [n(hideIdx === 0 ? null : left), n(hideIdx === 1 ? null : right), n(hideIdx === 2 ? null : bottom)];

  const questionText = `בצורת פרפר כתובים מספרים:\n\n  (${labels[0]})     (${labels[1]})\n      ╲   ╱\n      (${labels[2]})\n\nהחוקיות: ${rule}.\nמהו המספר החסר?`;

  const opStr = op === 1 ? `${left} − ${right} = ${bottom}` : op === 2 ? `${left} + ${right} = ${bottom}` : `${left} × ${right} = ${bottom}`;
  const explanation = `${opStr}. המספר החסר הוא ${answer}.`;

  return { questionText, answer, explanation };
}

// ─── Pattern 6: Arrow function machine ────────────

function arrowPairs(difficulty: number): PatternResult {
  const opType = randInt(1, 4);
  let fn: (x: number) => number;
  let ruleText: string;

  if (opType === 1) {
    const factor = randInt(2, difficulty <= 2 ? 4 : 7);
    fn = (x) => x * factor;
    ruleText = `כל מספר מוכפל ב-${factor}`;
  } else if (opType === 2) {
    const adder = randInt(3, difficulty <= 2 ? 10 : 20);
    fn = (x) => x + adder;
    ruleText = `לכל מספר מוסיפים ${adder}`;
  } else if (opType === 3) {
    const sub = randInt(2, difficulty <= 2 ? 5 : 10);
    fn = (x) => x - sub;
    ruleText = `מכל מספר מחסירים ${sub}`;
  } else {
    fn = (x) => x * x;
    ruleText = "כל מספר מועלה בריבוע (מוכפל בעצמו)";
  }

  const pairCount = difficulty <= 2 ? 3 : 4;
  const inputs: number[] = [];
  const used = new Set<number>();
  while (inputs.length < pairCount) {
    const v = randInt(2, difficulty <= 2 ? 10 : 15);
    if (!used.has(v)) {
      used.add(v);
      inputs.push(v);
    }
  }
  const outputs = inputs.map(fn);
  if (outputs.some((o) => o <= 0)) return arrowPairs(difficulty);

  // Hide one output — usually last, sometimes vary
  const hideIdx = Math.random() < 0.7 ? pairCount - 1 : randInt(0, pairCount - 1);
  const answer = outputs[hideIdx];

  const lines = inputs.map((inp, i) =>
    `${inp} → ${i === hideIdx ? "?" : outputs[i]}`
  );

  const questionText = `בכל זוג חיצים יש חוקיות קבועה:\n\n${lines.join("\n")}\n\nמצאו את החוקיות. מהו המספר החסר?`;
  const explanation = `החוקיות: ${ruleText}. לכן ${inputs[hideIdx]} → ${answer}.`;

  return { questionText, answer, explanation };
}

// ─── Pattern 7: Three shapes — same rule ──────────

function threeShapesSameRule(difficulty: number): PatternResult {
  const shapeChars = ["○", "□", "△"];
  const op = randInt(1, 3);

  let fn: (a: number, b: number) => number;
  let ruleDesc: string;
  let opSign: string;

  if (op === 1) {
    fn = (a, b) => a + b;
    ruleDesc = "סכום שני המספרים שווה למספר השלישי";
    opSign = "+";
  } else if (op === 2) {
    fn = (a, b) => a * b;
    ruleDesc = "מכפלת שני המספרים שווה למספר השלישי";
    opSign = "×";
  } else {
    fn = (a, b) => Math.abs(a - b);
    ruleDesc = "ההפרש בין שני המספרים שווה למספר השלישי";
    opSign = "−";
  }

  const max = op === 2 ? (difficulty <= 2 ? 7 : 10) : (difficulty <= 2 ? 15 : 25);
  const examples: { a: number; b: number; c: number }[] = [];
  for (let i = 0; i < 3; i++) {
    const a = randInt(2, max);
    const b = randInt(2, max);
    examples.push({ a, b, c: fn(a, b) });
  }

  // Sometimes hide an input instead of always hiding the result
  const lastEx = examples[2];
  const hideWhat = Math.random() < 0.6 ? "c" : (Math.random() < 0.5 ? "a" : "b");
  const answer = hideWhat === "c" ? lastEx.c : hideWhat === "a" ? lastEx.a : lastEx.b;

  const lines = examples.map((ex, i) => {
    if (i < 2) {
      return `${shapeChars[i]}  ${ex.a} , ${ex.b}  →  ${ex.c}`;
    }
    const aStr = hideWhat === "a" ? "?" : String(ex.a);
    const bStr = hideWhat === "b" ? "?" : String(ex.b);
    const cStr = hideWhat === "c" ? "?" : String(ex.c);
    return `${shapeChars[i]}  ${aStr} , ${bStr}  →  ${cStr}`;
  });

  const questionText = `בכל צורה כתובים מספרים לפי אותה חוקיות:\n\n${lines.join("\n")}\n\nמצאו את החוקיות. מהו המספר החסר?`;
  const explanation = `החוקיות: ${ruleDesc}.\n${lastEx.a} ${opSign} ${lastEx.b} = ${lastEx.c}. המספר החסר הוא ${answer}.`;

  return { questionText, answer, explanation };
}

// ─── Pattern 8: Cross/plus — opposite pairs ──────

function crossPattern(difficulty: number): PatternResult {
  const target = randInt(12, difficulty <= 2 ? 25 : 45);
  const a = randInt(2, target - 2);
  const b = target - a;
  const c = randInt(2, target - 2);
  const d = target - c;

  const nums = [a, b, c, d];
  const hideIdx = randInt(0, 3);
  const answer = nums[hideIdx];
  const labels = nums.map((v, i) => (i === hideIdx ? "?" : String(v)));

  const questionText = `בצורת פלוס (+) כתובים ארבעה מספרים:\n\n         ${labels[0]}\n         │\n  ${labels[2]} ── + ── ${labels[3]}\n         │\n         ${labels[1]}\n\nהחוקיות: כל זוג מספרים מנוגדים (למעלה+למטה, שמאל+ימין) סוכם ל-${target}.\nמהו המספר החסר?`;

  const pairOfHidden = hideIdx <= 1 ? [a, b] : [c, d];
  const explanation = `${pairOfHidden[0]} + ${pairOfHidden[1]} = ${target}. המספר החסר הוא ${answer}.`;

  return { questionText, answer, explanation };
}

// ─── Pattern 9: Paired multiplier ────────────────

function pairedMultiplier(difficulty: number): PatternResult {
  const multiplier = randInt(2, difficulty <= 2 ? 5 : 8);
  const pairs = difficulty <= 2 ? 3 : 4;
  const inputs: number[] = [];
  const used = new Set<number>();
  while (inputs.length < pairs) {
    const v = randInt(2, difficulty <= 2 ? 10 : 15);
    if (!used.has(v)) {
      used.add(v);
      inputs.push(v);
    }
  }
  const outputs = inputs.map((x) => x * multiplier);
  const answer = outputs[pairs - 1];

  const lines = inputs.map((inp, i) =>
    `○ ${inp} → ${i === pairs - 1 ? "?" : outputs[i]}`
  );

  const questionText = `בכל עיגול יש זוג מספרים עם חוקיות קבועה:\n\n${lines.join("\n")}\n\nמהו המספר החסר?`;
  const explanation = `החוקיות: כל מספר מוכפל ב-${multiplier}.\n${inputs[pairs - 1]} × ${multiplier} = ${answer}.`;

  return { questionText, answer, explanation };
}

// ─── Pattern 10: Diamond — four operations ───────

function diamondPattern(difficulty: number): PatternResult {
  const opType = randInt(1, 3);
  let left: number, right: number, top: number, bottom: number;
  let rule: string;

  if (opType === 1) {
    left = randInt(2, difficulty <= 2 ? 8 : 12);
    right = randInt(2, difficulty <= 2 ? 8 : 12);
    top = left + right;
    bottom = left * right;
    rule = "למעלה = סכום, למטה = מכפלה";
  } else if (opType === 2) {
    left = randInt(2, difficulty <= 2 ? 8 : 10);
    right = randInt(2, difficulty <= 2 ? 8 : 10);
    top = left * right;
    bottom = left + right;
    rule = "למעלה = מכפלה, למטה = סכום";
  } else {
    left = randInt(5, difficulty <= 2 ? 15 : 25);
    right = randInt(2, left - 2);
    top = left + right;
    bottom = left - right;
    rule = "למעלה = סכום, למטה = הפרש";
  }

  const nums = [top, left, right, bottom];
  const hideIdx = randInt(0, 3);
  const answer = nums[hideIdx];
  const labels = nums.map((v, i) => (i === hideIdx ? "?" : String(v)));

  const questionText = `בצורת מעוין כתובים ארבעה מספרים:\n\n       ${labels[0]}\n      ╱  ╲\n   ${labels[1]}      ${labels[2]}\n      ╲  ╱\n       ${labels[3]}\n\nהחוקיות: ${rule} של המספרים בצדדים.\nמהו המספר החסר?`;

  const explanation = `שמאל=${left}, ימין=${right}.\n${rule}: ${top} ו-${bottom}.\nהמספר החסר הוא ${answer}.`;

  return { questionText, answer, explanation };
}

// ─── Pattern 11: Grid/table row sums ─────────────

function gridRowSum(difficulty: number): PatternResult {
  const targetSum = randInt(12, difficulty <= 2 ? 20 : 35);
  const rows: number[][] = [];

  for (let r = 0; r < 3; r++) {
    const a = randInt(1, targetSum - 4);
    const b = randInt(1, targetSum - a - 2);
    const c = targetSum - a - b;
    if (c <= 0) return gridRowSum(difficulty);
    rows.push([a, b, c]);
  }

  // Hide a cell — not always the last cell
  const hideRow = Math.random() < 0.6 ? 2 : randInt(0, 2);
  const hideCol = randInt(0, 2);
  const answer = rows[hideRow][hideCol];

  const lines = rows.map((row, r) =>
    `│ ${row.map((v, c) => (r === hideRow && c === hideCol ? " ? " : String(v).padStart(2, " ") + " ")).join("│ ")}│`
  );

  const questionText = `בטבלה, סכום כל שורה שווה ל-${targetSum}.\n\n${lines.join("\n")}\n\nמהו המספר החסר?`;

  const rowNums = rows[hideRow];
  const known = rowNums.filter((_, c) => c !== hideCol);
  const explanation = `${known.join(" + ")} + ? = ${targetSum}.\n${known.join(" + ")} = ${known.reduce((a, b) => a + b, 0)}.\nלכן ? = ${targetSum} − ${known.reduce((a, b) => a + b, 0)} = ${answer}.`;

  return { questionText, answer, explanation };
}

// ─── Pattern 12: Two-step function ───────────────

function twoStepFunction(difficulty: number): PatternResult {
  const step1Type = randInt(1, 2);

  const mul = randInt(2, difficulty <= 2 ? 4 : 6);
  const add = randInt(1, difficulty <= 2 ? 5 : 10);

  let fn: (x: number) => number;
  let ruleText: string;

  if (step1Type === 1) {
    fn = (x) => x * mul + add;
    ruleText = `כפול ${mul} ועוד ${add}`;
  } else {
    fn = (x) => (x + add) * mul;
    ruleText = `ועוד ${add}, ואז כפול ${mul}`;
  }

  const pairCount = difficulty <= 2 ? 3 : 4;
  const inputs: number[] = [];
  const used = new Set<number>();
  while (inputs.length < pairCount) {
    const v = randInt(1, difficulty <= 2 ? 8 : 12);
    if (!used.has(v)) {
      used.add(v);
      inputs.push(v);
    }
  }
  const outputs = inputs.map(fn);
  if (outputs.some((o) => o <= 0 || o > 200)) return arrowPairs(difficulty);

  const hideIdx = pairCount - 1;
  const answer = outputs[hideIdx];

  const lines = inputs.map((inp, i) =>
    `${inp}  →  ${i === hideIdx ? "?" : outputs[i]}`
  );

  const questionText = `בכל שורה, המספר בצד שמאל הופך למספר בצד ימין לפי אותה חוקיות:\n\n${lines.join("\n")}\n\nמצאו את החוקיות. מהו המספר החסר?`;
  const explanation = `החוקיות: ${ruleText}.\n${inputs[hideIdx]} → ${answer}.`;

  return { questionText, answer, explanation };
}

// ─── Smart distractor generation ─────────────────

function generateDistractors(correct: number, count: number): number[] {
  const result = new Set<number>();

  // Close plausible values (±1, ±2)
  for (const delta of [1, -1, 2, -2]) {
    const v = correct + delta;
    if (v > 0 && v !== correct) result.add(v);
  }
  // Common mistake: half / double
  if (correct % 2 === 0 && correct / 2 > 0) result.add(correct / 2);
  if (correct * 2 < 300) result.add(correct * 2);
  // Digit swap for 2-digit numbers
  if (correct >= 10 && correct < 100) {
    const tens = Math.floor(correct / 10);
    const ones = correct % 10;
    if (ones > 0) {
      const swapped = ones * 10 + tens;
      if (swapped !== correct) result.add(swapped);
    }
  }
  // Slightly further values
  for (const delta of [3, -3, 5, -5]) {
    const v = correct + delta;
    if (v > 0 && v !== correct) result.add(v);
  }

  result.delete(correct);
  const arr = [...result];
  shuffle(arr);

  while (arr.length < count) {
    const d = correct + randInt(-8, 8);
    if (d > 0 && d !== correct && !arr.includes(d)) arr.push(d);
  }

  return arr.slice(0, count);
}

// ─── Main export ─────────────────────────────────

const GENERATORS: ((d: number) => PatternResult)[] = [
  circleSum,
  circleProduct,
  circleAverage,
  trianglePattern,
  butterflyPattern,
  arrowPairs,
  threeShapesSameRule,
  crossPattern,
  pairedMultiplier,
  diamondPattern,
  gridRowSum,
  twoStepFunction,
];

const SUB_TYPE_MAP: Record<string, ((d: number) => PatternResult)[]> = {
  circles: [circleSum, circleProduct, circleAverage],
  triangles: [trianglePattern, butterflyPattern],
  arrows: [arrowPairs, twoStepFunction, pairedMultiplier],
  special: [threeShapesSameRule, crossPattern, diamondPattern, gridRowSum],
};

export function generateNumbersInShapes(difficulty: number, subType?: string): GeneratedQuestion {
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

export function generateNumbersInShapesBatch(count: number, difficulty?: number, subType?: string): GeneratedQuestion[] {
  const results: GeneratedQuestion[] = [];
  for (let i = 0; i < count; i++) {
    const diff = difficulty ?? randInt(1, 5);
    results.push(generateNumbersInShapes(diff, subType));
  }
  return results;
}
