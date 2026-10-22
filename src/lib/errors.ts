/**
 * Erros sempre com mensagem amigável em português; detalhes técnicos só no console.
 */
export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public cause?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

const FRIENDLY: Record<string, string> = {
  UNAUTHORIZED: "Sua sessão expirou. Entre de novo para continuar.",
  FORBIDDEN: "Este usuário não tem permissão para usar o painel.",
  INVALID_INPUT: "Confira os dados e tente de novo.",
  CITY_NOT_FOUND: "Não encontramos essa cidade. Confira a grafia e tente de novo.",
  NO_RESULTS: "Nenhuma empresa encontrada para esse nicho nessa cidade. Tente outro nicho ou uma cidade vizinha.",
  GOOGLE_QUOTA: "O limite de buscas do Google foi atingido. Tente mais tarde.",
  GOOGLE_AUTH: "A busca está indisponível: verifique a chave do Google nas configurações do Supabase.",
  GOOGLE_UNAVAILABLE: "O Google não respondeu agora. Tente de novo em instantes.",
  AI_UNAVAILABLE: "Não foi possível gerar a mensagem agora. Tente de novo em instantes.",
  AI_NOT_CONFIGURED: "A geração com IA não está configurada: falta a chave AI_API_KEY no Supabase.",
  NETWORK: "Sem conexão com o servidor. Verifique sua internet e tente de novo.",
  DUPLICATE: "Já existe um registro igual.",
  INTERNAL: "Algo deu errado. Tente de novo em instantes.",
};

export function friendlyMessage(code: string): string {
  return FRIENDLY[code] ?? FRIENDLY.INTERNAL;
}

/** Converte erros do Supabase (PostgREST, Auth, rede) em AppError com mensagem amigável. */
export function toAppError(err: unknown, context = "operação"): AppError {
  if (err instanceof AppError) return err;
  console.error(`[${context}]`, err);
  const e = err as { code?: string; message?: string; status?: number; name?: string } | null;
  const msg = e?.message ?? "";
  if (e?.name === "TypeError" && /fetch|network|load failed/i.test(msg)) return new AppError("NETWORK", FRIENDLY.NETWORK, err);
  if (/failed to fetch|networkerror|load failed/i.test(msg)) return new AppError("NETWORK", FRIENDLY.NETWORK, err);
  if (e?.code === "23505") return new AppError("DUPLICATE", FRIENDLY.DUPLICATE, err);
  if (e?.code === "PGRST301" || e?.status === 401 || /jwt expired|invalid jwt/i.test(msg)) return new AppError("UNAUTHORIZED", FRIENDLY.UNAUTHORIZED, err);
  if (e?.code === "42501") return new AppError("FORBIDDEN", "Você não tem permissão para essa ação.", err);
  return new AppError("INTERNAL", FRIENDLY.INTERNAL, err);
}

/** Erro de Edge Function: lê { error: { code, message } } da resposta. */
export async function edgeFunctionError(err: unknown, context: string): Promise<AppError> {
  const ctx = (err as { context?: unknown } | null)?.context;
  if (ctx instanceof Response) {
    try {
      const body = await ctx.clone().json();
      const code: string = body?.error?.code ?? (ctx.status === 401 ? "UNAUTHORIZED" : "INTERNAL");
      const message: string = body?.error?.message ?? friendlyMessage(code);
      console.error(`[${context}] ${ctx.status} ${code}`, body);
      return new AppError(code, message, err);
    } catch {
      console.error(`[${context}] resposta sem JSON`, ctx.status);
      return new AppError(ctx.status === 401 ? "UNAUTHORIZED" : "INTERNAL", friendlyMessage(ctx.status === 401 ? "UNAUTHORIZED" : "INTERNAL"), err);
    }
  }
  const name = (err as { name?: string } | null)?.name;
  if (name === "FunctionsFetchError" || name === "FunctionsRelayError") return new AppError("NETWORK", FRIENDLY.NETWORK, err);
  return toAppError(err, context);
}

/** Mensagem pronta para toast/tela a partir de qualquer erro. */
export function errorMessage(err: unknown): string {
  return err instanceof AppError ? err.message : FRIENDLY.INTERNAL;
}
