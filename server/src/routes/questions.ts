import { Router, Response } from "express";
import { Category } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { authMiddleware, AuthRequest } from "../middleware/auth.js";

export const questionsRouter = Router();
questionsRouter.use(authMiddleware);

// Get questions by category, with optional filters
questionsRouter.get("/", async (req: AuthRequest, res: Response) => {
  const { category, difficulty, grade, limit } = req.query;

  const where: Record<string, unknown> = {};
  if (category && Object.values(Category).includes(category as Category)) {
    where.category = category;
  }
  if (difficulty) {
    where.difficulty = parseInt(difficulty as string, 10);
  }
  if (grade) {
    const g = parseInt(grade as string, 10);
    where.OR = [{ grade: 0 }, { grade: g }];
  }

  const take = Math.min(parseInt((limit as string) || "20", 10), 100);

  const questions = await prisma.question.findMany({
    where,
    take,
    orderBy: { difficulty: "asc" },
    select: {
      id: true,
      externalId: true,
      category: true,
      difficulty: true,
      grade: true,
      questionText: true,
      questionImage: true,
      options: true,
      timeLimitSec: true,
      needsImage: true,
      tags: true,
    },
  });

  res.json(questions);
});

// Get random questions for practice
questionsRouter.get("/practice", async (req: AuthRequest, res: Response) => {
  const { category, childId, count } = req.query;

  if (!category || !childId) {
    res.status(400).json({ error: "category and childId are required" });
    return;
  }

  const take = Math.min(parseInt((count as string) || "10", 10), 30);

  // Get questions the child hasn't answered recently (or answered incorrectly)
  const recentCorrect = await prisma.answer.findMany({
    where: {
      childId: childId as string,
      isCorrect: true,
      question: { category: category as Category },
      createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    },
    select: { questionId: true },
  });

  const excludeIds = recentCorrect.map((a) => a.questionId);

  const questions = await prisma.question.findMany({
    where: {
      category: category as Category,
      id: { notIn: excludeIds },
    },
    take,
    select: {
      id: true,
      externalId: true,
      category: true,
      difficulty: true,
      questionText: true,
      questionImage: true,
      options: true,
      timeLimitSec: true,
      needsImage: true,
      tags: true,
    },
  });

  // Shuffle
  for (let i = questions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [questions[i], questions[j]] = [questions[j], questions[i]];
  }

  res.json(questions);
});

// Get a single question with answer (for review)
questionsRouter.get("/:id", async (req: AuthRequest, res: Response) => {
  const question = await prisma.question.findUnique({
    where: { id: req.params.id },
  });

  if (!question) {
    res.status(404).json({ error: "Question not found" });
    return;
  }

  res.json(question);
});

// Get category summary (counts per difficulty)
questionsRouter.get("/summary/categories", async (_req: AuthRequest, res: Response) => {
  const counts = await prisma.question.groupBy({
    by: ["category", "difficulty"],
    _count: true,
  });

  const summary: Record<string, { total: number; byDifficulty: Record<number, number> }> = {};
  for (const row of counts) {
    if (!summary[row.category]) {
      summary[row.category] = { total: 0, byDifficulty: {} };
    }
    summary[row.category].total += row._count;
    summary[row.category].byDifficulty[row.difficulty] = row._count;
  }

  res.json(summary);
});
