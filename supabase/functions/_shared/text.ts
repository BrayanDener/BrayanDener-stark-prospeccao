/** minúsculas, sem acento, espaços simples. "  São  João del-Rei " → "sao joao del-rei" */
export function normalizeCity(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}
