"use client";

import ReactECharts from "echarts-for-react";
import { useEffect, useMemo, useState } from "react";

type ApiResponse = {
  corpCode: string;
  reprtCode: string;
  years: number[];
  series: Array<{
    bsnsYear: number;
    fsDiv: string;
    metrics: Record<string, number | null>;
  }>;
};

function formatWon(v: number | null) {
  if (v === null) return "-";
  const abs = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  if (abs >= 1e12) return `${sign}${(abs / 1e12).toFixed(1)}조`;
  if (abs >= 1e8) return `${sign}${(abs / 1e8).toFixed(1)}억`;
  if (abs >= 1e4) return `${sign}${(abs / 1e4).toFixed(1)}만`;
  return `${v}`;
}

export function SingleAccountChart({
  corpCode,
  years = 5,
}: {
  corpCode: string;
  years?: number;
}) {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(null);

    fetch(`/api/opendart/single-account?corpCode=${corpCode}&years=${years}`)
      .then(async (res) => {
        const json = (await res.json()) as ApiResponse | { error: string };
        if (!res.ok) throw new Error("error" in json ? json.error : "API error");
        return json as ApiResponse;
      })
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [corpCode, years]);

  const option = useMemo(() => {
    if (!data) return null;

    const labels = data.series.map((s) => String(s.bsnsYear));
    const revenue = data.series.map((s) => s.metrics.revenue ?? null);
    const op = data.series.map((s) => s.metrics.operatingIncome ?? null);
    const net = data.series.map((s) => s.metrics.netIncome ?? null);
    const assets = data.series.map((s) => s.metrics.assets ?? null);
    const liab = data.series.map((s) => s.metrics.liabilities ?? null);
    const eq = data.series.map((s) => s.metrics.equity ?? null);

    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        valueFormatter: (v: unknown) =>
          typeof v === "number" ? `${formatWon(v)}원` : "-",
      },
      legend: { top: 0 },
      grid: { left: 16, right: 16, top: 40, bottom: 24, containLabel: true },
      xAxis: { type: "category", data: labels },
      yAxis: [
        { type: "value", name: "손익(원)", scale: true },
        { type: "value", name: "자산/부채/자본(원)", scale: true },
      ],
      series: [
        { name: "매출액", type: "bar", yAxisIndex: 0, data: revenue },
        { name: "영업이익", type: "line", yAxisIndex: 0, data: op },
        { name: "당기순이익", type: "line", yAxisIndex: 0, data: net },
        { name: "자산총계", type: "line", yAxisIndex: 1, data: assets },
        { name: "부채총계", type: "line", yAxisIndex: 1, data: liab },
        { name: "자본총계", type: "line", yAxisIndex: 1, data: eq },
      ],
    };
  }, [data]);

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold tracking-tight">
            단일회사 주요계정 (최근 {years}개년)
          </div>
          <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
            OpenDART 기준, 연결(CFS) 우선 선택
          </div>
        </div>
        {data?.series?.[0]?.fsDiv ? (
          <div className="text-xs text-zinc-500 dark:text-zinc-400">
            fs_div: <span className="font-mono">{data.series[0].fsDiv}</span>
          </div>
        ) : null}
      </div>

      {loading ? (
        <div className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">
          불러오는 중...
        </div>
      ) : null}
      {error ? (
        <div className="mt-6 text-sm text-red-600">{error}</div>
      ) : null}

      {option ? (
        <div className="mt-4">
          <ReactECharts option={option} style={{ height: 420 }} notMerge />
        </div>
      ) : null}
    </div>
  );
}

