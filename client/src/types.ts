// Category enum matching server
export enum Category {
  word_relations = "word_relations",
  sentence_completion = "sentence_completion",
  numbers_in_shapes = "numbers_in_shapes",
  math_problems = "math_problems",
  shapes = "shapes",
  vocabulary = "vocabulary",
}

export const CATEGORY_INFO: Record<
  Category,
  { name: string; icon: string; color: string; description: string }
> = {
  [Category.word_relations]: {
    name: "קשרי מילים",
    icon: "📝",
    color: "#6366f1",
    description: "מציאת קשרים בין מילים וביטויים",
  },
  [Category.sentence_completion]: {
    name: "השלמת משפטים",
    icon: "✏️",
    color: "#f59e0b",
    description: "השלמת משפטים עם המילה המתאימה",
  },
  [Category.numbers_in_shapes]: {
    name: "מספרים בצורות",
    icon: "🔢",
    color: "#10b981",
    description: "מציאת החוקיות במספרים בתוך צורות — עיגולים, משולשים, מעוינים, חיצים ועוד",
  },
  [Category.math_problems]: {
    name: "בעיות חשבון",
    icon: "🧮",
    color: "#ef4444",
    description: "פתרון בעיות מילוליות במתמטיקה",
  },
  [Category.shapes]: {
    name: "צורות ומטריצות",
    icon: "🔷",
    color: "#8b5cf6",
    description: "מטריצות, סדרות חזותיות ואנלוגיות — חשיבה חזותית ופיגורטיבית",
  },
  [Category.vocabulary]: {
    name: "אוצר מילים",
    icon: "📖",
    color: "#0ea5e9",
    description: "הכרת משמעות של מילים מתקדמות",
  },
};

export interface SubPracticeItem {
  id: string;
  category: Category;
  subType: string;
  name: string;
  icon: string;
  color: string;
  description: string;
}

export const SUB_PRACTICE_ITEMS: SubPracticeItem[] = [
  // מספרים בצורות sub-types
  {
    id: "nis_circles",
    category: Category.numbers_in_shapes,
    subType: "circles",
    name: "עיגולים",
    icon: "⭕",
    color: "#10b981",
    description: "סכום, מכפלה וממוצע במרכז עיגול",
  },
  {
    id: "nis_triangles",
    category: Category.numbers_in_shapes,
    subType: "triangles",
    name: "משולשים ופרפרים",
    icon: "🔺",
    color: "#059669",
    description: "חוקיות בקודקודי משולש ובצורת פרפר",
  },
  {
    id: "nis_arrows",
    category: Category.numbers_in_shapes,
    subType: "arrows",
    name: "חיצים וחוקיות",
    icon: "➡️",
    color: "#047857",
    description: "מכונת פונקציה — קלט → פלט, כפל, חיבור, ריבוע, דו-שלבי",
  },
  {
    id: "nis_special",
    category: Category.numbers_in_shapes,
    subType: "special",
    name: "צורות מיוחדות",
    icon: "💎",
    color: "#065f46",
    description: "פלוס, מעוין, טבלה ושלוש צורות עם אותה חוקיות",
  },
  // צורות sub-types
  {
    id: "shp_matrices",
    category: Category.shapes,
    subType: "matrices",
    name: "מטריצות",
    icon: "🔲",
    color: "#8b5cf6",
    description: "טבלה 3×3 — מצאו את הצורה החסרה",
  },
  {
    id: "shp_sequences",
    category: Category.shapes,
    subType: "sequences",
    name: "סדרות חזותיות",
    icon: "🔄",
    color: "#7c3aed",
    description: "מצאו את הצורה הבאה בסדרה",
  },
  {
    id: "shp_analogies",
    category: Category.shapes,
    subType: "analogies",
    name: "אנלוגיות",
    icon: "🔀",
    color: "#6d28d9",
    description: "א:ב = ג:? — מצאו את הקשר",
  },
  {
    id: "shp_emoji",
    category: Category.shapes,
    subType: "emoji",
    name: "סדרות צורות",
    icon: "🔷",
    color: "#5b21b6",
    description: "דפוסים חוזרים של צורות — ●○□△",
  },
];

export interface User {
  id: string;
  email: string;
  name: string;
  children?: Child[];
}

export interface Child {
  id: string;
  name: string;
  grade: number;
  avatarType: string;
  avatarColor: string;
  level: number;
  xp: number;
  coins: number;
}

export interface QuestionOption {
  id: string;
  text: string;
  image?: string;
}

// Visual data types for SVG-rendered questions
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

export interface Question {
  id: string;
  externalId: string;
  category: Category;
  difficulty: number;
  grade: number;
  questionText: string;
  questionImage?: string;
  options: QuestionOption[];
  timeLimitSec: number;
  needsImage: boolean;
  tags: string;
  correctAnswer?: string;
  explanation?: string;
  visualData?: VisualData;
}

export interface AnswerResult {
  answerId: string;
  isCorrect: boolean;
  correctAnswer: string;
  explanation?: string;
  xpGain: number;
  coinGain: number;
  newXp: number;
  newCoins: number;
}

export interface GameSession {
  id: string;
  category: Category;
  mode: string;
  score: number;
  total: number;
  stars: number;
  xpEarned: number;
  coinsEarned: number;
  startedAt: string;
  endedAt?: string;
}

export interface ChildStats {
  child: Child;
  perCategory: Record<
    string,
    { total: number; correct: number; avgTimeMs: number }
  >;
  currentStreak: number;
  totalAnswers: number;
  totalCorrect: number;
  recentSessions: GameSession[];
}

export interface CategorySummary {
  total: number;
  byDifficulty: Record<number, number>;
}
