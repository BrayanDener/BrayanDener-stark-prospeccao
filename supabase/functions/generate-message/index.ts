/**
 * Edge Function "generate-message" (Etapa 4)
 * POST { leadId, service, tone? } com o JWT do usuário → { message }.
 * Lê o lead no banco (RLS do usuário) e gera uma abordagem curta com o Claude.
 * A chave fica no secret AI_API_KEY; nunca vai para o front.
 */
import Anthropic from "npm:@anthropic-ai/sdk@0.131.0";
import { authenticate, corsHeaders, errorResponse, HttpError, json } from "../_shared/http.ts";
import { isServiceKey } from "../_shared/services.ts";
import { buildUserPrompt, cleanMessage, SYSTEM_PROMPT, type LeadFacts, type Tone } from "./prompt.ts";

const MODEL = "claude-opus-5-5";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return errorResponse("METHOD_NOT_ALLOWED");

  try {
    const { supabase } = await authenticate(req);

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const leadId = typeof body?.leadId === "string" ? body.leadId : "";
    const service = body?.service;
    const tone: Tone = body?.tone === "direto" ? "direto" : "amigavel";
    if (!UUID_RE.test(leadId) || !isServiceKey(service)) throw new HttpError("INVALID_INPUT", "Lead ou serviço inválido.");

    const apiKey = Deno.env.get("AI_API_KEY");
    if (!apiKey) {
      console.error("[generate-message] secret AI_API_KEY ausente");
      throw new HttpError("AI_NOT_CONFIGURED");
    }

    const [{ data: lead, error: leadErr }, { data: settings }] = await Promise.all([
      supabase.from("leads").select("name, city, niche, rating, reviews_count, website_kind").eq("id", leadId).maybeSingle(),
      supabase.from("user_settings").select("signature").maybeSingle(),
    ]);
    if (leadErr) throw leadErr;
    if (!lead) throw new HttpError("NOT_FOUND");

    const facts: LeadFacts = {
      name: lead.name,
      city: lead.city,
      niche: lead.niche,
      rating: lead.rating === null ? null : Number(lead.rating),
      reviews_count: lead.reviews_count ?? 0,
      website_kind: lead.website_kind,
    };
    const signature = settings?.signature ?? "[Seu nome], da Stark IA";

    const client = new Anthropic({ apiKey, maxRetries: 1, timeout: 45_000 });
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 4000,
      // Mensagem curta: esforço baixo é suficiente e responde mais rápido.
      output_config: { effort: "low" },
      // Se o modelo recusar por política, o próprio servidor tenta o modelo de reserva adequado.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildUserPrompt(facts, service, tone, signature) }],
    });

    if (response.stop_reason === "refusal") {
      console.error("[generate-message] recusa", response.stop_details);
      throw new HttpError("AI_UNAVAILABLE", "A IA não quis gerar essa mensagem. Use o modelo pronto ou escreva a sua.");
    }

    const text = response.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
    if (!text) throw new HttpError("AI_UNAVAILABLE");

    return json({ message: cleanMessage(text), model: response.model });
  } catch (err) {
    if (err instanceof HttpError) return errorResponse(err.code, err.message);
    if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) {
      console.error("[generate-message] chave da IA recusada", err.status);
      return errorResponse("AI_NOT_CONFIGURED", "A chave AI_API_KEY foi recusada. Confira o secret no Supabase.");
    }
    if (err instanceof Anthropic.RateLimitError) {
      console.error("[generate-message] limite de uso da IA", err.status);
      return errorResponse("AI_UNAVAILABLE", "Muitas gerações seguidas. Espere um pouco e tente de novo.");
    }
    if (err instanceof Anthropic.APIError) {
      // 529 (sobrecarga), 5xx e timeouts caem aqui.
      console.error("[generate-message] erro da API", err.status, err.message);
      return errorResponse("AI_UNAVAILABLE");
    }
    console.error("[generate-message] erro inesperado", err);
    return errorResponse("INTERNAL");
  }
});
