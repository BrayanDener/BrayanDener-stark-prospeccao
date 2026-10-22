import { describe, expect, it } from "vitest";
import { classifyWebsite } from "../../supabase/functions/_shared/website";

describe("classificação do site (website_kind)", () => {
  it("vazio → nenhum", () => {
    expect(classifyWebsite(null)).toBe("nenhum");
    expect(classifyWebsite("  ")).toBe("nenhum");
  });
  it("redes sociais, link na bio e WhatsApp → rede_social", () => {
    for (const url of [
      "https://instagram.com/barbeariabadyo.ofc?r=nametag",
      "https://www.instagram.com/kings5_barbearia",
      "https://m.facebook.com/padaria",
      "https://linktr.ee/sorrisos",
      "https://wa.me/5531999999999",
      "https://api.whatsapp.com/send?phone=55",
    ]) expect(classifyWebsite(url)).toBe("rede_social");
  });
  it("plataformas de agendamento/cardápio e links curtos não contam como site próprio", () => {
    expect(classifyWebsite("https://agendamento.avec.beauty/?slug=stillus")).toBe("rede_social");
    expect(classifyWebsite("https://barb.page.link/27jvJ")).toBe("rede_social");
    expect(classifyWebsite("https://booksy.com/pt-br/123")).toBe("rede_social");
  });
  it("domínio próprio → site", () => {
    expect(classifyWebsite("https://studio33barbearia.com.br")).toBe("site");
    expect(classifyWebsite("www.fogaomineiro.com.br")).toBe("site");
    // não confundir com domínios que só terminam parecido
    expect(classifyWebsite("https://notinstagram.com.br")).toBe("site");
  });
});
