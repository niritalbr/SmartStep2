import { useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Layout() {
  const { user, activeChild, children, setActiveChild, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
    setMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-purple-50 flex flex-col">
      {/* Top Nav */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 h-14 sm:h-16 flex items-center justify-between">
          {/* Logo */}
          <NavLink to="/" className="flex items-center gap-1.5 sm:gap-2 text-lg sm:text-xl font-bold text-indigo-600">
            <span className="text-xl sm:text-2xl">🧠</span>
            <span className="hidden sm:inline">מבחן מחוננים</span>
            <span className="sm:hidden">מחוננים</span>
          </NavLink>

          {/* Center: Child selector - scrollable on mobile */}
          {user && children.length > 0 && (
            <div className="flex items-center gap-1.5 sm:gap-3 overflow-x-auto max-w-[40%] sm:max-w-none scrollbar-hide">
              {children.map((child) => (
                <button
                  key={child.id}
                  onClick={() => setActiveChild(child)}
                  className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all whitespace-nowrap shrink-0 ${
                    activeChild?.id === child.id
                      ? "bg-indigo-100 text-indigo-700 shadow-sm"
                      : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <span>{child.avatarType === "owl" ? "🦉" : child.avatarType === "robot" ? "🤖" : "🐱"}</span>
                  <span>{child.name}</span>
                  {activeChild?.id === child.id && (
                    <span className="text-xs bg-indigo-200 rounded-full px-1 sm:px-1.5 hidden sm:inline">
                      ⭐ {child.level}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Right: User actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Coins/XP - compact on mobile */}
            {user && activeChild && (
              <div className="hidden sm:flex items-center gap-2 text-sm">
                <span className="text-yellow-500">🪙 {activeChild.coins}</span>
                <span className="text-purple-500">✨ {activeChild.xp} XP</span>
              </div>
            )}
            {user ? (
              <>
                {/* Desktop nav */}
                <div className="hidden md:flex items-center gap-2">
                  <NavLink
                    to="/stats"
                    className={({ isActive }) =>
                      `px-3 py-1.5 rounded-lg text-sm ${isActive ? "bg-indigo-100 text-indigo-700" : "text-gray-600 hover:bg-gray-100"}`
                    }
                  >
                    📊 סטטיסטיקה
                  </NavLink>
                  <NavLink
                    to="/parent"
                    className={({ isActive }) =>
                      `px-3 py-1.5 rounded-lg text-sm ${isActive ? "bg-indigo-100 text-indigo-700" : "text-gray-600 hover:bg-gray-100"}`
                    }
                  >
                    👪 הורים
                  </NavLink>
                  <NavLink
                    to="/profile"
                    className={({ isActive }) =>
                      `px-3 py-1.5 rounded-lg text-sm ${isActive ? "bg-indigo-100 text-indigo-700" : "text-gray-600 hover:bg-gray-100"}`
                    }
                  >
                    ⚙️ פרופיל
                  </NavLink>
                  <button
                    onClick={handleLogout}
                    className="px-3 py-1.5 rounded-lg text-sm text-red-600 hover:bg-red-50"
                  >
                    יציאה
                  </button>
                </div>
                {/* Mobile hamburger */}
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="md:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-600 text-xl"
                  aria-label="תפריט"
                >
                  {menuOpen ? "✕" : "☰"}
                </button>
              </>
            ) : (
              <NavLink to="/login" className="px-3 sm:px-4 py-1.5 sm:py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
                כניסה
              </NavLink>
            )}
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {menuOpen && user && (
          <div className="md:hidden border-t border-gray-100 bg-white/95 backdrop-blur-sm">
            <div className="max-w-6xl mx-auto px-3 py-2 space-y-1">
              {activeChild && (
                <div className="flex items-center gap-3 px-3 py-2 text-sm text-gray-500 border-b border-gray-100 mb-1">
                  <span className="text-yellow-500">🪙 {activeChild.coins}</span>
                  <span className="text-purple-500">✨ {activeChild.xp} XP</span>
                </div>
              )}
              <NavLink
                to="/stats"
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `block px-3 py-2.5 rounded-lg text-sm ${isActive ? "bg-indigo-100 text-indigo-700" : "text-gray-600 hover:bg-gray-100"}`
                }
              >
                📊 סטטיסטיקה
              </NavLink>
              <NavLink
                to="/parent"
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `block px-3 py-2.5 rounded-lg text-sm ${isActive ? "bg-indigo-100 text-indigo-700" : "text-gray-600 hover:bg-gray-100"}`
                }
              >
                👪 לוח הורים
              </NavLink>
              <NavLink
                to="/profile"
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `block px-3 py-2.5 rounded-lg text-sm ${isActive ? "bg-indigo-100 text-indigo-700" : "text-gray-600 hover:bg-gray-100"}`
                }
              >
                ⚙️ פרופיל
              </NavLink>
              <button
                onClick={handleLogout}
                className="block w-full text-right px-3 py-2.5 rounded-lg text-sm text-red-600 hover:bg-red-50"
              >
                יציאה
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="py-3 sm:py-4 text-center text-xs text-gray-400">
        מערכת הכנה למבחן מחוננים שלב ב' 🧠
      </footer>
    </div>
  );
}
