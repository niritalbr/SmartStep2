import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Layout() {
  const { user, activeChild, children, setActiveChild, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-purple-50 flex flex-col">
      {/* Top Nav */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <NavLink to="/" className="flex items-center gap-2 text-xl font-bold text-indigo-600">
            <span className="text-2xl">🧠</span>
            <span>מבחן מחוננים</span>
          </NavLink>

          {/* Center: Child selector */}
          {user && children.length > 0 && (
            <div className="flex items-center gap-3">
              {children.map((child) => (
                <button
                  key={child.id}
                  onClick={() => setActiveChild(child)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                    activeChild?.id === child.id
                      ? "bg-indigo-100 text-indigo-700 shadow-sm"
                      : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <span>{child.avatarType === "owl" ? "🦉" : child.avatarType === "robot" ? "🤖" : "🐱"}</span>
                  <span>{child.name}</span>
                  {activeChild?.id === child.id && (
                    <span className="text-xs bg-indigo-200 rounded-full px-1.5">
                      ⭐ {child.level}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Right: User actions */}
          <div className="flex items-center gap-3">
            {user && activeChild && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-yellow-500">🪙 {activeChild.coins}</span>
                <span className="text-purple-500">✨ {activeChild.xp} XP</span>
              </div>
            )}
            {user ? (
              <div className="flex items-center gap-2">
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
            ) : (
              <NavLink to="/login" className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
                כניסה
              </NavLink>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-gray-400">
        מערכת הכנה למבחן מחוננים שלב ב' 🧠
      </footer>
    </div>
  );
}
