import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authMiddleware, AuthRequest } from "../middleware/auth.js";

export const gameRewardRouter = Router();
gameRewardRouter.use(authMiddleware);

const rewardSchema = z.object({
  childId: z.string(),
  gameType: z.string(),
  score: z.number().int().min(0),
  maxScore: z.number().int().min(1),
});

// POST /api/games/reward — award XP + coins for completing an interactive game
gameRewardRouter.post("/reward", async (req: AuthRequest, res: Response) => {
  try {
    const data = rewardSchema.parse(req.body);

    // Verify child belongs to user
    const child = await prisma.child.findFirst({
      where: { id: data.childId, userId: req.userId! },
    });
    if (!child) {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    const pct = data.score / data.maxScore;
    // XP: 5-30 based on score percentage; Coins: 2-15
    const xpGain = Math.round(5 + pct * 25);
    const coinGain = Math.round(2 + pct * 13);

    const updated = await prisma.child.update({
      where: { id: data.childId },
      data: {
        xp: { increment: xpGain },
        coins: { increment: coinGain },
        level: Math.floor((child.xp + xpGain) / 100) + 1,
      },
    });

    res.json({
      xpGain,
      coinGain,
      newXp: updated.xp,
      newCoins: updated.coins,
      newLevel: updated.level,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid input", details: err.errors });
      return;
    }
    console.error("Game reward error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});
