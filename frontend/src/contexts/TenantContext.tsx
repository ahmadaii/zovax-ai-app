import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { api } from "@/lib/api";

type AuthUser = {
  user_id: number;
  user_name: string;
  email_address: string;
  role: string;
  tenant_id?: number | null;
};

type AuthResponse = {
  access_token: string;
  token_type: "bearer";
  user: AuthUser;
};

type Ctx = {
  loading: boolean;
  ready: boolean; // ✅ NEW: provider initialized
  user: AuthUser | null;
  token: string | null;
  signIn: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  signUp: (args: any) => Promise<{ success: boolean; error?: string }>;
  signOut: () => void;
};

const TenantContext = createContext<Ctx | null>(null);

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false); // ✅
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);

  // Initialize from localStorage synchronously on first effect
  useEffect(() => {
    const t = localStorage.getItem("token");
    const u = localStorage.getItem("user");
    if (t) setToken(t);
    if (u) setUser(JSON.parse(u));
    setReady(true);
  }, []);

  const persist = (auth?: AuthResponse) => {
    if (!auth) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      setToken(null);
      setUser(null);
      return;
    }
    localStorage.setItem("token", auth.access_token);
    localStorage.setItem("user", JSON.stringify(auth.user));
    setToken(auth.access_token);
    setUser(auth.user);
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const res = await api<AuthResponse>("/auth/signin", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok || !res.data)
        return { success: false, error: res.error || "Sign in failed" };
      persist(res.data);
      return { success: true };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (args: any) => {
    setLoading(true);
    try {
      const res = await api<AuthResponse>("/auth/signup", {
        method: "POST",
        body: JSON.stringify(args),
      });
      if (!res.ok || !res.data)
        return { success: false, error: res.error || "Sign up failed" };
      persist(res.data);
      return { success: true };
    } finally {
      setLoading(false);
    }
  };

  const signOut = () => persist(undefined);

  const value = useMemo(
    () => ({ loading, ready, user, token, signIn, signUp, signOut }),
    [loading, ready, user, token]
  );

  return (
    <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
  );
};

export const useTenant = () => {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error("useTenant must be used within TenantProvider");
  return ctx;
};
