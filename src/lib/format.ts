const dayMs = 24 * 60 * 60 * 1000;

const TZ = "America/Sao_Paulo";
const ddmm = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", timeZone: TZ });
const longDate = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short", year: "numeric", timeZone: TZ });
const dateTime = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: TZ });
const number = new Intl.NumberFormat("pt-BR");
const rating = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export const formatDayMonth = (iso: string) => ddmm.format(new Date(iso));
export const formatDate = (iso: string) => longDate.format(new Date(iso)).replace(".", "");
export const formatDateTime = (iso: string) => dateTime.format(new Date(iso)).replace(",", " às");
export const formatNumber = (n: number) => number.format(n);
export const formatRating = (n: number) => rating.format(n);
export const formatPercent = (ratio: number) => `${Math.round(ratio * 100)}%`;

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

/** "hoje", "ontem", "há 3 dias", "amanhã", "em 4 dias" ou a data. */
export function formatRelativeDay(iso: string, now: Date = new Date()): string {
  const diff = Math.round((startOfDay(new Date(iso)).getTime() - startOfDay(now).getTime()) / dayMs);
  if (diff === 0) return "hoje";
  if (diff === -1) return "ontem";
  if (diff === 1) return "amanhã";
  if (diff < 0 && diff > -30) return `há ${-diff} dias`;
  if (diff > 0 && diff < 30) return `em ${diff} dias`;
  return formatDate(iso);
}

/** Valor para <input type="date"> (yyyy-mm-dd, horário local). */
export function toDateInputValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromDateInputValue(value: string): string | null {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d, 9, 0, 0).toISOString();
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * dayMs);
}

export function greeting(date: Date = new Date()): string {
  const h = date.getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}
