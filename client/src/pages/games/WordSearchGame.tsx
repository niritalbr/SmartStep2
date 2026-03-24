import { useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../api";

/* ───── word pair data ─────────────────────────────── */

type GameMode = "synonyms" | "antonyms";

interface WordPair {
  clue: string;   // shown in the word list
  hidden: string; // placed in the grid
}

// Synonym pairs: clue → hidden (synonym of clue)
const SYNONYM_PAIRS: WordPair[] = [
  { clue: "שמח", hidden: "עליז" },
  { clue: "גדול", hidden: "ענק" },
  { clue: "חכם", hidden: "נבון" },
  { clue: "יפה", hidden: "נאה" },
  { clue: "מהיר", hidden: "זריז" },
  { clue: "אמיץ", hidden: "נועז" },
  { clue: "כעוס", hidden: "זועם" },
  { clue: "חזק", hidden: "איתן" },
  { clue: "עייף", hidden: "תשוש" },
  { clue: "קשה", hidden: "סבוך" },
  { clue: "חם", hidden: "לוהט" },
  { clue: "קר", hidden: "צונן" },
  { clue: "רגוע", hidden: "שלו" },
  { clue: "עצוב", hidden: "נוגה" },
  { clue: "קטן", hidden: "זעיר" },
  { clue: "חשוב", hidden: "מרכזי" },
  { clue: "פשוט", hidden: "קל" },
  { clue: "מדויק", hidden: "נכון" },
  { clue: "רחוק", hidden: "נידח" },
  { clue: "ישן", hidden: "עתיק" },
];

// Antonym pairs: clue → hidden (opposite of clue)
const ANTONYM_PAIRS: WordPair[] = [
  { clue: "שמח", hidden: "עצוב" },
  { clue: "גדול", hidden: "קטן" },
  { clue: "חזק", hidden: "חלש" },
  { clue: "מהיר", hidden: "איטי" },
  { clue: "חם", hidden: "קר" },
  { clue: "יפה", hidden: "מכוער" },
  { clue: "קשה", hidden: "קל" },
  { clue: "חכם", hidden: "טיפש" },
  { clue: "אמיץ", hidden: "פחדן" },
  { clue: "רגוע", hidden: "לחוץ" },
  { clue: "ישן", hidden: "חדש" },
  { clue: "רחוק", hidden: "קרוב" },
  { clue: "גבוה", hidden: "נמוך" },
  { clue: "עשיר", hidden: "עני" },
  { clue: "בריא", hidden: "חולה" },
  { clue: "מלא", hidden: "ריק" },
  { clue: "ארוך", hidden: "קצר" },
  { clue: "רחב", hidden: "צר" },
  { clue: "בהיר", hidden: "כהה" },
  { clue: "שקט", hidden: "רועש" },
];

const HEB_LETTERS = "אבגדהוזחטיכלמנסעפצקרשת";
const GRID_SIZE = 8;

type Dir = [number, number];
const DIRECTIONS: Dir[] = [
  [0, 1],  // right
  [1, 0],  // down
  [0, -1], // left
  [1, 1],  // diagonal down-right
  [1, -1], // diagonal down-left
];

/* ───── grid generation ────────────────────────────── */

interface PlacedWord {
  clue: string;   // shown in the word list
  hidden: string; // the word placed in the grid
  cells: [number, number][];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateGrid(pairs: WordPair[]): { grid: string[][]; placed: PlacedWord[] } {
  const grid: string[][] = Array.from({ length: GRID_SIZE }, () =>
    Array(GRID_SIZE).fill("")
  );
  const placed: PlacedWord[] = [];

  for (const pair of shuffle(pairs)) {
    const chars = pair.hidden.split("");
    const len = chars.length;
    if (len > GRID_SIZE) continue;

    let success = false;
    const dirs = shuffle([...DIRECTIONS]);

    for (const [dr, dc] of dirs) {
      if (success) break;
      const positions = shuffle(
        Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, i) => [
          Math.floor(i / GRID_SIZE),
          i % GRID_SIZE,
        ] as [number, number])
      );

      for (const [startR, startC] of positions) {
        const endR = startR + dr * (len - 1);
        const endC = startC + dc * (len - 1);
        if (endR < 0 || endR >= GRID_SIZE || endC < 0 || endC >= GRID_SIZE) continue;

        let fits = true;
        const cells: [number, number][] = [];
        for (let i = 0; i < len; i++) {
          const r = startR + dr * i;
          const c = startC + dc * i;
          cells.push([r, c]);
          if (grid[r][c] !== "" && grid[r][c] !== chars[i]) {
            fits = false;
            break;
          }
        }

        if (fits) {
          for (let i = 0; i < len; i++) {
            grid[cells[i][0]][cells[i][1]] = chars[i];
          }
          placed.push({ clue: pair.clue, hidden: pair.hidden, cells });
          success = true;
          break;
        }
      }
    }

    if (placed.length >= 6) break; // target 6 words
  }

  // Fill empty cells with random Hebrew letters
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (grid[r][c] === "") {
        grid[r][c] = HEB_LETTERS[Math.floor(Math.random() * HEB_LETTERS.length)];
      }
    }
  }

  return { grid, placed };
}

/* ───── component ──────────────────────────────────── */

export default function WordSearchGame() {
  const navigate = useNavigate();
  const { activeChild, updateActiveChild } = useAuth();

  const [mode, setMode] = useState<GameMode>("synonyms");
  const [phase, setPhase] = useState<"intro" | "playing" | "done">("intro");
  const [grid, setGrid] = useState<string[][]>([]);
  const [placedWords, setPlacedWords] = useState<PlacedWord[]>([]);
  const [foundWords, setFoundWords] = useState<Set<string>>(new Set());
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());
  const [highlightedCells, setHighlightedCells] = useState<Set<string>>(new Set());
  const [dragCells, setDragCells] = useState<[number, number][]>([]);
  const [reward, setReward] = useState<{ xpGain: number; coinGain: number } | null>(null);
  const [timer, setTimer] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isDragging = useRef(false);

  const cellKey = (r: number, c: number) => `${r}-${c}`;

  const startGame = (selectedMode?: GameMode) => {
    const m = selectedMode ?? mode;
    setMode(m);
    const pool = m === "synonyms" ? SYNONYM_PAIRS : ANTONYM_PAIRS;
    const { grid: g, placed } = generateGrid(pool);
    setGrid(g);
    setPlacedWords(placed);
    setFoundWords(new Set());
    setSelectedCells(new Set());
    setHighlightedCells(new Set());
    setDragCells([]);
    setReward(null);
    setTimer(0);
    setPhase("playing");
    timerRef.current = setInterval(() => setTimer(t => t + 1), 1000);
  };

  const endGame = useCallback(async (found: number, total: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase("done");
    if (!activeChild) return;
    try {
      const r = await api.claimGameReward({
        childId: activeChild.id,
        gameType: "word-search",
        score: found,
        maxScore: total,
      });
      setReward({ xpGain: r.xpGain, coinGain: r.coinGain });
      updateActiveChild({ xp: r.newXp, coins: r.newCoins, level: r.newLevel });
    } catch { /* ignore */ }
  }, [activeChild, updateActiveChild]);

  // Check if dragged cells form a word
  const checkSelection = useCallback((cells: [number, number][]) => {
    if (cells.length < 2) return;

    const letters = cells.map(([r, c]) => grid[r][c]).join("");
    const lettersReversed = [...letters].reverse().join("");

    for (const pw of placedWords) {
      if (foundWords.has(pw.hidden)) continue;
      if (pw.hidden === letters || pw.hidden === lettersReversed) {
        const newFound = new Set(foundWords);
        newFound.add(pw.hidden);
        setFoundWords(newFound);

        const newHighlight = new Set(highlightedCells);
        pw.cells.forEach(([r, c]) => newHighlight.add(cellKey(r, c)));
        setHighlightedCells(newHighlight);

        if (newFound.size === placedWords.length) {
          endGame(newFound.size, placedWords.length);
        }
        return;
      }
    }
  }, [grid, placedWords, foundWords, highlightedCells, endGame]);

  const handleCellDown = (r: number, c: number) => {
    isDragging.current = true;
    setDragCells([[r, c]]);
    setSelectedCells(new Set([cellKey(r, c)]));
  };

  const handleCellEnter = (r: number, c: number) => {
    if (!isDragging.current) return;
    const key = cellKey(r, c);
    if (selectedCells.has(key)) return;

    // Only allow straight lines
    const [startR, startC] = dragCells[0];
    const dr = Math.sign(r - startR);
    const dc = Math.sign(c - startC);

    if (dragCells.length > 1) {
      const [prevR, prevC] = dragCells[dragCells.length - 1];
      const existDr = Math.sign(prevR - startR) || dr;
      const existDc = Math.sign(prevC - startC) || dc;
      if (dr !== existDr || dc !== existDc) return;
    }

    // Build line from start to current
    const newDrag: [number, number][] = [];
    const newSel = new Set<string>();
    let cr = startR, cc = startC;
    while (true) {
      newDrag.push([cr, cc]);
      newSel.add(cellKey(cr, cc));
      if (cr === r && cc === c) break;
      cr += dr;
      cc += dc;
      if (cr < 0 || cr >= GRID_SIZE || cc < 0 || cc >= GRID_SIZE) return;
    }

    setDragCells(newDrag);
    setSelectedCells(newSel);
  };

  const handleCellUp = () => {
    if (isDragging.current) {
      checkSelection(dragCells);
      isDragging.current = false;
      setDragCells([]);
      setSelectedCells(new Set());
    }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  const stars = foundWords.size === placedWords.length
    ? (timer <= placedWords.length * 15 ? 3 : timer <= placedWords.length * 25 ? 2 : 1)
    : 0;

  /* ───── intro ────────────────────────────────────── */
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
          <div className="text-5xl sm:text-7xl mb-4">🔍</div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">תפזורת מילים</h1>
          <p className="text-gray-500 text-sm sm:text-base mb-4">
            ברשימה מופיעות מילים. מצאו ברשת את ה<strong>{mode === "synonyms" ? "מילה הנרדפת" : "ההפך"}</strong> של כל מילה!
          </p>

          {/* Mode toggle */}
          <div className="flex justify-center gap-2 mb-5">
            <button
              onClick={() => setMode("synonyms")}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                mode === "synonyms"
                  ? "bg-emerald-500 text-white shadow-md"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              🤝 מילים נרדפות
            </button>
            <button
              onClick={() => setMode("antonyms")}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                mode === "antonyms"
                  ? "bg-orange-500 text-white shadow-md"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              🔄 הפכים
            </button>
          </div>

          <div className="text-sm text-gray-400 mb-6 space-y-1">
            <p>📏 רשת {GRID_SIZE}×{GRID_SIZE}</p>
            <p>📝 6 {mode === "synonyms" ? "נרדפות" : "הפכים"} מוסתרים</p>
            <p>👆 גררו אצבע/עכבר על רצף אותיות</p>
          </div>
          <button
            onClick={() => startGame(mode)}
            className={`px-8 py-3 text-white text-lg rounded-2xl font-bold active:scale-95 transition-all shadow-lg ${
              mode === "synonyms"
                ? "bg-emerald-500 hover:bg-emerald-600"
                : "bg-orange-500 hover:bg-orange-600"
            }`}
          >
            🔍 יאללה!
          </button>
        </motion.div>
      </div>
    );
  }

  /* ───── done ─────────────────────────────────────── */
  if (phase === "done") {
    return (
      <div className="max-w-lg mx-auto px-3 sm:px-4 py-8 sm:py-12">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-2xl shadow-xl p-5 sm:p-8 text-center"
        >
          <div className="text-5xl sm:text-6xl mb-3">🎉</div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">
            מצאת את כל ה{mode === "synonyms" ? "נרדפות" : "הפכים"}!
          </h2>
          <div className="text-3xl mb-4">
            {[1, 2, 3].map(s => (
              <span key={s} className={s <= stars ? "opacity-100" : "opacity-20"}>⭐</span>
            ))}
          </div>

          <div className="flex justify-center gap-8 mb-4 text-sm text-gray-500">
            <div className="text-center">
              <div className="text-xl font-bold text-gray-700">{foundWords.size}</div>
              <div>מילים</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-gray-700">{formatTime(timer)}</div>
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
              className={`flex-1 py-3 text-white rounded-xl font-medium ${
                mode === "synonyms"
                  ? "bg-emerald-500 hover:bg-emerald-600"
                  : "bg-orange-500 hover:bg-orange-600"
              }`}
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

  /* ───── playing ──────────────────────────────────── */
  return (
    <div className="max-w-lg mx-auto px-2 sm:px-4 py-4 sm:py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <button onClick={() => { if (timerRef.current) clearInterval(timerRef.current); setPhase("intro"); }}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← חזרה
        </button>
        <div className="text-sm font-bold text-gray-600">
          ⏱ {formatTime(timer)}
        </div>
        <div className={`text-sm font-bold ${mode === "synonyms" ? "text-emerald-600" : "text-orange-600"}`}>
          {foundWords.size}/{placedWords.length} 🎯
        </div>
      </div>

      {/* Hint: what to look for */}
      <div className="text-center mb-2 text-xs text-gray-400">
        {mode === "synonyms" ? "מצאו מילה נרדפת לכל מילה ברשימה" : "מצאו את ההפך של כל מילה ברשימה"}
      </div>

      {/* Word list — shows the clue words */}
      <div className="flex flex-wrap gap-2 justify-center mb-4">
        {placedWords.map(pw => {
          const isFound = foundWords.has(pw.hidden);
          return (
            <span
              key={pw.clue}
              className={`px-2.5 py-1 rounded-full text-xs sm:text-sm font-bold transition-all ${
                isFound
                  ? mode === "synonyms"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-orange-100 text-orange-700"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {isFound ? `${pw.clue} ← ${pw.hidden} ✓` : pw.clue}
            </span>
          );
        })}
      </div>

      {/* Grid */}
      <div
        className="grid bg-white rounded-2xl shadow-lg p-2 sm:p-3 select-none touch-none"
        style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`, gap: "2px" }}
        onMouseUp={handleCellUp}
        onMouseLeave={handleCellUp}
        onTouchEnd={handleCellUp}
      >
        {grid.map((row, r) =>
          row.map((letter, c) => {
            const key = cellKey(r, c);
            const isHighlighted = highlightedCells.has(key);
            const isSelected = selectedCells.has(key);

            return (
              <motion.div
                key={key}
                onMouseDown={(e) => { e.preventDefault(); handleCellDown(r, c); }}
                onMouseEnter={() => handleCellEnter(r, c)}
                onTouchStart={(e) => { e.preventDefault(); handleCellDown(r, c); }}
                onTouchMove={(e) => {
                  const touch = e.touches[0];
                  const el = document.elementFromPoint(touch.clientX, touch.clientY);
                  const rc = el?.getAttribute("data-rc");
                  if (rc) {
                    const [tr, tc] = rc.split("-").map(Number);
                    handleCellEnter(tr, tc);
                  }
                }}
                data-rc={`${r}-${c}`}
                className={`aspect-square flex items-center justify-center rounded-lg text-base sm:text-xl font-bold cursor-pointer transition-colors
                  ${isHighlighted
                    ? mode === "synonyms"
                      ? "bg-emerald-200 text-emerald-800"
                      : "bg-orange-200 text-orange-800"
                    : isSelected
                      ? "bg-indigo-200 text-indigo-800"
                      : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                  }`}
                whileTap={{ scale: 0.9 }}
              >
                {letter}
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
