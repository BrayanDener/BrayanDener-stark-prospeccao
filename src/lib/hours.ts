/**
 * Horário de funcionamento (Google Places regularOpeningHours) no fuso America/Sao_Paulo.
 * "Aberto agora" é sempre calculado aqui, nunca salvo (ficaria desatualizado).
 */
import type { OpeningHours, OpeningPeriod } from "@/types";

export const TIME_ZONE = "America/Sao_Paulo";
const WEEK_MINUTES = 7 * 24 * 60;
const DAY_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

const partsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** Dia da semana (0 = domingo), hora e minuto em São Paulo. */
export function spClock(date: Date = new Date()): { day: number; hour: number; minute: number } {
  const parts = Object.fromEntries(partsFormatter.formatToParts(date).map((p) => [p.type, p.value]));
  return { day: DAY_INDEX[parts.weekday] ?? 0, hour: Number(parts.hour) % 24, minute: Number(parts.minute) };
}

const toWeekMinute = (p: { day: number; hour: number; minute: number }) => p.day * 1440 + p.hour * 60 + p.minute;

function covers(period: OpeningPeriod, now: number): boolean {
  // Sem "close" = aberto 24 horas.
  if (!period.close) return true;
  const open = toWeekMinute(period.open);
  let close = toWeekMinute(period.close);
  if (close <= open) close += WEEK_MINUTES; // vira a semana (sábado → domingo) ou a madrugada
  return (now >= open && now < close) || (now + WEEK_MINUTES >= open && now + WEEK_MINUTES < close);
}

/** true/false, ou null quando o Google não informou o horário. */
export function isOpenAt(hours: OpeningHours | null | undefined, date: Date = new Date()): boolean | null {
  const periods = hours?.periods;
  if (!periods || periods.length === 0) return null;
  const now = toWeekMinute(spClock(date));
  return periods.some((p) => covers(p, now));
}

/**
 * Linhas da semana para exibir (segunda → domingo), destacando hoje.
 * O Google já devolve weekdayDescriptions em pt-BR começando na segunda.
 */
export function weekLines(hours: OpeningHours | null | undefined, date: Date = new Date()): { label: string; value: string; today: boolean }[] {
  const lines = hours?.weekdayDescriptions ?? [];
  const today = spClock(date).day; // 0 = domingo
  const todayIndex = (today + 6) % 7; // 0 = segunda
  return lines.map((line, i) => {
    const sep = line.indexOf(":");
    const label = sep > 0 ? line.slice(0, sep) : line;
    const value = sep > 0 ? line.slice(sep + 1).trim() : "";
    return { label: label.charAt(0).toUpperCase() + label.slice(1), value, today: i === todayIndex };
  });
}
