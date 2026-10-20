import { describe, expect, it } from "vitest";
import { daysOpen, hoursForDay, isOpenAt } from "./hours";
import type { WeeklyHours } from "@/types";

const bar: WeeklyHours = [{ day: 5, open: "18:00", close: "02:00" }];
const shop: WeeklyHours = [{ day: 1, open: "08:00", close: "18:00" }];

describe("hours", () => {
  it("aberto/fechado em horário comum", () => {
    expect(isOpenAt(shop, new Date(2026, 9, 19, 10))).toBe(true); // segunda 10h
    expect(isOpenAt(shop, new Date(2026, 9, 19, 18))).toBe(false);
    expect(isOpenAt(null)).toBeNull();
  });
  it("horário que vira a madrugada", () => {
    expect(isOpenAt(bar, new Date(2026, 9, 23, 23))).toBe(true); // sexta 23h
    expect(isOpenAt(bar, new Date(2026, 9, 24, 1))).toBe(true); // sábado 1h
    expect(isOpenAt(bar, new Date(2026, 9, 24, 3))).toBe(false);
  });
  it("formata e conta dias", () => {
    expect(hoursForDay(shop, 1)).toBe("08:00 – 18:00");
    expect(hoursForDay(shop, 0)).toBe("Fechado");
    expect(daysOpen(shop)).toBe(1);
  });
});
