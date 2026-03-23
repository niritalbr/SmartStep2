import { Router, Response } from "express";
import { z } from "zod";
import { Category } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { authMiddleware, AuthRequest } from "../middleware/auth.js";

export const sessionsRouter = Router();
sessionsRouter.use(authMiddleware);

const createSessionSchema = z.object({
  childId: z.string(),
  category: z.nativeEnum(Category),
  mode: z.enum(["practice", "challenge", "race"]),
});

// Start a game session
sessionsRouter.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const data = createSessionSchema.parse(req.body);

    const child = await prisma.child.findFirst({
      where: { id: data.childId, userId: req.userId! },
    });
    if (!child) {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    const session = await prisma.gameSession.create({
      data: {
        childId: data.childId,
        category: data.category,
        mode: data.mode,
      },
    });

    res.status(201).json(session);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid input", details: err.errors });
      return;
    }
    console.error("Create session error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// End a game session
sessionsRouter.patch("/:id/end", async (req: AuthRequest, res: Response) => {
  const session = await prisma.gameSession.findUnique({
    where: { id: req.params.id },
    include: { answers: true, child: true },
  });

  if (!session || session.child.userId !== req.userId) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const score = session.answers.filter((a) => a.isCorrect).length;
  const total = session.answers.length;
  const pct = total > 0 ? score / total : 0;
  const stars = pct >= 0.9 ? 3 : pct >= 0.7 ? 2 : pct >= 0.5 ? 1 : 0;
  const xpEarned = session.answers.reduce(
    (sum, a) => sum + (a.isCorrect ? (a.hintsUsed > 0 ? 5 : 10) : 2),
    0
  );
  const coinsEarned = session.answers.reduce(
    (sum, a) => sum + (a.isCorrect ? (a.hintsUsed > 0 ? 1 : 3) : 0),
    0
  );

  // Update streak
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  await prisma.streak.upsert({
    where: { childId_date: { childId: session.childId, date: today } },
    create: { childId: session.childId, date: today },
    update: {},
  });

  const updated = await prisma.gameSession.update({
    where: { id: req.params.id },
    data: { score, total, stars, xpEarned, coinsEarned, endedAt: new Date() },
  });

  res.json(updated);
});

// Get session history for a child
sessionsRouter.get("/child/:childId", async (req: AuthRequest, res: Response) => {
  const child = await prisma.child.findFirst({
    where: { id: req.params.childId, userId: req.userId! },
  });
  if (!child) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const sessions = await prisma.gameSession.findMany({
    where: { childId: req.params.childId },
    orderBy: { startedAt: "desc" },
    take: 50,
  });

  res.json(sessions);
});
