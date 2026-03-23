import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Layout from "./components/Layout";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import HomePage from "./pages/HomePage";
import CreateChildPage from "./pages/CreateChildPage";
import GamePage from "./pages/GamePage";
import StatsPage from "./pages/StatsPage";
import ParentDashboard from "./pages/ParentDashboard";
import ProfilePage from "./pages/ProfilePage";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin text-4xl">🧠</div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function NeedChild({ children }: { children: React.ReactNode }) {
  const { activeChild, children: childList, loading } = useAuth();
  if (loading) return null;
  if (childList.length === 0) return <Navigate to="/create-child" replace />;
  if (!activeChild) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <NeedChild>
                <HomePage />
              </NeedChild>
            </ProtectedRoute>
          }
        />
        <Route
          path="/create-child"
          element={
            <ProtectedRoute>
              <CreateChildPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/game/:category"
          element={
            <ProtectedRoute>
              <NeedChild>
                <GamePage />
              </NeedChild>
            </ProtectedRoute>
          }
        />
        <Route
          path="/stats"
          element={
            <ProtectedRoute>
              <NeedChild>
                <StatsPage />
              </NeedChild>
            </ProtectedRoute>
          }
        />
        <Route
          path="/parent"
          element={
            <ProtectedRoute>
              <ParentDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
      </Route>
    </Routes>
  );
}
