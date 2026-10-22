/** Classificação do "site" que o Google informa. */
export type WebsiteKind = "nenhum" | "rede_social" | "site";

const SOCIAL_HOSTS = [
  "instagram.com",
  "facebook.com",
  "fb.com",
  "fb.me",
  "m.facebook.com",
  "linktr.ee",
  "linktree.com",
  "wa.me",
  "api.whatsapp.com",
  "whatsapp.com",
  "chat.whatsapp.com",
  "tiktok.com",
  "twitter.com",
  "x.com",
  "youtube.com",
  "linkedin.com",
  "beacons.ai",
  "bio.link",
  "taplink.cc",
  "linkbio.co",
  "ifood.com.br",
  // Plataformas de agendamento, cardápio e links de terceiros: não são um site próprio do negócio.
  "page.link",
  "avec.beauty",
  "avec.app",
  "booksy.com",
  "trinks.com",
  "appbarber.com.br",
  "agendasalao.com.br",
  "simplesagenda.com.br",
  "goomer.app",
  "anota.ai",
  "menudino.com",
  "cardapioweb.com",
  "linkme.bio",
  "msha.ke",
  "bio.site",
];

function hostOf(url: string): string | null {
  try {
    const withProto = /^[a-z]+:\/\//i.test(url) ? url : `https://${url}`;
    return new URL(withProto).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

/** vazio → 'nenhum' · rede social / link na bio / WhatsApp → 'rede_social' · resto → 'site'. */
export function classifyWebsite(url: string | null | undefined): WebsiteKind {
  if (!url || !url.trim()) return "nenhum";
  const host = hostOf(url.trim());
  if (!host) return "nenhum";
  if (SOCIAL_HOSTS.some((s) => host === s || host.endsWith(`.${s}`))) return "rede_social";
  return "site";
}
