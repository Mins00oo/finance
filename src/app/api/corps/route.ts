import { NextResponse } from "next/server";
import { z } from "zod";
import { searchCorps } from "@/lib/corp-index";

export const runtime = "nodejs";

const QuerySchema = z.object({
  query: z.string().trim().min(1).max(50),
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : 20))
    .pipe(z.number().int().min(1).max(50)),
});

export async function GET(req: Request) {
  const url = new URL(req.url);

  const parsed = QuerySchema.safeParse({
    query: url.searchParams.get("query") ?? "",
    limit: url.searchParams.get("limit") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query. Provide query=회사명 (1~50 chars)." },
      { status: 400 },
    );
  }

  const { query, limit } = parsed.data;
  const items = await searchCorps(query, limit);
  return NextResponse.json({ items });
}

