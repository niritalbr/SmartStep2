const BASE = "/api";

function getToken(): string | null {
  return localStorage.getItem("token");
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.error || `Request failed: ${res.status}`);
    (err as any).status = res.status;
    throw err;
  }

  return res.json();
}

export const api = {
  // Auth
  register: (data: { email: string; password: string; name: string }) =>
    request<{ token: string; user: { id: string; email: string; name: string } }>(
      "/auth/register",
      { method: "POST", body: JSON.stringify(data) }
    ),

  login: (data: { email: string; password: string }) =>
    request<{ token: string; user: { id: string; email: string; name: string } }>(
      "/auth/login",
      { method: "POST", body: JSON.stringify(data) }
    ),

  me: () =>
    request<{ id: string; email: string; name: string; children: any[] }>("/auth/me"),

  // Children
  getChildren: () => request<any[]>("/children"),

  createChild: (data: { name: string; grade: number; avatarType?: string; avatarColor?: string }) =>
    request<any>("/children", { method: "POST", body: JSON.stringify(data) }),

  getChild: (id: string) => request<any>(`/children/${encodeURIComponent(id)}`),

  updateChild: (id: string, data: { name?: string; avatarType?: string; avatarColor?: string }) =>
    request<any>(`/children/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(data) }),

  // Questions
  getQuestions: (params: { category?: string; difficulty?: number; grade?: number; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params.category) qs.set("category", params.category);
    if (params.difficulty) qs.set("difficulty", String(params.difficulty));
    if (params.grade) qs.set("grade", String(params.grade));
    if (params.limit) qs.set("limit", String(params.limit));
    return request<any[]>(`/questions?${qs}`);
  },

  getPracticeQuestions: (params: { category: string; childId: string; count?: number }) => {
    const qs = new URLSearchParams({
      category: params.category,
      childId: params.childId,
    });
    if (params.count) qs.set("count", String(params.count));
    return request<any[]>(`/questions/practice?${qs}`);
  },

  getQuestion: (id: string) => request<any>(`/questions/${encodeURIComponent(id)}`),

  getCategorySummary: () =>
    request<Record<string, { total: number; byDifficulty: Record<number, number> }>>(
      "/questions/summary/categories"
    ),

  generateQuestions: (params: { category?: string; count?: number; difficulty?: number; mixed?: boolean; childId?: string; subType?: string }) =>
    request<any[]>("/questions/generate", {
      method: "POST",
      body: JSON.stringify(params),
    }),

  // Answers
  submitAnswer: (data: {
    childId: string;
    questionId: string;
    selected: string;
    timeSpentMs: number;
    hintsUsed?: number;
    sessionId?: string;
  }) =>
    request<{
      answerId: string;
      isCorrect: boolean;
      correctAnswer: string;
      explanation?: string;
      xpGain: number;
      coinGain: number;
      newXp: number;
      newCoins: number;
    }>("/answers", { method: "POST", body: JSON.stringify(data) }),

  // Sessions
  createSession: (data: { childId: string; category: string; mode: string }) =>
    request<any>("/sessions", { method: "POST", body: JSON.stringify(data) }),

  endSession: (id: string) =>
    request<any>(`/sessions/${encodeURIComponent(id)}/end`, { method: "PATCH" }),

  getSessionHistory: (childId: string) =>
    request<any[]>(`/sessions/child/${encodeURIComponent(childId)}`),

  // Profile
  updateProfile: (data: { name?: string; email?: string; currentPassword?: string; newPassword?: string }) =>
    request<{ id: string; email: string; name: string }>("/auth/profile", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  resetChildProgress: (id: string) =>
    request<any>(`/children/${encodeURIComponent(id)}/reset`, { method: "POST" }),

  deleteChild: (id: string) =>
    request<{ success: boolean }>(`/children/${encodeURIComponent(id)}`, { method: "DELETE" }),

  // Stats
  getChildStats: (childId: string) =>
    request<any>(`/stats/child/${encodeURIComponent(childId)}`),

  getDashboard: () => request<any[]>("/stats/dashboard"),

  // Interactive games
  claimGameReward: (data: { childId: string; gameType: string; score: number; maxScore: number }) =>
    request<{ xpGain: number; coinGain: number; newXp: number; newCoins: number; newLevel: number }>(
      "/games/reward",
      { method: "POST", body: JSON.stringify(data) }
    ),

  // Exam simulation
  generateExam: (data: { childId: string }) =>
    request<{ sections: { id: string; name: string; timeLimitMin: number; questions: any[] }[] }>(
      "/exam/generate",
      { method: "POST", body: JSON.stringify(data) }
    ),

  submitExam: (data: {
    childId: string;
    sections: { id: string; answers: { questionId: string; selected: string; timeSpentMs: number }[] }[];
    totalDurationSec: number;
  }) =>
    request<any>("/exam/submit", { method: "POST", body: JSON.stringify(data) }),
};
