import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../api";

/* ───── synonym data ───────────────────────────────── */

interface WordGroup {
  base: string;
  synonyms: string[];
  distractors: string[];
}

const WORD_GROUPS: WordGroup[] = [
  { base: "שמח", synonyms: ["עליז", "מאושר", "צוהל"], distractors: ["עצוב", "כועס", "עייף", "שקט"] },
  { base: "עצוב", synonyms: ["נוגה", "מדוכא", "עגום"], distractors: ["שמח", "עליז", "אמיץ", "חזק"] },
  { base: "גדול", synonyms: ["ענק", "עצום", "אדיר"], distractors: ["קטן", "זעיר", "חלש", "איטי"] },
  { base: "קטן", synonyms: ["זעיר", "פעוט", "דק"], distractors: ["ענק", "גדול", "עצום", "רחב"] },
  { base: "חכם", synonyms: ["נבון", "פיקח", "מבריק"], distractors: ["טיפש", "אטי", "שקט", "צעיר"] },
  { base: "יפה", synonyms: ["נאה", "הדור", "מקסים"], distractors: ["מכוער", "עקום", "קשה", "חזק"] },
  { base: "מהיר", synonyms: ["זריז", "מיידי", "חטוף"], distractors: ["איטי", "כבד", "עייף", "עצלן"] },
  { base: "אמיץ", synonyms: ["גיבור", "נועז", "אמיצני"], distractors: ["פחדן", "ביישן", "שקט", "קטן"] },
  { base: "כעוס", synonyms: ["זועם", "רותח", "נסער"], distractors: ["שמח", "רגוע", "שלו", "עליז"] },
  { base: "חזק", synonyms: ["עצמתי", "איתן", "אדיר"], distractors: ["חלש", "רפה", "קטן", "עדין"] },
  { base: "עייף", synonyms: ["תשוש", "מותש", "מוגמר"], distractors: ["ערני", "חזק", "מהיר", "שמח"] },
  { base: "חם", synonyms: ["לוהט", "רותח", "בוער"], distractors: ["קר", "קפוא", "צונן", "רגוע"] },
  { base: "קר", synonyms: ["צונן", "קפוא", "מקרר"], distractors: ["חם", "לוהט", "בוער", "גדול"] },
  { base: "רגוע", synonyms: ["שלו", "שקט", "נינוח"], distractors: ["לחוץ", "עצבני", "כועס", "מהיר"] },
  { base: "חשוב", synonyms: ["משמעותי", "מרכזי", "עיקרי"], distractors: ["שולי", "קטן", "פשוט", "רגיל"] },
  { base: "קשה", synonyms: ["מאתגר", "סבוך", "מורכב"], distractors: ["קל", "פשוט", "נוח", "שמח"] },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ───── types ──────────────────────────────────────── */

interface FallingWord {
  id: number;
  text: string;
  isSynonym: boolean;
  x: number; // 0-100 percent
  y: number; // 0-100 percent (100 = bottom)
  alive: boolean;
  exploding: boolean;
}

interface Bullet {
  id: number;
  x: number;
  y: number;
}

/* ───── constants ──────────────────────────────────── */
const MAX_LIVES = 3;
const WORDS_TO_WIN = 12; // correct synonyms to pass for a full game
const SPAWN_INTERVAL_BASE = 1800;
const SPAWN_INTERVAL_MIN = 800;
const FALL_SPEED_BASE = 0.35; // percent per frame
const FALL_SPEED_MAX = 0.9;
const BULLET_SPEED = 2.5;

/* ───── component ──────────────────────────────────── */

export default function SynonymInvadersGame() {
  const navigate = useNavigate();
  const { activeChild, updateActiveChild } = useAuth();

  const [phase, setPhase] = useState<"intro" | "playing" | "done">("intro");
  const [shipX, setShipX] = useState(50); // center percent
  const [shipWord, setShipWord] = useState("");
  const [, setCurrentGroup] = useState<WordGroup | null>(null);
  const [fallingWords, setFallingWords] = useState<FallingWord[]>([]);
  const [bullets, setBullets] = useState<Bullet[]>([]);
  const [lives, setLives] = useState(MAX_LIVES);
  const [score, setScore] = useState(0);
  const [synonymsCleared, setSynonymsCleared] = useState(0);
  const [reward, setReward] = useState<{ xpGain: number; coinGain: number } | null>(null);
  const [hitFlash, setHitFlash] = useState(false);

  // Refs for game loop
  const gameRef = useRef({
    fallingWords: [] as FallingWord[],
    bullets: [] as Bullet[],
    shipX: 50,
    lives: MAX_LIVES,
    score: 0,
    synonymsCleared: 0,
    currentGroup: null as WordGroup | null,
    usedGroups: new Set<number>(),
    nextId: 0,
    running: false,
    fallSpeed: FALL_SPEED_BASE,
    spawnInterval: SPAWN_INTERVAL_BASE,
    synonymQueued: false,
  });
  const frameRef = useRef<number>(0);
  const spawnRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  /* ───── pick new word group ──────────────────────── */
  const pickNewGroup = useCallback(() => {
    const g = gameRef.current;
    const available = WORD_GROUPS.filter((_, i) => !g.usedGroups.has(i));
    const pool = available.length > 0 ? available : WORD_GROUPS;
    const idx = WORD_GROUPS.indexOf(pool[Math.floor(Math.random() * pool.length)]);
    g.usedGroups.add(idx);
    g.currentGroup = WORD_GROUPS[idx];
    g.synonymQueued = false;
    setShipWord(WORD_GROUPS[idx].base);
    setCurrentGroup(WORD_GROUPS[idx]);
  }, []);

  /* ───── spawn a falling word ─────────────────────── */
  const spawnWord = useCallback(() => {
    const g = gameRef.current;
    if (!g.running || !g.currentGroup) return;

    const group = g.currentGroup;
    let text: string;
    let isSynonym = false;

    // Every 3-5 words, guarantee a synonym falls
    const existingSynonyms = g.fallingWords.filter(w => w.isSynonym && w.alive).length;
    const shouldBeSynonym = !g.synonymQueued && (existingSynonyms === 0 && Math.random() < 0.4);

    if (shouldBeSynonym) {
      const syns = shuffle(group.synonyms);
      text = syns[0];
      isSynonym = true;
      g.synonymQueued = true;
    } else if (Math.random() < 0.3 && !g.synonymQueued) {
      const syns = shuffle(group.synonyms);
      text = syns[0];
      isSynonym = true;
      g.synonymQueued = true;
    } else {
      const distractors = shuffle(group.distractors);
      text = distractors[0];
      isSynonym = false;
    }

    const word: FallingWord = {
      id: g.nextId++,
      text,
      isSynonym,
      x: 8 + Math.random() * 84,
      y: -5,
      alive: true,
      exploding: false,
    };
    g.fallingWords.push(word);

    // Schedule next spawn
    const jitter = Math.random() * 600 - 300;
    spawnRef.current = setTimeout(spawnWord, g.spawnInterval + jitter);
  }, []);

  /* ───── game loop ────────────────────────────────── */
  const gameLoop = useCallback(() => {
    const g = gameRef.current;
    if (!g.running) return;

    // Move bullets up
    g.bullets = g.bullets.filter(b => b.y > -5);
    g.bullets.forEach(b => { b.y -= BULLET_SPEED; });

    // Move falling words down
    g.fallingWords.forEach(w => {
      if (!w.alive) return;
      w.y += g.fallSpeed;
    });

    // Check bullet-word collisions
    for (const b of g.bullets) {
      for (const w of g.fallingWords) {
        if (!w.alive || w.exploding) continue;
        const dx = Math.abs(b.x - w.x);
        const dy = Math.abs(b.y - w.y);
        if (dx < 8 && dy < 4) {
          // Hit!
          w.alive = false;
          w.exploding = true;
          b.y = -100; // remove bullet
          if (w.isSynonym) {
            // Shot a synonym — mistake! Lose a life
            g.lives--;
            setLives(g.lives);
            setHitFlash(true);
            setTimeout(() => setHitFlash(false), 300);
            if (g.lives <= 0) {
              g.running = false;
              finishGame(g.score, g.synonymsCleared);
              return;
            }
          } else {
            // Correctly shot a distractor
            g.score += 10;
            setScore(g.score);
          }
          break;
        }
      }
    }

    // Check words reaching bottom
    g.fallingWords.forEach(w => {
      if (!w.alive) return;
      if (w.y >= 90) {
        w.alive = false;
        if (w.isSynonym) {
          // Synonym passed through — correct!
          g.score += 25;
          g.synonymsCleared++;
          setScore(g.score);
          setSynonymsCleared(g.synonymsCleared);

          // Increase difficulty
          g.fallSpeed = Math.min(FALL_SPEED_MAX, g.fallSpeed + 0.03);
          g.spawnInterval = Math.max(SPAWN_INTERVAL_MIN, g.spawnInterval - 70);

          if (g.synonymsCleared >= WORDS_TO_WIN) {
            g.running = false;
            finishGame(g.score, g.synonymsCleared);
            return;
          }
          // New word for ship
          pickNewGroup();
        } else {
          // Distractor reached bottom — mistake! Lose a life
          g.lives--;
          setLives(g.lives);
          setHitFlash(true);
          setTimeout(() => setHitFlash(false), 300);
          if (g.lives <= 0) {
            g.running = false;
            finishGame(g.score, g.synonymsCleared);
            return;
          }
        }
      }
    });

    // Cleanup dead words after explosion animation
    g.fallingWords = g.fallingWords.filter(w => w.alive || w.y < 95);

    // Update React state
    setFallingWords([...g.fallingWords]);
    setBullets([...g.bullets]);

    frameRef.current = requestAnimationFrame(gameLoop);
  }, [pickNewGroup]);

  /* ───── finish ───────────────────────────────────── */
  const finishGame = useCallback(async (_finalScore: number, cleared: number) => {
    if (spawnRef.current) clearTimeout(spawnRef.current);
    setPhase("done");
    if (!activeChild) return;
    try {
      const r = await api.claimGameReward({
        childId: activeChild.id,
        gameType: "synonym-invaders",
        score: Math.min(cleared, WORDS_TO_WIN),
        maxScore: WORDS_TO_WIN,
      });
      setReward({ xpGain: r.xpGain, coinGain: r.coinGain });
      updateActiveChild({ xp: r.newXp, coins: r.newCoins, level: r.newLevel });
    } catch { /* ignore */ }
  }, [activeChild, updateActiveChild]);

  /* ───── controls ─────────────────────────────────── */
  const shoot = useCallback(() => {
    const g = gameRef.current;
    if (!g.running) return;
    const bullet: Bullet = {
      id: g.nextId++,
      x: g.shipX,
      y: 88,
    };
    g.bullets.push(bullet);
  }, []);

  // Keyboard
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const g = gameRef.current;
      if (!g.running) return;
      if (e.key === "ArrowLeft" || e.key === "a") {
        g.shipX = Math.max(5, g.shipX - 4);
        setShipX(g.shipX);
      } else if (e.key === "ArrowRight" || e.key === "d") {
        g.shipX = Math.min(95, g.shipX + 4);
        setShipX(g.shipX);
      } else if (e.key === " " || e.key === "ArrowUp") {
        e.preventDefault();
        shoot();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [shoot]);

  // Touch controls
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const g = gameRef.current;
    if (!g.running || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const touch = e.touches[0];
    const pct = ((touch.clientX - rect.left) / rect.width) * 100;
    g.shipX = Math.max(5, Math.min(95, pct));
    setShipX(g.shipX);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    handleTouchMove(e);
    shoot();
  }, [handleTouchMove, shoot]);

  /* ───── start game ───────────────────────────────── */
  const startGame = () => {
    const g = gameRef.current;
    g.fallingWords = [];
    g.bullets = [];
    g.shipX = 50;
    g.lives = MAX_LIVES;
    g.score = 0;
    g.synonymsCleared = 0;
    g.usedGroups = new Set();
    g.nextId = 0;
    g.running = true;
    g.fallSpeed = FALL_SPEED_BASE;
    g.spawnInterval = SPAWN_INTERVAL_BASE;
    g.synonymQueued = false;

    setShipX(50);
    setLives(MAX_LIVES);
    setScore(0);
    setSynonymsCleared(0);
    setFallingWords([]);
    setBullets([]);
    setReward(null);
    setPhase("playing");

    pickNewGroup();

    // Start spawning & game loop
    setTimeout(spawnWord, 800);
    frameRef.current = requestAnimationFrame(gameLoop);
  };

  // Cleanup
  useEffect(() => {
    return () => {
      gameRef.current.running = false;
      cancelAnimationFrame(frameRef.current);
      if (spawnRef.current) clearTimeout(spawnRef.current);
    };
  }, []);

  const stars = synonymsCleared >= WORDS_TO_WIN
    ? (lives >= 3 ? 3 : lives >= 2 ? 2 : 1)
    : (synonymsCleared >= 8 ? 2 : synonymsCleared >= 4 ? 1 : 1);

  /* ───── INTRO ────────────────────────────────────── */
  if (phase === "intro") {
    return (
      <div className="max-w-lg mx-auto px-3 sm:px-4 py-6 sm:py-10">
        <button onClick={() => navigate("/")} className="mb-4 text-sm text-gray-500 hover:text-gray-700">
          ← חזרה
        </button>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 text-center"
        >
          <div className="text-5xl sm:text-7xl mb-4">🚀</div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">פלישת המילים!</h1>
          <p className="text-gray-500 text-sm sm:text-base mb-4">
            החללית שלך היא מילה. מילים נופלות מלמעלה — <strong>ירו בכל מילה שאינה נרדפת</strong> למילה של החללית, 
            ותנו ל<strong>מילה הנרדפת לעבור</strong> בלי לפגוע בה!
          </p>
          <div className="text-sm text-gray-400 mb-6 space-y-1">
            <p>🎯 {WORDS_TO_WIN} מילים נרדפות לניצחון</p>
            <p>❤️ {MAX_LIVES} חיים</p>
            <p>⚡ המהירות עולה עם כל מילה נכונה!</p>
            <p className="text-xs mt-2">🖱️ מקלדת: חצים + רווח | 📱 מגע: גררו + לחצו</p>
          </div>
          <button
            onClick={startGame}
            className="px-8 py-3 bg-indigo-600 text-white text-lg rounded-2xl font-bold hover:bg-indigo-700 active:scale-95 transition-all shadow-lg"
          >
            🚀 שיגור!
          </button>
        </motion.div>
      </div>
    );
  }

  /* ───── DONE ─────────────────────────────────────── */
  if (phase === "done") {
    return (
      <div className="max-w-lg mx-auto px-3 sm:px-4 py-8 sm:py-12">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-2xl shadow-xl p-5 sm:p-8 text-center"
        >
          <div className="text-5xl sm:text-6xl mb-3">
            {synonymsCleared >= WORDS_TO_WIN ? "🏆" : "💪"}
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">
            {synonymsCleared >= WORDS_TO_WIN ? "ניצחון!" : "נסיון טוב!"}
          </h2>
          <div className="text-3xl mb-4">
            {[1, 2, 3].map(s => (
              <span key={s} className={s <= stars ? "opacity-100" : "opacity-20"}>⭐</span>
            ))}
          </div>

          <div className="flex justify-center gap-6 sm:gap-8 mb-4 text-sm text-gray-500">
            <div className="text-center">
              <div className="text-xl font-bold text-gray-700">{synonymsCleared}</div>
              <div>מילים נרדפות</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-gray-700">{score}</div>
              <div>ניקוד</div>
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

  /* ───── PLAYING ──────────────────────────────────── */
  return (
    <div className="max-w-lg mx-auto px-1 sm:px-2 py-2 sm:py-4 select-none">
      {/* HUD */}
      <div className="flex items-center justify-between mb-2 px-2">
        <div className="flex gap-1">
          {[1, 2, 3].map(i => (
            <span key={i} className={`text-lg sm:text-xl ${i <= lives ? "" : "opacity-20"}`}>❤️</span>
          ))}
        </div>
        <div className="text-xs sm:text-sm font-bold text-indigo-600">
          🎯 {synonymsCleared}/{WORDS_TO_WIN}
        </div>
        <div className="text-sm sm:text-base font-bold text-gray-600">
          ⭐ {score}
        </div>
      </div>

      {/* Game arena */}
      <div
        ref={containerRef}
        className={`relative w-full rounded-2xl overflow-hidden touch-none ${hitFlash ? "ring-4 ring-red-400" : ""}`}
        style={{
          aspectRatio: "3 / 4",
          background: "linear-gradient(180deg, #0f0c29 0%, #302b63 50%, #24243e 100%)",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
      >
        {/* Stars background */}
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              width: Math.random() * 2 + 1,
              height: Math.random() * 2 + 1,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              opacity: Math.random() * 0.6 + 0.2,
            }}
          />
        ))}

        {/* Falling words */}
        <AnimatePresence>
          {fallingWords.map(w => (
            <motion.div
              key={w.id}
              className={`absolute px-2 py-1 rounded-lg text-xs sm:text-sm font-bold whitespace-nowrap
                ${w.exploding
                  ? "bg-orange-400/80 text-white scale-125"
                  : w.isSynonym
                    ? "bg-emerald-500/90 text-white border border-emerald-300"
                    : "bg-red-500/80 text-white border border-red-300"
                }`}
              style={{
                left: `${w.x}%`,
                top: `${w.y}%`,
                transform: "translate(-50%, -50%)",
              }}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: w.exploding ? 0 : 1, scale: w.exploding ? 1.5 : 1 }}
              exit={{ opacity: 0, scale: 0 }}
              transition={{ duration: w.exploding ? 0.3 : 0.15 }}
            >
              {w.text}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Bullets */}
        {bullets.map(b => (
          <div
            key={b.id}
            className="absolute w-1.5 h-4 bg-yellow-400 rounded-full shadow-[0_0_6px_#fbbf24]"
            style={{
              left: `${b.x}%`,
              top: `${b.y}%`,
              transform: "translate(-50%, -50%)",
            }}
          />
        ))}

        {/* Ship (the word) */}
        <div
          className="absolute bottom-[4%] transition-[left] duration-75"
          style={{
            left: `${shipX}%`,
            transform: "translateX(-50%)",
          }}
        >
          {/* Ship body */}
          <div className="relative flex flex-col items-center">
            <div className="text-2xl sm:text-3xl mb-0.5">🚀</div>
            <div className="bg-indigo-600 text-white px-3 py-1 rounded-lg text-sm sm:text-base font-bold shadow-[0_0_12px_rgba(99,102,241,0.6)] border border-indigo-400 whitespace-nowrap">
              {shipWord}
            </div>
          </div>
        </div>

        {/* Helper text */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 text-white/50 text-[10px] sm:text-xs text-center pointer-events-none">
          תנו לנרדפת לעבור 🟢 | ירו בשונות 🔴
        </div>
      </div>

      {/* Touch shoot button for mobile */}
      <div className="flex justify-center mt-3 sm:hidden">
        <button
          onTouchStart={(e) => { e.preventDefault(); shoot(); }}
          className="px-10 py-3 bg-yellow-500 text-white rounded-2xl font-bold text-lg active:scale-95 shadow-lg"
        >
          💥 ירי!
        </button>
      </div>
    </div>
  );
}
