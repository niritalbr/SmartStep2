/**
 * Generate – Route that creates fresh questions on-the-fly,
 * persists them to the DB, and returns them in the standard Question shape.
 *
 * Retry / spaced-repetition logic:
 *   • Questions the child got WRONG (most-recent answer) come back in the
 *     next session (up to half the batch).
 *   • Correctly-answered questions are pushed to the back via the dedup
 *     window (last 200 answer texts) so they won't reappear soon.
 */

import { Router, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { authMiddleware, AuthRequest } from "../middleware/auth.js";
import {
  generateQuestions,
  generateMixedQuestions,
  type GeneratedQuestion,
} from "../generators/index.js";

export const generateRouter = Router();
generateRouter.use(authMiddleware);

/* ── helpers ───────────────────────────────────────────────────────── */

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
} as const;

function genExternalId(cat: string): string {
  return `gen_${cat}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Persist a generated question to the DB and return the full Prisma row. */
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
      tags: q.tags || "generated",
      source: "generator",
      timeLimitSec: q.timeLimitSec || 90,
      needsImage: false,
      visualData: q.visualData || undefined,
    },
    select: QUESTION_SELECT,
  });
}

/**
 * Find questions where the child's MOST RECENT answer was wrong.
 * These are candidates for retry in the next game session.
 *
 * @param categoryFilter – if supplied, only that category; null = all categories
 * @param maxRetry       – upper bound on retry questions to return
 */
async function getRetryQuestions(
  childId: string,
  categoryFilter: string | null,
  maxRetry: number,
) {
  const where: Record<string, unknown> = { childId };
  if (categoryFilter) {
    where.question = { category: categoryFilter as any };
  }

  const answers = await prisma.answer.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: { questionId: true, isCorrect: true },
  });

  // Keep only the latest answer per question
  const latestByQ = new Map<string, boolean>();
  for (const a of answers) {
    if (!latestByQ.has(a.questionId)) {
      latestByQ.set(a.questionId, a.isCorrect);
    }
  }

  const retryIds = [...latestByQ.entries()]
    .filter(([, correct]) => !correct)
    .map(([qId]) => qId)
    .slice(0, maxRetry);

  if (retryIds.length === 0) return [];

  return prisma.question.findMany({
    where: { id: { in: retryIds } },
    select: QUESTION_SELECT,
  });
}

/** Fisher-Yates shuffle (in-place). */
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/* ── route ─────────────────────────────────────────────────────────── */

/**
 * POST /api/questions/generate
 * Body: { category?, count?, difficulty?, mixed?, childId? }
 */
generateRouter.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const {
      category,
      count: rawCount,
      difficulty: rawDiff,
      mixed,
      childId,
    } = req.body as {
      category?: string;
      count?: number;
      difficulty?: number;
      mixed?: boolean;
      childId?: string;
    };

    const count = Math.min(Math.max(rawCount || 10, 1), 50);
    const difficulty = rawDiff
      ? Math.min(Math.max(rawDiff, 1), 5)
      : undefined;

    // ── 1. Retry questions (wrong on last attempt) ───────────────
    const maxRetry = Math.ceil(count / 2); // up to half the batch
    let retryQuestions: Awaited<ReturnType<typeof getRetryQuestions>> = [];
    if (childId) {
      const catFilter = mixed || !category ? null : category;
      retryQuestions = await getRetryQuestions(childId, catFilter, maxRetry);
      shuffle(retryQuestions);
    }

    const newCount = Math.max(count - retryQuestions.length, 0);

    // ── 2. Dedup set: recent answer texts + retry texts ──────────
    let recentTexts = new Set<string>();
    if (childId) {
      const recent = await prisma.answer.findMany({
        where: { childId },
        orderBy: { createdAt: "desc" },
        take: 200,
        select: { question: { select: { questionText: true } } },
      });
      recentTexts = new Set(
        recent.map(
          (a: { question: { questionText: string } }) =>
            a.question.questionText.trim(),
        ),
      );
    }
    // Also exclude retry texts so generators don't duplicate them
    for (const rq of retryQuestions) {
      recentTexts.add(rq.questionText.trim());
    }

    // ── 3. Generate fresh questions for the remaining slots ──────
    let generated: GeneratedQuestion[] = [];

    if (newCount > 0) {
      if (mixed || !category) {
        generated = generateMixedQuestions(newCount, difficulty);
      } else {
        const validCategories = [
          "word_relations",
          "sentence_completion",
          "numbers_in_shapes",
          "math_problems",
          "shapes",
          "vocabulary",
        ];
        if (!validCategories.includes(category)) {
          res.status(400).json({ error: "Invalid category" });
          return;
        }
        const extra = Math.min(newCount * 3, 50);
        generated = generateQuestions(category as any, extra, difficulty);
      }

      // Cross-session dedup: prefer unseen question texts
      if (recentTexts.size > 0) {
        const fresh = generated.filter(
          (q) => !recentTexts.has(q.questionText.trim()),
        );
        if (fresh.length >= newCount) {
          generated = fresh.slice(0, newCount);
        } else {
          const repeat = generated.filter((q) =>
            recentTexts.has(q.questionText.trim()),
          );
          generated = [...fresh, ...repeat].slice(0, newCount);
        }
      } else {
        generated = generated.slice(0, newCount);
      }
    }

    // ── 4. Persist new questions & combine with retries ──────────
    const savedNew = await Promise.all(generated.map(persistQuestion));

    const combined = shuffle([...retryQuestions, ...savedNew]);

    res.json(combined);
  } catch (err) {
    console.error("Generate questions error:", err);
    res.status(500).json({ error: "Failed to generate questions" });
  }
});
