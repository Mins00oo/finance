import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerEnv } from "@/lib/env";
import {
  extractSingleAccountMetrics,
  fetchOpendartSingleAccount,
  type SingleAccountPayload,
} from "@/lib/opendart";

export const runtime = "nodejs";

const QuerySchema = z.object({
  corpCode: z.string().trim().length(8),
  years: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : 5))
    .pipe(z.number().int().min(1).max(10)),
  reprtCode: z.string().optional().default("11011"),
});

const memoryCache = new Map<string, SingleAccountPayload[]>();

export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse({
    corpCode: url.searchParams.get("corpCode") ?? "",
    years: url.searchParams.get("years") ?? undefined,
    reprtCode: url.searchParams.get("reprtCode") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid params. corpCode(8), years(1~10), reprtCode." },
      { status: 400 },
    );
  }

  const env = getServerEnv();
  if (!env.OPENDART_API_KEY) {
    return NextResponse.json(
      {
        error:
          "OPENDART_API_KEY is not set. Add it to .env.local (dev) or Vercel env (prod).",
      },
      { status: 503 },
    );
  }

  const { corpCode, years, reprtCode } = parsed.data;

  const currentYear = new Date().getFullYear();
  const targetYears = Array.from({ length: years }, (_, i) => currentYear - 1 - i)
    .filter((y) => y >= 2015)
    .reverse();

  const cacheKey = `${corpCode}:${reprtCode}`;
  const existing = memoryCache.get(cacheKey) ?? [];
  const series: SingleAccountPayload[] = [...existing];

  for (const y of targetYears) {
    if (series.some((s) => s.bsnsYear === y)) continue;

    const list = await fetchOpendartSingleAccount({
      apiKey: env.OPENDART_API_KEY,
      corpCode,
      bsnsYear: y,
      reprtCode,
    });

    const extracted = extractSingleAccountMetrics(list);
    const payload: SingleAccountPayload = {
      bsnsYear: y,
      fsDiv: extracted.fsDiv,
      metrics: extracted.metrics,
    };

    series.push(payload);
  }

  memoryCache.set(
    cacheKey,
    series.sort((a, b) => a.bsnsYear - b.bsnsYear),
  );

  return NextResponse.json({
    corpCode,
    reprtCode,
    years: targetYears,
    series,
  });
}

