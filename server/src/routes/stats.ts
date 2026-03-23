import { Router, Response } from "express";
import { Category } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { authMiddleware, AuthRequest } from "../middleware/auth.js";

export const statsRouter = Router();
statsRouter.use(authMiddleware);

// Get child stats overview
statsRouter.get("/child/:childId", async (req: AuthRequest, res: Response) => {
  const child = await prisma.child.findFirst({
    where: { id: req.params.childId, userId: req.userId! },
  });
  if (!child) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  // Category breakdown
  const categoryStats = await prisma.answer.groupBy({
    by: ["questionId"],
    where: { childId: child.id },
    _count: true,
  });

  // Correct/total per category
  const answers = await prisma.answer.findMany({
    where: { childId: child.id },
    include: { question: { select: { category: true } } },
  });

  const perCategory: Record<string, { total: number; correct: number; avgTimeMs: number }> = {};
  for (const cat of Object.values(Category)) {
    const catAnswers = answers.filter((a) => a.question.category === cat);
    perCategory[cat] = {
      total: catAnswers.length,
      correct: catAnswers.filter((a) => a.isCorrect).length,
      avgTimeMs:
        catAnswers.length > 0
          ? Math.round(catAnswers.reduce((s, a) => s + a.timeSpentMs, 0) / catAnswers.length)
          : 0,
    };
  }

  // Streak calculation
  const streaks = await prisma.streak.findMany({
    where: { childId: child.id },
    orderBy: { date: "desc" },
    take: 60,
  });

  let currentStreak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < streaks.length; i++) {
    const expected = new Date(today);
    expected.setDate(expected.getDate() - i);
    const streakDate = new Date(streaks[i].date);
    streakDate.setHours(0, 0, 0, 0);
    if (streakDate.getTime() === expected.getTime()) {
      currentStreak++;
    } else {
      break;
    }
  }

  // Recent sessions
  const recentSessions = await prisma.gameSession.findMany({
    where: { childId: child.id, endedAt: { not: null } },
    orderBy: { endedAt: "desc" },
    take: 10,
  });

  res.json({
    child: {
      id: child.id,
      name: child.name,
      level: child.level,
      xp: child.xp,
      coins: child.coins,
      grade: child.grade,
    },
    perCategory,
    currentStreak,
    totalAnswers: answers.length,
    totalCorrect: answers.filter((a) => a.isCorrect).length,
    recentSessions,
  });
});

// Parent dashboard — all children summary
statsRouter.get("/dashboard", async (req: AuthRequest, res: Response) => {
  const children = await prisma.child.findMany({
    where: { userId: req.userId! },
    include: {
      _count: { select: { answers: true, sessions: true } },
    },
  });

  const summaries = await Promise.all(
    children.map(async (child) => {
      const answers = await prisma.answer.findMany({
        where: { childId: child.id },
        select: { isCorrect: true },
      });
      const total = answers.length;
      const correct = answers.filter((a) => a.isCorrect).length;

      return {
        id: child.id,
        name: child.name,
        grade: child.grade,
        level: child.level,
        xp: child.xp,
        coins: child.coins,
        totalAnswers: total,
        accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
        sessionsCount: child._count.sessions,
      };
    })
  );

  res.json(summaries);
});
