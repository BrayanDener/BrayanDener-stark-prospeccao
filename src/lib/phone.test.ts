import { describe, expect, it } from "vitest";
import { formatPhone, normalizePhone, phoneKind, telUrl, whatsappUrl } from "./phone";

describe("phone", () => {
  it("normaliza formatos comuns", () => {
    expect(normalizePhone("(31) 98812-4471")).toBe("31988124471");
    expect(normalizePhone("+55 31 98812-4471")).toBe("31988124471");
    expect(normalizePhone("031 3831-2290")).toBe("3138312290");
    expect(normalizePhone("123")).toBeNull();
    expect(normalizePhone(null)).toBeNull();
  });
  it("adiciona o 9 em celular antigo de 8 dígitos", () => {
    expect(normalizePhone("(31) 8812-4471")).toBe("31988124471");
  });
  it("classifica celular, fixo e nenhum", () => {
    expect(phoneKind("(31) 98812-4471")).toBe("celular");
    expect(phoneKind("(31) 3831-2290")).toBe("fixo");
    expect(phoneKind(null)).toBe("nenhum");
  });
  it("formata e gera links", () => {
    expect(formatPhone("31988124471")).toBe("(31) 98812-4471");
    expect(formatPhone("3138312290")).toBe("(31) 3831-2290");
    expect(whatsappUrl("(31) 98812-4471", "Olá!")).toBe("https://wa.me/5531988124471?text=Ol%C3%A1!");
    expect(telUrl("(31) 3831-2290")).toBe("tel:+553138312290");
    expect(whatsappUrl(null)).toBeNull();
  });
});
