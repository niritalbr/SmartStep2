import { useState, useEffect, useRef, useCallback, useMemo } from "react";
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

type WordState = "falling" | "exploding" | "passed-good" | "passed-bad" | "dead";

interface FallingWord {
  id: number;
  text: string;
  isSynonym: boolean;
  x: number;
  y: number;
  state: WordState;
}

interface Bullet {
  id: number;
  x: number;
  y: number;
}

/* ───── constants ──────────────────────────────────── */
const MAX_LIVES = 3;
const WORDS_TO_WIN = 12; // correct synonyms to pass for a full game
const SPAWN_INTERVAL_BASE = 2600;
const SPAWN_INTERVAL_MIN = 900;
const FALL_SPEED_BASE = 0.22; // percent per frame
const FALL_SPEED_MAX = 0.75;
const BULLET_SPEED = 2.5;

/* ───── component ──────────────────────────────────── */

export default function SynonymInvadersGame() {
  const navigate = useNavigate();
  const { activeChild, updateActiveChild } = useAuth();

  const [phase, setPhase] = useState<"intro" | "playing" | "done">("intro");
  const [shipX, setShipX] = useState(50);
  const [shipWord, setShipWord] = useState("");
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
    spawnCount: 0,
    lastDistractorIdx: -1,
  });
  const frameRef = useRef<number>(0);
  const spawnRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Pre-generate star positions so they don't re-randomize on each render
  const starPositions = useMemo(() =>
    Array.from({ length: 40 }, () => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 1.5 + 0.5,
      opacity: Math.random() * 0.3 + 0.08,
    })),
  []);

  /* ───── pick new word group ──────────────────────── */
  const pickNewGroup = useCallback(() => {
    const g = gameRef.current;
    const available = WORD_GROUPS.filter((_, i) => !g.usedGroups.has(i));
    const pool = available.length > 0 ? available : WORD_GROUPS;
    const idx = WORD_GROUPS.indexOf(pool[Math.floor(Math.random() * pool.length)]);
    g.usedGroups.add(idx);
    g.currentGroup = WORD_GROUPS[idx];
    g.spawnCount = 0;
    g.lastDistractorIdx = -1;
    setShipWord(WORD_GROUPS[idx].base);
  }, []);

  /* ───── spawn a falling word ─────────────────────── */
  const spawnWord = useCallback(() => {
    const g = gameRef.current;
    if (!g.running || !g.currentGroup) return;

    const group = g.currentGroup;
    let text: string;
    let isSynonym = false;

    // Guarantee a synonym every 2-4 distractors
    const synonymNeeded = g.spawnCount >= 2 + Math.floor(Math.random() * 2);
    const hasSynonymOnScreen = g.fallingWords.some(w => w.isSynonym && w.state === "falling");

    if (synonymNeeded || (!hasSynonymOnScreen && g.spawnCount >= 2)) {
      const syns = shuffle(group.synonyms);
      text = syns[0];
      isSynonym = true;
      g.spawnCount = 0;
    } else {
      const distractors = group.distractors;
      let idx = Math.floor(Math.random() * distractors.length);
      if (idx === g.lastDistractorIdx && distractors.length > 1) {
        idx = (idx + 1) % distractors.length;
      }
      g.lastDistractorIdx = idx;
      text = distractors[idx];
      isSynonym = false;
      g.spawnCount++;
    }

    const word: FallingWord = {
      id: g.nextId++,
      text,
      isSynonym,
      x: 8 + Math.random() * 84,
      y: -5,
      state: "falling",
    };
    g.fallingWords.push(word);

    // Schedule next spawn
    const jitter = Math.random() * 500 - 250;
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
      if (w.state !== "falling") return;
      w.y += g.fallSpeed;
    });

    // Check bullet-word collisions
    for (const b of g.bullets) {
      for (const w of g.fallingWords) {
        if (w.state !== "falling") continue;
        const dx = Math.abs(b.x - w.x);
        const dy = Math.abs(b.y - w.y);
        if (dx < 10 && dy < 7) {
          w.state = "exploding";
          b.y = -100;
          if (w.isSynonym) {
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
            g.score += 10;
            setScore(g.score);
          }
          const wRef = w;
          setTimeout(() => { wRef.state = "dead"; }, 350);
          break;
        }
      }
    }

    // Check words reaching bottom
    g.fallingWords.forEach(w => {
      if (w.state !== "falling") return;
      if (w.y >= 88) {
        if (w.isSynonym) {
          w.state = "passed-good";
          g.score += 25;
          g.synonymsCleared++;
          setScore(g.score);
          setSynonymsCleared(g.synonymsCleared);

          g.fallSpeed = Math.min(FALL_SPEED_MAX, g.fallSpeed + 0.03);
          g.spawnInterval = Math.max(SPAWN_INTERVAL_MIN, g.spawnInterval - 70);

          if (g.synonymsCleared >= WORDS_TO_WIN) {
            g.running = false;
            setTimeout(() => finishGame(g.score, g.synonymsCleared), 600);
            return;
          }
          pickNewGroup();
        } else {
          w.state = "passed-bad";
          g.lives--;
          setLives(g.lives);
          setHitFlash(true);
          setTimeout(() => setHitFlash(false), 300);
          if (g.lives <= 0) {
            g.running = false;
            setTimeout(() => finishGame(g.score, g.synonymsCleared), 600);
            return;
          }
        }
        const wRef = w;
        setTimeout(() => { wRef.state = "dead"; }, 600);
      }
    });

    // Cleanup dead words
    g.fallingWords = g.fallingWords.filter(w => w.state !== "dead");

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
      y: 86,
    };
    g.bullets.push(bullet);
  }, []);

  // Keyboard — direct movement per keypress
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
    g.spawnCount = 0;
    g.lastDistractorIdx = -1;

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
          background: "linear-gradient(180deg, #0f0c29 0%, #1a1640 40%, #24243e 100%)",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
      >
        {/* Subtle static stars */}
        {starPositions.map((star, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white/60"
            style={{
              width: star.size,
              height: star.size,
              left: `${star.x}%`,
              top: `${star.y}%`,
              opacity: star.opacity,
            }}
          />
        ))}

        {/* Falling words — asteroid style */}
        <AnimatePresence>
          {fallingWords.map(w => {
            if (w.state === "dead") return null;
            const isExploding = w.state === "exploding";
            const isPassedGood = w.state === "passed-good";
            const isPassedBad = w.state === "passed-bad";
            const isLeaving = isExploding || isPassedGood || isPassedBad;

            return (
              <motion.div
                key={w.id}
                className="absolute pointer-events-none"
                style={{
                  left: `${w.x}%`,
                  top: `${w.y}%`,
                  transform: "translate(-50%, -50%)",
                }}
                initial={{ opacity: 0, scale: 0.5, rotate: -10 }}
                animate={{
                  opacity: isLeaving ? 0 : 1,
                  scale: isExploding ? 1.8 : isPassedGood ? 1.4 : isPassedBad ? 1.3 : 1,
                  y: isPassedGood ? -20 : isPassedBad ? 10 : 0,
                  rotate: isExploding ? 45 : 0,
                }}
                exit={{ opacity: 0, scale: 0 }}
                transition={{ duration: isLeaving ? 0.5 : 0.15 }}
              >
                <div className={`relative flex items-center justify-center
                  ${isExploding
                    ? ""
                    : isPassedGood
                      ? ""
                      : isPassedBad
                        ? ""
                        : ""
                  }`}
                >
                  {/* Asteroid SVG shape */}
                  <svg viewBox="0 0 120 100" className="w-20 h-16 sm:w-24 sm:h-20 drop-shadow-lg" style={{ filter: isExploding ? "brightness(1.8) saturate(2)" : isPassedGood ? "hue-rotate(90deg) brightness(1.4)" : isPassedBad ? "hue-rotate(-30deg) brightness(1.3) saturate(1.5)" : "" }}>
                    <path
                      d="M60 5 L85 10 L105 25 L115 50 L108 75 L90 90 L65 95 L35 92 L12 78 L5 55 L10 30 L30 12 Z"
                      fill={isExploding ? "#f97316" : isPassedGood ? "#34d399" : isPassedBad ? "#ef4444" : "#78716c"}
                      stroke={isExploding ? "#fdba74" : isPassedGood ? "#6ee7b7" : isPassedBad ? "#fca5a5" : "#a8a29e"}
                      strokeWidth="2.5"
                    />
                    {/* Crater details */}
                    <ellipse cx="40" cy="35" rx="8" ry="6" fill="rgba(0,0,0,0.15)" />
                    <ellipse cx="75" cy="55" rx="10" ry="7" fill="rgba(0,0,0,0.12)" />
                    <ellipse cx="55" cy="72" rx="6" ry="5" fill="rgba(0,0,0,0.1)" />
                  </svg>
                  {/* Word text centered on asteroid */}
                  <span className={`absolute text-[11px] sm:text-sm font-bold whitespace-nowrap drop-shadow-md
                    ${isExploding ? "text-white" : isPassedGood ? "text-white" : isPassedBad ? "text-white" : "text-white"}`}
                  >
                    {isPassedGood && "✅ "}
                    {isPassedBad && "💥 "}
                    {w.text}
                  </span>
                </div>
              </motion.div>
            );
          })}
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

        {/* Ship — spaceship SVG with word inside */}
        <div
          className="absolute bottom-[2%]"
          style={{
            left: `${shipX}%`,
            transform: "translateX(-50%)",
            transition: "left 0.06s linear",
          }}
        >
          <div className="relative flex flex-col items-center" style={{ filter: "drop-shadow(0 0 10px rgba(99,102,241,0.5))" }}>
            {/* Spaceship SVG */}
            <svg viewBox="0 0 140 180" className="w-20 h-28 sm:w-24 sm:h-32">
              {/* Engine flames */}
              <ellipse cx="55" cy="170" rx="8" ry="10" fill="#f97316" opacity="0.8">
                <animate attributeName="ry" values="10;14;10" dur="0.3s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.8;0.5;0.8" dur="0.2s" repeatCount="indefinite" />
              </ellipse>
              <ellipse cx="85" cy="170" rx="8" ry="10" fill="#f97316" opacity="0.8">
                <animate attributeName="ry" values="10;14;10" dur="0.3s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.8;0.5;0.8" dur="0.25s" repeatCount="indefinite" />
              </ellipse>
              <ellipse cx="55" cy="168" rx="4" ry="7" fill="#fde047">
                <animate attributeName="ry" values="7;10;7" dur="0.25s" repeatCount="indefinite" />
              </ellipse>
              <ellipse cx="85" cy="168" rx="4" ry="7" fill="#fde047">
                <animate attributeName="ry" values="7;10;7" dur="0.25s" repeatCount="indefinite" />
              </ellipse>

              {/* Main body */}
              <path d="M70 8 C70 8, 45 40, 40 70 L40 135 L55 155 L85 155 L100 135 L100 70 C95 40, 70 8, 70 8Z" fill="#4f46e5" stroke="#818cf8" strokeWidth="2" />

              {/* Cockpit window */}
              <ellipse cx="70" cy="45" rx="16" ry="18" fill="#7dd3fc" stroke="#4f46e5" strokeWidth="2" />
              <ellipse cx="70" cy="42" rx="10" ry="10" fill="#bae6fd" opacity="0.5" />

              {/* Side wings */}
              <path d="M40 100 L15 140 L25 155 L45 145 Z" fill="#6366f1" stroke="#818cf8" strokeWidth="1.5" />
              <path d="M100 100 L125 140 L115 155 L95 145 Z" fill="#6366f1" stroke="#818cf8" strokeWidth="1.5" />

              {/* Body panel lines */}
              <line x1="55" y1="70" x2="55" y2="140" stroke="#818cf8" strokeWidth="1" opacity="0.4" />
              <line x1="85" y1="70" x2="85" y2="140" stroke="#818cf8" strokeWidth="1" opacity="0.4" />

              {/* Engine pods */}
              <rect x="47" y="145" width="16" height="15" rx="3" fill="#4338ca" stroke="#818cf8" strokeWidth="1" />
              <rect x="77" y="145" width="16" height="15" rx="3" fill="#4338ca" stroke="#818cf8" strokeWidth="1" />
            </svg>
            {/* Word label below ship */}
            <div className="-mt-3 bg-indigo-700/90 text-white px-4 py-1 rounded-full text-sm sm:text-base font-bold whitespace-nowrap border border-indigo-400/60 shadow-[0_0_14px_rgba(99,102,241,0.5)]">
              {shipWord}
            </div>
          </div>
        </div>

        {/* Helper text */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 text-white/40 text-[10px] sm:text-xs text-center pointer-events-none">
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
