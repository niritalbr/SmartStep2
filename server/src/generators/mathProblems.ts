/**
 * Math Word Problem Generator (בעיות חשבון)
 * Generates unlimited math word problems for grades 2-3 at various difficulty levels.
 * Covers: addition, subtraction, multiplication, division, multi-step, fractions intro.
 */

import {
  GeneratedQuestion,
  makeOptions,
  pick,
  randInt,
  shuffle,
  hebrewNum,
} from "./utils.js";

// ── Name/object banks for word problems ──

const BOY_NAMES = [
  "דניאל", "יובל", "אורי", "עידו", "איתי", "רועי", "נועם", "אלון",
  "עומר", "תום", "ליאם", "אריאל", "גיל", "שי", "עידן", "אסף",
  "רון", "גלעד", "מתן", "בן", "דורון", "אייל", "נדב", "צחי",
] as const;

const GIRL_NAMES = [
  "מאיה", "נועה", "שירה", "יעל", "תמר", "אביגיל", "הילה", "ליאור",
  "רוני", "דנה", "עדי", "שלי", "מיכל", "ענבר", "אגם", "הדס",
  "יהל", "קרן", "אלה", "שרון", "לירון", "ים", "רותם", "איילת",
] as const;

const FRUITS = [
  "תפוחים", "בננות", "תפוזים", "אבטיחים", "ענבים", "תותים",
  "אגסים", "שזיפים", "מנגו", "קיווי", "אפרסקים", "דובדבנים",
] as const;

const FRUIT_SINGLE = [
  "תפוח", "בננה", "תפוז", "אבטיח", "ענב", "תות",
  "אגס", "שזיף", "מנגו", "קיווי", "אפרסק", "דובדבן",
] as const;

const OBJECTS = [
  "גולות", "מדבקות", "כדורים", "ספרים", "עפרונות", "צעצועים",
  "קלפים", "מחברות", "סוכריות", "עוגיות", "בלונים", "כוכבים",
  "פרחים", "חרוזים", "שקיות", "קוביות", "דפים", "ציורים",
] as const;

const ANIMALS = [
  "כלבים", "חתולים", "ארנבות", "דגים", "ציפורים", "צבים",
  "תוכים", "אוגרים", "פרפרים", "חיפושיות",
] as const;

const PLACES = [
  "בגן", "בכיתה", "בחנות", "בפארק", "בחצר", "בספרייה",
  "בקניון", "במכולת", "בבית", "בגן החיות",
] as const;

const VEHICLES = [
  "מיניבוסים", "אוטובוסים", "מכוניות", "אופניים", "קורקינטים",
] as const;

function getName(): string {
  return Math.random() < 0.5 ? pick(BOY_NAMES) : pick(GIRL_NAMES);
}

function getObj(): string {
  return pick(OBJECTS);
}

// ── Templates by type ──

type TemplateGenerator = (difficulty: number) => GeneratedQuestion;

/** Simple addition */
function genAddition(difficulty: number): GeneratedQuestion {
  const maxNum = difficulty <= 2 ? 20 : difficulty <= 3 ? 50 : 100;
  const a = randInt(2, maxNum);
  const b = randInt(2, maxNum);
  const answer = a + b;
  const name = getName();
  const obj = getObj();
  const place = pick(PLACES);

  const templates = [
    `ל${name} יש ${hebrewNum(a)} ${obj}. הוא קיבל עוד ${hebrewNum(b)} ${obj} ${place}. כמה ${obj} יש ל${name} עכשיו?`,
    `${name} אסף/ה ${hebrewNum(a)} ${obj} בבוקר ועוד ${hebrewNum(b)} ${obj} אחר הצהריים. כמה ${obj} אסף/ה בסך הכל?`,
    `בקופסה הראשונה יש ${hebrewNum(a)} ${obj}, ובקופסה השנייה יש ${hebrewNum(b)} ${obj}. כמה ${obj} יש בשתי הקופסאות ביחד?`,
    `${name} קנה ${hebrewNum(a)} ${obj} ${place}. אחר כך קנה עוד ${hebrewNum(b)}. כמה ${obj} קנה בסך הכל?`,
  ];

  const questionText = pick(templates);
  const distractors = generateDistractors(answer, 3, 1, answer + maxNum);

  const allOptions = shuffle([answer, ...distractors]);
  const correctIndex = allOptions.indexOf(answer);

  const { options, correctAnswer } = makeOptions(
    allOptions.map((n) => hebrewNum(n)),
    correctIndex
  );

  return {
    category: "math_problems",
    difficulty,
    questionText,
    options,
    correctAnswer,
    explanation: `${hebrewNum(a)} + ${hebrewNum(b)} = ${hebrewNum(answer)}`,
    tags: "addition,חיבור",
    timeLimitSec: difficulty <= 2 ? 60 : 90,
  };
}

/** Simple subtraction */
function genSubtraction(difficulty: number): GeneratedQuestion {
  const maxNum = difficulty <= 2 ? 20 : difficulty <= 3 ? 50 : 100;
  const total = randInt(5, maxNum);
  const taken = randInt(1, total - 1);
  const answer = total - taken;
  const name = getName();
  const obj = getObj();

  const templates = [
    `ל${name} היו ${hebrewNum(total)} ${obj}. הוא נתן ${hebrewNum(taken)} ${obj} לחבר. כמה ${obj} נשארו ל${name}?`,
    `בסלסלה היו ${hebrewNum(total)} ${pick(FRUITS)}. אכלו ${hebrewNum(taken)} מתוכם. כמה נשארו?`,
    `${name} קנה ${hebrewNum(total)} ${obj}. ${hebrewNum(taken)} ${obj} נפלו ונשברו. כמה ${obj} שלמים נשארו?`,
    `בכיתה היו ${hebrewNum(total)} ילדים. ${hebrewNum(taken)} ילדים הלכו הביתה. כמה ילדים נשארו בכיתה?`,
  ];

  const questionText = pick(templates);
  const distractors = generateDistractors(answer, 3, 0, total);
  const allOptions = shuffle([answer, ...distractors]);
  const correctIndex = allOptions.indexOf(answer);

  const { options, correctAnswer } = makeOptions(
    allOptions.map((n) => hebrewNum(n)),
    correctIndex
  );

  return {
    category: "math_problems",
    difficulty,
    questionText,
    options,
    correctAnswer,
    explanation: `${hebrewNum(total)} - ${hebrewNum(taken)} = ${hebrewNum(answer)}`,
    tags: "subtraction,חיסור",
    timeLimitSec: difficulty <= 2 ? 60 : 90,
  };
}

/** Multiplication */
function genMultiplication(difficulty: number): GeneratedQuestion {
  const maxFactor = difficulty <= 2 ? 5 : difficulty <= 3 ? 10 : 12;
  const a = randInt(2, maxFactor);
  const b = randInt(2, maxFactor);
  const answer = a * b;
  const name = getName();
  const obj = getObj();

  const templates = [
    `ל${name} יש ${hebrewNum(a)} שקיות. בכל שקית יש ${hebrewNum(b)} ${obj}. כמה ${obj} יש בסך הכל?`,
    `בכיתה יש ${hebrewNum(a)} שולחנות. על כל שולחן יש ${hebrewNum(b)} ${obj}. כמה ${obj} יש בכיתה?`,
    `${name} קנה ${hebrewNum(a)} חבילות של ${obj}. בכל חבילה יש ${hebrewNum(b)} ${obj}. כמה ${obj} קנה?`,
    `${hebrewNum(a)} ילדים מקבלים כל אחד ${hebrewNum(b)} ${obj}. כמה ${obj} צריך בסך הכל?`,
  ];

  const questionText = pick(templates);
  const distractors = generateDistractors(answer, 3, 2, answer * 2);
  const allOptions = shuffle([answer, ...distractors]);
  const correctIndex = allOptions.indexOf(answer);

  const { options, correctAnswer } = makeOptions(
    allOptions.map((n) => hebrewNum(n)),
    correctIndex
  );

  return {
    category: "math_problems",
    difficulty,
    questionText,
    options,
    correctAnswer,
    explanation: `${hebrewNum(a)} × ${hebrewNum(b)} = ${hebrewNum(answer)}`,
    tags: "multiplication,כפל",
    timeLimitSec: 90,
  };
}

/** Division */
function genDivision(difficulty: number): GeneratedQuestion {
  const maxDiv = difficulty <= 2 ? 5 : difficulty <= 3 ? 10 : 12;
  const divisor = randInt(2, maxDiv);
  const quotient = randInt(2, 12);
  const total = divisor * quotient;
  const name = getName();
  const obj = getObj();

  const templates = [
    `ל${name} יש ${hebrewNum(total)} ${obj} והוא רוצה לחלק אותם שווה בשווה בין ${hebrewNum(divisor)} חברים. כמה ${obj} יקבל כל חבר?`,
    `${hebrewNum(total)} ילדים מתחלקים ל-${hebrewNum(divisor)} קבוצות שוות. כמה ילדים בכל קבוצה?`,
    `${name} קנה ${hebrewNum(total)} ${obj} ושם אותם ב-${hebrewNum(divisor)} קופסאות באופן שווה. כמה ${obj} בכל קופסה?`,
    `בחנות יש ${hebrewNum(total)} ${obj} על ${hebrewNum(divisor)} מדפים. על כל מדף מספר שווה של ${obj}. כמה על כל מדף?`,
  ];

  const questionText = pick(templates);
  const distractors = generateDistractors(quotient, 3, 1, quotient * 3);
  const allOptions = shuffle([quotient, ...distractors]);
  const correctIndex = allOptions.indexOf(quotient);

  const { options, correctAnswer } = makeOptions(
    allOptions.map((n) => hebrewNum(n)),
    correctIndex
  );

  return {
    category: "math_problems",
    difficulty,
    questionText,
    options,
    correctAnswer,
    explanation: `${hebrewNum(total)} ÷ ${hebrewNum(divisor)} = ${hebrewNum(quotient)}`,
    tags: "division,חילוק",
    timeLimitSec: 90,
  };
}

/** Multi-step problems */
function genMultiStep(difficulty: number): GeneratedQuestion {
  const name = getName();
  const obj = getObj();
  const type = randInt(1, 4);

  let questionText: string;
  let answer: number;
  let explanation: string;

  if (type === 1) {
    // Buy + Give away
    const bought = randInt(10, 40);
    const gave = randInt(1, bought - 5);
    const gotMore = randInt(1, 15);
    answer = bought - gave + gotMore;
    questionText = `${name} קנה ${hebrewNum(bought)} ${obj}. נתן ${hebrewNum(gave)} לחבר, ואז קיבל עוד ${hebrewNum(gotMore)} מאמא. כמה ${obj} יש ל${name} עכשיו?`;
    explanation = `${hebrewNum(bought)} - ${hebrewNum(gave)} + ${hebrewNum(gotMore)} = ${hebrewNum(answer)}`;
  } else if (type === 2) {
    // Groups × items - some removed
    const groups = randInt(3, 6);
    const perGroup = randInt(3, 8);
    const removed = randInt(1, groups * perGroup - 5);
    answer = groups * perGroup - removed;
    questionText = `יש ${hebrewNum(groups)} שולחנות ועל כל שולחן ${hebrewNum(perGroup)} ${obj}. לקחו ${hebrewNum(removed)} ${obj}. כמה ${obj} נשארו?`;
    explanation = `${hebrewNum(groups)} × ${hebrewNum(perGroup)} - ${hebrewNum(removed)} = ${hebrewNum(groups * perGroup)} - ${hebrewNum(removed)} = ${hebrewNum(answer)}`;
  } else if (type === 3) {
    // Sharing after combining
    const a = randInt(5, 20);
    const b = randInt(5, 20);
    const friends = pick([2, 3, 4, 5]);
    const total = a + b;
    answer = Math.floor(total / friends);
    const actualTotal = answer * friends;
    questionText = `${name} אסף/ה ${hebrewNum(a)} ${obj} בבוקר ו-${hebrewNum(b)} אחר הצהריים. חילק/ה שווה בשווה בין ${hebrewNum(friends)} חברים. כמה קיבל כל חבר?`;
    // Adjust to make division exact
    const adjustedA = answer * friends - b;
    questionText = `${name} אסף/ה ${hebrewNum(adjustedA)} ${obj} בבוקר ו-${hebrewNum(b)} אחר הצהריים. חילק/ה שווה בשווה בין ${hebrewNum(friends)} חברים. כמה קיבל כל חבר?`;
    explanation = `(${hebrewNum(adjustedA)} + ${hebrewNum(b)}) ÷ ${hebrewNum(friends)} = ${hebrewNum(adjustedA + b)} ÷ ${hebrewNum(friends)} = ${hebrewNum(answer)}`;
  } else {
    // Time problem
    const startHour = randInt(8, 14);
    const duration1 = randInt(1, 3);
    const duration2 = randInt(1, 2);
    answer = startHour + duration1 + duration2;
    questionText = `${name} התחיל/ה פעילות בשעה ${hebrewNum(startHour)}:00. הפעילות הראשונה נמשכה ${hebrewNum(duration1)} שעות, והשנייה ${hebrewNum(duration2)} שעות. באיזו שעה סיים/ה?`;
    explanation = `${hebrewNum(startHour)} + ${hebrewNum(duration1)} + ${hebrewNum(duration2)} = ${hebrewNum(answer)}:00`;
  }

  const distractors = generateDistractors(answer, 3, Math.max(1, answer - 10), answer + 10);
  const allOptions = shuffle([answer, ...distractors]);
  const correctIndex = allOptions.indexOf(answer);

  const { options, correctAnswer } = makeOptions(
    allOptions.map((n) => hebrewNum(n)),
    correctIndex
  );

  return {
    category: "math_problems",
    difficulty,
    questionText,
    options,
    correctAnswer,
    explanation,
    tags: "multi-step,רב-שלבי",
    timeLimitSec: 120,
  };
}

/** Comparison / logic-based math */
function genComparison(difficulty: number): GeneratedQuestion {
  const name1 = pick(BOY_NAMES);
  let name2 = pick(GIRL_NAMES);
  const obj = getObj();
  const type = randInt(1, 3);

  let questionText: string;
  let answer: number;
  let explanation: string;

  if (type === 1) {
    // "X times more"
    const base = randInt(3, 10);
    const multiplier = randInt(2, 4);
    answer = base * multiplier;
    questionText = `ל${name1} יש ${hebrewNum(base)} ${obj}. ל${name2} יש פי ${hebrewNum(multiplier)} יותר. כמה ${obj} יש ל${name2}?`;
    explanation = `${hebrewNum(base)} × ${hebrewNum(multiplier)} = ${hebrewNum(answer)}`;
  } else if (type === 2) {
    // "How many more"
    const a = randInt(10, 30);
    const b = randInt(1, a - 2);
    answer = a - b;
    questionText = `ל${name1} יש ${hebrewNum(a)} ${obj}, ול${name2} יש ${hebrewNum(b)} ${obj}. בכמה ${obj} ל${name1} יותר מאשר ל${name2}?`;
    explanation = `${hebrewNum(a)} - ${hebrewNum(b)} = ${hebrewNum(answer)}`;
  } else {
    // "total of both"
    const a = randInt(5, 25);
    const b = randInt(5, 25);
    answer = a + b;
    questionText = `ל${name1} יש ${hebrewNum(a)} ${obj} ול${name2} יש ${hebrewNum(b)} ${obj}. כמה ${obj} יש לשניהם ביחד?`;
    explanation = `${hebrewNum(a)} + ${hebrewNum(b)} = ${hebrewNum(answer)}`;
  }

  const distractors = generateDistractors(answer, 3, 1, answer + 15);
  const allOptions = shuffle([answer, ...distractors]);
  const correctIndex = allOptions.indexOf(answer);

  const { options, correctAnswer } = makeOptions(
    allOptions.map((n) => hebrewNum(n)),
    correctIndex
  );

  return {
    category: "math_problems",
    difficulty,
    questionText,
    options,
    correctAnswer,
    explanation,
    tags: "comparison,השוואה",
    timeLimitSec: 90,
  };
}

/** Money/shopping problems */
function genMoney(difficulty: number): GeneratedQuestion {
  const name = getName();
  const items = [
    { name: "מחברת", price: randInt(5, 15) },
    { name: "עפרון", price: randInt(2, 8) },
    { name: "מחק", price: randInt(1, 5) },
    { name: "סרגל", price: randInt(3, 10) },
    { name: "צבעים", price: randInt(8, 20) },
    { name: "ספר", price: randInt(15, 40) },
    { name: "תיק", price: randInt(30, 80) },
    { name: "קלמר", price: randInt(10, 25) },
  ];

  const type = randInt(1, 3);
  let questionText: string;
  let answer: number;
  let explanation: string;

  if (type === 1) {
    // Total cost
    const item1 = pick(items);
    const item2 = pick(items.filter((i) => i.name !== item1.name));
    answer = item1.price + item2.price;
    questionText = `${name} קנה ${item1.name} ב-${hebrewNum(item1.price)} ₪ ו${item2.name} ב-${hebrewNum(item2.price)} ₪. כמה שילם/ה בסך הכל?`;
    explanation = `${hebrewNum(item1.price)} + ${hebrewNum(item2.price)} = ${hebrewNum(answer)} ₪`;
  } else if (type === 2) {
    // Change
    const item = pick(items);
    const paid = item.price + randInt(5, 20);
    answer = paid - item.price;
    questionText = `${name} קנה ${item.name} ב-${hebrewNum(item.price)} ₪ ושילם/ה עם שטר של ${hebrewNum(paid)} ₪. כמה עודף קיבל/ה?`;
    explanation = `${hebrewNum(paid)} - ${hebrewNum(item.price)} = ${hebrewNum(answer)} ₪`;
  } else {
    // Multiple items
    const item = pick(items);
    const qty = randInt(2, 5);
    answer = item.price * qty;
    questionText = `${name} קנה ${hebrewNum(qty)} ${item.name}ות. כל אחד/ת עולה ${hebrewNum(item.price)} ₪. כמה שילם/ה בסך הכל?`;
    explanation = `${hebrewNum(qty)} × ${hebrewNum(item.price)} = ${hebrewNum(answer)} ₪`;
  }

  const distractors = generateDistractors(answer, 3, 1, answer + 30);
  const allOptions = shuffle([answer, ...distractors]);
  const correctIndex = allOptions.indexOf(answer);

  const { options, correctAnswer } = makeOptions(
    allOptions.map((n) => hebrewNum(n) + " ₪"),
    correctIndex
  );

  return {
    category: "math_problems",
    difficulty,
    questionText,
    options,
    correctAnswer,
    explanation,
    tags: "money,כסף",
    timeLimitSec: 90,
  };
}

/** Measurement/weight problems */
function genMeasurement(difficulty: number): GeneratedQuestion {
  const name = getName();
  const type = randInt(1, 3);
  let questionText: string;
  let answer: number;
  let explanation: string;

  if (type === 1) {
    // Length
    const a = randInt(5, 30);
    const b = randInt(5, 30);
    answer = a + b;
    questionText = `${name} הלך/ה ${hebrewNum(a)} מטרים, ואז עוד ${hebrewNum(b)} מטרים. כמה מטרים הלך/ה בסך הכל?`;
    explanation = `${hebrewNum(a)} + ${hebrewNum(b)} = ${hebrewNum(answer)} מטרים`;
  } else if (type === 2) {
    // Weight
    const a = randInt(2, 10);
    const b = randInt(2, 10);
    answer = a + b;
    questionText = `שקית ${pick(FRUITS)} שוקלת ${hebrewNum(a)} ק"ג, ושקית ${pick(FRUITS)} שוקלת ${hebrewNum(b)} ק"ג. מה המשקל הכולל?`;
    explanation = `${hebrewNum(a)} + ${hebrewNum(b)} = ${hebrewNum(answer)} ק"ג`;
  } else {
    // Time/duration
    const hours = randInt(1, 4);
    const minutesPerActivity = randInt(10, 30);
    const activities = randInt(2, 4);
    answer = minutesPerActivity * activities;
    questionText = `${name} עשה ${hebrewNum(activities)} פעילויות. כל פעילות נמשכה ${hebrewNum(minutesPerActivity)} דקות. כמה דקות בסך הכל?`;
    explanation = `${hebrewNum(activities)} × ${hebrewNum(minutesPerActivity)} = ${hebrewNum(answer)} דקות`;
  }

  const distractors = generateDistractors(answer, 3, 1, answer + 20);
  const allOptions = shuffle([answer, ...distractors]);
  const correctIndex = allOptions.indexOf(answer);

  const { options, correctAnswer } = makeOptions(
    allOptions.map((n) => hebrewNum(n)),
    correctIndex
  );

  return {
    category: "math_problems",
    difficulty,
    questionText,
    options,
    correctAnswer,
    explanation,
    tags: "measurement,מדידה",
    timeLimitSec: 90,
  };
}

// ── Distractor generation ──

function generateDistractors(
  correct: number,
  count: number,
  min: number,
  max: number
): number[] {
  const result = new Set<number>();
  // Common mistake distractors
  const nearValues = [correct + 1, correct - 1, correct + 2, correct - 2, correct + 10, correct - 10, correct * 2, Math.floor(correct / 2)];

  for (const v of nearValues) {
    if (v !== correct && v >= min && v <= max && result.size < count) {
      result.add(v);
    }
  }

  while (result.size < count) {
    const d = randInt(Math.max(0, min), max);
    if (d !== correct) result.add(d);
  }
  return [...result].slice(0, count);
}

// ── Main export ──

const GENERATORS: TemplateGenerator[] = [
  genAddition,
  genSubtraction,
  genMultiplication,
  genDivision,
  genMultiStep,
  genComparison,
  genMoney,
  genMeasurement,
];

export function generateMathProblem(difficulty: number): GeneratedQuestion {
  // Weight generators by difficulty
  let generators: TemplateGenerator[];
  if (difficulty <= 2) {
    generators = [genAddition, genSubtraction, genMultiplication, genComparison, genMoney, genMeasurement];
  } else if (difficulty <= 3) {
    generators = [genMultiplication, genDivision, genMultiStep, genComparison, genMoney, genMeasurement];
  } else {
    generators = GENERATORS;
  }
  return pick(generators)(difficulty);
}

export function generateMathProblems(count: number, difficulty?: number): GeneratedQuestion[] {
  const results: GeneratedQuestion[] = [];
  for (let i = 0; i < count; i++) {
    const diff = difficulty ?? randInt(1, 5);
    results.push(generateMathProblem(diff));
  }
  return results;
}
