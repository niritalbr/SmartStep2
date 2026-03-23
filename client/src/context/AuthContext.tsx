import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { api } from "../api";
import type { User, Child } from "../types";

interface AuthState {
  user: User | null;
  children: Child[];
  activeChild: Child | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  setActiveChild: (child: Child) => void;
  refreshChildren: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateActiveChild: (updates: Partial<Child>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children: kids }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    children: [],
    activeChild: null,
    loading: true,
  });

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setState((s) => ({ ...s, loading: false }));
      return;
    }
    try {
      const data = await api.me();
      setState({
        user: { id: data.id, email: data.email, name: data.name },
        children: data.children || [],
        activeChild: data.children?.[0] || null,
        loading: false,
      });
    } catch {
      localStorage.removeItem("token");
      setState({ user: null, children: [], activeChild: null, loading: false });
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = async (email: string, password: string) => {
    const { token, user } = await api.login({ email, password });
    localStorage.setItem("token", token);
    setState((s) => ({ ...s, user, loading: true }));
    await loadUser();
  };

  const register = async (email: string, password: string, name: string) => {
    const { token, user } = await api.register({ email, password, name });
    localStorage.setItem("token", token);
    setState((s) => ({ ...s, user, children: [], activeChild: null, loading: false }));
  };

  const logout = () => {
    localStorage.removeItem("token");
    setState({ user: null, children: [], activeChild: null, loading: false });
  };

  const setActiveChild = (child: Child) => {
    setState((s) => ({ ...s, activeChild: child }));
  };

  const refreshChildren = async () => {
    const list = await api.getChildren();
    setState((s) => ({
      ...s,
      children: list,
      activeChild: list.find((c: Child) => c.id === s.activeChild?.id) || list[0] || null,
    }));
  };

  const refreshUser = async () => {
    await loadUser();
  };

  const updateActiveChild = (updates: Partial<Child>) => {
    setState((s) => ({
      ...s,
      activeChild: s.activeChild ? { ...s.activeChild, ...updates } : null,
      children: s.children.map((c) =>
        c.id === s.activeChild?.id ? { ...c, ...updates } : c
      ),
    }));
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        register,
        logout,
        setActiveChild,
        refreshChildren,
        refreshUser,
        updateActiveChild,
      }}
    >
      {kids}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
