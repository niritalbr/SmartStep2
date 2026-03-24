import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { authRouter } from "./routes/auth.js";
import { questionsRouter } from "./routes/questions.js";
import { answersRouter } from "./routes/answers.js";
import { childRouter } from "./routes/child.js";
import { sessionsRouter } from "./routes/sessions.js";
import { statsRouter } from "./routes/stats.js";
import { generateRouter } from "./routes/generate.js";
import { gameRewardRouter } from "./routes/gameReward.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.CORS_ORIGIN || "http://localhost:5173" }));
app.use(express.json());

// Static files for extracted images
app.use("/api/images", express.static("data/images"));

// Routes
app.use("/api/auth", authRouter);
app.use("/api/children", childRouter);
app.use("/api/questions/generate", generateRouter);
app.use("/api/questions", questionsRouter);
app.use("/api/answers", answersRouter);
app.use("/api/sessions", sessionsRouter);
app.use("/api/stats", statsRouter);
app.use("/api/games", gameRewardRouter);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Serve frontend static files in production
const clientDist = path.join(__dirname, "../../client/dist");
app.use(express.static(clientDist));

// SPA fallback: any non-API route serves index.html
app.get("*", (_req, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export default app;
