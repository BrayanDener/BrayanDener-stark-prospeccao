import type { DayHours, WeeklyHours } from "@/types";

export const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"] as const;
/** Ordem de exibição: segunda → domingo. */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
}

function coversMinute(entry: DayHours, minute: number, fromPreviousDay: boolean): boolean {
  const open = toMinutes(entry.open);
  const close = toMinutes(entry.close);
  const overnight = close <= open;
  if (fromPreviousDay) return overnight && minute < close;
  return overnight ? minute >= open : minute >= open && minute < close;
}

/** null = horário desconhecido. */
export function isOpenAt(hours: WeeklyHours | null, date: Date = new Date()): boolean | null {
  if (!hours || hours.length === 0) return null;
  const day = date.getDay();
  const minute = date.getHours() * 60 + date.getMinutes();
  const today = hours.filter((h) => h.day === day);
  if (today.some((h) => coversMinute(h, minute, false))) return true;
  const yesterday = hours.filter((h) => h.day === (day + 6) % 7);
  return yesterday.some((h) => coversMinute(h, minute, true));
}

export function daysOpen(hours: WeeklyHours | null): number {
  if (!hours) return 0;
  return new Set(hours.map((h) => h.day)).size;
}

export function hoursForDay(hours: WeeklyHours | null, day: number): string {
  if (!hours) return "—";
  const entries = hours.filter((h) => h.day === day);
  if (entries.length === 0) return "Fechado";
  return entries.map((e) => `${e.open} – ${e.close}`).join(", ");
}
