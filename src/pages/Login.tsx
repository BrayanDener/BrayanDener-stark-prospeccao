import { useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Navigate, useNavigate } from "react-router-dom";
import { LightLine } from "@/components/stark/LightLine";
import { LogoMark } from "@/components/stark/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isLoggedIn, startSession } from "@/store/session";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (isLoggedIn()) return <Navigate to="/" replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!EMAIL_RE.test(email.trim())) return setError("Digite um e-mail válido.");
    if (password.length < 6) return setError("A senha precisa ter pelo menos 6 caracteres.");
    setError(null);
    setLoading(true);
    // Etapa 1: login simulado. Na Etapa 2 vira supabase.auth.signInWithPassword.
    await new Promise((r) => setTimeout(r, 700));
    startSession(email.trim());
    navigate("/", { replace: true });
  };

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center px-4 py-10" style={{ paddingTop: "calc(var(--safe-top) + 40px)" }}>
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center">
          <LogoMark size={52} />
          <h1 className="mt-6 font-display text-3xl font-extrabold tracking-tighter">Stark Prospecção</h1>
          <LightLine sweep className="mt-4 w-40" />
          <p className="mt-4 text-sm text-muted-foreground">Encontre seus próximos clientes.</p>
        </div>

        <form onSubmit={submit} noValidate className="mt-10 space-y-4">
          <div className="grid grid-cols-1 gap-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@starkia.com.br"
              aria-invalid={!!error && !EMAIL_RE.test(email.trim())}
            />
          </div>
          <div className="grid grid-cols-1 gap-2">
            <Label htmlFor="password">Senha</Label>
            <div className="relative">
              <Input
                id="password"
                type={show ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-12"
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                aria-label={show ? "Ocultar senha" : "Mostrar senha"}
                className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {show ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
              </button>
            </div>
          </div>

          {error && (
            <p role="alert" className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2.5 text-sm text-[#F0A3A3]">
              {error}
            </p>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="animate-spin" /> Entrando…
              </>
            ) : (
              "Entrar"
            )}
          </Button>
        </form>

        <p className="mt-10 text-center text-xs text-muted-foreground">Uso pessoal · Stark IA</p>
      </div>
    </div>
  );
}
