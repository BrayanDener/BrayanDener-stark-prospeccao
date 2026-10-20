/**
 * Sessão simulada da Etapa 1. Na Etapa 2 vira Supabase Auth (e-mail + senha).
 * localStorage pode falhar (modo privado, armazenamento bloqueado): tudo em try/catch.
 */
const KEY = "stark.session.mock";
let memorySession = false;

export function hasSession(): boolean {
  try {
    return localStorage.getItem(KEY) !== null;
  } catch {
    return false;
  }
}

export function startSession(email: string): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ email, at: new Date().toISOString() }));
  } catch {
    /* sem armazenamento: a sessão vale só até recarregar */
  }
  memorySession = true;
}

export function endSession(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignora */
  }
  memorySession = false;
}

export const isLoggedIn = () => memorySession || hasSession();
