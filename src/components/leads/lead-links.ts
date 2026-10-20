import { getWebPresence } from "@/lib/filters";
import type { Lead } from "@/types";

export function mapsUrl(lead: Pick<Lead, "name" | "address" | "city" | "state">): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lead.name}, ${lead.address}, ${lead.city} - ${lead.state}`)}`;
}

/** Link do Instagram: handle cadastrado ou o "site" que na verdade é um perfil. */
export function instagramUrl(lead: Pick<Lead, "instagram" | "website">): string | null {
  if (lead.instagram) return `https://instagram.com/${lead.instagram.replace(/^@/, "")}`;
  if (lead.website && lead.website.toLowerCase().includes("instagram.com")) return lead.website;
  return null;
}

export function instagramHandle(lead: Pick<Lead, "instagram" | "website">): string | null {
  if (lead.instagram) return `@${lead.instagram.replace(/^@/, "")}`;
  const url = instagramUrl(lead);
  const m = url?.match(/instagram\.com\/([^/?#]+)/i);
  return m ? `@${m[1]}` : null;
}

export function ownSiteUrl(lead: Pick<Lead, "website" | "instagram">): string | null {
  return getWebPresence(lead) === "site" ? lead.website : null;
}
