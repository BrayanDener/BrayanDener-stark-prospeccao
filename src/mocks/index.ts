import type { Lead, Search } from "@/types";
import { generateSearchResults } from "./generator";
import { MOCK_LEADS } from "./leads";
import { MOCK_SEARCHES } from "./searches";

export { DEFAULT_SETTINGS } from "./settings";
export { MOCK_TEMPLATES } from "./templates";
export { generateSearchResults } from "./generator";

/** Leads iniciais: os escritos à mão + resultados gerados até completar o total de cada busca. */
export function buildInitialData(): { leads: Lead[]; searches: Search[] } {
  const leads: Lead[] = [...MOCK_LEADS];
  for (const s of MOCK_SEARCHES) {
    const own = MOCK_LEADS.filter((l) => l.searchId === s.id);
    const extra = generateSearchResults(s, {
      searchId: s.id,
      count: Math.max(0, s.totalFound - own.length),
      createdAt: s.createdAt,
      skipNames: new Set(own.map((l) => l.name)),
    });
    leads.push(...extra);
  }
  const searches: Search[] = MOCK_SEARCHES.map(({ totalFound: _total, ...s }) => s);
  return { leads, searches };
}
