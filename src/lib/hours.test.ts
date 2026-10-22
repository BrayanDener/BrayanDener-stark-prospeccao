import { describe, expect, it } from "vitest";
import type { OpeningHours } from "@/types";
import { isOpenAt, spClock, weekLines } from "./hours";

// Datas em UTC; São Paulo = UTC-3.
const sp = (iso: string) => new Date(`${iso}-03:00`);

const shop: OpeningHours = {
  periods: [1, 2, 3, 4, 5].map((day) => ({ open: { day, hour: 9, minute: 0 }, close: { day, hour: 18, minute: 0 } })),
  weekdayDescriptions: ["segunda-feira: 09:00 – 18:00", "terça-feira: 09:00 – 18:00", "quarta-feira: 09:00 – 18:00", "quinta-feira: 09:00 – 18:00", "sexta-feira: 09:00 – 18:00", "sábado: Fechado", "domingo: Fechado"],
};
const bar: OpeningHours = { periods: [{ open: { day: 6, hour: 18, minute: 0 }, close: { day: 0, hour: 2, minute: 0 } }], weekdayDescriptions: [] };
const allDay: OpeningHours = { periods: [{ open: { day: 0, hour: 0, minute: 0 } }], weekdayDescriptions: [] };

describe("horário em America/Sao_Paulo", () => {
  it("relógio de São Paulo independe do fuso do aparelho", () => {
    expect(spClock(new Date("2026-10-19T12:30:00Z"))).toEqual({ day: 1, hour: 9, minute: 30 });
  });
  it("aberto/fechado em horário comercial", () => {
    expect(isOpenAt(shop, sp("2026-10-19T10:00:00"))).toBe(true); // segunda 10h
    expect(isOpenAt(shop, sp("2026-10-19T18:00:00"))).toBe(false);
    expect(isOpenAt(shop, sp("2026-10-18T10:00:00"))).toBe(false); // domingo
  });
  it("horário que vira a semana (sábado 18h → domingo 2h)", () => {
    expect(isOpenAt(bar, sp("2026-10-24T23:00:00"))).toBe(true); // sábado 23h
    expect(isOpenAt(bar, sp("2026-10-25T01:30:00"))).toBe(true); // domingo 1h30
    expect(isOpenAt(bar, sp("2026-10-25T03:00:00"))).toBe(false);
  });
  it("24 horas e horário desconhecido", () => {
    expect(isOpenAt(allDay, sp("2026-10-21T03:00:00"))).toBe(true);
    expect(isOpenAt(null)).toBeNull();
  });
  it("linhas da semana com 'hoje' destacado", () => {
    const lines = weekLines(shop, sp("2026-10-21T10:00:00")); // quarta
    expect(lines[0]).toEqual({ label: "Segunda-feira", value: "09:00 – 18:00", today: false });
    expect(lines[2].today).toBe(true);
  });
});
