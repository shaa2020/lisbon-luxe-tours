import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthState = {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const refreshRole = async (uid: string | undefined) => {
    try {
      if (!uid) {
        setIsAdmin(false);
        return;
      }

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid)
        .eq("role", "admin")
        .maybeSingle();

      if (error) {
        console.error("Failed to fetch admin role", error);
        setIsAdmin(false);
        return;
      }

      setIsAdmin(!!data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const syncSession = (nextSession: Session | null) => {
      setLoading(true);
      setSession(nextSession);

      window.setTimeout(() => {
        void refreshRole(nextSession?.user.id);
      }, 0);
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      syncSession(s);
    });

    supabase.auth.getSession().then(({ data }) => {
      syncSession(data.session);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn: AuthState["signIn"] = async (email, password) => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
    }
    return error ? { error: error.message } : {};
  };

  const signUp: AuthState["signUp"] = async (email, password) => {
    const redirectUrl = `${window.location.origin}/admin`;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectUrl },
    });
    if (error) return { error: error.message };
    // If first user, try to claim admin (RLS allows insert only if no admin exists yet via fallback below)
    if (data.user) {
      // Check if any admin exists
      const { count } = await supabase
        .from("user_roles")
        .select("*", { count: "exact", head: true })
        .eq("role", "admin");
      if ((count ?? 0) === 0) {
        await supabase.from("user_roles").insert({
          user_id: data.user.id,
          role: "admin",
        });
        await refreshRole(data.user.id);
      }
    }
    return {};
  };

  const signOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setSession(null);
    setIsAdmin(false);
    setLoading(false);
  };

  return (
    <Ctx.Provider
      value={{
        user: session?.user ?? null,
        session,
        isAdmin,
        loading,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside AuthProvider");
  return v;
}
