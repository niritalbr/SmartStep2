import { useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../api";

/* ───── word pools ─────────────────────────────────── */

const WORD_POOL = [
  "חכם", "נבון", "אמיץ", "זריז", "חרוץ", "נדיב", "חסכן", "סקרן",
  "יצירתי", "עקשן", "שמח", "גיבור", "חזק", "זהיר", "ממציא",
  "מהיר", "עצום", "זעיר", "נאה", "עליז", "נחוש", "תשוש",
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
  word: string;
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

function generateGrid(words: string[]): { grid: string[][]; placed: PlacedWord[] } {
  const grid: string[][] = Array.from({ length: GRID_SIZE }, () =>
    Array(GRID_SIZE).fill("")
  );
  const placed: PlacedWord[] = [];

  for (const word of shuffle(words)) {
    const chars = word.split("");
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
          placed.push({ word, cells });
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

  const startGame = () => {
    const { grid: g, placed } = generateGrid(WORD_POOL);
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
      if (foundWords.has(pw.word)) continue;
      if (pw.word === letters || pw.word === lettersReversed) {
        const newFound = new Set(foundWords);
        newFound.add(pw.word);
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
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">חיפוש מילים</h1>
          <p className="text-gray-500 text-sm sm:text-base mb-2">
            מצאו את המילים המוסתרות ברשת האותיות!
          </p>
          <div className="text-sm text-gray-400 mb-6 space-y-1">
            <p>📏 רשת {GRID_SIZE}×{GRID_SIZE}</p>
            <p>📝 6 מילים מוסתרות</p>
            <p>👆 גררו אצבע/עכבר על רצף אותיות</p>
          </div>
          <button
            onClick={startGame}
            className="px-8 py-3 bg-emerald-500 text-white text-lg rounded-2xl font-bold hover:bg-emerald-600 active:scale-95 transition-all shadow-lg"
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
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">מצאת הכל!</h2>
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
              onClick={startGame}
              className="flex-1 py-3 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600"
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
        <div className="text-sm font-bold text-emerald-600">
          {foundWords.size}/{placedWords.length} 🎯
        </div>
      </div>

      {/* Word list */}
      <div className="flex flex-wrap gap-2 justify-center mb-4">
        {placedWords.map(pw => (
          <span
            key={pw.word}
            className={`px-2.5 py-1 rounded-full text-xs sm:text-sm font-bold transition-all ${
              foundWords.has(pw.word)
                ? "bg-emerald-100 text-emerald-700 line-through"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {pw.word}
          </span>
        ))}
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
                    ? "bg-emerald-200 text-emerald-800"
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
