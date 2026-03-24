/**
 * Exam route – generates a full simulation exam matching
 * the real מבחן מחוננים שלב ב' (Gifted Test Stage B) – 2026 format.
 *
 * Structure (5 sections, 10 questions each):
 *   Section 1 – חשבון (arithmetic)           : 10 questions, 14 min
 *   Section 2 – השלמת משפטים (sentence comp.) : 10 questions, 14 min
 *   Section 3 – יחסי מילים (word relations)   : 10 questions, 14 min
 *   Section 4 – מספרים בצורות (numbers/shapes) : 10 questions, 14 min
 *   Section 5 – צורות (shapes)                : 10 questions, 14 min
 *
 * Total: 50 questions, 70 minutes
 */

import { Router, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { authMiddleware, AuthRequest } from "../middleware/auth.js";
import {
  generateQuestions,
  type GeneratedQuestion,
} from "../generators/index.js";

export const examRouter = Router();
examRouter.use(authMiddleware);

/* ── helpers ───────────────────────────────────────── */

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function genExternalId(cat: string): string {
  return `exam_${cat}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

const QUESTION_SELECT = {
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
  visualData: true,
  correctAnswer: true,
  explanation: true,
} as const;

async function persistQuestion(q: GeneratedQuestion) {
  return prisma.question.create({
    data: {
      externalId: genExternalId(q.category),
      category: q.category as any,
      difficulty: q.difficulty,
      grade: 0,
      questionText: q.questionText,
      options: q.options,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      tags: q.tags || "exam",
      source: "exam-generator",
      timeLimitSec: q.timeLimitSec || 90,
      needsImage: false,
      visualData: q.visualData || undefined,
    },
    select: QUESTION_SELECT,
  });
}

/* ── Exam section definitions ──────────────────────── */

interface SectionDef {
  id: string;
  name: string;
  timeLimitMin: number;
  categories: { category: string; count: number; difficulty?: number }[];
}

const EXAM_SECTIONS: SectionDef[] = [
  {
    id: "arithmetic",
    name: "חשבון",
    timeLimitMin: 14,
    categories: [
      { category: "math_problems", count: 10 },
    ],
  },
  {
    id: "sentence_completion",
    name: "השלמת משפטים",
    timeLimitMin: 14,
    categories: [
      { category: "sentence_completion", count: 10 },
    ],
  },
  {
    id: "word_relations",
    name: "יחסי מילים",
    timeLimitMin: 14,
    categories: [
      { category: "word_relations", count: 10 },
    ],
  },
  {
    id: "numbers_in_shapes",
    name: "מספרים בצורות",
    timeLimitMin: 14,
    categories: [
      { category: "numbers_in_shapes", count: 10 },
    ],
  },
  {
    id: "shapes",
    name: "צורות",
    timeLimitMin: 14,
    categories: [
      { category: "shapes", count: 10 },
    ],
  },
];

/* ── POST /api/exam/generate ───────────────────────── */

examRouter.post("/generate", async (req: AuthRequest, res: Response) => {
  try {
    const { childId } = req.body as { childId?: string };

    if (!childId) {
      res.status(400).json({ error: "childId is required" });
      return;
    }

    // Verify child belongs to user
    const child = await prisma.child.findFirst({
      where: { id: childId, userId: req.userId! },
    });
    if (!child) {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    // Generate questions for all sections
    const sections = [];

    for (const section of EXAM_SECTIONS) {
      const sectionQuestions = [];

      for (const catDef of section.categories) {
        // Mix difficulties: mostly 3-4 with some 2 and 5
        const difficulties = buildDifficultyMix(catDef.count);
        const allGenerated: GeneratedQuestion[] = [];

        for (const diff of [2, 3, 4, 5]) {
          const countForDiff = difficulties.filter(d => d === diff).length;
          if (countForDiff === 0) continue;
          // Generate extra to have variety for dedup
          const extra = Math.min(countForDiff * 3, 30);
          const batch = generateQuestions(catDef.category as any, extra, diff);
          allGenerated.push(...batch);
        }

        // Shuffle and pick the needed count
        shuffle(allGenerated);
        const picked = allGenerated.slice(0, catDef.count);

        // Persist all
        const saved = await Promise.all(picked.map(persistQuestion));
        sectionQuestions.push(...saved);
      }

      shuffle(sectionQuestions);

      sections.push({
        id: section.id,
        name: section.name,
        timeLimitMin: section.timeLimitMin,
        questions: sectionQuestions,
      });
    }

    res.json({ sections });
  } catch (err) {
    console.error("Exam generate error:", err);
    res.status(500).json({ error: "Failed to generate exam" });
  }
});

/* ── POST /api/exam/submit ─────────────────────────── */

examRouter.post("/submit", async (req: AuthRequest, res: Response) => {
  try {
    const { childId, sections, totalDurationSec } = req.body as {
      childId: string;
      sections: {
        id: string;
        answers: { questionId: string; selected: string; timeSpentMs: number }[];
      }[];
      totalDurationSec: number;
    };

    if (!childId || !sections) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    // Verify child belongs to user
    const child = await prisma.child.findFirst({
      where: { id: childId, userId: req.userId! },
    });
    if (!child) {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    // Process all answers
    const categoryScores: Record<string, { score: number; total: number }> = {};
    let totalScore = 0;
    let totalQuestions = 0;
    const allAnswerDetails: {
      questionId: string;
      selected: string;
      isCorrect: boolean;
      correctAnswer: string;
      explanation?: string;
      category: string;
    }[] = [];

    for (const section of sections) {
      for (const ans of section.answers) {
        const question = await prisma.question.findUnique({
          where: { id: ans.questionId },
        });
        if (!question) continue;

        const isCorrect = ans.selected === question.correctAnswer;
        const cat = question.category;

        if (!categoryScores[cat]) {
          categoryScores[cat] = { score: 0, total: 0 };
        }
        categoryScores[cat].total++;
        totalQuestions++;
        if (isCorrect) {
          categoryScores[cat].score++;
          totalScore++;
        }

        allAnswerDetails.push({
          questionId: ans.questionId,
          selected: ans.selected,
          isCorrect,
          correctAnswer: question.correctAnswer!,
          explanation: question.explanation || undefined,
          category: cat,
        });

        // Save individual answer
        await prisma.answer.create({
          data: {
            childId,
            questionId: ans.questionId,
            selected: ans.selected || "",
            isCorrect,
            timeSpentMs: ans.timeSpentMs || 0,
            hintsUsed: 0,
          },
        });
      }
    }

    // Build section scores
    const sectionScores: Record<string, { score: number; total: number }> = {};
    for (const sectionDef of EXAM_SECTIONS) {
      const cats = sectionDef.categories.map(c => c.category);
      let sScore = 0, sTotal = 0;
      for (const cat of cats) {
        const cs = categoryScores[cat];
        if (cs) { sScore += cs.score; sTotal += cs.total; }
      }
      sectionScores[sectionDef.id] = { score: sScore, total: sTotal };
    }

    // Calculate XP/coins reward
    const pct = totalQuestions > 0 ? totalScore / totalQuestions : 0;
    const xpGain = Math.round(20 + pct * 80);   // 20-100 XP
    const coinGain = Math.round(10 + pct * 40);  // 10-50 coins

    // Update child
    await prisma.child.update({
      where: { id: childId },
      data: {
        xp: { increment: xpGain },
        coins: { increment: coinGain },
        level: Math.floor((child.xp + xpGain) / 100) + 1,
      },
    });

    // Save simulation result
    const simulation = await prisma.simulationResult.create({
      data: {
        childId,
        level: "exam",
        totalScore,
        totalQuestions,
        durationSec: totalDurationSec || 0,
        categoryScores,
      },
    });

    res.json({
      simulationId: simulation.id,
      totalScore,
      totalQuestions,
      percentage: Math.round(pct * 100),
      categoryScores,
      sectionScores,
      xpGain,
      coinGain,
      newXp: child.xp + xpGain,
      newCoins: child.coins + coinGain,
      answers: allAnswerDetails,
    });
  } catch (err) {
    console.error("Exam submit error:", err);
    res.status(500).json({ error: "Failed to submit exam" });
  }
});

/* ── difficulty distribution helper ────────────────── */

function buildDifficultyMix(count: number): number[] {
  // ~15% easy (2), ~35% medium (3), ~35% hard (4), ~15% very hard (5)
  const mix: number[] = [];
  const dist = [
    { diff: 2, pct: 0.15 },
    { diff: 3, pct: 0.35 },
    { diff: 4, pct: 0.35 },
    { diff: 5, pct: 0.15 },
  ];

  let remaining = count;
  for (let i = 0; i < dist.length; i++) {
    const n = i === dist.length - 1
      ? remaining
      : Math.round(count * dist[i].pct);
    for (let j = 0; j < n && remaining > 0; j++) {
      mix.push(dist[i].diff);
      remaining--;
    }
  }

  return shuffle(mix);
}
