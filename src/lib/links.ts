import type { Lead } from "@/types";

/** Link do Maps: o googleMapsUri do Google; sem ele, uma busca pelo nome + endereço. */
export function mapsUrl(lead: Pick<Lead, "googleMapsUri" | "name" | "address" | "city">): string {
  if (lead.googleMapsUri) return lead.googleMapsUri;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lead.name}, ${lead.address ?? lead.city}`)}`;
}

/** Se o "site" do Google é um perfil do Instagram, devolve esse link. */
export function instagramProfileUrl(lead: Pick<Lead, "website">): string | null {
  if (lead.website && /(^|\.)instagram\.com/i.test(safeHost(lead.website))) return lead.website;
  return null;
}

/** Instagram: o perfil, se o Google tiver; senão uma busca no Google por "{empresa} {cidade} instagram". */
export function instagramUrl(lead: Pick<Lead, "website" | "name" | "city">): string {
  return instagramProfileUrl(lead) ?? `https://www.google.com/search?q=${encodeURIComponent(`${lead.name} ${lead.city} instagram`)}`;
}

function safeHost(url: string): string {
  try {
    return new URL(/^[a-z]+:\/\//i.test(url) ? url : `https://${url}`).hostname;
  } catch {
    return "";
  }
}

export function displayUrl(url: string): string {
  return url.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "");
}
