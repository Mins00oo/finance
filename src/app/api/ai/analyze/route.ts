import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerEnv } from "@/lib/env";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  extractSingleAccountMetrics,
  fetchOpendartSingleAccount,
} from "@/lib/opendart";

export const runtime = "nodejs";

const BodySchema = z.object({
  corpCode: z.string().trim().length(8),
  years: z.number().int().min(1).max(10).default(5),
  reprtCode: z.string().trim().min(1).default("11011"),
  corpName: z.string().trim().min(1).max(100).optional(),
  model: z.enum(["gemini-2.0-flash", "gemini-2.5-flash"]).optional(),
});

function compactSeries(series: Array<any>) {
  return series.map((s) => ({
    bsnsYear: s.bsnsYear,
    fsDiv: s.fsDiv,
    metrics: s.metrics,
  }));
}

export async function POST(req: Request) {
  const env = getServerEnv();
  if (!env.GEMINI_API_KEY) {
    return NextResponse.json(
      {
        error:
          "GEMINI_API_KEY is not set. Add it to .env.local (dev) or Vercel env (prod).",
      },
      { status: 503 },
    );
  }

  const raw = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body. Provide corpCode, years(1~10)." },
      { status: 400 },
    );
  }

  const { corpCode, years, reprtCode, corpName, model } = parsed.data;
  const selectedModel = model ?? "gemini-2.0-flash";

  const currentYear = new Date().getFullYear();
  const targetYears = Array.from({ length: years }, (_, i) => currentYear - 1 - i)
    .filter((y) => y >= 2015)
    .reverse();

  const seriesRaw = [];
  for (const y of targetYears) {
    const list = await fetchOpendartSingleAccount({
      apiKey: env.OPENDART_API_KEY!,
      corpCode,
      bsnsYear: y,
      reprtCode,
    });
    const extracted = extractSingleAccountMetrics(list);
    seriesRaw.push({
      bsnsYear: y,
      fsDiv: extracted.fsDiv,
      metrics: extracted.metrics,
    });
  }

  const series = compactSeries(seriesRaw).slice(-years);

  const input = {
    corpCode,
    corpName: corpName ?? null,
    reprtCode,
    years,
    series,
    notes: {
      currency: "KRW",
      caveat:
        "OpenDART 주요계정(연결 우선) 기반. 계정 누락/0/공란 가능.",
    },
  };

  const system = [
    "당신은 한국어로 재무 데이터를 쉽게 풀어서 설명하는 분석가다.",
    "투자 조언을 하지 말고, 정보 해설과 리스크/포인트 정리에 집중한다.",
    "초보자도 이해할 수 있게 용어는 짧게 풀이(괄호)하고, 숫자는 과도하게 나열하지 않는다.",
    "출력은 아래 형식을 정확히 지킨다.",
  ].join("\n");

  const prompt = [
    "아래 JSON은 특정 회사의 최근 연도별 주요계정 지표다.",
    "이를 바탕으로 누구나 이해할 수 있는 쉬운 한국어 요약을 작성해줘.",
    "",
    "## 출력 형식",
    "1) 한 줄 결론",
    "2) 무엇이 좋아졌나(최대 3개 bullet)",
    "3) 무엇이 부담인가(최대 3개 bullet)",
    "4) 숫자로 보는 변화(최대 5줄, 조/억 단위로 요약)",
    "5) 용어 풀이(최대 5개)",
    "",
    "## 입력 JSON",
    JSON.stringify(input),
  ].join("\n");

  const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  const client = genAI.getGenerativeModel({
    model: selectedModel,
    systemInstruction: system,
  });

  const result = await client.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.4 },
  });

  const text = result.response.text().trim();
  if (!text) {
    return NextResponse.json(
      { error: "Gemini returned empty response." },
      { status: 502 },
    );
  }

  return NextResponse.json({ text, cached: false });
}

