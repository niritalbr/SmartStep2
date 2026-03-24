import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { api } from "../api";

interface ChildSummary {
  id: string;
  name: string;
  grade: number;
  level: number;
  xp: number;
  coins: number;
  totalAnswers: number;
  accuracy: number;
  sessionsCount: number;
}

export default function ParentDashboard() {
  const { user } = useAuth();
  const [summaries, setSummaries] = useState<ChildSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getDashboard()
      .then(setSummaries)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="animate-spin text-4xl">👪</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
      <div className="flex items-center justify-between mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">👪 לוח הורים</h1>
        <p className="text-gray-500 text-sm">שלום, {user?.name}</p>
      </div>

      {summaries.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
          <div className="text-5xl mb-4">👶</div>
          <p className="text-gray-500">אין עדיין פרופילי ילדים</p>
        </div>
      ) : (
        <div className="space-y-6">
          {summaries.map((child, i) => (
            <motion.div
              key={child.id}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white rounded-2xl shadow-sm p-4 sm:p-6"
            >
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-gray-800">{child.name}</h2>
                  <p className="text-sm text-gray-500">
                    כיתה {child.grade === 2 ? "ב'" : "ג'"} · רמה {child.level}
                  </p>
                </div>
                <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm">
                  <span className="text-yellow-500 font-medium">🪙 {child.coins}</span>
                  <span className="text-purple-500 font-medium">✨ {child.xp} XP</span>
                </div>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-3 gap-2 sm:gap-4">
                <div className="bg-gray-50 rounded-xl p-2 sm:p-3 text-center">
                  <div className="text-lg sm:text-2xl font-bold text-indigo-600">
                    {child.totalAnswers}
                  </div>
                  <div className="text-xs text-gray-500">תשובות</div>
                </div>
                <div className="bg-gray-50 rounded-xl p-2 sm:p-3 text-center">
                  <div className="text-lg sm:text-2xl font-bold text-green-600">
                    {child.accuracy}%
                  </div>
                  <div className="text-xs text-gray-500">דיוק</div>
                </div>
                <div className="bg-gray-50 rounded-xl p-2 sm:p-3 text-center">
                  <div className="text-lg sm:text-2xl font-bold text-orange-600">
                    {child.sessionsCount}
                  </div>
                  <div className="text-xs text-gray-500">משחקים</div>
                </div>
              </div>

              {/* Accuracy bar */}
              <div className="mt-4">
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-l from-green-400 to-emerald-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${child.accuracy}%` }}
                    transition={{ duration: 1 }}
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
