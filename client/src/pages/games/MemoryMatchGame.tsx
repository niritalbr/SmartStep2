import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../api";

/* ───── pair pools ─────────────────────────────────── */

interface Pair { a: string; b: string }

const VOCAB_PAIRS: Pair[] = [
  { a: "חסכן", b: "שומר על כסף" },
  { a: "נדיב", b: "נותן בשמחה" },
  { a: "עקשן", b: "לא מוותר" },
  { a: "זריז", b: "מהיר ומיומן" },
  { a: "אמיץ", b: "לא מפחד" },
  { a: "ענק", b: "גדול מאוד" },
  { a: "זהיר", b: "נזהר מסכנות" },
  { a: "ממציא", b: "יוצר דבר חדש" },
  { a: "סקרן", b: "רוצה לדעת הכל" },
  { a: "חרוץ", b: "עובד קשה" },
  { a: "יצירתי", b: "חושב מחוץ לקופסה" },
  { a: "נחוש", b: "לא מפסיק עד שמצליח" },
];

const SYNONYM_PAIRS: Pair[] = [
  { a: "שמח", b: "עליז" },
  { a: "עצוב", b: "נוגה" },
  { a: "גדול", b: "ענק" },
  { a: "קטן", b: "זעיר" },
  { a: "חכם", b: "נבון" },
  { a: "יפה", b: "נאה" },
  { a: "מהיר", b: "זריז" },
  { a: "אמיץ", b: "גיבור" },
  { a: "כעוס", b: "זועם" },
  { a: "שקט", b: "דומם" },
  { a: "חזק", b: "עצום" },
  { a: "עייף", b: "תשוש" },
];

const MATH_PAIRS: Pair[] = [
  { a: "7 × 8", b: "56" },
  { a: "12 + 19", b: "31" },
  { a: "45 - 17", b: "28" },
  { a: "6 × 9", b: "54" },
  { a: "81 ÷ 9", b: "9" },
  { a: "15 + 27", b: "42" },
  { a: "100 - 36", b: "64" },
  { a: "8 × 7", b: "56" },
  { a: "48 ÷ 6", b: "8" },
  { a: "33 + 18", b: "51" },
  { a: "5 × 12", b: "60" },
  { a: "72 - 25", b: "47" },
];

type Mode = "vocab" | "synonyms" | "math";
const MODES: { id: Mode; name: string; icon: string; color: string }[] = [
  { id: "vocab", name: "מילים והגדרות", icon: "📖", color: "#6366f1" },
  { id: "synonyms", name: "מילים נרדפות", icon: "🔗", color: "#10b981" },
  { id: "math", name: "תרגילי חשבון", icon: "🧮", color: "#ef4444" },
];

const POOL: Record<Mode, Pair[]> = {
  vocab: VOCAB_PAIRS,
  synonyms: SYNONYM_PAIRS,
  math: MATH_PAIRS,
};

/* ───── card type ──────────────────────────────────── */
interface Card {
  id: number;
  text: string;
  pairId: number;
  flipped: boolean;
  matched: boolean;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildCards(mode: Mode, pairCount: number): Card[] {
  const pool = shuffle(POOL[mode]).slice(0, pairCount);
  const cards: Card[] = [];
  pool.forEach((pair, idx) => {
    cards.push({ id: idx * 2, text: pair.a, pairId: idx, flipped: false, matched: false });
    cards.push({ id: idx * 2 + 1, text: pair.b, pairId: idx, flipped: false, matched: false });
  });
  return shuffle(cards);
}

/* ───── component ──────────────────────────────────── */
export default function MemoryMatchGame() {
  const navigate = useNavigate();
  const { activeChild, updateActiveChild } = useAuth();

  // State
  const [mode, setMode] = useState<Mode | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [flippedIds, setFlippedIds] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matchedCount, setMatchedCount] = useState(0);
  const [timer, setTimer] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [reward, setReward] = useState<{ xpGain: number; coinGain: number } | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lockRef = useRef(false);

  const pairCount = 6; // 12 cards total = 4×3 grid

  // Timer
  useEffect(() => {
    if (mode && !gameOver) {
      timerRef.current = setInterval(() => setTimer(t => t + 1), 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [mode, gameOver]);

  const startGame = (m: Mode) => {
    setMode(m);
    setCards(buildCards(m, pairCount));
    setFlippedIds([]);
    setMoves(0);
    setMatchedCount(0);
    setTimer(0);
    setGameOver(false);
    setReward(null);
    lockRef.current = false;
  };

  const claimReward = useCallback(async (score: number) => {
    if (!activeChild) return;
    try {
      const r = await api.claimGameReward({
        childId: activeChild.id,
        gameType: "memory-match",
        score,
        maxScore: pairCount,
      });
      setReward({ xpGain: r.xpGain, coinGain: r.coinGain });
      updateActiveChild({ xp: r.newXp, coins: r.newCoins, level: r.newLevel });
    } catch { /* ignore */ }
  }, [activeChild, updateActiveChild]);

  const handleFlip = (cardId: number) => {
    if (lockRef.current || gameOver) return;
    const card = cards.find(c => c.id === cardId);
    if (!card || card.flipped || card.matched) return;

    const newFlipped = [...flippedIds, cardId];
    setFlippedIds(newFlipped);
    setCards(prev => prev.map(c => c.id === cardId ? { ...c, flipped: true } : c));

    if (newFlipped.length === 2) {
      lockRef.current = true;
      setMoves(m => m + 1);

      const [first, second] = newFlipped.map(id => cards.find(c => c.id === id)!);
      const firstCard = cardId === first.id ? card : first;
      const secondCard = cardId === second.id ? card : second;

      if (firstCard.pairId === secondCard.pairId) {
        // Match!
        setTimeout(() => {
          setCards(prev => prev.map(c =>
            c.id === firstCard.id || c.id === secondCard.id ? { ...c, matched: true } : c
          ));
          setFlippedIds([]);
          const newMatched = matchedCount + 1;
          setMatchedCount(newMatched);
          lockRef.current = false;

          if (newMatched === pairCount) {
            setGameOver(true);
            if (timerRef.current) clearInterval(timerRef.current);
            // Score: fewer moves = better
            const perfectMoves = pairCount;
            const score = Math.max(1, Math.round(pairCount * (perfectMoves / Math.max(moves + 1, perfectMoves))));
            claimReward(score);
          }
        }, 400);
      } else {
        // No match — flip back
        setTimeout(() => {
          setCards(prev => prev.map(c =>
            c.id === firstCard.id || c.id === secondCard.id ? { ...c, flipped: false } : c
          ));
          setFlippedIds([]);
          lockRef.current = false;
        }, 800);
      }
    }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  const stars = moves <= pairCount + 2 ? 3 : moves <= pairCount * 2 ? 2 : 1;

  /* ───── mode select ──────────────────────────────── */
  if (!mode) {
    return (
      <div className="max-w-lg mx-auto px-3 sm:px-4 py-6 sm:py-10">
        <button
          onClick={() => navigate("/")}
          className="mb-4 text-sm text-gray-500 hover:text-gray-700"
        >
          ← חזרה
        </button>

        <div className="text-center mb-8">
          <div className="text-5xl sm:text-6xl mb-3">🧠</div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">משחק זיכרון</h1>
          <p className="text-gray-500 text-sm sm:text-base">
            הפכו קלפים ומצאו את הזוגות התואמים!
          </p>
        </div>

        <div className="space-y-3">
          {MODES.map(m => (
            <motion.button
              key={m.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => startGame(m.id)}
              className="w-full flex items-center gap-4 p-4 sm:p-5 bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow text-right"
            >
              <span className="text-3xl sm:text-4xl">{m.icon}</span>
              <div className="flex-1">
                <h3 className="font-bold text-gray-800 text-base sm:text-lg">{m.name}</h3>
                <p className="text-xs sm:text-sm text-gray-500">6 זוגות · 12 קלפים</p>
              </div>
              <span className="text-gray-300 text-2xl">›</span>
            </motion.button>
          ))}
        </div>
      </div>
    );
  }

  /* ───── game over ────────────────────────────────── */
  if (gameOver) {
    return (
      <div className="max-w-lg mx-auto px-3 sm:px-4 py-8 sm:py-12">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-2xl shadow-xl p-5 sm:p-8 text-center"
        >
          <div className="text-5xl sm:text-6xl mb-3">🎉</div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">כל הכבוד!</h2>
          <div className="text-3xl mb-4">
            {[1, 2, 3].map(s => (
              <span key={s} className={s <= stars ? "opacity-100" : "opacity-20"}>⭐</span>
            ))}
          </div>

          <div className="flex justify-center gap-6 sm:gap-8 mb-4 text-sm text-gray-500">
            <div className="text-center">
              <div className="text-lg sm:text-xl font-bold text-gray-700">{moves}</div>
              <div>מהלכים</div>
            </div>
            <div className="text-center">
              <div className="text-lg sm:text-xl font-bold text-gray-700">{formatTime(timer)}</div>
              <div>זמן</div>
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
              onClick={() => startGame(mode)}
              className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700"
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

  /* ───── game board ───────────────────────────────── */
  const modeInfo = MODES.find(m => m.id === mode)!;

  return (
    <div className="max-w-lg mx-auto px-2 sm:px-4 py-4 sm:py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setMode(null)} className="text-sm text-gray-500 hover:text-gray-700">
          ← חזרה
        </button>
        <div className="flex items-center gap-3 sm:gap-4 text-sm text-gray-600">
          <span>🎯 {matchedCount}/{pairCount}</span>
          <span>👆 {moves}</span>
          <span>⏱ {formatTime(timer)}</span>
        </div>
      </div>

      {/* Title */}
      <div className="text-center mb-4">
        <h2 className="text-base sm:text-lg font-bold text-gray-700">
          {modeInfo.icon} {modeInfo.name}
        </h2>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-3">
        {cards.map(card => (
          <motion.button
            key={card.id}
            onClick={() => handleFlip(card.id)}
            whileTap={{ scale: 0.95 }}
            className={`aspect-square rounded-xl text-sm sm:text-base font-bold transition-all duration-300 
              ${card.matched
                ? "bg-green-100 border-2 border-green-300 text-green-700 scale-95 opacity-60"
                : card.flipped
                  ? "bg-white border-2 shadow-md text-gray-800"
                  : "bg-gradient-to-br from-indigo-400 to-purple-500 border-2 border-indigo-300 text-white shadow-lg hover:shadow-xl cursor-pointer"
              }`}
            style={card.flipped && !card.matched ? { borderColor: modeInfo.color } : {}}
          >
            <AnimatePresence mode="wait">
              {card.flipped || card.matched ? (
                <motion.span
                  key="front"
                  initial={{ rotateY: 90, opacity: 0 }}
                  animate={{ rotateY: 0, opacity: 1 }}
                  exit={{ rotateY: -90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center justify-center w-full h-full p-1 text-xs sm:text-sm leading-tight"
                >
                  {card.text}
                </motion.span>
              ) : (
                <motion.span
                  key="back"
                  initial={{ rotateY: -90, opacity: 0 }}
                  animate={{ rotateY: 0, opacity: 1 }}
                  exit={{ rotateY: 90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-xl sm:text-2xl"
                >
                  ❓
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
