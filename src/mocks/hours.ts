import type { NicheKey, WeeklyHours } from "@/types";

type Day = 0 | 1 | 2 | 3 | 4 | 5 | 6;
const span = (days: Day[], open: string, close: string): WeeklyHours => days.map((day) => ({ day, open, close }));

export const HOURS = {
  comercial: [...span([1, 2, 3, 4, 5], "08:00", "18:00"), ...span([6], "08:00", "12:00")],
  escritorio: span([1, 2, 3, 4, 5], "08:30", "18:00"),
  barbearia: [...span([2, 3, 4, 5], "09:00", "20:00"), ...span([6], "08:00", "18:00")],
  salao: [...span([2, 3, 4, 5, 6], "09:00", "19:00")],
  restaurante: [...span([2, 3, 4, 5, 6, 0], "11:30", "15:00"), ...span([4, 5, 6], "18:30", "23:30")],
  lanchonete: span([1, 2, 3, 4, 5, 6, 0], "10:00", "22:00"),
  bar: span([3, 4, 5, 6, 0], "17:00", "01:00"),
  todoDia: span([0, 1, 2, 3, 4, 5, 6], "07:00", "22:00"),
  academia: [...span([1, 2, 3, 4, 5], "05:30", "22:30"), ...span([6], "08:00", "14:00")],
  padaria: span([0, 1, 2, 3, 4, 5, 6], "06:00", "20:30"),
  clinica: [...span([1, 2, 3, 4, 5], "08:00", "19:00"), ...span([6], "08:00", "12:00")],
  oficina: [...span([1, 2, 3, 4, 5], "07:30", "18:00"), ...span([6], "07:30", "12:00")],
  hotel: span([0, 1, 2, 3, 4, 5, 6], "00:00", "23:59"),
} satisfies Record<string, WeeklyHours>;

export const NICHE_HOURS: Record<NicheKey, WeeklyHours> = {
  restaurantes: HOURS.restaurante,
  saloes: HOURS.salao,
  barbearias: HOURS.barbearia,
  oficinas: HOURS.oficina,
  estetica_automotiva: HOURS.comercial,
  clinicas: HOURS.clinica,
  dentistas: HOURS.clinica,
  academias: HOURS.academia,
  farmacias: HOURS.todoDia,
  hoteis: HOURS.hotel,
  supermercados: HOURS.todoDia,
  padarias: HOURS.padaria,
  bares: HOURS.bar,
  escolas: HOURS.escritorio,
  advocacia: HOURS.escritorio,
  contabilidades: HOURS.escritorio,
  lojas_roupa: HOURS.comercial,
  construcao: HOURS.comercial,
  pet_shops: HOURS.comercial,
  imobiliarias: HOURS.escritorio,
};
