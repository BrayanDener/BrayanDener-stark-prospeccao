import { describe, expect, it } from "vitest";
import { formatPhone, normalizePhone, phoneType, telUrl, toE164, whatsappUrl } from "./phone";

describe("telefone", () => {
  it("normaliza formatos comuns do Google", () => {
    expect(normalizePhone("(31) 98812-4471")).toBe("31988124471");
    expect(normalizePhone("+55 31 98812-4471")).toBe("31988124471");
    expect(normalizePhone("031 3831-2290")).toBe("3138312290");
    expect(normalizePhone("123")).toBeNull();
    expect(normalizePhone(null)).toBeNull();
  });
  it("celular = 9 dígitos começando com 9; fixo = 8 dígitos", () => {
    expect(phoneType("+55 31 98812-4471")).toBe("celular");
    expect(phoneType("(31) 3831-2290")).toBe("fixo");
    expect(phoneType(undefined)).toBe("nenhum");
  });
  it("celular antigo de 8 dígitos (6–9) ganha o 9", () => {
    expect(normalizePhone("(31) 8812-4471")).toBe("31988124471");
  });
  it("gera E.164, formato de exibição e links", () => {
    expect(toE164("(31) 98812-4471")).toBe("+5531988124471");
    expect(formatPhone("+5531988124471")).toBe("(31) 98812-4471");
    expect(formatPhone("3138312290")).toBe("(31) 3831-2290");
    expect(whatsappUrl("+5531988124471", "Olá!")).toBe("https://wa.me/5531988124471?text=Ol%C3%A1!");
    expect(telUrl("(31) 3831-2290")).toBe("tel:+553138312290");
    expect(whatsappUrl(null)).toBeNull();
  });
});
