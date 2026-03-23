import { PrismaClient, Category } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

const DATA_DIR = path.resolve(__dirname, "../../../data");
const QUESTIONS_DIR = path.join(DATA_DIR, "questions");

const CATEGORY_MAP: Record<string, Category> = {
  word_relations: Category.word_relations,
  sentence_completion: Category.sentence_completion,
  numbers_in_shapes: Category.numbers_in_shapes,
  math_problems: Category.math_problems,
  shapes: Category.shapes,
};

// Default answers for questions that we couldn't parse automatically
// These come from the answer grids in the PDFs
const MANUAL_ANSWERS: Record<string, Record<number, string>> = {
  sentence_completion_2g_1: {
    1: "א", 2: "ג", 3: "ב", 4: "ג", 5: "ג", 6: "א", 7: "ב",
  },
  sentence_completion_2g_2: {
    1: "ד", 2: "א", 3: "ג", 4: "ב", 5: "ד", 6: "א", 7: "ב",
  },
  math_problems_2g_1: {
    1: "א", 2: "א", 3: "א", 4: "ג", 5: "ב", 6: "ג", 7: "ב", 8: "ג",
    9: "ד", 10: "ב", 11: "ג", 12: "א",
  },
};

async function seedQuestions() {
  console.log("Seeding questions...");

  const files = fs.readdirSync(QUESTIONS_DIR).filter((f) => f.endsWith(".json"));
  let totalSeeded = 0;

  for (const file of files) {
    const categoryKey = file.replace(".json", "");
    const category = CATEGORY_MAP[categoryKey];

    if (!category) {
      console.log(`  Skipping ${file} (no matching category)`);
      continue;
    }

    const filePath = path.join(QUESTIONS_DIR, file);
    const questions = JSON.parse(fs.readFileSync(filePath, "utf-8"));

    console.log(`  Processing ${file}: ${questions.length} questions`);

    for (const q of questions) {
      // Determine correct answer
      let correctAnswer = q.correctAnswer || "";

      // Try manual answers
      if (!correctAnswer && q.source) {
        const stem = q.source.replace(".pdf", "");
        if (MANUAL_ANSWERS[stem]?.[q.number]) {
          correctAnswer = MANUAL_ANSWERS[stem][q.number];
        }
      }

      // Skip questions without answers or content
      const text = q.wordPair || q.sentence || q.problem || q.content || "";
      if (!text && !q.needsImage) continue;

      // Determine difficulty based on question number and source
      const difficulty = q.number <= 3 ? 1
        : q.number <= 6 ? 2
        : q.number <= 9 ? 3
        : q.number <= 12 ? 4
        : 5;

      // Determine grade from filename
      const grade = q.source?.includes("2g") ? 2 : 0;

      try {
        await prisma.question.upsert({
          where: { externalId: q.id },
          create: {
            externalId: q.id,
            category,
            difficulty,
            grade,
            questionText: text,
            questionImage: q.needsImage ? `images/${categoryKey}/${q.source?.replace(".pdf", "")}_q${q.number}.png` : null,
            options: q.options || [],
            correctAnswer: correctAnswer || "א",
            explanation: q.explanation || null,
            tags: "[]",
            source: q.source || file,
            timeLimitSec: category === "shapes" ? 120 : 90,
            needsImage: q.needsImage || false,
          },
          update: {
            questionText: text,
            options: q.options || [],
            correctAnswer: correctAnswer || "א",
            explanation: q.explanation || null,
          },
        });
        totalSeeded++;
      } catch (err) {
        console.error(`  Error seeding question ${q.id}:`, err);
      }
    }
  }

  console.log(`\nSeeded ${totalSeeded} questions total`);
}

async function seedAchievements() {
  console.log("\nSeeding achievements...");

  const achievements = [
    {
      key: "first_answer",
      name: "צעד ראשון",
      description: "ענית על השאלה הראשונה שלך!",
      icon: "🌟",
      criteria: { type: "total_answers", value: 1 },
    },
    {
      key: "word_master",
      name: "מלך המילים",
      description: "ענית נכון על 20 שאלות יחסי מילים",
      icon: "📚",
      criteria: { type: "category_correct", category: "word_relations", value: 20 },
    },
    {
      key: "math_genius",
      name: "גאון חשבון",
      description: "ענית נכון על 20 בעיות חשבון",
      icon: "🧮",
      criteria: { type: "category_correct", category: "math_problems", value: 20 },
    },
    {
      key: "shape_hunter",
      name: "שודד הצורות",
      description: "ענית נכון על 20 שאלות צורות",
      icon: "🔷",
      criteria: { type: "category_correct", category: "shapes", value: 20 },
    },
    {
      key: "sentence_pro",
      name: "אלוף המשפטים",
      description: "ענית נכון על 20 שאלות השלמת משפטים",
      icon: "✍️",
      criteria: { type: "category_correct", category: "sentence_completion", value: 20 },
    },
    {
      key: "number_wizard",
      name: "קוסם המספרים",
      description: "ענית נכון על 20 שאלות מספרים בצורות",
      icon: "🔢",
      criteria: { type: "category_correct", category: "numbers_in_shapes", value: 20 },
    },
    {
      key: "streak_3",
      name: "3 ימים ברצף!",
      description: "תרגלת 3 ימים ברציפות",
      icon: "🔥",
      criteria: { type: "streak", value: 3 },
    },
    {
      key: "streak_7",
      name: "שבוע של אלופים",
      description: "תרגלת 7 ימים ברציפות!",
      icon: "💪",
      criteria: { type: "streak", value: 7 },
    },
    {
      key: "streak_30",
      name: "מתמיד אמיתי",
      description: "תרגלת חודש שלם ברציפות!",
      icon: "🏆",
      criteria: { type: "streak", value: 30 },
    },
    {
      key: "perfect_session",
      name: "מושלם!",
      description: "סיימת סשן עם 100% תשובות נכונות",
      icon: "💯",
      criteria: { type: "perfect_session", value: 1 },
    },
    {
      key: "speed_demon",
      name: "בזק!",
      description: "ענית על 5 שאלות נכון תוך פחות מ-30 שניות כל אחת",
      icon: "⚡",
      criteria: { type: "speed", value: 5, maxTimeMs: 30000 },
    },
    {
      key: "all_categories",
      name: "גאון בכל תחום",
      description: "ענית על שאלות מכל 5 הקטגוריות",
      icon: "🌈",
      criteria: { type: "all_categories", value: 5 },
    },
  ];

  for (const a of achievements) {
    await prisma.achievement.upsert({
      where: { key: a.key },
      create: a,
      update: { name: a.name, description: a.description, icon: a.icon, criteria: a.criteria },
    });
  }

  console.log(`Seeded ${achievements.length} achievements`);
}

async function main() {
  console.log("=".repeat(50));
  console.log("Database Seed Script");
  console.log("=".repeat(50));

  await seedQuestions();
  await seedAchievements();

  console.log("\nSeed complete!");
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
