import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { api } from "../api";
import { type Question } from "../types";
import { VisualQuestion, VisualOption } from "../components/VisualQuestion";

/* ───── Types ──────────────────────────────────────── */

interface ExamSection {
  id: string;
  name: string;
  timeLimitMin: number;
  questions: Question[];
}

interface UserAnswer {
  questionId: string;
  selected: string;
  timeSpentMs: number;
}

interface ExamResult {
  totalScore: number;
  totalQuestions: number;
  percentage: number;
  categoryScores: Record<string, { score: number; total: number }>;
  sectionScores: Record<string, { score: number; total: number }>;
  xpGain: number;
  coinGain: number;
  newXp: number;
  newCoins: number;
  answers: {
    questionId: string;
    selected: string;
    isCorrect: boolean;
    correctAnswer: string;
    explanation?: string;
    category: string;
  }[];
}

type Phase = "intro" | "loading" | "exam" | "section-break" | "submitting" | "results";

/* ───── Diagram chars (same as GamePage) ───────────── */

const DIAGRAM_CHARS = /[╱╲──│→○□△◇☆●■▲◆★]/;

function QuestionText({ text }: { text: string }) {
  const parts = text.split(/\n\n/);
  return (
    <div className="mb-4">
      {parts.map((part, i) => {
        const isDiagram = DIAGRAM_CHARS.test(part);
        return (
          <div
            key={i}
            className={`${
              isDiagram
                ? "font-mono text-base sm:text-lg leading-loose my-2 text-center"
                : "text-base sm:text-xl font-medium text-gray-800 leading-relaxed"
            } whitespace-pre-wrap ${i > 0 ? "mt-2" : ""}`}
            dir={isDiagram ? "ltr" : "rtl"}
          >
            {part}
          </div>
        );
      })}
    </div>
  );
}

/* ───── Section Info ───────────────────────────────── */

const SECTION_META: Record<string, { icon: string; color: string; desc: string }> = {
  verbal: { icon: "📝", color: "#6366f1", desc: "קשרי מילים, השלמת משפטים ואוצר מילים" },
  quantitative: { icon: "🔢", color: "#ef4444", desc: "בעיות חשבון ומספרים בצורות" },
  figural: { icon: "🔷", color: "#8b5cf6", desc: "צורות, מטריצות וסדרות" },
};

const CATEGORY_NAMES: Record<string, string> = {
  word_relations: "קשרי מילים",
  sentence_completion: "השלמת משפטים",
  vocabulary: "אוצר מילים",
  math_problems: "בעיות חשבון",
  numbers_in_shapes: "מספרים בצורות",
  shapes: "צורות ומטריצות",
};

/* ───── Component ──────────────────────────────────── */

export default function ExamPage() {
  const navigate = useNavigate();
  const { activeChild, updateActiveChild } = useAuth();

  // Exam state
  const [phase, setPhase] = useState<Phase>("intro");
  const [sections, setSections] = useState<ExamSection[]>([]);
  const [currentSectionIdx, setCurrentSectionIdx] = useState(0);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);

  // Answers: Map<sectionId, Map<questionId, UserAnswer>>
  const [answers, setAnswers] = useState<Record<string, Record<string, UserAnswer>>>({});
  // Flagged questions: Set of "sectionIdx-questionIdx"
  const [flagged, setFlagged] = useState<Set<string>>(new Set());

  // Timer
  const [timeLeftSec, setTimeLeftSec] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const questionStartRef = useRef(Date.now());
  const examStartRef = useRef(Date.now());

  // Results
  const [examResult, setExamResult] = useState<ExamResult | null>(null);
  const [showReview, setShowReview] = useState(false);
  const [reviewSectionIdx, setReviewSectionIdx] = useState(0);
  const [reviewQuestionIdx, setReviewQuestionIdx] = useState(0);

  // Nav panel visibility on mobile
  const [showNav, setShowNav] = useState(false);

  // Confirm dialog
  const [confirmEndSection, setConfirmEndSection] = useState(false);

  const currentSection = sections[currentSectionIdx];
  const currentQuestion = currentSection?.questions[currentQuestionIdx];

  /* ───── Generate exam ────────────────────────────── */
  const startExam = async () => {
    if (!activeChild) return;
    setPhase("loading");
    try {
      const data = await api.generateExam({ childId: activeChild.id });
      setSections(data.sections);

      // Initialize answer maps
      const ans: Record<string, Record<string, UserAnswer>> = {};
      for (const s of data.sections) {
        ans[s.id] = {};
      }
      setAnswers(ans);
      setFlagged(new Set());

      setCurrentSectionIdx(0);
      setCurrentQuestionIdx(0);
      examStartRef.current = Date.now();

      // Start first section timer
      setTimeLeftSec(data.sections[0].timeLimitMin * 60);
      setPhase("exam");
      questionStartRef.current = Date.now();
    } catch (err) {
      console.error("Failed to generate exam:", err);
      setPhase("intro");
    }
  };

  /* ───── Timer ────────────────────────────────────── */
  useEffect(() => {
    if (phase !== "exam") {
      clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeftSec(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          // Time's up — auto move to next section
          handleEndSection(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [phase, currentSectionIdx]);

  /* ───── Select answer ────────────────────────────── */
  const selectAnswer = useCallback((optionId: string) => {
    if (!currentSection || !currentQuestion) return;

    const timeSpentMs = Date.now() - questionStartRef.current;

    setAnswers(prev => ({
      ...prev,
      [currentSection.id]: {
        ...prev[currentSection.id],
        [currentQuestion.id]: {
          questionId: currentQuestion.id,
          selected: optionId,
          timeSpentMs,
        },
      },
    }));
  }, [currentSection, currentQuestion]);

  /* ───── Navigation ───────────────────────────────── */
  const goToQuestion = (idx: number) => {
    questionStartRef.current = Date.now();
    setCurrentQuestionIdx(idx);
    setShowNav(false);
  };

  const goNext = () => {
    if (!currentSection) return;
    if (currentQuestionIdx < currentSection.questions.length - 1) {
      goToQuestion(currentQuestionIdx + 1);
    }
  };

  const goPrev = () => {
    if (currentQuestionIdx > 0) {
      goToQuestion(currentQuestionIdx - 1);
    }
  };

  /* ───── Flag question ────────────────────────────── */
  const toggleFlag = () => {
    const key = `${currentSectionIdx}-${currentQuestionIdx}`;
    setFlagged(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  /* ───── End section ──────────────────────────────── */
  const handleEndSection = useCallback((_forced = false) => {
    clearInterval(timerRef.current);

    if (currentSectionIdx < sections.length - 1) {
      // Move to section break
      setConfirmEndSection(false);
      setPhase("section-break");
    } else {
      // Last section — submit exam
      submitExam();
    }
  }, [currentSectionIdx, sections.length]);

  const startNextSection = () => {
    const nextIdx = currentSectionIdx + 1;
    setCurrentSectionIdx(nextIdx);
    setCurrentQuestionIdx(0);
    setTimeLeftSec(sections[nextIdx].timeLimitMin * 60);
    questionStartRef.current = Date.now();
    setPhase("exam");
  };

  /* ───── Submit exam ──────────────────────────────── */
  const submitExam = async () => {
    if (!activeChild) return;
    setPhase("submitting");

    const totalDurationSec = Math.round((Date.now() - examStartRef.current) / 1000);

    const sectionData = sections.map(s => ({
      id: s.id,
      answers: Object.values(answers[s.id] || {}),
    }));

    try {
      const result = await api.submitExam({
        childId: activeChild.id,
        sections: sectionData,
        totalDurationSec,
      });
      setExamResult(result);
      updateActiveChild({ xp: result.newXp, coins: result.newCoins });
      setPhase("results");
    } catch (err) {
      console.error("Failed to submit exam:", err);
    }
  };

  /* ───── Parse options helper ─────────────────────── */
  const parseOptions = (q: Question): { id: string; text: string; image?: string }[] => {
    if (Array.isArray(q.options)) return q.options;
    try { return JSON.parse(q.options as any); } catch { return []; }
  };

  /* ───── Format time ──────────────────────────────── */
  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  /* ═══════════════════════════════════════════════════
     INTRO PHASE
     ═══════════════════════════════════════════════════ */
  if (phase === "intro") {
    return (
      <div className="max-w-2xl mx-auto px-3 sm:px-4 py-6 sm:py-10">
        <button onClick={() => navigate("/")} className="mb-4 text-sm text-gray-500 hover:text-gray-700">
          ← חזרה
        </button>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white rounded-2xl shadow-xl p-5 sm:p-8"
        >
          <div className="text-center mb-6">
            <div className="text-5xl sm:text-7xl mb-3">📋</div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">מבחן סימולציה מלא</h1>
            <p className="text-gray-500 text-sm sm:text-base">
              סימולציה מלאה של מבחן מחוננים שלב ב' — בדיוק כמו המבחן האמיתי!
            </p>
          </div>

          {/* Sections overview */}
          <div className="space-y-3 mb-6">
            {[
              { id: "verbal", name: "פרק 1: חשיבה מילולית", questions: 20, time: 25 },
              { id: "quantitative", name: "פרק 2: חשיבה כמותית", questions: 20, time: 25 },
              { id: "figural", name: "פרק 3: חשיבה צורנית", questions: 15, time: 20 },
            ].map(s => {
              const meta = SECTION_META[s.id];
              return (
                <div
                  key={s.id}
                  className="flex items-center gap-3 p-3 sm:p-4 rounded-xl"
                  style={{ background: meta.color + "10" }}
                >
                  <div className="text-2xl sm:text-3xl">{meta.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-gray-800 text-sm sm:text-base">{s.name}</div>
                    <div className="text-xs sm:text-sm text-gray-500">{meta.desc}</div>
                  </div>
                  <div className="text-left shrink-0">
                    <div className="text-xs sm:text-sm font-bold text-gray-700">{s.questions} שאלות</div>
                    <div className="text-xs text-gray-400">{s.time} דקות</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Rules */}
          <div className="bg-amber-50 rounded-xl p-4 mb-6 text-sm text-amber-800">
            <h3 className="font-bold mb-2">📌 חוקי המבחן:</h3>
            <ul className="space-y-1 list-disc list-inside text-xs sm:text-sm">
              <li>לכל פרק יש <strong>מגבלת זמן נפרדת</strong> — כשנגמר הזמן, עוברים לפרק הבא</li>
              <li>ניתן <strong>לדלג על שאלות ולחזור אליהן</strong> בתוך אותו פרק</li>
              <li>ניתן <strong>לסמן שאלות לחזרה</strong> עם 🚩</li>
              <li><strong>אין ניקוד שלילי</strong> — כדאי לנסות לענות על הכל!</li>
              <li>לא ניתן לחזור לפרק קודם אחרי שעברתם הלאה</li>
            </ul>
          </div>

          <div className="text-center">
            <div className="text-xs text-gray-400 mb-3">
              סה"כ: 55 שאלות · 70 דקות
            </div>
            <button
              onClick={startExam}
              className="px-8 sm:px-10 py-3 sm:py-4 bg-gradient-to-l from-indigo-600 to-purple-600 text-white text-lg sm:text-xl rounded-2xl font-bold hover:from-indigo-700 hover:to-purple-700 active:scale-95 transition-all shadow-lg"
            >
              📋 התחל מבחן!
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════
     LOADING PHASE
     ═══════════════════════════════════════════════════ */
  if (phase === "loading") {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
          className="text-6xl mb-4"
        >📋</motion.div>
        <p className="text-gray-500 text-lg mb-2">מכין את המבחן...</p>
        <p className="text-gray-400 text-sm">יוצר 55 שאלות ב-6 קטגוריות</p>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════
     SUBMITTING PHASE
     ═══════════════════════════════════════════════════ */
  if (phase === "submitting") {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
          className="text-6xl mb-4"
        >⏳</motion.div>
        <p className="text-gray-500 text-lg">בודק תשובות...</p>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════
     SECTION BREAK PHASE
     ═══════════════════════════════════════════════════ */
  if (phase === "section-break") {
    const nextSection = sections[currentSectionIdx + 1];
    const meta = nextSection ? SECTION_META[nextSection.id] : null;
    const answeredCount = Object.keys(answers[currentSection?.id] || {}).length;
    const totalInSection = currentSection?.questions.length || 0;

    return (
      <div className="max-w-lg mx-auto px-3 sm:px-4 py-8 sm:py-12">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-2xl shadow-xl p-5 sm:p-8 text-center"
        >
          <div className="text-4xl sm:text-5xl mb-3">✅</div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">
            סיימתם את {currentSection?.name}!
          </h2>
          <p className="text-gray-500 text-sm mb-4">
            עניתם על {answeredCount} מתוך {totalInSection} שאלות
          </p>

          {nextSection && meta && (
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <div className="text-3xl mb-2">{meta.icon}</div>
              <h3 className="font-bold text-gray-800 mb-1">הפרק הבא: {nextSection.name}</h3>
              <p className="text-sm text-gray-500">
                {nextSection.questions.length} שאלות · {nextSection.timeLimitMin} דקות
              </p>
            </div>
          )}

          <button
            onClick={startNextSection}
            className="px-8 py-3 bg-indigo-600 text-white text-lg rounded-2xl font-bold hover:bg-indigo-700 active:scale-95 transition-all shadow-lg"
          >
            המשך לפרק הבא ➜
          </button>
        </motion.div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════
     RESULTS PHASE
     ═══════════════════════════════════════════════════ */
  if (phase === "results" && examResult) {
    if (showReview) {
      return (
        <ReviewScreen
          sections={sections}
          examResult={examResult}
          reviewSectionIdx={reviewSectionIdx}
          reviewQuestionIdx={reviewQuestionIdx}
          setReviewSectionIdx={setReviewSectionIdx}
          setReviewQuestionIdx={setReviewQuestionIdx}
          onBack={() => setShowReview(false)}
          parseOptions={parseOptions}
          answers={answers}
        />
      );
    }

    const totalTime = Math.round((Date.now() - examStartRef.current) / 1000);
    const minutes = Math.floor(totalTime / 60);

    return (
      <div className="max-w-2xl mx-auto px-3 sm:px-4 py-6 sm:py-10">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-2xl shadow-xl p-5 sm:p-8"
        >
          {/* Header */}
          <div className="text-center mb-6">
            <div className="text-5xl sm:text-6xl mb-3">
              {examResult.percentage >= 80 ? "🏆" : examResult.percentage >= 60 ? "🌟" : "💪"}
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-1">תוצאות המבחן</h2>
            <div className="text-4xl sm:text-5xl font-black text-indigo-600 mb-1">
              {examResult.percentage}%
            </div>
            <p className="text-gray-500 text-sm">
              {examResult.totalScore} מתוך {examResult.totalQuestions} תשובות נכונות · {minutes} דקות
            </p>
          </div>

          {/* Section scores */}
          <div className="space-y-3 mb-6">
            <h3 className="font-bold text-gray-700 text-sm sm:text-base">ציון לפי פרק:</h3>
            {sections.map(s => {
              const ss = examResult.sectionScores[s.id];
              const pct = ss && ss.total > 0 ? Math.round((ss.score / ss.total) * 100) : 0;
              const meta = SECTION_META[s.id];
              return (
                <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                  <div className="text-xl sm:text-2xl">{meta.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-800 text-sm">{s.name}</div>
                    <div className="h-2 bg-gray-200 rounded-full mt-1 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: pct >= 80 ? "#22c55e" : pct >= 60 ? "#f59e0b" : "#ef4444",
                        }}
                      />
                    </div>
                  </div>
                  <div className="text-sm font-bold text-gray-700 shrink-0">
                    {ss?.score || 0}/{ss?.total || 0} ({pct}%)
                  </div>
                </div>
              );
            })}
          </div>

          {/* Category breakdown */}
          <div className="space-y-2 mb-6">
            <h3 className="font-bold text-gray-700 text-sm sm:text-base">פירוט לפי קטגוריה:</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(examResult.categoryScores).map(([cat, cs]) => {
                const pct = cs.total > 0 ? Math.round((cs.score / cs.total) * 100) : 0;
                return (
                  <div key={cat} className="bg-gray-50 rounded-lg p-2 sm:p-3 text-center">
                    <div className="text-xs text-gray-500 mb-0.5">{CATEGORY_NAMES[cat] || cat}</div>
                    <div className={`text-lg font-bold ${
                      pct >= 80 ? "text-green-600" : pct >= 60 ? "text-amber-600" : "text-red-600"
                    }`}>
                      {pct}%
                    </div>
                    <div className="text-xs text-gray-400">{cs.score}/{cs.total}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Rewards */}
          <div className="flex justify-center gap-6 mb-6">
            <div className="text-center">
              <div className="text-xl font-bold text-purple-500">+{examResult.xpGain}</div>
              <div className="text-xs text-gray-400">XP</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-yellow-500">+{examResult.coinGain}</div>
              <div className="text-xs text-gray-400">מטבעות</div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => { setShowReview(true); setReviewSectionIdx(0); setReviewQuestionIdx(0); }}
              className="flex-1 py-3 bg-amber-100 text-amber-800 rounded-xl font-medium hover:bg-amber-200"
            >
              🔍 סקירת תשובות
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

  /* ═══════════════════════════════════════════════════
     EXAM PHASE
     ═══════════════════════════════════════════════════ */
  if (!currentSection || !currentQuestion) return null;

  const options = parseOptions(currentQuestion);
  const sectionMeta = SECTION_META[currentSection.id];
  const sectionAnswers = answers[currentSection.id] || {};
  const selectedAnswer = sectionAnswers[currentQuestion.id]?.selected || null;
  const answeredCount = Object.keys(sectionAnswers).length;
  const totalInSection = currentSection.questions.length;
  const flagKey = `${currentSectionIdx}-${currentQuestionIdx}`;
  const isFlagged = flagged.has(flagKey);
  const isLastSection = currentSectionIdx === sections.length - 1;

  return (
    <div className="max-w-3xl mx-auto px-2 sm:px-4 py-2 sm:py-4">
      {/* Top bar: section info + timer */}
      <div className="flex items-center justify-between mb-2 sm:mb-3 bg-white rounded-xl shadow-sm px-3 py-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg sm:text-xl">{sectionMeta.icon}</span>
          <div className="min-w-0">
            <div className="text-xs sm:text-sm font-bold text-gray-700 truncate">{currentSection.name}</div>
            <div className="text-xs text-gray-400">
              פרק {currentSectionIdx + 1} מתוך {sections.length}
            </div>
          </div>
        </div>

        <div className={`text-base sm:text-lg font-mono font-bold px-3 py-1 rounded-lg ${
          timeLeftSec <= 120 ? "bg-red-100 text-red-600 animate-pulse" :
          timeLeftSec <= 300 ? "bg-amber-100 text-amber-600" :
          "bg-green-100 text-green-700"
        }`}>
          ⏱ {formatTime(timeLeftSec)}
        </div>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-2 mb-2">
        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all"
            style={{ width: `${((currentQuestionIdx + 1) / totalInSection) * 100}%` }}
          />
        </div>
        <span className="text-xs text-gray-400 shrink-0">
          {currentQuestionIdx + 1}/{totalInSection}
        </span>
        <span className="text-xs text-gray-400 shrink-0">
          ({answeredCount} נענו)
        </span>
      </div>

      {/* Question card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${currentSectionIdx}-${currentQuestionIdx}`}
          initial={{ x: 40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -40, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 mb-3"
        >
          {/* Question header */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs sm:text-sm text-gray-400">
              שאלה {currentQuestionIdx + 1}
            </span>
            <button
              onClick={toggleFlag}
              className={`text-lg sm:text-xl transition-transform ${isFlagged ? "scale-125" : "opacity-40 hover:opacity-70"}`}
              title="סמן לחזרה"
            >
              🚩
            </button>
          </div>

          {/* Question content */}
          {currentQuestion.visualData ? (
            <>
              <p className="text-sm sm:text-lg font-medium text-gray-800 text-center mb-3" dir="rtl">
                {currentQuestion.questionText}
              </p>
              <VisualQuestion data={currentQuestion.visualData} />
            </>
          ) : (
            <QuestionText text={currentQuestion.questionText} />
          )}

          {/* Options */}
          <div className={currentQuestion.visualData ? "grid grid-cols-2 gap-2 sm:gap-3" : "space-y-2"}>
            {options.map((opt, optIdx) => (
              <button
                key={opt.id}
                onClick={() => selectAnswer(opt.id)}
                className={`w-full flex items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-xl border-2 text-right transition-all
                  ${selectedAnswer === opt.id
                    ? "border-indigo-500 bg-indigo-50 shadow-md"
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }`}
              >
                <span className={`w-7 h-7 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold shrink-0 ${
                  selectedAnswer === opt.id ? "bg-indigo-500 text-white" : "bg-gray-100 text-gray-600"
                }`}>
                  {opt.id}
                </span>
                {currentQuestion.visualData?.optionVisuals?.[optIdx] ? (
                  <span className="flex-1 flex justify-center">
                    <VisualOption cell={currentQuestion.visualData.optionVisuals[optIdx]} />
                  </span>
                ) : (
                  <span className="flex-1 text-sm sm:text-base">{opt.text}</span>
                )}
              </button>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <button
          onClick={goPrev}
          disabled={currentQuestionIdx === 0}
          className="px-4 py-2.5 bg-white rounded-xl text-sm font-medium shadow-sm disabled:opacity-30 hover:bg-gray-50"
        >
          → הקודם
        </button>

        <button
          onClick={() => setShowNav(!showNav)}
          className="px-4 py-2.5 bg-white rounded-xl text-sm font-medium shadow-sm hover:bg-gray-50 sm:hidden"
        >
          📊 ניווט
        </button>

        {currentQuestionIdx < totalInSection - 1 ? (
          <button
            onClick={goNext}
            className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium shadow-sm hover:bg-indigo-700"
          >
            הבא ←
          </button>
        ) : (
          <button
            onClick={() => setConfirmEndSection(true)}
            className="px-4 py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium shadow-sm hover:bg-green-700"
          >
            {isLastSection ? "סיים מבחן ✓" : "סיים פרק ✓"}
          </button>
        )}
      </div>

      {/* Question navigation grid */}
      <div className={`bg-white rounded-2xl shadow-sm p-3 mb-3 ${showNav ? "" : "hidden sm:block"}`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-gray-500">ניווט שאלות</span>
          <div className="flex gap-3 text-xs text-gray-400">
            <span>🟦 נענתה</span>
            <span>🚩 מסומנת</span>
            <span>⬜ לא נענתה</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {currentSection.questions.map((q, i) => {
            const isAnswered = !!sectionAnswers[q.id];
            const isFlag = flagged.has(`${currentSectionIdx}-${i}`);
            const isCurrent = i === currentQuestionIdx;
            return (
              <button
                key={q.id}
                onClick={() => goToQuestion(i)}
                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg text-xs font-bold transition-all
                  ${isCurrent ? "ring-2 ring-indigo-500 ring-offset-1" : ""}
                  ${isAnswered ? "bg-indigo-500 text-white" : "bg-gray-100 text-gray-600"}
                  ${isFlag ? "ring-2 ring-amber-400" : ""}
                  hover:scale-110`}
              >
                {i + 1}
              </button>
            );
          })}
        </div>

        {/* End section button (desktop) */}
        <div className="mt-3 text-center">
          <button
            onClick={() => setConfirmEndSection(true)}
            className="text-xs text-gray-500 hover:text-indigo-600 underline"
          >
            {isLastSection
              ? `סיים מבחן (${answeredCount}/${totalInSection} נענו)`
              : `סיים פרק (${answeredCount}/${totalInSection} נענו)`}
          </button>
        </div>
      </div>

      {/* Confirm end section dialog */}
      <AnimatePresence>
        {confirmEndSection && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4"
            onClick={() => setConfirmEndSection(false)}
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              className="bg-white rounded-2xl p-5 sm:p-6 max-w-sm w-full shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-gray-800 mb-2 text-center">
                {isLastSection ? "סיים את המבחן?" : "סיים את הפרק?"}
              </h3>
              <p className="text-sm text-gray-500 mb-1 text-center">
                עניתם על {answeredCount} מתוך {totalInSection} שאלות.
              </p>
              {answeredCount < totalInSection && (
                <p className="text-xs text-amber-600 mb-4 text-center">
                  ⚠️ יש {totalInSection - answeredCount} שאלות שלא נענו!
                </p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmEndSection(false)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200"
                >
                  חזרה
                </button>
                <button
                  onClick={() => handleEndSection(false)}
                  className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700"
                >
                  {isLastSection ? "סיים מבחן" : "סיים פרק"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   REVIEW SCREEN (sub-component)
   ═══════════════════════════════════════════════════ */

function ReviewScreen({
  sections,
  examResult,
  reviewSectionIdx,
  reviewQuestionIdx,
  setReviewSectionIdx,
  setReviewQuestionIdx,
  onBack,
  parseOptions,
  answers,
}: {
  sections: ExamSection[];
  examResult: ExamResult;
  reviewSectionIdx: number;
  reviewQuestionIdx: number;
  setReviewSectionIdx: (i: number) => void;
  setReviewQuestionIdx: (i: number) => void;
  onBack: () => void;
  parseOptions: (q: Question) => { id: string; text: string; image?: string }[];
  answers: Record<string, Record<string, UserAnswer>>;
}) {
  const section = sections[reviewSectionIdx];
  const question = section?.questions[reviewQuestionIdx];
  if (!section || !question) return null;

  const answerDetail = examResult.answers.find(a => a.questionId === question.id);
  const options = parseOptions(question);
  const userSelected = answers[section.id]?.[question.id]?.selected || "";
  const meta = SECTION_META[section.id];

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
      <button onClick={onBack} className="mb-3 text-sm text-gray-500 hover:text-gray-700">
        ← חזרה לתוצאות
      </button>

      {/* Section tabs */}
      <div className="flex gap-1 mb-3 bg-white rounded-xl p-1 shadow-sm">
        {sections.map((s, i) => {
          const m = SECTION_META[s.id];
          return (
            <button
              key={s.id}
              onClick={() => { setReviewSectionIdx(i); setReviewQuestionIdx(0); }}
              className={`flex-1 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                i === reviewSectionIdx
                  ? "bg-indigo-500 text-white shadow"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {m.icon} {s.name}
            </button>
          );
        })}
      </div>

      {/* Question nav */}
      <div className="flex flex-wrap gap-1.5 mb-3 bg-white rounded-xl p-2 shadow-sm">
        {section.questions.map((q, i) => {
          const ad = examResult.answers.find(a => a.questionId === q.id);
          const wasAnswered = !!answers[section.id]?.[q.id];
          return (
            <button
              key={q.id}
              onClick={() => setReviewQuestionIdx(i)}
              className={`w-8 h-8 rounded-lg text-xs font-bold transition-all
                ${i === reviewQuestionIdx ? "ring-2 ring-indigo-500 ring-offset-1" : ""}
                ${!wasAnswered ? "bg-gray-200 text-gray-500" :
                  ad?.isCorrect ? "bg-green-500 text-white" : "bg-red-500 text-white"}
                hover:scale-110`}
            >
              {i + 1}
            </button>
          );
        })}
      </div>

      {/* Question review card */}
      <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 mb-3">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-gray-400">
            {meta.icon} {section.name} · שאלה {reviewQuestionIdx + 1}
          </span>
          {answerDetail && (
            <span className={`text-sm font-bold ${answerDetail.isCorrect ? "text-green-600" : "text-red-600"}`}>
              {answerDetail.isCorrect ? "✓ נכון" : "✗ שגוי"}
            </span>
          )}
        </div>

        {question.visualData ? (
          <>
            <p className="text-sm sm:text-lg font-medium text-gray-800 text-center mb-3" dir="rtl">
              {question.questionText}
            </p>
            <VisualQuestion data={question.visualData} />
          </>
        ) : (
          <div className="mb-4">
            {question.questionText.split(/\n\n/).map((part, i) => (
              <div key={i} className="text-sm sm:text-base font-medium text-gray-800 leading-relaxed whitespace-pre-wrap" dir="rtl">
                {part}
              </div>
            ))}
          </div>
        )}

        <div className={question.visualData ? "grid grid-cols-2 gap-2" : "space-y-2"}>
          {options.map((opt, optIdx) => {
            const isCorrect = answerDetail?.correctAnswer === opt.id;
            const isUserChoice = userSelected === opt.id;
            const isWrong = isUserChoice && !isCorrect;

            return (
              <div
                key={opt.id}
                className={`w-full flex items-center gap-2 sm:gap-3 p-3 rounded-xl border-2 text-right
                  ${isCorrect ? "border-green-500 bg-green-50" :
                    isWrong ? "border-red-400 bg-red-50" :
                    "border-gray-200 opacity-60"}`}
              >
                <span className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                  ${isCorrect ? "bg-green-500 text-white" :
                    isWrong ? "bg-red-400 text-white" :
                    "bg-gray-100 text-gray-600"}`}>
                  {opt.id}
                </span>
                {question.visualData?.optionVisuals?.[optIdx] ? (
                  <span className="flex-1 flex justify-center">
                    <VisualOption cell={question.visualData.optionVisuals[optIdx]} />
                  </span>
                ) : (
                  <span className="flex-1 text-sm">{opt.text}</span>
                )}
                {isCorrect && <span className="text-green-500">✓</span>}
                {isWrong && <span className="text-red-400">✗</span>}
              </div>
            );
          })}
        </div>

        {answerDetail?.explanation && (
          <div className="mt-3 p-3 bg-blue-50 rounded-xl text-sm text-blue-800">
            <strong>הסבר:</strong> {answerDetail.explanation}
          </div>
        )}

        {!userSelected && (
          <div className="mt-3 p-2 bg-gray-100 rounded-lg text-center text-xs text-gray-500">
            לא נענתה
          </div>
        )}
      </div>

      {/* Review navigation */}
      <div className="flex justify-between">
        <button
          onClick={() => {
            if (reviewQuestionIdx > 0) {
              setReviewQuestionIdx(reviewQuestionIdx - 1);
            } else if (reviewSectionIdx > 0) {
              setReviewSectionIdx(reviewSectionIdx - 1);
              setReviewQuestionIdx(sections[reviewSectionIdx - 1].questions.length - 1);
            }
          }}
          disabled={reviewSectionIdx === 0 && reviewQuestionIdx === 0}
          className="px-4 py-2 bg-white rounded-xl text-sm font-medium shadow-sm disabled:opacity-30"
        >
          → הקודם
        </button>
        <button
          onClick={() => {
            if (reviewQuestionIdx < section.questions.length - 1) {
              setReviewQuestionIdx(reviewQuestionIdx + 1);
            } else if (reviewSectionIdx < sections.length - 1) {
              setReviewSectionIdx(reviewSectionIdx + 1);
              setReviewQuestionIdx(0);
            }
          }}
          disabled={reviewSectionIdx === sections.length - 1 && reviewQuestionIdx === section.questions.length - 1}
          className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium shadow-sm disabled:opacity-30"
        >
          הבא ←
        </button>
      </div>
    </div>
  );
}
