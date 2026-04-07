import { z } from "zod";

export const DartItemSchema = z.object({
  corp_code: z.string(),
  bsns_year: z.string(),
  reprt_code: z.string(),
  fs_div: z.string(),
  sj_div: z.string(),
  account_nm: z.string(),
  thstrm_amount: z.string().optional(),
});

export type DartItem = z.infer<typeof DartItemSchema>;

export type SingleAccountPayload = {
  bsnsYear: number;
  fsDiv: string;
  metrics: Record<string, number | null>;
};

function parseAmount(v: string | undefined) {
  const s = (v ?? "").trim();
  if (!s) return null;
  const cleaned = s.replaceAll(",", "");
  if (cleaned === "-" || cleaned === "0") return cleaned === "0" ? 0 : null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

const KEY_ACCOUNTS: Array<{ key: string; names: string[] }> = [
  { key: "revenue", names: ["매출액"] },
  { key: "operatingIncome", names: ["영업이익"] },
  { key: "netIncome", names: ["당기순이익", "당기순이익(손실)"] },
  { key: "assets", names: ["자산총계"] },
  { key: "liabilities", names: ["부채총계"] },
  { key: "equity", names: ["자본총계"] },
];

function pickPreferredFs(list: DartItem[]) {
  const hasCfs = list.some((x) => x.fs_div === "CFS");
  return hasCfs ? "CFS" : "OFS";
}

export function extractSingleAccountMetrics(list: DartItem[]) {
  const preferred = pickPreferredFs(list);
  const filtered = list.filter((x) => x.fs_div === preferred);

  const metrics: Record<string, number | null> = {};
  for (const acc of KEY_ACCOUNTS) {
    const found = filtered.find((x) =>
      acc.names.some((n) => x.account_nm?.trim() === n),
    );
    metrics[acc.key] = parseAmount(found?.thstrm_amount);
  }
  return { fsDiv: preferred, metrics };
}

export async function fetchOpendartSingleAccount(params: {
  apiKey: string;
  corpCode: string;
  bsnsYear: number;
  reprtCode: string;
}) {
  const url = new URL("https://opendart.fss.or.kr/api/fnlttSinglAcnt.json");
  url.searchParams.set("crtfc_key", params.apiKey);
  url.searchParams.set("corp_code", params.corpCode);
  url.searchParams.set("bsns_year", String(params.bsnsYear));
  url.searchParams.set("reprt_code", params.reprtCode);

  const res = await fetch(url.toString(), { cache: "no-store" });
  const json = (await res.json()) as {
    status: string;
    message: string;
    list?: unknown;
  };

  if (!res.ok) throw new Error(`OpenDART HTTP ${res.status}`);
  if (!json?.status || json.status !== "000") {
    throw new Error(`OpenDART ${json?.status ?? "???"}: ${json?.message ?? ""}`);
  }

  const list = Array.isArray(json.list) ? json.list : [];
  return z.array(DartItemSchema).parse(list);
}

