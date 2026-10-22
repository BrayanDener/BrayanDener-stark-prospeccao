/**
 * Edge Function "generate-message" (Etapa 4)
 * POST { leadId, service, tone? } com o JWT do usuário → { message }.
 * Lê o lead no banco (RLS do usuário) e gera uma abordagem curta com o Gemini (plano grátis).
 * A chave fica no secret AI_API_KEY; nunca vai para o front.
 */
import { authenticate, corsHeaders, errorResponse, HttpError, json } from "../_shared/http.ts";
import { isServiceKey } from "../_shared/services.ts";
import { AiError, DEFAULT_MODEL, generateWithGemini } from "./gemini.ts";
import { buildUserPrompt, cleanMessage, SYSTEM_PROMPT, type LeadFacts, type Tone } from "./prompt.ts";

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
    const model = Deno.env.get("AI_MODEL")?.trim() || DEFAULT_MODEL;

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

    const result = await generateWithGemini({
      apiKey,
      model,
      system: SYSTEM_PROMPT,
      prompt: buildUserPrompt(facts, service, tone, signature),
    });

    return json({ message: cleanMessage(result.text), model: result.model });
  } catch (err) {
    if (err instanceof HttpError) return errorResponse(err.code, err.message);
    if (err instanceof AiError) return errorResponse(err.code, err.message || undefined);
    console.error("[generate-message] erro inesperado", err);
    return errorResponse("INTERNAL");
  }
});
