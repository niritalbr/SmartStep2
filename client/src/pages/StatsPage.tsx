import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { api } from "../api";
import { Category, CATEGORY_INFO, type ChildStats } from "../types";

export default function StatsPage() {
  const { activeChild } = useAuth();
  const [stats, setStats] = useState<ChildStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeChild) return;
    api
      .getChildStats(activeChild.id)
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [activeChild]);

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="animate-spin text-4xl">📊</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <p className="text-gray-500">לא נמצאו נתונים</p>
      </div>
    );
  }

  const overallAccuracy =
    stats.totalAnswers > 0
      ? Math.round((stats.totalCorrect / stats.totalAnswers) * 100)
      : 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">
        📊 הסטטיסטיקה של {stats.child.name}
      </h1>

      {/* Overview cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="רמה" value={String(stats.child.level)} icon="⭐" color="indigo" />
        <StatCard label="רצף ימים" value={String(stats.currentStreak)} icon="🔥" color="orange" />
        <StatCard label="דיוק כולל" value={`${overallAccuracy}%`} icon="🎯" color="green" />
        <StatCard label="סה״כ תשובות" value={String(stats.totalAnswers)} icon="📝" color="purple" />
      </div>

      {/* Category breakdown */}
      <h2 className="text-lg font-bold text-gray-700 mb-4">ביצועים לפי קטגוריה</h2>
      <div className="space-y-4 mb-8">
        {Object.values(Category).map((cat) => {
          const catStats = stats.perCategory[cat];
          if (!catStats) return null;
          const info = CATEGORY_INFO[cat];
          const accuracy =
            catStats.total > 0
              ? Math.round((catStats.correct / catStats.total) * 100)
              : 0;

          return (
            <motion.div
              key={cat}
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="bg-white rounded-xl p-4 shadow-sm"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{info.icon}</span>
                  <span className="font-medium text-gray-700">{info.name}</span>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span>{catStats.total} תשובות</span>
                  <span className="font-bold" style={{ color: info.color }}>
                    {accuracy}%
                  </span>
                </div>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: info.color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${accuracy}%` }}
                  transition={{ duration: 1 }}
                />
              </div>
              {catStats.avgTimeMs > 0 && (
                <div className="text-xs text-gray-400 mt-1">
                  ⏱ זמן ממוצע: {Math.round(catStats.avgTimeMs / 1000)} שניות
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Recent sessions */}
      {stats.recentSessions.length > 0 && (
        <>
          <h2 className="text-lg font-bold text-gray-700 mb-4">משחקים אחרונים</h2>
          <div className="space-y-2">
            {stats.recentSessions.map((session) => {
              const info = CATEGORY_INFO[session.category as Category];
              return (
                <div
                  key={session.id}
                  className="bg-white rounded-xl p-4 shadow-sm flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{info?.icon}</span>
                    <div>
                      <div className="font-medium text-gray-700 text-sm">
                        {info?.name}
                      </div>
                      <div className="text-xs text-gray-400">
                        {session.endedAt
                          ? new Date(session.endedAt).toLocaleDateString("he-IL")
                          : "—"}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-600">
                      {session.score}/{session.total}
                    </span>
                    <div className="flex">
                      {[1, 2, 3].map((s) => (
                        <span
                          key={s}
                          className={`text-sm ${s <= session.stars ? "opacity-100" : "opacity-20"}`}
                        >
                          ⭐
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: string;
  color: string;
}) {
  const colors: Record<string, string> = {
    indigo: "bg-indigo-50 text-indigo-700",
    orange: "bg-orange-50 text-orange-700",
    green: "bg-green-50 text-green-700",
    purple: "bg-purple-50 text-purple-700",
  };

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className={`rounded-xl p-4 text-center ${colors[color]}`}
    >
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs opacity-70">{label}</div>
    </motion.div>
  );
}
