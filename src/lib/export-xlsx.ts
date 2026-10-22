/**
 * Exporta exatamente os leads da visão atual para .xlsx (gerado no aparelho, sem servidor).
 * Carregado sob demanda: o exceljs só baixa quando o usuário toca em "Exportar".
 */
import { getNiche } from "@/config/niches";
import { getStatus } from "@/config/status";
import { formatPhone } from "@/lib/phone";
import { mapsUrl } from "@/lib/links";
import type { Lead } from "@/types";

const PHONE_TYPE = { celular: "Celular", fixo: "Fixo", nenhum: "Sem telefone" } as const;
const SITE_KIND = { site: "", rede_social: " (rede social)", nenhum: "" } as const;

function slug(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "todos";
}

const toDate = (iso: string | null) => (iso ? new Date(iso) : null);

export function exportFileName(city: string, niche: string, date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `leads-${slug(city)}-${slug(niche)}-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.xlsx`;
}

export async function exportLeadsXlsx(leads: Lead[], opts: { scores: Map<string, number>; city: string; niche: string }): Promise<void> {
  const { default: ExcelJS } = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  wb.creator = "Stark Prospecção";
  wb.created = new Date();
  const ws = wb.addWorksheet("Leads", { views: [{ state: "frozen", ySplit: 1 }] });

  ws.columns = [
    { header: "Nome", key: "nome", width: 34 },
    { header: "Score", key: "score", width: 8 },
    { header: "Status", key: "status", width: 14 },
    { header: "Telefone", key: "telefone", width: 18 },
    { header: "Tipo de telefone", key: "tipo", width: 16 },
    { header: "Site", key: "site", width: 36 },
    { header: "Nota", key: "nota", width: 8 },
    { header: "Avaliações", key: "avaliacoes", width: 12 },
    { header: "Endereço", key: "endereco", width: 48 },
    { header: "Cidade", key: "cidade", width: 18 },
    { header: "Nicho", key: "nicho", width: 22 },
    { header: "Último contato", key: "ultimo", width: 16, style: { numFmt: "dd/mm/yyyy" } },
    { header: "Follow-up", key: "followup", width: 14, style: { numFmt: "dd/mm/yyyy" } },
    { header: "Anotações", key: "notas", width: 40 },
    { header: "Link do Maps", key: "maps", width: 40 },
  ];

  for (const l of leads) {
    ws.addRow({
      nome: l.name,
      score: opts.scores.get(l.id) ?? null,
      status: getStatus(l.status).label,
      telefone: l.phoneE164 || l.phoneNational ? formatPhone(l.phoneE164 ?? l.phoneNational) : "",
      tipo: PHONE_TYPE[l.phoneType],
      site: l.website ? `${l.website}${SITE_KIND[l.websiteKind]}` : "",
      nota: l.rating,
      avaliacoes: l.reviewsCount,
      endereco: l.address ?? "",
      cidade: l.city,
      nicho: getNiche(l.niche)?.label ?? l.niche,
      ultimo: toDate(l.lastContactAt),
      followup: toDate(l.followUpAt),
      notas: l.notes,
      maps: { text: "Abrir no Maps", hyperlink: mapsUrl(l) },
    });
  }

  const header = ws.getRow(1);
  header.font = { bold: true };
  header.alignment = { vertical: "middle" };
  header.height = 20;
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: ws.columns.length } };

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = exportFileName(opts.city, opts.niche);
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
