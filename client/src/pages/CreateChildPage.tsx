import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";

const AVATARS = [
  { type: "owl", emoji: "🦉", label: "ינשוף" },
  { type: "robot", emoji: "🤖", label: "רובוט" },
  { type: "cat", emoji: "🐱", label: "חתול" },
];

const COLORS = [
  "#6366f1", "#ef4444", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6",
];

export default function CreateChildPage() {
  const navigate = useNavigate();
  const { refreshChildren } = useAuth();
  const [name, setName] = useState("");
  const [grade, setGrade] = useState(2);
  const [avatarType, setAvatarType] = useState("owl");
  const [avatarColor, setAvatarColor] = useState("#6366f1");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.createChild({ name, grade, avatarType, avatarColor });
      await refreshChildren();
      navigate("/");
    } catch (err: any) {
      setError(err.message || "שגיאה ביצירת פרופיל");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] sm:min-h-[80vh] flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-xl p-5 sm:p-8 w-full max-w-lg">
        <div className="text-center mb-6 sm:mb-8">
          <div className="text-4xl sm:text-5xl mb-3">🌟</div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">יצירת פרופיל ילד</h1>
          <p className="text-gray-500 mt-1">בואו נכיר את השחקן החדש!</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">שם הילד/ה</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="איך קוראים לך?"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">כיתה</label>
            <div className="flex gap-3">
              {[2, 3].map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGrade(g)}
                  className={`flex-1 py-3 rounded-xl text-lg font-bold transition-all ${
                    grade === g
                      ? "bg-indigo-100 text-indigo-700 ring-2 ring-indigo-400"
                      : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                  }`}
                >
                  כיתה {g === 2 ? "ב'" : "ג'"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">דמות</label>
            <div className="flex gap-2 sm:gap-3 justify-center">
              {AVATARS.map((a) => (
                <button
                  key={a.type}
                  type="button"
                  onClick={() => setAvatarType(a.type)}
                  className={`flex flex-col items-center p-3 sm:p-4 rounded-xl transition-all ${
                    avatarType === a.type
                      ? "bg-indigo-50 ring-2 ring-indigo-400 scale-110"
                      : "bg-gray-50 hover:bg-gray-100"
                  }`}
                >
                  <span className="text-3xl sm:text-4xl mb-1">{a.emoji}</span>
                  <span className="text-xs text-gray-600">{a.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">צבע</label>
            <div className="flex gap-3 justify-center">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setAvatarColor(c)}
                  className={`w-10 h-10 rounded-full transition-all ${
                    avatarColor === c ? "ring-3 ring-offset-2 ring-indigo-400 scale-110" : "hover:scale-105"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors text-lg"
          >
            {loading ? "יוצר..." : "🚀 יאללה, בואו נתחיל!"}
          </button>
        </form>
      </div>
    </div>
  );
}
