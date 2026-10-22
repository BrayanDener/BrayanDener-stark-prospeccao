/**
 * Sessão do Supabase Auth (e-mail + senha). Sessão persistente no aparelho.
 * No primeiro login: cria user_settings e os modelos padrão (ensure_user_setup).
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { ensureUserSetup } from "@/data/api";
import { supabase } from "@/integrations/supabase/client";
import { AppError } from "@/lib/errors";

interface AuthContextValue {
  session: Session | null;
  loading: boolean;
  email: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function loginError(err: { message?: string; status?: number; code?: string }): AppError {
  console.error("[auth] falha no login", err);
  const msg = (err.message ?? "").toLowerCase();
  if (err.code === "invalid_credentials" || msg.includes("invalid login")) return new AppError("UNAUTHORIZED", "E-mail ou senha incorretos.");
  if (err.code === "email_not_confirmed" || msg.includes("not confirmed")) return new AppError("UNAUTHORIZED", "Este e-mail ainda não foi confirmado no Supabase.");
  if (err.status === 429 || msg.includes("rate limit")) return new AppError("UNAUTHORIZED", "Muitas tentativas. Aguarde alguns minutos e tente de novo.");
  if (msg.includes("fetch") || msg.includes("network")) return new AppError("NETWORK", "Sem conexão com o servidor. Verifique sua internet.");
  return new AppError("INTERNAL", "Não foi possível entrar agora. Tente de novo.");
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const setupDoneFor = useRef<string | null>(null);

  const runSetup = useCallback((s: Session | null) => {
    const uid = s?.user.id;
    if (!uid || setupDoneFor.current === uid) return;
    setupDoneFor.current = uid;
    ensureUserSetup()
      .then(() => {
        void qc.invalidateQueries({ queryKey: ["settings"] });
        void qc.invalidateQueries({ queryKey: ["templates"] });
      })
      .catch((err) => {
        console.error("[auth] ensure_user_setup falhou", err);
        setupDoneFor.current = null;
      });
  }, [qc]);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setLoading(false);
      runSetup(data.session);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      setLoading(false);
      if (event === "SIGNED_IN") runSetup(s);
      if (event === "SIGNED_OUT") {
        setupDoneFor.current = null;
        qc.clear();
      }
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [qc, runSetup]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw loginError(error);
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error("[auth] erro ao sair", error);
    qc.clear();
  }, [qc]);

  const value = useMemo(
    () => ({ session, loading, email: session?.user.email ?? null, signIn, signOut }),
    [session, loading, signIn, signOut],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro de <AuthProvider>");
  return ctx;
}
