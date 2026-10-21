/**
 * Telefones brasileiros — usado pelo app e pela Edge Function.
 * Formato interno: DDD + número, só dígitos (10 ou 11 dígitos).
 */
export type PhoneType = "celular" | "fixo" | "nenhum";

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Normaliza para DDD + número. Celular antigo de 8 dígitos começando com 6–9 ganha o 9
 * (fixo no Brasil começa com 2–5). Retorna null se não for um telefone válido.
 */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let d = digitsOnly(raw);
  if ((d.length === 12 || d.length === 13) && d.startsWith("55")) d = d.slice(2);
  d = d.replace(/^0+/, "");
  if (d.length === 10) {
    const ddd = d.slice(0, 2);
    const local = d.slice(2);
    if (/^[6-9]/.test(local)) return `${ddd}9${local}`;
    return d;
  }
  if (d.length === 11 && d[2] === "9") return d;
  return null;
}

/** celular = DDD + 9 dígitos começando com 9 · fixo = DDD + 8 dígitos. */
export function phoneType(raw: string | null | undefined): PhoneType {
  const n = normalizePhone(raw);
  if (!n) return "nenhum";
  return n.length === 11 ? "celular" : "fixo";
}

/** +5531988124471 */
export function toE164(raw: string | null | undefined): string | null {
  const n = normalizePhone(raw);
  return n ? `+55${n}` : null;
}

/** (31) 98765-4321 · (31) 3831-1234. Se não der para normalizar, devolve o original. */
export function formatPhone(raw: string | null | undefined): string {
  if (!raw) return "";
  const n = normalizePhone(raw);
  if (!n) return raw;
  const ddd = n.slice(0, 2);
  const local = n.slice(2);
  const split = local.length === 9 ? 5 : 4;
  return `(${ddd}) ${local.slice(0, split)}-${local.slice(split)}`;
}
