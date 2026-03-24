import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { api } from "../api";
import { Category, CATEGORY_INFO, type CategorySummary } from "../types";

/* ───── Practice categories ────────────────────────── */
const PRACTICE_ITEMS = [
  Category.word_relations,
  Category.sentence_completion,
  Category.numbers_in_shapes,
  Category.math_problems,
  Category.shapes,
  Category.vocabulary,
];

/* ───── Interactive games ──────────────────────────── */
const GAMES = [
  {
    id: "memory-match",
    name: "משחק זיכרון",
    icon: "🧠",
    color: "#6366f1",
    description: "הפכו קלפים ומצאו זוגות תואמים — מילים, מספרים וצורות",
    route: "/games/memory-match",
  },
  {
    id: "whack-a-mole",
    name: "הכה את השומה",
    icon: "🔨",
    color: "#ef4444",
    description: "הכו את השומה עם התשובה הנכונה לפני שהיא נעלמת!",
    route: "/games/whack-a-mole",
  },
  {
    id: "word-search",
    name: "תפזורת מילים",
    icon: "🔍",
    color: "#10b981",
    description: "מצאו נרדפות או הפכים מוסתרים ברשת אותיות",
    route: "/games/word-search",
  },
  {
    id: "synonym-invaders",
    name: "פלישת המילים",
    icon: "🚀",
    color: "#8b5cf6",
    description: "ירו במילים שאינן נרדפות ותנו לנרדפות לעבור! מהירות עולה",
    route: "/games/synonym-invaders",
  },
];

type Tab = "games" | "practice" | "exam";

export default function HomePage() {
  const { activeChild } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<Record<string, CategorySummary>>({});
  const [tab, setTab] = useState<Tab>("games");

  useEffect(() => {
    api.getCategorySummary().then(setSummary).catch(() => {});
  }, []);

  const xpProgress = ((activeChild?.xp || 0) % 100) / 100;

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
      {/* Player card */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 mb-6 sm:mb-8"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div
              className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center text-2xl sm:text-3xl shrink-0"
              style={{ backgroundColor: activeChild?.avatarColor + "20" }}
            >
              {activeChild?.avatarType === "owl" ? "🦉" : activeChild?.avatarType === "robot" ? "🤖" : "🐱"}
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-bold text-gray-800 truncate">
                שלום {activeChild?.name}! 👋
              </h2>
              <p className="text-gray-500 text-xs sm:text-sm">
                כיתה {activeChild?.grade === 2 ? "ב'" : "ג'"} · רמה {activeChild?.level}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-6 shrink-0">
            <div className="text-center">
              <div className="text-lg sm:text-2xl font-bold text-yellow-500">🪙 {activeChild?.coins}</div>
              <div className="text-xs text-gray-400 hidden sm:block">מטבעות</div>
            </div>
            <div className="text-center">
              <div className="text-lg sm:text-2xl font-bold text-purple-500">✨ {activeChild?.xp}</div>
              <div className="text-xs text-gray-400 hidden sm:block">ניסיון</div>
            </div>
          </div>
        </div>

        {/* XP bar */}
        <div className="mt-3 sm:mt-4">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>רמה {activeChild?.level}</span>
            <span>רמה {(activeChild?.level || 1) + 1}</span>
          </div>
          <div className="h-2.5 sm:h-3 bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-l from-indigo-500 to-purple-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${xpProgress * 100}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </div>
          <div className="text-xs text-gray-400 mt-1 text-center">
            {(activeChild?.xp || 0) % 100} / 100 XP לרמה הבאה
          </div>
        </div>
      </motion.div>

      {/* Tab selector */}
      <div className="flex bg-white rounded-2xl shadow-sm p-1.5 mb-5 sm:mb-6">
        <button
          onClick={() => setTab("games")}
          className={`flex-1 py-2.5 sm:py-3 rounded-xl text-sm sm:text-base font-bold transition-all ${
            tab === "games"
              ? "bg-gradient-to-l from-indigo-500 to-purple-500 text-white shadow-md"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          🎮 משחקים
        </button>
        <button
          onClick={() => setTab("practice")}
          className={`flex-1 py-2.5 sm:py-3 rounded-xl text-sm sm:text-base font-bold transition-all ${
            tab === "practice"
              ? "bg-gradient-to-l from-indigo-500 to-purple-500 text-white shadow-md"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          📝 תרגול
        </button>
        <button
          onClick={() => setTab("exam")}
          className={`flex-1 py-2.5 sm:py-3 rounded-xl text-sm sm:text-base font-bold transition-all ${
            tab === "exam"
              ? "bg-gradient-to-l from-red-500 to-orange-500 text-white shadow-md"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          📋 מבחן
        </button>
      </div>

      {/* ───── Games tab ───────────────────────────── */}
      {tab === "games" && (
        <motion.div
          key="games"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.25 }}
        >
          <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4 text-center">
            🎮 משחקים אינטראקטיביים
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 text-center mb-4 sm:mb-6">
            למדו תוך כדי משחק! כל משחק מעניק XP ומטבעות 🏆
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            {GAMES.map((game, i) => (
              <motion.button
                key={game.id}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: i * 0.1, type: "spring", stiffness: 200 }}
                whileHover={{ scale: 1.03, y: -4 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate(game.route)}
                className="group relative overflow-hidden rounded-2xl p-5 sm:p-6 text-center transition-shadow hover:shadow-xl"
                style={{
                  background: `linear-gradient(135deg, ${game.color}10, ${game.color}25)`,
                }}
              >
                <div className="relative z-10">
                  <div className="text-4xl sm:text-6xl mb-3">{game.icon}</div>
                  <h3 className="text-base sm:text-xl font-bold text-gray-800 mb-1">{game.name}</h3>
                  <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">{game.description}</p>
                </div>
                <div
                  className="absolute -left-6 -bottom-6 w-20 sm:w-28 h-20 sm:h-28 rounded-full opacity-10 group-hover:opacity-20 transition-opacity"
                  style={{ backgroundColor: game.color }}
                />
                <div
                  className="absolute -right-4 -top-4 w-14 sm:w-20 h-14 sm:h-20 rounded-full opacity-5 group-hover:opacity-15 transition-opacity"
                  style={{ backgroundColor: game.color }}
                />
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}

      {/* ───── Practice tab ────────────────────────── */}
      {tab === "practice" && (
        <motion.div
          key="practice"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.25 }}
        >
          <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4 text-center">
            📝 אזור תרגול
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 text-center mb-4 sm:mb-6">
            תרגלו שאלות לפי קטגוריה — בדיוק כמו במבחן! 🎯
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6">
            {PRACTICE_ITEMS.map((cat, i) => {
              const info = CATEGORY_INFO[cat];
              const catSummary = summary[cat];
              return (
                <motion.button
                  key={cat}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: i * 0.08, type: "spring", stiffness: 200 }}
                  whileHover={{ scale: 1.05, y: -5 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate(`/game/${cat}`)}
                  className="game-card group relative overflow-hidden rounded-2xl p-4 sm:p-6 text-right transition-shadow hover:shadow-xl"
                  style={{
                    background: `linear-gradient(135deg, ${info.color}15, ${info.color}30)`,
                    borderColor: info.color + "40",
                  }}
                >
                  <div className="relative z-10">
                    <div className="text-3xl sm:text-5xl mb-2 sm:mb-3">{info.icon}</div>
                    <h3 className="text-sm sm:text-xl font-bold text-gray-800 mb-0.5 sm:mb-1">{info.name}</h3>
                    <p className="text-xs sm:text-sm text-gray-500 mb-2 sm:mb-3 line-clamp-2">{info.description}</p>
                    {catSummary && (
                      <div className="text-xs text-gray-400 hidden sm:block">
                        {catSummary.total} שאלות זמינות
                      </div>
                    )}
                  </div>
                  <div
                    className="absolute -left-6 -bottom-6 w-16 sm:w-24 h-16 sm:h-24 rounded-full opacity-10 group-hover:opacity-20 transition-opacity"
                    style={{ backgroundColor: info.color }}
                  />
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ───── Exam tab ────────────────────────────── */}
      {tab === "exam" && (
        <motion.div
          key="exam"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <div className="text-center mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-2">
              📋 מבחן סימולציה מלא
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 mb-4">
              סימולציה מלאה של מבחן מחוננים שלב ב' — 55 שאלות, 70 דקות, 3 פרקים
            </p>
          </div>

          <div className="max-w-md mx-auto">
            <motion.button
              whileHover={{ scale: 1.03, y: -4 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate("/exam")}
              className="w-full group relative overflow-hidden rounded-2xl p-6 sm:p-8 text-center transition-shadow hover:shadow-xl"
              style={{ background: "linear-gradient(135deg, #ef444415, #f97316 25)" }}
            >
              <div className="relative z-10">
                <div className="text-5xl sm:text-7xl mb-4">📋</div>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">התחל מבחן</h3>
                <p className="text-sm text-gray-500 mb-4">
                  3 פרקים: חשיבה מילולית, כמותית וצורנית
                </p>
                <div className="flex justify-center gap-4 text-xs text-gray-400">
                  <span>📝 55 שאלות</span>
                  <span>⏱ 70 דקות</span>
                  <span>🏆 ציון מפורט</span>
                </div>
              </div>
              <div className="absolute -left-6 -bottom-6 w-28 h-28 rounded-full bg-red-400 opacity-10 group-hover:opacity-20 transition-opacity" />
              <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full bg-orange-400 opacity-5 group-hover:opacity-15 transition-opacity" />
            </motion.button>

            <div className="mt-4 grid grid-cols-3 gap-2">
              {[
                { icon: "📝", name: "חשיבה מילולית", time: "25 דק'", qs: 20 },
                { icon: "🔢", name: "חשיבה כמותית", time: "25 דק'", qs: 20 },
                { icon: "🔷", name: "חשיבה צורנית", time: "20 דק'", qs: 15 },
              ].map(s => (
                <div key={s.name} className="bg-white rounded-xl p-3 text-center shadow-sm">
                  <div className="text-2xl mb-1">{s.icon}</div>
                  <div className="text-xs font-bold text-gray-700">{s.name}</div>
                  <div className="text-xs text-gray-400">{s.qs} שאלות · {s.time}</div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
