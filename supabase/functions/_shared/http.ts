/**
 * Utilitários HTTP das Edge Functions (Deno): CORS, respostas padronizadas e autenticação.
 * Erros sempre no formato { error: { code, message } } com mensagem amigável em português.
 */
import { createClient, type SupabaseClient, type User } from "npm:@supabase/supabase-js@2.117.2";

export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export const ERROR_MESSAGES = {
  UNAUTHORIZED: "Sua sessão expirou. Entre de novo para continuar.",
  FORBIDDEN: "Este usuário não tem permissão para usar o painel.",
  INVALID_INPUT: "Confira os dados da busca e tente de novo.",
  METHOD_NOT_ALLOWED: "Método não permitido.",
  CITY_NOT_FOUND: "Não encontramos essa cidade. Confira a grafia e tente de novo.",
  NO_RESULTS: "Nenhuma empresa encontrada para esse nicho nessa cidade. Tente outro nicho ou uma cidade vizinha.",
  GOOGLE_QUOTA: "O limite de buscas do Google foi atingido. Tente mais tarde.",
  GOOGLE_AUTH: "A busca está indisponível: verifique a chave do Google nas configurações do Supabase.",
  GOOGLE_UNAVAILABLE: "O Google não respondeu agora. Tente de novo em instantes.",
  NOT_FOUND: "Não encontramos esse lead.",
  AI_UNAVAILABLE: "Não foi possível gerar a mensagem agora. Tente de novo em instantes.",
  AI_NOT_CONFIGURED: "A geração com IA não está configurada: falta a chave AI_API_KEY no Supabase.",
  INTERNAL: "Algo deu errado do nosso lado. Tente de novo em instantes.",
} as const;

export type ErrorCode = keyof typeof ERROR_MESSAGES;

const STATUS: Record<ErrorCode, number> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  INVALID_INPUT: 400,
  METHOD_NOT_ALLOWED: 405,
  CITY_NOT_FOUND: 404,
  NO_RESULTS: 404,
  GOOGLE_QUOTA: 429,
  GOOGLE_AUTH: 503,
  GOOGLE_UNAVAILABLE: 502,
  NOT_FOUND: 404,
  AI_UNAVAILABLE: 502,
  AI_NOT_CONFIGURED: 503,
  INTERNAL: 500,
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

export function errorResponse(code: ErrorCode, message: string = ERROR_MESSAGES[code]): Response {
  return json({ error: { code, message } }, STATUS[code]);
}

export class HttpError extends Error {
  constructor(public code: ErrorCode, message?: string) {
    super(message ?? ERROR_MESSAGES[code]);
    this.name = "HttpError";
  }
}

/**
 * Cliente Supabase com o JWT do próprio usuário (nunca a service role): o RLS vale aqui também.
 * Só atende o(s) e-mail(s) do secret ALLOWED_EMAIL (separados por vírgula). Sem o secret, ninguém passa.
 */
export async function authenticate(req: Request): Promise<{ supabase: SupabaseClient; user: User }> {
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!/^Bearer\s+\S+/i.test(authHeader)) throw new HttpError("UNAUTHORIZED");

  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_ANON_KEY") ?? req.headers.get("apikey");
  if (!url || !key) {
    console.error("[auth] SUPABASE_URL/SUPABASE_ANON_KEY ausentes");
    throw new HttpError("INTERNAL");
  }

  const supabase = createClient(url, key, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const token = authHeader.replace(/^Bearer\s+/i, "");
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) throw new HttpError("UNAUTHORIZED");

  const allowed = (Deno.env.get("ALLOWED_EMAIL") ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const email = (data.user.email ?? "").toLowerCase();
  if (allowed.length === 0) {
    console.error("[auth] secret ALLOWED_EMAIL não configurado: negando acesso");
    throw new HttpError("FORBIDDEN", "Acesso bloqueado: configure o secret ALLOWED_EMAIL no Supabase.");
  }
  if (!allowed.includes(email)) throw new HttpError("FORBIDDEN");

  return { supabase, user: data.user };
}
