import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authMiddleware, AuthRequest } from "../middleware/auth.js";

export const childRouter = Router();
childRouter.use(authMiddleware);

const createChildSchema = z.object({
  name: z.string().min(1),
  grade: z.number().int().min(2).max(3),
  avatarType: z.enum(["owl", "robot", "cat"]).optional(),
  avatarColor: z.string().optional(),
});

// List children for current user
childRouter.get("/", async (req: AuthRequest, res: Response) => {
  const children = await prisma.child.findMany({
    where: { userId: req.userId! },
    orderBy: { createdAt: "asc" },
  });
  res.json(children);
});

// Create child profile
childRouter.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const data = createChildSchema.parse(req.body);
    const child = await prisma.child.create({
      data: { ...data, userId: req.userId! },
    });
    res.status(201).json(child);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid input", details: err.errors });
      return;
    }
    console.error("Create child error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get single child (with ownership check)
childRouter.get("/:id", async (req: AuthRequest, res: Response) => {
  const child = await prisma.child.findFirst({
    where: { id: req.params.id, userId: req.userId! },
    include: {
      achievements: { include: { achievement: true } },
      streaks: { orderBy: { date: "desc" }, take: 30 },
    },
  });

  if (!child) {
    res.status(404).json({ error: "Child not found" });
    return;
  }

  res.json(child);
});

// Update child profile
childRouter.patch("/:id", async (req: AuthRequest, res: Response) => {
  const updateSchema = z.object({
    name: z.string().min(1).optional(),
    avatarType: z.enum(["owl", "robot", "cat"]).optional(),
    avatarColor: z.string().optional(),
  });

  try {
    const data = updateSchema.parse(req.body);

    // Verify ownership
    const existing = await prisma.child.findFirst({
      where: { id: req.params.id, userId: req.userId! },
    });
    if (!existing) {
      res.status(404).json({ error: "Child not found" });
      return;
    }

    const child = await prisma.child.update({
      where: { id: req.params.id },
      data,
    });
    res.json(child);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid input", details: err.errors });
      return;
    }
    console.error("Update child error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Reset child progress (XP, coins, level, answers, sessions)
childRouter.post("/:id/reset", async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.child.findFirst({
      where: { id: req.params.id, userId: req.userId! },
    });
    if (!existing) { res.status(404).json({ error: "Child not found" }); return; }

    await prisma.$transaction([
      prisma.answer.deleteMany({ where: { childId: req.params.id } }),
      prisma.gameSession.deleteMany({ where: { childId: req.params.id } }),
      prisma.childAchievement.deleteMany({ where: { childId: req.params.id } }),
      prisma.streak.deleteMany({ where: { childId: req.params.id } }),
      prisma.simulationResult.deleteMany({ where: { childId: req.params.id } }),
      prisma.child.update({
        where: { id: req.params.id },
        data: { xp: 0, coins: 0, level: 1 },
      }),
    ]);

    const child = await prisma.child.findUnique({ where: { id: req.params.id } });
    res.json(child);
  } catch (err) {
    console.error("Reset child error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete child profile
childRouter.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.child.findFirst({
      where: { id: req.params.id, userId: req.userId! },
    });
    if (!existing) { res.status(404).json({ error: "Child not found" }); return; }

    await prisma.$transaction([
      prisma.answer.deleteMany({ where: { childId: req.params.id } }),
      prisma.gameSession.deleteMany({ where: { childId: req.params.id } }),
      prisma.childAchievement.deleteMany({ where: { childId: req.params.id } }),
      prisma.streak.deleteMany({ where: { childId: req.params.id } }),
      prisma.simulationResult.deleteMany({ where: { childId: req.params.id } }),
      prisma.child.delete({ where: { id: req.params.id } }),
    ]);

    res.json({ success: true });
  } catch (err) {
    console.error("Delete child error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});
