"use client";

import { useMemo, useState } from "react";

export function AiAnalysisPanel({
  corpCode,
  years = 5,
}: {
  corpCode: string;
  years?: number;
}) {
  const [text, setText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cached, setCached] = useState<boolean | null>(null);

  const canCopy = useMemo(() => Boolean(text), [text]);

  async function run(model: "gemini-2.0-flash" | "gemini-2.5-flash") {
    setLoading(true);
    setError(null);
    setCached(null);
    try {
      const res = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ corpCode, years, model }),
      });
      const json = (await res.json()) as
        | { text: string; cached: boolean }
        | { error: string };
      if (!res.ok) throw new Error("error" in json ? json.error : "API error");
      setText("text" in json ? json.text : null);
      setCached("cached" in json ? json.cached : null);
    } catch (e) {
      setText(null);
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    if (!text) return;
    await navigator.clipboard.writeText(text);
  }

  return (
    <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold tracking-tight">AI 쉬운 요약</div>
          <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
            차트에 사용된 실제 OpenDART 데이터(캐시)를 기반으로 설명합니다.
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => run("gemini-2.0-flash")}
            disabled={loading}
            className="rounded-xl bg-zinc-900 px-3 py-2 text-xs font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {loading ? "생성 중..." : "생성(gemini-2.0-flash)"}
          </button>
          <button
            onClick={() => run("gemini-2.5-flash")}
            disabled={loading}
            className="rounded-xl border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-900 disabled:opacity-60 dark:border-zinc-800 dark:text-zinc-100"
          >
            생성(gemini-2.5-flash)
          </button>
          <button
            onClick={copy}
            disabled={!canCopy}
            className="rounded-xl border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-700 disabled:opacity-60 dark:border-zinc-800 dark:text-zinc-300"
          >
            복사
          </button>
        </div>
      </div>

      {error ? (
        <div className="mt-4 text-sm text-red-600">{error}</div>
      ) : null}

      {text ? (
        <div className="mt-4">
          <div className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">
            {cached === null ? null : cached ? "캐시 결과" : "새로 생성됨"}
          </div>
          <pre className="whitespace-pre-wrap rounded-xl bg-zinc-50 p-4 text-sm leading-7 text-zinc-900 dark:bg-zinc-900/40 dark:text-zinc-100">
            {text}
          </pre>
        </div>
      ) : (
        <div className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
          버튼을 눌러 요약을 생성하세요. (Gemini 키가 설정되어 있어야 합니다.)
        </div>
      )}
    </div>
  );
}

