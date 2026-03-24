import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../api";

/* ───── question generators ────────────────────────── */

interface MoleQ { question: string; correct: number; options: number[] }

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateMathQ(round: number): MoleQ {
  const difficulty = Math.min(3, Math.floor(round / 4) + 1);
  let a: number, b: number, correct: number, question: string;

  if (difficulty === 1) {
    a = randInt(2, 15); b = randInt(2, 15);
    correct = a + b; question = `${a} + ${b} = ?`;
  } else if (difficulty === 2) {
    const op = Math.random() < 0.5 ? "×" : "-";
    if (op === "×") {
      a = randInt(2, 9); b = randInt(2, 9);
      correct = a * b; question = `${a} × ${b} = ?`;
    } else {
      a = randInt(15, 50); b = randInt(2, a - 1);
      correct = a - b; question = `${a} - ${b} = ?`;
    }
  } else {
    const op = Math.random() < 0.5 ? "×" : "÷";
    if (op === "×") {
      a = randInt(3, 12); b = randInt(3, 12);
      correct = a * b; question = `${a} × ${b} = ?`;
    } else {
      b = randInt(2, 9); correct = randInt(2, 12);
      a = b * correct; question = `${a} ÷ ${b} = ?`;
    }
  }

  // Generate decoys
  const decoys = new Set<number>();
  while (decoys.size < 5) {
    const d = correct + randInt(-10, 10);
    if (d !== correct && d > 0) decoys.add(d);
  }
  const options = shuffle([correct, ...Array.from(decoys).slice(0, 5)]);
  return { question, correct, options };
}

/* ───── constants ──────────────────────────────────── */
const TOTAL_ROUNDS = 15;
const HOLES = 6; // 2×3 grid
const MOLE_SHOW_BASE = 2200; // ms
const MOLE_SHOW_MIN = 1000;
const MOLE_SPEED_DECAY = 80; // ms faster each round

/* ───── component ──────────────────────────────────── */
export default function WhackAMoleGame() {
  const navigate = useNavigate();
  const { activeChild, updateActiveChild } = useAuth();

  const [phase, setPhase] = useState<"intro" | "playing" | "done">("intro");
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [currentQ, setCurrentQ] = useState<MoleQ | null>(null);
  const [activeMoles, setActiveMoles] = useState<(number | null)[]>(Array(HOLES).fill(null));
  const [hitHole, setHitHole] = useState<number | null>(null);
  const [missHole, setMissHole] = useState<number | null>(null);
  const [shake, setShake] = useState(false);
  const [reward, setReward] = useState<{ xpGain: number; coinGain: number } | null>(null);

  const roundRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRef = useRef(true);

  const showDuration = useCallback(
    (r: number) => Math.max(MOLE_SHOW_MIN, MOLE_SHOW_BASE - r * MOLE_SPEED_DECAY),
    []
  );

  const endGame = useCallback(async (finalScore: number) => {
    activeRef.current = false;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setPhase("done");
    if (!activeChild) return;
    try {
      const r = await api.claimGameReward({
        childId: activeChild.id,
        gameType: "whack-a-mole",
        score: finalScore,
        maxScore: TOTAL_ROUNDS,
      });
      setReward({ xpGain: r.xpGain, coinGain: r.coinGain });
      updateActiveChild({ xp: r.newXp, coins: r.newCoins, level: r.newLevel });
    } catch { /* ignore */ }
  }, [activeChild, updateActiveChild]);

  // Spawn a round of moles
  const spawnRound = useCallback((r: number, currentLives: number) => {
    if (!activeRef.current || r >= TOTAL_ROUNDS || currentLives <= 0) {
      return;
    }
    roundRef.current = r;
    const q = generateMathQ(r);
    setCurrentQ(q);
    setRound(r + 1);
    setHitHole(null);
    setMissHole(null);

    // Place correct answer + decoys in random holes
    const correctHole = randInt(0, HOLES - 1);
    const otherHoles = shuffle(
      Array.from({ length: HOLES }, (_, i) => i).filter(i => i !== correctHole)
    );
    const newMoles: (number | null)[] = Array(HOLES).fill(null);
    newMoles[correctHole] = q.correct;
    const decoys = q.options.filter(o => o !== q.correct);
    otherHoles.forEach((hole, idx) => {
      if (idx < decoys.length) newMoles[hole] = decoys[idx];
    });
    setActiveMoles(newMoles);

    // Auto-hide after time
    const dur = showDuration(r);
    timeoutRef.current = setTimeout(() => {
      if (!activeRef.current) return;
      // Missed — lose a life
      const newLives = currentLives - 1;
      setLives(newLives);
      setShake(true);
      setTimeout(() => setShake(false), 400);
      setActiveMoles(Array(HOLES).fill(null));
      if (newLives <= 0 || r + 1 >= TOTAL_ROUNDS) {
        endGame(roundRef.current > 0 ? Math.round((score / (r + 1)) * TOTAL_ROUNDS) : 0);
      } else {
        setTimeout(() => spawnRound(r + 1, newLives), 600);
      }
    }, dur);
  }, [showDuration, endGame, score]);

  const startGame = () => {
    setPhase("playing");
    setScore(0);
    setLives(3);
    setRound(0);
    setReward(null);
    activeRef.current = true;
    setTimeout(() => spawnRound(0, 3), 500);
  };

  // Cleanup
  useEffect(() => {
    return () => {
      activeRef.current = false;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleWhack = (holeIdx: number) => {
    if (phase !== "playing" || !currentQ || activeMoles[holeIdx] === null) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    const value = activeMoles[holeIdx]!;
    const isCorrect = value === currentQ.correct;

    if (isCorrect) {
      setHitHole(holeIdx);
      const newScore = score + 1;
      setScore(newScore);
      setActiveMoles(Array(HOLES).fill(null));

      if (round >= TOTAL_ROUNDS) {
        setTimeout(() => endGame(newScore), 500);
      } else {
        setTimeout(() => spawnRound(round, lives), 600);
      }
    } else {
      setMissHole(holeIdx);
      const newLives = lives - 1;
      setLives(newLives);
      setShake(true);
      setTimeout(() => setShake(false), 400);
      setActiveMoles(Array(HOLES).fill(null));

      if (newLives <= 0) {
        setTimeout(() => endGame(score), 500);
      } else {
        setTimeout(() => spawnRound(round, newLives), 600);
      }
    }
  };

  const stars = score >= TOTAL_ROUNDS * 0.9 ? 3 : score >= TOTAL_ROUNDS * 0.6 ? 2 : 1;

  /* ───── intro screen ─────────────────────────────── */
  if (phase === "intro") {
    return (
      <div className="max-w-lg mx-auto px-3 sm:px-4 py-6 sm:py-10">
        <button
          onClick={() => navigate("/")}
          className="mb-4 text-sm text-gray-500 hover:text-gray-700"
        >
          ← חזרה
        </button>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 text-center"
        >
          <div className="text-5xl sm:text-7xl mb-4">🔨</div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">הכה את השומה!</h1>
          <p className="text-gray-500 text-sm sm:text-base mb-2">
            שומות מציצות עם תשובות — הכו את השומה עם התשובה הנכונה!
          </p>
          <div className="text-sm text-gray-400 mb-6 space-y-1">
            <p>🎯 {TOTAL_ROUNDS} סיבובים</p>
            <p>❤️ 3 חיים</p>
            <p>⚡ המשחק מתגבר בקושי!</p>
          </div>
          <button
            onClick={startGame}
            className="px-8 py-3 bg-red-500 text-white text-lg rounded-2xl font-bold hover:bg-red-600 active:scale-95 transition-all shadow-lg"
          >
            🔨 יאללה!
          </button>
        </motion.div>
      </div>
    );
  }

  /* ───── done screen ──────────────────────────────── */
  if (phase === "done") {
    return (
      <div className="max-w-lg mx-auto px-3 sm:px-4 py-8 sm:py-12">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-2xl shadow-xl p-5 sm:p-8 text-center"
        >
          <div className="text-5xl sm:text-6xl mb-3">{score >= TOTAL_ROUNDS * 0.6 ? "🎉" : "💪"}</div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">
            {score >= TOTAL_ROUNDS * 0.6 ? "מדהים!" : "נסיון טוב!"}
          </h2>
          <div className="text-3xl mb-4">
            {[1, 2, 3].map(s => (
              <span key={s} className={s <= stars ? "opacity-100" : "opacity-20"}>⭐</span>
            ))}
          </div>

          <div className="flex justify-center gap-8 mb-4 text-sm text-gray-500">
            <div className="text-center">
              <div className="text-xl font-bold text-gray-700">{score}/{round}</div>
              <div>תשובות נכונות</div>
            </div>
          </div>

          {reward && (
            <div className="flex justify-center gap-6 mb-6">
              <div className="text-center">
                <div className="text-xl font-bold text-purple-500">+{reward.xpGain}</div>
                <div className="text-xs text-gray-400">XP</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-yellow-500">+{reward.coinGain}</div>
                <div className="text-xs text-gray-400">מטבעות</div>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={startGame}
              className="flex-1 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600"
            >
              🔄 שחק שוב
            </button>
            <button
              onClick={() => navigate("/")}
              className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200"
            >
              🏠 ראשי
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  /* ───── playing screen ───────────────────────────── */
  return (
    <div className={`max-w-lg mx-auto px-2 sm:px-4 py-4 sm:py-6 ${shake ? "animate-shake" : ""}`}>
      {/* HUD */}
      <div className="flex items-center justify-between mb-3 sm:mb-4 px-1">
        <div className="flex gap-1">
          {[1, 2, 3].map(i => (
            <span key={i} className={`text-xl sm:text-2xl ${i <= lives ? "" : "opacity-20"}`}>❤️</span>
          ))}
        </div>
        <div className="text-sm sm:text-base font-bold text-gray-600">
          סיבוב {round}/{TOTAL_ROUNDS}
        </div>
        <div className="text-lg sm:text-xl font-bold text-indigo-600">
          🎯 {score}
        </div>
      </div>

      {/* Question */}
      <AnimatePresence mode="wait">
        {currentQ && (
          <motion.div
            key={round}
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 10, opacity: 0 }}
            className="bg-white rounded-2xl shadow-lg p-3 sm:p-4 text-center mb-4 sm:mb-6"
          >
            <p className="text-lg sm:text-2xl font-bold text-gray-800" dir="ltr">
              {currentQ.question}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mole grid — 2×3 */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {activeMoles.map((value, idx) => (
          <motion.button
            key={idx}
            onClick={() => handleWhack(idx)}
            className="relative aspect-square rounded-2xl overflow-hidden"
            whileTap={value !== null ? { scale: 0.9 } : {}}
          >
            {/* Hole background */}
            <div className="absolute inset-0 bg-gradient-to-b from-amber-100 to-amber-200 rounded-2xl border-2 border-amber-300" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[80%] h-[35%] bg-amber-800/30 rounded-[50%]" />

            {/* Mole */}
            <AnimatePresence>
              {value !== null && (
                <motion.div
                  initial={{ y: 40, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 40, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className={`absolute inset-0 flex flex-col items-center justify-center cursor-pointer 
                    ${hitHole === idx ? "bg-green-200/80" : missHole === idx ? "bg-red-200/80" : ""}`}
                >
                  <span className="text-2xl sm:text-4xl mb-0.5">
                    {hitHole === idx ? "✅" : missHole === idx ? "❌" : "🐹"}
                  </span>
                  <span className="text-sm sm:text-lg font-bold text-gray-800 bg-white/80 rounded-lg px-2 py-0.5">
                    {value}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
