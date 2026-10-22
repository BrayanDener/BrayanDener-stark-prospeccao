/**
 * Telefones: a lógica fica em supabase/functions/_shared/phone.ts (mesma regra no app e na Edge Function).
 * Aqui só os links usados pela interface.
 */
import { normalizePhone } from "../../supabase/functions/_shared/phone";

export { digitsOnly, formatPhone, normalizePhone, phoneType, toE164, type PhoneType } from "../../supabase/functions/_shared/phone";

/** https://wa.me/5531988124471?text=... (aceita E.164, nacional ou só dígitos). */
export function whatsappUrl(phone: string | null | undefined, text?: string): string | null {
  const n = normalizePhone(phone);
  if (!n) return null;
  const base = `https://wa.me/55${n}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

export function telUrl(phone: string | null | undefined): string | null {
  const n = normalizePhone(phone);
  return n ? `tel:+55${n}` : null;
}
