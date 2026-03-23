/**
 * Word Relations Generator (יחסי מילים / אנלוגיות)
 * Generates analogy-style questions: A:B = C:?
 * Uses a curated Hebrew word-pair database covering many relationship types.
 */

import {
  GeneratedQuestion,
  makeOptions,
  pick,
  pickN,
  shuffle,
} from "./utils.js";

// ── Relationship types and word pairs ──

interface WordPair {
  a: string;
  b: string;
}

interface Relationship {
  type: string;
  label: string;
  pairs: WordPair[];
}

const RELATIONSHIPS: Relationship[] = [
  {
    type: "synonyms",
    label: "מילים נרדפות",
    pairs: [
      { a: "שמח", b: "עליז" },
      { a: "עצוב", b: "נוגה" },
      { a: "גדול", b: "ענק" },
      { a: "קטן", b: "זעיר" },
      { a: "יפה", b: "נאה" },
      { a: "חכם", b: "נבון" },
      { a: "מהיר", b: "זריז" },
      { a: "אמיץ", b: "גיבור" },
      { a: "כעוס", b: "רגוז" },
      { a: "רגוע", b: "שלו" },
      { a: "חזק", b: "עוצמתי" },
      { a: "עייף", b: "מותש" },
      { a: "רעב", b: "רעבתן" },
      { a: "דרך", b: "שביל" },
      { a: "בית", b: "דירה" },
      { a: "ילד", b: "נער" },
      { a: "ספר", b: "חוברת" },
      { a: "אור", b: "זוהר" },
      { a: "רופא", b: "דוקטור" },
      { a: "תלמיד", b: "לומד" },
    ],
  },
  {
    type: "antonyms",
    label: "מילים הפוכות",
    pairs: [
      { a: "חם", b: "קר" },
      { a: "גבוה", b: "נמוך" },
      { a: "ארוך", b: "קצר" },
      { a: "כבד", b: "קל" },
      { a: "רחב", b: "צר" },
      { a: "מהיר", b: "איטי" },
      { a: "חדש", b: "ישן" },
      { a: "רך", b: "קשה" },
      { a: "שמח", b: "עצוב" },
      { a: "בהיר", b: "כהה" },
      { a: "יבש", b: "רטוב" },
      { a: "עשיר", b: "עני" },
      { a: "מלא", b: "ריק" },
      { a: "פתוח", b: "סגור" },
      { a: "חזק", b: "חלש" },
      { a: "מתוק", b: "מר" },
      { a: "יום", b: "לילה" },
      { a: "שמש", b: "ירח" },
      { a: "אור", b: "חושך" },
      { a: "קיץ", b: "חורף" },
      { a: "תחילה", b: "סוף" },
      { a: "עולה", b: "יורד" },
      { a: "נכנס", b: "יוצא" },
    ],
  },
  {
    type: "part_whole",
    label: "חלק ושלם",
    pairs: [
      { a: "אצבע", b: "יד" },
      { a: "עלה", b: "עץ" },
      { a: "גלגל", b: "מכונית" },
      { a: "דף", b: "ספר" },
      { a: "לבנה", b: "קיר" },
      { a: "חלון", b: "בית" },
      { a: "כפתור", b: "חולצה" },
      { a: "מילה", b: "משפט" },
      { a: "אות", b: "מילה" },
      { a: "שורה", b: "טקסט" },
      { a: "קומה", b: "בניין" },
      { a: "פרק", b: "ספר" },
      { a: "חרוז", b: "שיר" },
      { a: "תא", b: "טבלה" },
      { a: "שן", b: "פה" },
      { a: "כנף", b: "ציפור" },
      { a: "עין", b: "פנים" },
      { a: "פרח", b: "זר" },
      { a: "פסוק", b: "תפילה" },
      { a: "נגן", b: "תזמורת" },
    ],
  },
  {
    type: "category_member",
    label: "קטגוריה ופריט",
    pairs: [
      { a: "כלב", b: "חיה" },
      { a: "ורד", b: "פרח" },
      { a: "אלון", b: "עץ" },
      { a: "כיסא", b: "רהיט" },
      { a: "חצוצרה", b: "כלי נגינה" },
      { a: "חולצה", b: "בגד" },
      { a: "תפוז", b: "פרי" },
      { a: "גזר", b: "ירק" },
      { a: "נשר", b: "עוף" },
      { a: "לוויתן", b: "יונק" },
      { a: "נהר", b: "מקור מים" },
      { a: "אוטובוס", b: "תחבורה" },
      { a: "מברג", b: "כלי עבודה" },
      { a: "עברית", b: "שפה" },
      { a: "כדורגל", b: "ספורט" },
      { a: "פסנתר", b: "כלי נגינה" },
      { a: "יהלום", b: "אבן יקרה" },
      { a: "ירושלים", b: "עיר" },
    ],
  },
  {
    type: "tool_profession",
    label: "כלי ומקצוע",
    pairs: [
      { a: "מברשת", b: "צייר" },
      { a: "סטטוסקופ", b: "רופא" },
      { a: "מחט", b: "תופר" },
      { a: "מקדחה", b: "שרברב" },
      { a: "מספריים", b: "ספר" },
      { a: "עט", b: "סופר" },
      { a: "מחבת", b: "טבח" },
      { a: "מצלמה", b: "צלם" },
      { a: "גיר", b: "מורה" },
      { a: "מפתח ברגים", b: "מכונאי" },
      { a: "משפך", b: "כימאי" },
      { a: "מסור", b: "נגר" },
      { a: "אזמל", b: "מנתח" },
      { a: "כינור", b: "כנר" },
      { a: "מחשב", b: "מתכנת" },
      { a: "משקפת", b: "חוקר" },
    ],
  },
  {
    type: "place_activity",
    label: "מקום ופעולה",
    pairs: [
      { a: "מטבח", b: "בישול" },
      { a: "כיתה", b: "לימוד" },
      { a: "מגרש", b: "משחק" },
      { a: "ספרייה", b: "קריאה" },
      { a: "מעבדה", b: "ניסוי" },
      { a: "בריכה", b: "שחייה" },
      { a: "חנות", b: "קנייה" },
      { a: "תיאטרון", b: "הצגה" },
      { a: "בית חולים", b: "ריפוי" },
      { a: "מסעדה", b: "אכילה" },
      { a: "מספרה", b: "תספורת" },
      { a: "גן", b: "גידול" },
      { a: "אולפן", b: "הקלטה" },
      { a: "משרד", b: "עבודה" },
      { a: "נמל", b: "הפלגה" },
    ],
  },
  {
    type: "animal_sound",
    label: "חיה וקול",
    pairs: [
      { a: "כלב", b: "נביחה" },
      { a: "חתול", b: "מיאו" },
      { a: "אריה", b: "שאגה" },
      { a: "נחש", b: "שריקה" },
      { a: "ציפור", b: "ציוץ" },
      { a: "צפרדע", b: "קרקור" },
      { a: "פרה", b: "געייה" },
      { a: "תרנגול", b: "קריאה" },
      { a: "זאב", b: "ייבוב" },
      { a: "סוס", b: "צהלה" },
      { a: "חמור", b: "נעירה" },
      { a: "דבורה", b: "זמזום" },
    ],
  },
  {
    type: "animal_habitat",
    label: "חיה ובית גידול",
    pairs: [
      { a: "דג", b: "ים" },
      { a: "ציפור", b: "קן" },
      { a: "דב", b: "מערה" },
      { a: "נמלה", b: "קן נמלים" },
      { a: "דבורה", b: "כוורת" },
      { a: "עכביש", b: "קורים" },
      { a: "סנאי", b: "עץ" },
      { a: "ארנב", b: "מחילה" },
      { a: "חילזון", b: "קונכייה" },
      { a: "פרה", b: "רפת" },
      { a: "סוס", b: "אורווה" },
      { a: "תרנגולת", b: "לול" },
    ],
  },
  {
    type: "material_product",
    label: "חומר ומוצר",
    pairs: [
      { a: "עץ", b: "שולחן" },
      { a: "חול", b: "זכוכית" },
      { a: "צמר", b: "סוודר" },
      { a: "קמח", b: "לחם" },
      { a: "חלב", b: "גבינה" },
      { a: "ענבים", b: "יין" },
      { a: "ברזל", b: "מסמר" },
      { a: "כותנה", b: "חולצה" },
      { a: "חימר", b: "כד" },
      { a: "גומי", b: "צמיג" },
      { a: "זהב", b: "טבעת" },
      { a: "נייר", b: "ספר" },
      { a: "בד", b: "שמלה" },
      { a: "שעווה", b: "נר" },
    ],
  },
  {
    type: "young_animal",
    label: "חיה וגור",
    pairs: [
      { a: "כלבה", b: "גור" },
      { a: "חתולה", b: "גורון" },
      { a: "סוסה", b: "סייח" },
      { a: "פרה", b: "עגל" },
      { a: "תרנגולת", b: "אפרוח" },
      { a: "כבשה", b: "טלה" },
      { a: "אריה", b: "כפיר" },
      { a: "עז", b: "גדי" },
      { a: "ברווזה", b: "ברווזון" },
      { a: "דובה", b: "גור דובים" },
    ],
  },
  {
    type: "gender_pair",
    label: "זכר ונקבה",
    pairs: [
      { a: "אבא", b: "אמא" },
      { a: "אח", b: "אחות" },
      { a: "מלך", b: "מלכה" },
      { a: "נסיך", b: "נסיכה" },
      { a: "שחקן", b: "שחקנית" },
      { a: "מורה", b: "מורה" },
      { a: "דוד", b: "דודה" },
      { a: "סבא", b: "סבתא" },
      { a: "תלמיד", b: "תלמידה" },
      { a: "שכן", b: "שכנה" },
      { a: "בן", b: "בת" },
      { a: "גבר", b: "אישה" },
    ],
  },
  {
    type: "cause_effect",
    label: "סיבה ותוצאה",
    pairs: [
      { a: "גשם", b: "שלולית" },
      { a: "שמש", b: "חום" },
      { a: "רעד", b: "רעידת אדמה" },
      { a: "אש", b: "עשן" },
      { a: "לימוד", b: "ידע" },
      { a: "אימון", b: "כושר" },
      { a: "שינה", b: "מנוחה" },
      { a: "צחוק", b: "שמחה" },
      { a: "מכה", b: "כאב" },
      { a: "זריעה", b: "צמיחה" },
      { a: "קור", b: "קרח" },
      { a: "רוח", b: "גלים" },
    ],
  },
  {
    type: "size_order",
    label: "סדר גודל",
    pairs: [
      { a: "עיר", b: "כפר" },
      { a: "אוקיינוס", b: "אגם" },
      { a: "הר", b: "גבעה" },
      { a: "נהר", b: "נחל" },
      { a: "יבשת", b: "אי" },
      { a: "עץ", b: "שיח" },
      { a: "ארמון", b: "בקתה" },
      { a: "ספינה", b: "סירה" },
      { a: "מטוס", b: "רחפן" },
      { a: "כביש", b: "שביל" },
    ],
  },
  {
    type: "action_result",
    label: "פעולה ותוצאה",
    pairs: [
      { a: "חותך", b: "חתיכה" },
      { a: "שובר", b: "שבר" },
      { a: "בונה", b: "בניין" },
      { a: "כותב", b: "כתבה" },
      { a: "צר", b: "ציור" },
      { a: "שר", b: "שיר" },
      { a: "אופה", b: "עוגה" },
      { a: "תופר", b: "בגד" },
      { a: "מצלם", b: "תמונה" },
      { a: "מלחין", b: "מנגינה" },
      { a: "פוסל", b: "פסל" },
      { a: "מגדל", b: "יבול" },
    ],
  },
  {
    type: "collective",
    label: "פרט וקבוצה",
    pairs: [
      { a: "חייל", b: "צבא" },
      { a: "שחקן", b: "קבוצה" },
      { a: "תלמיד", b: "כיתה" },
      { a: "דבורה", b: "נחיל" },
      { a: "עץ", b: "יער" },
      { a: "כוכב", b: "קבוצת כוכבים" },
      { a: "אבן", b: "ערמה" },
      { a: "ספר", b: "ספרייה" },
      { a: "שיר", b: "אלבום" },
      { a: "אי", b: "אִיִּים" },
      { a: "פרח", b: "זר" },
      { a: "מילה", b: "מילון" },
    ],
  },
];

// ── Distractor generation ──

/** Get plausible wrong answers from the same relationship */
function getDistractors(
  correctPair: WordPair,
  rel: Relationship,
  count: number
): string[] {
  const others = rel.pairs
    .filter((p) => p.b !== correctPair.b && p.a !== correctPair.a)
    .map((p) => p.b);
  const result = shuffle(others).slice(0, count);

  // If not enough distractors from same relationship, add from random relationships
  while (result.length < count) {
    const otherRel = pick(RELATIONSHIPS.filter((r) => r.type !== rel.type));
    const otherWord = pick(otherRel.pairs).b;
    if (!result.includes(otherWord) && otherWord !== correctPair.b) {
      result.push(otherWord);
    }
  }

  return result;
}

// ── Question generation ──

function generateAnalogy(difficulty: number): GeneratedQuestion {
  // Pick relationship type based on difficulty
  const easyTypes = ["synonyms", "antonyms", "young_animal", "gender_pair", "animal_sound"];
  const medTypes = [...easyTypes, "part_whole", "category_member", "material_product", "animal_habitat"];
  const hardTypes = RELATIONSHIPS.map((r) => r.type);

  const allowedTypes =
    difficulty <= 2 ? easyTypes : difficulty <= 3 ? medTypes : hardTypes;

  const rel = pick(
    RELATIONSHIPS.filter((r) => allowedTypes.includes(r.type))
  );

  // Pick two different pairs from same relationship
  if (rel.pairs.length < 2) return generateAnalogy(difficulty);
  const [pair1, pair2] = pickN(rel.pairs, 2);

  // Format: A is to B as C is to ?
  const questionText = `${pair1.a} : ${pair1.b} = ${pair2.a} : ?`;

  const distractors = getDistractors(pair2, rel, 3);
  const allOptions = shuffle([pair2.b, ...distractors]);
  const correctIndex = allOptions.indexOf(pair2.b);

  const { options, correctAnswer } = makeOptions(allOptions, correctIndex);

  return {
    category: "word_relations",
    difficulty,
    questionText,
    options,
    correctAnswer,
    explanation: `הקשר הוא ${rel.label}. כמו ש"${pair1.a}" קשור ל"${pair1.b}", כך "${pair2.a}" קשור ל"${pair2.b}"`,
    tags: `analogy,${rel.type},אנלוגיה`,
    timeLimitSec: difficulty <= 2 ? 45 : 60,
  };
}

function generateOddOneOut(difficulty: number): GeneratedQuestion {
  // Pick a relationship and 3 pairs from it
  const rel = pick(RELATIONSHIPS.filter((r) => r.pairs.length >= 3));
  const samePairs = pickN(rel.pairs, 3);

  // Pick an odd pair from a different relationship
  const otherRel = pick(RELATIONSHIPS.filter((r) => r.type !== rel.type));
  const oddPair = pick(otherRel.pairs);

  const items = shuffle([
    ...samePairs.map((p) => `${p.a}-${p.b}`),
    `${oddPair.a}-${oddPair.b}`,
  ]);
  const oddItem = `${oddPair.a}-${oddPair.b}`;
  const correctIdx = items.indexOf(oddItem);

  const questionText = `איזה זוג מילים לא שייך לקבוצה?`;

  const { options, correctAnswer } = makeOptions(items, correctIdx);

  return {
    category: "word_relations",
    difficulty,
    questionText,
    options,
    correctAnswer,
    explanation: `שלושת הזוגות הם ${rel.label}, אבל "${oddItem}" הוא ${otherRel.label}`,
    tags: "odd_one_out,מי_לא_שייך",
    timeLimitSec: 60,
  };
}

function generateRelationshipIdentification(difficulty: number): GeneratedQuestion {
  const rel = pick(RELATIONSHIPS);
  const pair = pick(rel.pairs);

  const questionText = `מהו הקשר בין "${pair.a}" ל"${pair.b}"?`;

  // Get other relationship labels as distractors
  const otherLabels = RELATIONSHIPS
    .filter((r) => r.type !== rel.type)
    .map((r) => r.label);
  const distractors = pickN(
    otherLabels.filter((l) => l !== rel.label),
    3
  );

  const allOptions = shuffle([rel.label, ...distractors]);
  const correctIdx = allOptions.indexOf(rel.label);

  const { options, correctAnswer } = makeOptions(allOptions, correctIdx);

  return {
    category: "word_relations",
    difficulty,
    questionText,
    options,
    correctAnswer,
    explanation: `"${pair.a}" ו"${pair.b}" - היחס ביניהם הוא ${rel.label}`,
    tags: "relation_id,זיהוי_יחס",
    timeLimitSec: 45,
  };
}

function generateCompletePair(difficulty: number): GeneratedQuestion {
  const rel = pick(RELATIONSHIPS);
  const pair = pick(rel.pairs);

  // Randomly hide a or b
  const hideB = Math.random() < 0.5;
  const questionText = hideB
    ? `${pair.a} : ___ (${rel.label})`
    : `___ : ${pair.b} (${rel.label})`;
  
  const correctWord = hideB ? pair.b : pair.a;

  // Distractors from same relationship
  const distractorWords = rel.pairs
    .filter((p) => p !== pair)
    .map((p) => (hideB ? p.b : p.a))
    .filter((w) => w !== correctWord);

  const distractors = shuffle(distractorWords).slice(0, 3);
  while (distractors.length < 3) {
    const otherRel = pick(RELATIONSHIPS.filter((r) => r.type !== rel.type));
    const w = hideB ? pick(otherRel.pairs).b : pick(otherRel.pairs).a;
    if (!distractors.includes(w) && w !== correctWord) distractors.push(w);
  }

  const allOptions = shuffle([correctWord, ...distractors.slice(0, 3)]);
  const correctIdx = allOptions.indexOf(correctWord);

  const { options, correctAnswer } = makeOptions(allOptions, correctIdx);

  return {
    category: "word_relations",
    difficulty,
    questionText,
    options,
    correctAnswer,
    explanation: `הזוג המלא: ${pair.a} - ${pair.b} (${rel.label})`,
    tags: "complete_pair,השלמת_זוג",
    timeLimitSec: 45,
  };
}

// ── Main exports ──

export function generateWordRelation(difficulty: number): GeneratedQuestion {
  const rand = Math.random();
  if (rand < 0.60) return generateAnalogy(difficulty);
  if (rand < 0.80) return generateOddOneOut(difficulty);
  if (rand < 0.90) return generateRelationshipIdentification(difficulty);
  return generateCompletePair(difficulty);
}

export function generateWordRelationsBatch(
  count: number,
  difficulty?: number
): GeneratedQuestion[] {
  const results: GeneratedQuestion[] = [];
  for (let i = 0; i < count; i++) {
    const diff = difficulty ?? (Math.random() < 0.3 ? 1 + Math.floor(Math.random() * 2) : 3 + Math.floor(Math.random() * 3));
    results.push(generateWordRelation(diff));
  }
  return results;
}
