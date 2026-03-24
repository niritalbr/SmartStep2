import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { api } from "../api";
import { Category, CATEGORY_INFO, type Question, type AnswerResult } from "../types";
import { VisualQuestion, VisualOption } from "../components/VisualQuestion";

type GameState = "loading" | "playing" | "feedback" | "summary";

// Characters that indicate a diagram/pattern needing monospace rendering
const DIAGRAM_CHARS = /[╱╲──│→○□△◇☆●■▲◆★]/;

function QuestionText({ text }: { text: string }) {
  // Split into paragraphs by double newline
  const parts = text.split(/\n\n/);

  return (
    <div className="mb-6">
      {parts.map((part, i) => {
        const isDiagram = DIAGRAM_CHARS.test(part);
        return (
          <div
            key={i}
            className={`${
              isDiagram
                ? "font-mono text-lg leading-loose my-3 text-center"
                : "text-xl font-medium text-gray-800 leading-relaxed"
            } whitespace-pre-wrap ${i > 0 ? "mt-3" : ""}`}
            dir={isDiagram ? "ltr" : "rtl"}
          >
            {part}
          </div>
        );
      })}
    </div>
  );
}

export default function GamePage() {
  const { category } = useParams<{ category: string }>();
  const navigate = useNavigate();
  const { activeChild, updateActiveChild } = useAuth();

  const [gameState, setGameState] = useState<GameState>("loading");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [results, setResults] = useState<AnswerResult[]>([]);
  const [timeLeft, setTimeLeft] = useState(90);
  const startTimeRef = useRef(Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const catInfo = CATEGORY_INFO[category as Category];
  const currentQuestion = questions[currentIndex];

  // Load questions (generated fresh each time) and create session
  useEffect(() => {
    if (!activeChild || !category) return;

    const load = async () => {
      try {
        const TARGET = 10;

        // Map child level to difficulty range (1-5)
        const childLevel = activeChild.level || 1;
        const difficulty = Math.min(Math.max(Math.ceil(childLevel / 2), 1), 5);

        // Generate fresh questions and create session in parallel
        const [generated, session] = await Promise.all([
          api.generateQuestions({
            category,
            count: TARGET,
            difficulty,
            childId: activeChild.id,
          }),
          api.createSession({
            childId: activeChild.id,
            category,
            mode: "practice",
          }),
        ]);

        if (!generated || generated.length === 0) {
          console.error("No questions generated");
          return;
        }

        // Shuffle
        for (let i = generated.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [generated[i], generated[j]] = [generated[j], generated[i]];
        }

        setQuestions(generated.slice(0, TARGET));
        setSessionId(session.id);
        setGameState("playing");
        startTimeRef.current = Date.now();
      } catch (err) {
        console.error("Failed to load game:", err);
      }
    };
    load();
  }, [activeChild, category]);

  // Timer
  useEffect(() => {
    if (gameState !== "playing" || !currentQuestion) return;

    setTimeLeft(currentQuestion.timeLimitSec || 90);
    startTimeRef.current = Date.now();

    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          handleSubmit("timeout");
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [gameState, currentIndex]);

  const handleSubmit = useCallback(
    async (answer: string) => {
      if (!activeChild || !currentQuestion || !sessionId) return;
      if (gameState !== "playing") return;

      clearInterval(timerRef.current);
      setSelected(answer);

      const timeSpentMs = Date.now() - startTimeRef.current;

      try {
        const res = await api.submitAnswer({
          childId: activeChild.id,
          questionId: currentQuestion.id,
          selected: answer === "timeout" ? "" : answer,
          timeSpentMs,
          sessionId,
        });
        setResult(res);
        setResults((prev) => [...prev, res]);
        updateActiveChild({ xp: res.newXp, coins: res.newCoins });
        setGameState("feedback");
      } catch (err) {
        console.error("Submit error:", err);
      }
    },
    [activeChild, currentQuestion, sessionId, gameState, updateActiveChild]
  );

  const handleNext = async () => {
    if (currentIndex + 1 >= questions.length) {
      // End session
      if (sessionId) {
        try {
          await api.endSession(sessionId);
        } catch {}
      }
      setGameState("summary");
    } else {
      setCurrentIndex((i) => i + 1);
      setSelected(null);
      setResult(null);
      setGameState("playing");
    }
  };

  // Parse options from JSON
  const parseOptions = (q: Question): { id: string; text: string; image?: string }[] => {
    if (Array.isArray(q.options)) return q.options;
    try {
      return JSON.parse(q.options as any);
    } catch {
      return [];
    }
  };

  if (gameState === "loading") {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
          className="text-6xl mb-4"
        >
          {catInfo?.icon || "🧠"}
        </motion.div>
        <p className="text-gray-500 text-lg">טוען שאלות...</p>
      </div>
    );
  }

  if (gameState === "summary") {
    const correct = results.filter((r) => r.isCorrect).length;
    const total = results.length;
    const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
    const stars = pct >= 90 ? 3 : pct >= 70 ? 2 : pct >= 50 ? 1 : 0;
    const totalXp = results.reduce((s, r) => s + r.xpGain, 0);
    const totalCoins = results.reduce((s, r) => s + r.coinGain, 0);

    return (
      <div className="max-w-lg mx-auto px-3 sm:px-4 py-8 sm:py-12">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-2xl shadow-xl p-5 sm:p-8 text-center"
        >
          <div className="text-6xl mb-4">
            {stars === 3 ? "🏆" : stars === 2 ? "🌟" : stars === 1 ? "⭐" : "💪"}
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">סיום משחק!</h2>

          {/* Stars */}
          <div className="flex justify-center gap-2 mb-4">
            {[1, 2, 3].map((s) => (
              <motion.span
                key={s}
                initial={{ scale: 0 }}
                animate={{ scale: s <= stars ? 1 : 0.5 }}
                transition={{ delay: s * 0.2 }}
                className={`text-4xl ${s <= stars ? "opacity-100" : "opacity-20"}`}
              >
                ⭐
              </motion.span>
            ))}
          </div>

          <div className="text-lg text-gray-600 mb-6">
            {correct} מתוך {total} תשובות נכונות ({pct}%)
          </div>

          <div className="flex justify-center gap-6 sm:gap-8 mb-6 sm:mb-8">
            <div className="text-center">
              <div className="text-xl sm:text-2xl font-bold text-purple-500">+{totalXp}</div>
              <div className="text-xs text-gray-400">XP</div>
            </div>
            <div className="text-center">
              <div className="text-xl sm:text-2xl font-bold text-yellow-500">+{totalCoins}</div>
              <div className="text-xs text-gray-400">מטבעות</div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => navigate("/")}
              className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200"
            >
              🏠 חזרה הביתה
            </button>
            <button
              onClick={() => window.location.reload()}
              className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700"
            >
              🔄 משחק נוסף
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center">
        <div className="text-5xl mb-4">😕</div>
        <p className="text-gray-500 text-lg mb-4">אין שאלות זמינות בקטגוריה זו</p>
        <button
          onClick={() => navigate("/")}
          className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium"
        >
          חזרה הביתה
        </button>
      </div>
    );
  }

  const options = parseOptions(currentQuestion);
  const timerPct = (timeLeft / (currentQuestion.timeLimitSec || 90)) * 100;

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
      {/* Progress bar */}
      <div className="flex items-center gap-2 sm:gap-4 mb-4 sm:mb-6">
        <button
          onClick={() => navigate("/")}
          className="text-gray-400 hover:text-gray-600 text-lg"
        >
          ✕
        </button>
        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-indigo-500 rounded-full"
            animate={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
          />
        </div>
        <span className="text-sm text-gray-400 min-w-[3rem] text-center">
          {currentIndex + 1}/{questions.length}
        </span>
      </div>

      {/* Timer */}
      <div className="mb-4">
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full transition-colors ${
              timeLeft <= 10 ? "bg-red-500" : timeLeft <= 30 ? "bg-yellow-500" : "bg-green-500"
            }`}
            animate={{ width: `${timerPct}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>{catInfo?.name}</span>
          <span
            className={`font-mono ${timeLeft <= 10 ? "text-red-500 font-bold" : ""}`}
          >
            {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}
          </span>
        </div>
      </div>

      {/* Question card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -50, opacity: 0 }}
          className="bg-white rounded-2xl shadow-lg p-4 sm:p-8 mb-4 sm:mb-6"
        >
          {/* Question text / visual */}
          {currentQuestion.visualData ? (
            <>
              <p className="text-base sm:text-xl font-medium text-gray-800 text-center mb-3 sm:mb-4" dir="rtl">
                {currentQuestion.questionText}
              </p>
              <VisualQuestion data={currentQuestion.visualData} />
            </>
          ) : (
            <QuestionText text={currentQuestion.questionText} />
          )}

          {/* Options */}
          <div className={currentQuestion.visualData ? "grid grid-cols-2 gap-2 sm:gap-3" : "space-y-2 sm:space-y-3"}>
            {options.map((opt, optIdx) => {
              let btnClass = "option-btn ";
              if (gameState === "feedback" && result) {
                if (opt.id === result.correctAnswer) {
                  btnClass += "border-green-500 bg-green-50 text-green-700 ";
                } else if (opt.id === selected && !result.isCorrect) {
                  btnClass += "border-red-500 bg-red-50 text-red-700 animate-shake ";
                } else {
                  btnClass += "opacity-50 ";
                }
              } else if (selected === opt.id) {
                btnClass += "border-indigo-500 bg-indigo-50 ";
              }

              return (
                <motion.button
                  key={opt.id}
                  whileHover={gameState === "playing" ? { scale: 1.02 } : {}}
                  whileTap={gameState === "playing" ? { scale: 0.98 } : {}}
                  disabled={gameState !== "playing"}
                  onClick={() => handleSubmit(opt.id)}
                  className={`w-full flex items-center gap-2 sm:gap-4 p-3 sm:p-5 rounded-xl border-2 text-right transition-all ${btnClass}`}
                >
                  <span className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-100 flex items-center justify-center text-sm sm:text-base font-bold shrink-0">
                    {opt.id}
                  </span>
                  {currentQuestion.visualData?.optionVisuals?.[optIdx] ? (
                    <span className="flex-1 flex justify-center">
                      <VisualOption cell={currentQuestion.visualData.optionVisuals[optIdx]} />
                    </span>
                  ) : (
                    <span className="flex-1 text-sm sm:text-lg">{opt.text}</span>
                  )}
                  {gameState === "feedback" && opt.id === result?.correctAnswer && (
                    <span className="text-green-500 text-xl">✓</span>
                  )}
                  {gameState === "feedback" &&
                    opt.id === selected &&
                    !result?.isCorrect && (
                      <span className="text-red-500 text-xl">✗</span>
                    )}
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Feedback overlay */}
      <AnimatePresence>
        {gameState === "feedback" && result && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className={`rounded-2xl p-4 sm:p-6 text-center ${
              result.isCorrect
                ? "bg-green-50 border-2 border-green-200"
                : "bg-red-50 border-2 border-red-200"
            }`}
          >
            <div className="text-3xl sm:text-4xl mb-2">
              {result.isCorrect ? "🎉" : "😢"}
            </div>
            <h3
              className={`text-lg sm:text-xl font-bold mb-1 ${
                result.isCorrect ? "text-green-700" : "text-red-700"
              }`}
            >
              {result.isCorrect ? "כל הכבוד!" : "לא נורא, נסו שוב!"}
            </h3>
            {result.explanation && (
              <p className="text-gray-600 text-sm mb-3">{result.explanation}</p>
            )}
            <div className="flex justify-center gap-4 mb-4 text-sm">
              <span className="text-purple-500 font-medium">+{result.xpGain} XP</span>
              {result.coinGain > 0 && (
                <span className="text-yellow-500 font-medium">+{result.coinGain} 🪙</span>
              )}
            </div>
            <button
              onClick={handleNext}
              className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700"
            >
              {currentIndex + 1 >= questions.length ? "סיום" : "שאלה הבאה ➜"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
