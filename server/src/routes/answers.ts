import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authMiddleware, AuthRequest } from "../middleware/auth.js";

export const answersRouter = Router();
answersRouter.use(authMiddleware);

const submitAnswerSchema = z.object({
  childId: z.string(),
  questionId: z.string(),
  selected: z.string(),
  timeSpentMs: z.number().int().min(0),
  hintsUsed: z.number().int().min(0).max(2).optional(),
  sessionId: z.string().optional(),
});

// Submit an answer
answersRouter.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const data = submitAnswerSchema.parse(req.body);

    // Verify child belongs to user
    const child = await prisma.child.findFirst({
      where: { id: data.childId, userId: req.userId! },
    });
    if (!child) {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    // Get the question to check correctness
    const question = await prisma.question.findUnique({
      where: { id: data.questionId },
    });
    if (!question) {
      res.status(404).json({ error: "Question not found" });
      return;
    }

    const isCorrect = data.selected === question.correctAnswer;

    // Calculate rewards
    const xpGain = isCorrect ? (data.hintsUsed ? 5 : 10) : 2;
    const coinGain = isCorrect ? (data.hintsUsed ? 1 : 3) : 0;

    // Save answer and update child in a transaction
    const [answer] = await prisma.$transaction([
      prisma.answer.create({
        data: {
          childId: data.childId,
          questionId: data.questionId,
          selected: data.selected,
          isCorrect,
          timeSpentMs: data.timeSpentMs,
          hintsUsed: data.hintsUsed || 0,
          sessionId: data.sessionId,
        },
      }),
      prisma.child.update({
        where: { id: data.childId },
        data: {
          xp: { increment: xpGain },
          coins: { increment: coinGain },
          level: Math.floor((child.xp + xpGain) / 100) + 1,
        },
      }),
    ]);

    res.json({
      answerId: answer.id,
      isCorrect,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
      xpGain,
      coinGain,
      newXp: child.xp + xpGain,
      newCoins: child.coins + coinGain,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid input", details: err.errors });
      return;
    }
    console.error("Submit answer error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});
