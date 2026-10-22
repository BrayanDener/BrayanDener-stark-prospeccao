import { describe, expect, it } from "vitest";
import { exportFileName } from "./export-xlsx";

describe("exportação .xlsx", () => {
  it("nome do arquivo leads-{cidade}-{nicho}-{AAAA-MM-DD}.xlsx", () => {
    expect(exportFileName("João Monlevade", "Salões de Beleza", new Date(2026, 9, 21))).toBe("leads-joao-monlevade-saloes-de-beleza-2026-10-21.xlsx");
  });
});
