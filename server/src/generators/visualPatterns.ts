/**
 * Visual Pattern Generators for the shapes category.
 * Generates matrices, visual sequences, and analogies with structured data
 * that the client renders as SVG.
 *
 * Based on visual question types in the Israeli Gifted Students Test (שלב ב'):
 * - מטריצות (Matrices): 3×3 grids with shape rules across rows/columns
 * - רצפים ציוריים (Visual Sequences): shape transformation sequences
 * - אנלוגיות ציוריות (Visual Analogies): A:B = C:? with shape transformations
 */

import {
  type GeneratedQuestion,
  pick,
  pickN,
  shuffle,
  randInt,
} from "./utils.js";

// ─── Types ───────────────────────────────────────────

export type ShapeType =
  | "circle"
  | "square"
  | "triangle"
  | "diamond"
  | "star"
  | "hexagon";

export type FillType = "solid" | "empty";

export interface VisualShape {
  type: ShapeType;
  x: number;
  y: number;
  size: number;
  fill: FillType;
  rotation: number;
}

export interface VisualCell {
  shapes: VisualShape[];
}

export interface VisualData {
  type: "matrix" | "sequence" | "analogy";
  cells: (VisualCell | null)[];
  optionVisuals: VisualCell[];
}

// ─── Constants ───────────────────────────────────────

const ALL_SHAPES: ShapeType[] = [
  "circle",
  "square",
  "triangle",
  "diamond",
  "star",
  "hexagon",
];
const FILLS: FillType[] = ["solid", "empty"];
const SIZES = [25, 40, 60];

// ─── Cell constructors ───────────────────────────────

/** Single centered shape */
function cell1(
  type: ShapeType,
  fill: FillType = "solid",
  size = 50,
  rotation = 0,
): VisualCell {
  return { shapes: [{ type, x: 50, y: 50, size, fill, rotation }] };
}

/** Positions for N shapes in a cell (0-100 coordinate space) */
function getPositions(count: number): [number, number][] {
  const table: [number, number][][] = [
    [[50, 50]],
    [[32, 50], [68, 50]],
    [[50, 28], [30, 68], [70, 68]],
    [[30, 30], [70, 30], [30, 70], [70, 70]],
    [[50, 20], [22, 50], [78, 50], [30, 78], [70, 78]],
  ];
  return table[Math.min(count, 5) - 1] || [[50, 50]];
}

/** Multiple shapes of the same type in a cell */
function cellN(
  type: ShapeType,
  count: number,
  fill: FillType = "solid",
): VisualCell {
  const positions = getPositions(count);
  const sz = count <= 2 ? 28 : count <= 4 ? 22 : 18;
  return {
    shapes: positions.map(([x, y]) => ({
      type,
      x,
      y,
      size: sz,
      fill,
      rotation: 0,
    })),
  };
}

// ─── Distractor generation ───────────────────────────

function makeDistractors(correct: VisualCell, n = 3): VisualCell[] {
  const base = correct.shapes[0];
  if (!base) return Array.from({ length: n }, () => cell1("circle"));

  const pool: VisualCell[] = [];

  // Different shape, same properties
  for (const s of ALL_SHAPES) {
    if (s !== base.type) {
      if (correct.shapes.length === 1) {
        pool.push(cell1(s, base.fill, base.size, base.rotation));
      } else {
        pool.push(cellN(s, correct.shapes.length, base.fill));
      }
    }
  }

  // Different fill
  const altFill: FillType = base.fill === "solid" ? "empty" : "solid";
  if (correct.shapes.length === 1) {
    pool.push(cell1(base.type, altFill, base.size, base.rotation));
  } else {
    pool.push(cellN(base.type, correct.shapes.length, altFill));
  }

  // Different rotation (meaningful for non-symmetric shapes)
  if (base.type !== "circle" && base.type !== "hexagon") {
    for (const r of [90, 180, 270]) {
      if (r !== base.rotation) {
        pool.push(cell1(base.type, base.fill, base.size, r));
      }
    }
  }

  // Different size
  for (const sz of SIZES) {
    if (Math.abs(sz - base.size) > 8) {
      pool.push(cell1(base.type, base.fill, sz, base.rotation));
    }
  }

  // Different count
  if (correct.shapes.length > 1) {
    for (const delta of [-1, 1]) {
      const nc = correct.shapes.length + delta;
      if (nc >= 1 && nc <= 5) {
        pool.push(cellN(base.type, nc, base.fill));
      }
    }
  }

  // Remove any identical to correct, then deduplicate
  const correctKey = JSON.stringify(correct);
  const unique: VisualCell[] = [];
  const seen = new Set<string>();
  seen.add(correctKey);

  for (const d of shuffle(pool)) {
    const key = JSON.stringify(d);
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(d);
    }
  }

  // Fill remaining slots if needed
  while (unique.length < n) {
    unique.push(
      cell1(
        pick(ALL_SHAPES.filter((s) => s !== base.type)),
        pick(FILLS),
        pick(SIZES),
      ),
    );
  }

  return unique.slice(0, n);
}

// ─── Matrix Generators (3×3 grid, bottom-right missing) ─────

type GenResult = { cells: (VisualCell | null)[]; answer: VisualCell };

/** Latin square of shapes: each row/col has each shape once */
function matrixShapeCycle(): GenResult {
  const s = pickN(ALL_SHAPES, 3);
  const order = [
    [0, 1, 2],
    [1, 2, 0],
    [2, 0, 1],
  ];
  const cells: (VisualCell | null)[] = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      cells.push(r === 2 && c === 2 ? null : cell1(s[order[r][c]]));
    }
  }
  return { cells, answer: cell1(s[order[2][2]]) };
}

/** Each row = same shape, columns = different fills */
function matrixFill(): GenResult {
  const s = pickN(ALL_SHAPES, 3);
  const fills: FillType[] = ["solid", "empty", "solid"];
  const cells: (VisualCell | null)[] = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      cells.push(r === 2 && c === 2 ? null : cell1(s[r], fills[c], 45));
    }
  }
  return { cells, answer: cell1(s[2], fills[2], 45) };
}

/** Each row = same shape, columns = increasing sizes */
function matrixSize(): GenResult {
  const s = pickN(ALL_SHAPES, 3);
  const cells: (VisualCell | null)[] = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      cells.push(r === 2 && c === 2 ? null : cell1(s[r], "solid", SIZES[c]));
    }
  }
  return { cells, answer: cell1(s[2], "solid", SIZES[2]) };
}

/** Each row = same shape, columns = increasing count */
function matrixCount(): GenResult {
  const s = pickN(ALL_SHAPES, 3);
  const cells: (VisualCell | null)[] = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      cells.push(r === 2 && c === 2 ? null : cellN(s[r], c + 1));
    }
  }
  return { cells, answer: cellN(s[2], 3) };
}

/** Each row = same shape, columns = rotation 0°, 90°, 180° */
function matrixRotation(): GenResult {
  const rotatable: ShapeType[] = ["triangle", "diamond", "star"];
  const s = pickN(rotatable, 3);
  const rots = [0, 90, 180];
  const cells: (VisualCell | null)[] = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      cells.push(
        r === 2 && c === 2 ? null : cell1(s[r], "solid", 50, rots[c]),
      );
    }
  }
  return { cells, answer: cell1(s[2], "solid", 50, rots[2]) };
}

/** Two properties change: shape per row, both fill and size per column */
function matrixShapeFillSize(): GenResult {
  const s = pickN(ALL_SHAPES, 3);
  const fills: FillType[] = ["solid", "empty", "solid"];
  const sizes = [30, 45, 60];
  const cells: (VisualCell | null)[] = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      cells.push(
        r === 2 && c === 2 ? null : cell1(s[r], fills[c], sizes[c]),
      );
    }
  }
  return { cells, answer: cell1(s[2], fills[2], sizes[2]) };
}

/** Diagonal pattern: shape moves diagonally through grid */
function matrixDiagonal(): GenResult {
  const shapes = pickN(ALL_SHAPES, 3);
  const bg = pick(ALL_SHAPES.filter((s) => !shapes.includes(s)));

  // Each row has same background shape, but one special shape at a different col
  // Row 0: special at col 0, Row 1: special at col 1, Row 2: special at col 2
  const cells: (VisualCell | null)[] = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      if (r === 2 && c === 2) {
        cells.push(null);
      } else {
        cells.push(r === c ? cell1(shapes[r], "solid") : cell1(bg, "empty"));
      }
    }
  }
  return { cells, answer: cell1(shapes[2], "solid") };
}

// ─── Sequence Generators (linear, last missing) ──────

/** Shape rotates by fixed angle each step */
function seqRotation(): GenResult {
  const shape = pick(["triangle", "diamond", "star"] as ShapeType[]);
  const inc = pick([45, 60, 90]);
  const cells: (VisualCell | null)[] = [];
  for (let i = 0; i < 5; i++) {
    cells.push(cell1(shape, "solid", 50, (i * inc) % 360));
  }
  cells.push(null);
  return { cells, answer: cell1(shape, "solid", 50, (5 * inc) % 360) };
}

/** Fill alternates each step */
function seqFillAlt(): GenResult {
  const shape = pick(ALL_SHAPES);
  const start: FillType = pick(FILLS);
  const opp: FillType = start === "solid" ? "empty" : "solid";
  const cells: (VisualCell | null)[] = [];
  for (let i = 0; i < 5; i++) {
    cells.push(cell1(shape, i % 2 === 0 ? start : opp));
  }
  cells.push(null);
  return { cells, answer: cell1(shape, 5 % 2 === 0 ? start : opp) };
}

/** Shapes cycle: A, B, C, A, B, ? → C */
function seqShapeCycle(): GenResult {
  const s = pickN(ALL_SHAPES, 3);
  const cells: (VisualCell | null)[] = [];
  for (let i = 0; i < 5; i++) {
    cells.push(cell1(s[i % 3]));
  }
  cells.push(null);
  return { cells, answer: cell1(s[5 % 3]) };
}

/** Count grows: 1, 2, 3, 4, ? → 5 */
function seqGrowCount(): GenResult {
  const shape = pick(ALL_SHAPES);
  const fill: FillType = pick(FILLS);
  const cells: (VisualCell | null)[] = [];
  for (let i = 1; i <= 4; i++) {
    cells.push(cellN(shape, i, fill));
  }
  cells.push(null);
  return { cells, answer: cellN(shape, 5, fill) };
}

/** Size cycles: small, medium, large, small, medium, ? → large */
function seqSizeCycle(): GenResult {
  const shape = pick(ALL_SHAPES);
  const fill: FillType = pick(FILLS);
  const cells: (VisualCell | null)[] = [];
  for (let i = 0; i < 5; i++) {
    cells.push(cell1(shape, fill, SIZES[i % 3]));
  }
  cells.push(null);
  return { cells, answer: cell1(shape, fill, SIZES[5 % 3]) };
}

/** Shape AND fill alternate together */
function seqDualAlt(): GenResult {
  const s = pickN(ALL_SHAPES, 2);
  const cells: (VisualCell | null)[] = [];
  for (let i = 0; i < 5; i++) {
    cells.push(cell1(s[i % 2], i % 2 === 0 ? "solid" : "empty"));
  }
  cells.push(null);
  return {
    cells,
    answer: cell1(s[5 % 2], 5 % 2 === 0 ? "solid" : "empty"),
  };
}

/** Shape grows: small‑shape → big‑shape (monotonic increase) */
function seqGrowSize(): GenResult {
  const shape = pick(ALL_SHAPES);
  const fill: FillType = pick(FILLS);
  const gradual = [20, 30, 40, 50, 60];
  const cells: (VisualCell | null)[] = gradual.map((sz) =>
    cell1(shape, fill, sz),
  );
  cells.push(null);
  return { cells, answer: cell1(shape, fill, 70) };
}

// ─── Analogy Generators (A : B = C : ?) ─────────────

/** Fill flip: ● : ○ = ■ : ? → □ */
function analogyFill(): GenResult {
  const sA = pick(ALL_SHAPES);
  const sC = pick(ALL_SHAPES.filter((s) => s !== sA));
  const fA: FillType = pick(FILLS);
  const fB: FillType = fA === "solid" ? "empty" : "solid";
  return {
    cells: [cell1(sA, fA), cell1(sA, fB), cell1(sC, fA), null],
    answer: cell1(sC, fB),
  };
}

/** Size change: small-○ : big-○ = small-□ : ? → big-□ */
function analogySize(): GenResult {
  const sA = pick(ALL_SHAPES);
  const sC = pick(ALL_SHAPES.filter((s) => s !== sA));
  return {
    cells: [cell1(sA, "solid", 25), cell1(sA, "solid", 60), cell1(sC, "solid", 25), null],
    answer: cell1(sC, "solid", 60),
  };
}

/** Rotation: △-0° : △-90° = ◇-0° : ? → ◇-90° */
function analogyRotation(): GenResult {
  const rotatable: ShapeType[] = ["triangle", "diamond", "star"];
  const sA = pick(rotatable);
  const sC = pick(rotatable.filter((s) => s !== sA));
  const rot = pick([90, 180, 270]);
  return {
    cells: [cell1(sA, "solid", 50, 0), cell1(sA, "solid", 50, rot), cell1(sC, "solid", 50, 0), null],
    answer: cell1(sC, "solid", 50, rot),
  };
}

/** Count: 1●  : 3●  = 1■  : ? → 3■ */
function analogyCount(): GenResult {
  const sA = pick(ALL_SHAPES);
  const sC = pick(ALL_SHAPES.filter((s) => s !== sA));
  const f: FillType = pick(FILLS);
  return {
    cells: [cellN(sA, 1, f), cellN(sA, 3, f), cellN(sC, 1, f), null],
    answer: cellN(sC, 3, f),
  };
}

/** Combined: fill + size change together */
function analogyFillSize(): GenResult {
  const sA = pick(ALL_SHAPES);
  const sC = pick(ALL_SHAPES.filter((s) => s !== sA));
  return {
    cells: [cell1(sA, "solid", 25), cell1(sA, "empty", 60), cell1(sC, "solid", 25), null],
    answer: cell1(sC, "empty", 60),
  };
}

// ─── Master Assembly ─────────────────────────────────

const MATRIX_GENS = [
  matrixShapeCycle,
  matrixFill,
  matrixSize,
  matrixCount,
  matrixRotation,
  matrixShapeFillSize,
  matrixDiagonal,
];
const SEQ_GENS = [
  seqRotation,
  seqFillAlt,
  seqShapeCycle,
  seqGrowCount,
  seqSizeCycle,
  seqDualAlt,
  seqGrowSize,
];
const ANALOGY_GENS = [
  analogyFill,
  analogySize,
  analogyRotation,
  analogyCount,
  analogyFillSize,
];

const Q_TEXTS: Record<string, string> = {
  matrix: "מהי הצורה החסרה במטריצה?",
  sequence: "מהי הצורה הבאה ברצף?",
  analogy: "איזו צורה משלימה את האנלוגיה?",
};

const EXPLANATIONS: Record<string, string> = {
  matrix:
    "במטריצה, כל שורה ועמודה עוקבות אחרי חוקיות מסוימת. יש לזהות את החוקיות ולמצוא את הצורה החסרה.",
  sequence:
    "ברצף, כל צורה משתנה לפי דפוס קבוע. זיהוי הדפוס מוביל לצורה הבאה.",
  analogy:
    "באנלוגיה, אותו שינוי שנעשה בין הצורה הראשונה לשנייה צריך להיעשות גם בין השלישית לרביעית.",
};

function generateOne(difficulty: number): GeneratedQuestion {
  // Type distribution based on difficulty
  const roll = Math.random();
  let type: "matrix" | "sequence" | "analogy";

  if (difficulty <= 2) {
    // Easy: more sequences and analogies, fewer matrices
    type = roll < 0.45 ? "sequence" : roll < 0.75 ? "analogy" : "matrix";
  } else if (difficulty <= 3) {
    // Medium: balanced
    type = roll < 0.35 ? "matrix" : roll < 0.7 ? "sequence" : "analogy";
  } else {
    // Hard: more matrices (require 2D reasoning)
    type = roll < 0.5 ? "matrix" : roll < 0.8 ? "sequence" : "analogy";
  }

  let gen: () => GenResult;
  switch (type) {
    case "matrix":
      gen = pick(MATRIX_GENS);
      break;
    case "sequence":
      gen = pick(SEQ_GENS);
      break;
    case "analogy":
      gen = pick(ANALOGY_GENS);
      break;
  }

  const { cells, answer } = gen();
  const distractors = makeDistractors(answer);

  // Place correct answer at random position among 4 options
  const correctIdx = randInt(0, 3);
  const optionVisuals: VisualCell[] = [];
  let dIdx = 0;
  for (let i = 0; i < 4; i++) {
    optionVisuals.push(i === correctIdx ? answer : distractors[dIdx++]);
  }

  const LETTERS = ["א", "ב", "ג", "ד"];

  return {
    category: "shapes",
    difficulty,
    questionText: Q_TEXTS[type],
    options: LETTERS.map((l) => ({ id: l, text: "" })),
    correctAnswer: LETTERS[correctIdx],
    explanation: EXPLANATIONS[type],
    tags: JSON.stringify([type, "visual"]),
    timeLimitSec: type === "matrix" ? 120 : 90,
    visualData: { type, cells, optionVisuals } as VisualData,
  };
}

export function generateVisualPatterns(
  count: number,
  difficulty?: number,
): GeneratedQuestion[] {
  const results: GeneratedQuestion[] = [];
  for (let i = 0; i < count; i++) {
    results.push(generateOne(difficulty || randInt(1, 5)));
  }
  return results;
}
