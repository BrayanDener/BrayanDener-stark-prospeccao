const DAY = 24 * 60 * 60 * 1000;

/** Datas relativas a "agora", para os follow-ups dos mocks sempre fazerem sentido. */
export function daysAgo(days: number, hour = 10, minute = 0): string {
  const d = new Date(Date.now() - days * DAY);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

export function daysFromNow(days: number, hour = 9): string {
  return daysAgo(-days, hour);
}
