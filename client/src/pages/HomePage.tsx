import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { api } from "../api";
import { Category, CATEGORY_INFO, type CategorySummary } from "../types";

const ISLANDS = [
  { category: Category.word_relations, x: 15, y: 25, size: "lg" },
  { category: Category.sentence_completion, x: 55, y: 15, size: "lg" },
  { category: Category.numbers_in_shapes, x: 80, y: 35, size: "lg" },
  { category: Category.math_problems, x: 35, y: 55, size: "lg" },
  { category: Category.shapes, x: 70, y: 65, size: "lg" },
  { category: Category.vocabulary, x: 20, y: 75, size: "lg" },
];

export default function HomePage() {
  const { activeChild } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<Record<string, CategorySummary>>({});

  useEffect(() => {
    api.getCategorySummary().then(setSummary).catch(() => {});
  }, []);

  const xpProgress = ((activeChild?.xp || 0) % 100) / 100;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Player card */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white rounded-2xl shadow-lg p-6 mb-8"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
              style={{ backgroundColor: activeChild?.avatarColor + "20" }}
            >
              {activeChild?.avatarType === "owl" ? "🦉" : activeChild?.avatarType === "robot" ? "🤖" : "🐱"}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">
                שלום {activeChild?.name}! 👋
              </h2>
              <p className="text-gray-500 text-sm">
                כיתה {activeChild?.grade === 2 ? "ב'" : "ג'"} · רמה {activeChild?.level}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-500">🪙 {activeChild?.coins}</div>
              <div className="text-xs text-gray-400">מטבעות</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-500">✨ {activeChild?.xp}</div>
              <div className="text-xs text-gray-400">ניסיון</div>
            </div>
          </div>
        </div>

        {/* XP bar */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>רמה {activeChild?.level}</span>
            <span>רמה {(activeChild?.level || 1) + 1}</span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
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

      {/* Category title */}
      <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
        🗺️ בחרו משחק
      </h2>

      {/* Game islands grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {ISLANDS.map((island, i) => {
          const info = CATEGORY_INFO[island.category];
          const catSummary = summary[island.category];
          return (
            <motion.button
              key={island.category}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: i * 0.1, type: "spring", stiffness: 200 }}
              whileHover={{ scale: 1.05, y: -5 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate(`/game/${island.category}`)}
              className="game-card group relative overflow-hidden rounded-2xl p-6 text-right transition-shadow hover:shadow-xl"
              style={{
                background: `linear-gradient(135deg, ${info.color}15, ${info.color}30)`,
                borderColor: info.color + "40",
              }}
            >
              <div className="relative z-10">
                <div className="text-5xl mb-3">{info.icon}</div>
                <h3 className="text-xl font-bold text-gray-800 mb-1">{info.name}</h3>
                <p className="text-sm text-gray-500 mb-3">{info.description}</p>
                {catSummary && (
                  <div className="text-xs text-gray-400">
                    {catSummary.total} שאלות זמינות
                  </div>
                )}
              </div>

              {/* Decorative circle */}
              <div
                className="absolute -left-6 -bottom-6 w-24 h-24 rounded-full opacity-10 group-hover:opacity-20 transition-opacity"
                style={{ backgroundColor: info.color }}
              />
              <div
                className="absolute -left-2 -bottom-2 w-12 h-12 rounded-full opacity-5 group-hover:opacity-15 transition-opacity"
                style={{ backgroundColor: info.color }}
              />
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
