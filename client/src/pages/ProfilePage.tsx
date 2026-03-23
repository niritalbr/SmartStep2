import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { api } from "../api";
import type { Child } from "../types";

const AVATARS = [
  { type: "owl", emoji: "🦉", label: "ינשוף" },
  { type: "robot", emoji: "🤖", label: "רובוט" },
  { type: "cat", emoji: "🐱", label: "חתול" },
] as const;

const COLORS = ["#6366f1", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];

type ConfirmAction = { type: "reset" | "delete"; childId: string; childName: string } | null;

export default function ProfilePage() {
  const { user, children, refreshChildren, refreshUser } = useAuth();
  const navigate = useNavigate();

  // Parent form
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [parentMsg, setParentMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [parentSaving, setParentSaving] = useState(false);

  // Child editing
  const [editingChild, setEditingChild] = useState<string | null>(null);
  const [childName, setChildName] = useState("");
  const [childAvatar, setChildAvatar] = useState("owl");
  const [childColor, setChildColor] = useState(COLORS[0]);
  const [childMsg, setChildMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [childSaving, setChildSaving] = useState(false);

  // Confirmation dialog
  const [confirm, setConfirm] = useState<ConfirmAction>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const handleParentSave = async () => {
    setParentSaving(true);
    setParentMsg(null);
    try {
      const payload: Record<string, string> = {};
      if (name && name !== user?.name) payload.name = name;
      if (email && email !== user?.email) payload.email = email;
      if (newPassword) {
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
      }
      if (Object.keys(payload).length === 0) {
        setParentMsg({ text: "לא בוצעו שינויים", ok: true });
        setParentSaving(false);
        return;
      }
      await api.updateProfile(payload);
      await refreshUser();
      setCurrentPassword("");
      setNewPassword("");
      setParentMsg({ text: "הפרופיל עודכן בהצלחה ✓", ok: true });
    } catch (err: any) {
      setParentMsg({ text: err.message || "שגיאה בעדכון", ok: false });
    } finally {
      setParentSaving(false);
    }
  };

  const startEditChild = (child: Child) => {
    setEditingChild(child.id);
    setChildName(child.name);
    setChildAvatar(child.avatarType);
    setChildColor(child.avatarColor);
    setChildMsg(null);
  };

  const handleChildSave = async () => {
    if (!editingChild) return;
    setChildSaving(true);
    setChildMsg(null);
    try {
      await api.updateChild(editingChild, {
        name: childName,
        avatarType: childAvatar,
        avatarColor: childColor,
      });
      await refreshChildren();
      setEditingChild(null);
      setChildMsg({ text: "פרופיל הילד/ה עודכן ✓", ok: true });
    } catch (err: any) {
      setChildMsg({ text: err.message || "שגיאה בעדכון", ok: false });
    } finally {
      setChildSaving(false);
    }
  };

  const handleConfirm = async () => {
    if (!confirm) return;
    setConfirmLoading(true);
    try {
      if (confirm.type === "reset") {
        await api.resetChildProgress(confirm.childId);
      } else {
        await api.deleteChild(confirm.childId);
      }
      await refreshChildren();
      setConfirm(null);
    } catch (err: any) {
      alert(err.message || "שגיאה");
    } finally {
      setConfirmLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-800">⚙️ הגדרות פרופיל</h1>
        <button
          onClick={() => navigate(-1)}
          className="text-gray-500 hover:text-gray-700 text-sm"
        >
          ← חזרה
        </button>
      </div>

      {/* Parent Profile */}
      <section className="bg-white rounded-2xl shadow-sm p-6 mb-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">👤 פרטי הורה</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">שם</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">אימייל</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none"
              dir="ltr"
            />
          </div>
          <div className="border-t pt-4">
            <p className="text-sm text-gray-500 mb-3">שינוי סיסמה (אופציונלי)</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">סיסמה נוכחית</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none text-sm"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">סיסמה חדשה</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none text-sm"
                  dir="ltr"
                />
              </div>
            </div>
          </div>
          {parentMsg && (
            <p className={`text-sm ${parentMsg.ok ? "text-green-600" : "text-red-600"}`}>
              {parentMsg.text}
            </p>
          )}
          <button
            onClick={handleParentSave}
            disabled={parentSaving}
            className="w-full py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {parentSaving ? "שומר..." : "שמור שינויים"}
          </button>
        </div>
      </section>

      {/* Children Profiles */}
      <section className="bg-white rounded-2xl shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-800">👦 פרופילי ילדים</h2>
          <button
            onClick={() => navigate("/create-child")}
            className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-medium hover:bg-indigo-100"
          >
            + הוספת ילד/ה
          </button>
        </div>

        {childMsg && !editingChild && (
          <p className={`text-sm mb-3 ${childMsg.ok ? "text-green-600" : "text-red-600"}`}>
            {childMsg.text}
          </p>
        )}

        {children.length === 0 ? (
          <p className="text-gray-500 text-center py-8">אין פרופילי ילדים עדיין</p>
        ) : (
          <div className="space-y-4">
            {children.map((child) => (
              <div
                key={child.id}
                className="border border-gray-100 rounded-xl p-4"
              >
                {editingChild === child.id ? (
                  /* Edit Mode */
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={childName}
                      onChange={(e) => setChildName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none"
                      placeholder="שם הילד/ה"
                    />
                    <div>
                      <label className="block text-xs text-gray-500 mb-2">דמות</label>
                      <div className="flex gap-2">
                        {AVATARS.map((a) => (
                          <button
                            key={a.type}
                            onClick={() => setChildAvatar(a.type)}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 text-sm ${
                              childAvatar === a.type
                                ? "border-indigo-400 bg-indigo-50"
                                : "border-gray-200 hover:border-gray-300"
                            }`}
                          >
                            <span className="text-xl">{a.emoji}</span>
                            <span>{a.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-2">צבע</label>
                      <div className="flex gap-2">
                        {COLORS.map((c) => (
                          <button
                            key={c}
                            onClick={() => setChildColor(c)}
                            className={`w-8 h-8 rounded-full border-2 ${
                              childColor === c ? "border-gray-800 scale-110" : "border-transparent"
                            }`}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </div>
                    {childMsg && editingChild === child.id && (
                      <p className={`text-sm ${childMsg.ok ? "text-green-600" : "text-red-600"}`}>
                        {childMsg.text}
                      </p>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={handleChildSave}
                        disabled={childSaving}
                        className="flex-1 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                      >
                        {childSaving ? "שומר..." : "שמור"}
                      </button>
                      <button
                        onClick={() => setEditingChild(null)}
                        className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm hover:bg-gray-200"
                      >
                        ביטול
                      </button>
                    </div>
                  </div>
                ) : (
                  /* View Mode */
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span
                        className="text-3xl w-12 h-12 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: child.avatarColor + "20" }}
                      >
                        {child.avatarType === "owl" ? "🦉" : child.avatarType === "robot" ? "🤖" : "🐱"}
                      </span>
                      <div>
                        <h3 className="font-bold text-gray-800">{child.name}</h3>
                        <p className="text-xs text-gray-500">
                          כיתה {child.grade === 2 ? "ב'" : "ג'"} · רמה {child.level} · {child.xp} XP · {child.coins} 🪙
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => startEditChild(child)}
                        className="px-3 py-1.5 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg"
                        title="עריכה"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => setConfirm({ type: "reset", childId: child.id, childName: child.name })}
                        className="px-3 py-1.5 text-sm text-orange-600 hover:bg-orange-50 rounded-lg"
                        title="איפוס התקדמות"
                      >
                        🔄
                      </button>
                      <button
                        onClick={() => setConfirm({ type: "delete", childId: child.id, childName: child.name })}
                        className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg"
                        title="מחיקה"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Confirmation Dialog */}
      <AnimatePresence>
        {confirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
            onClick={() => !confirmLoading && setConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-xl p-6 max-w-sm mx-4 w-full"
            >
              <div className="text-center mb-4">
                <div className="text-4xl mb-2">
                  {confirm.type === "reset" ? "⚠️" : "🗑️"}
                </div>
                <h3 className="text-lg font-bold text-gray-800">
                  {confirm.type === "reset"
                    ? `איפוס התקדמות של ${confirm.childName}?`
                    : `מחיקת הפרופיל של ${confirm.childName}?`}
                </h3>
                <p className="text-sm text-gray-500 mt-2">
                  {confirm.type === "reset"
                    ? "כל ההתקדמות, הניקוד, המטבעות והסטטיסטיקות יימחקו לצמיתות. לא ניתן לשחזר פעולה זו."
                    : "הפרופיל וכל הנתונים של הילד/ה יימחקו לצמיתות. לא ניתן לשחזר פעולה זו."}
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirm(null)}
                  disabled={confirmLoading}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 disabled:opacity-50"
                >
                  ביטול
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={confirmLoading}
                  className={`flex-1 py-2.5 text-white rounded-xl font-medium disabled:opacity-50 ${
                    confirm.type === "reset"
                      ? "bg-orange-500 hover:bg-orange-600"
                      : "bg-red-500 hover:bg-red-600"
                  }`}
                >
                  {confirmLoading
                    ? "מבצע..."
                    : confirm.type === "reset"
                    ? "כן, אפס"
                    : "כן, מחק"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
