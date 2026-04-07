"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type CorpItem = {
  corp_code: string;
  corp_name: string;
  corp_eng_name: string | null;
  stock_code: string | null;
  modify_date: string | null;
};

export default function Home() {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<CorpItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = useMemo(() => query.trim(), [query]);

  useEffect(() => {
    if (!trimmed) {
      setItems([]);
      setError(null);
      return;
    }

    const handle = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/corps?query=${encodeURIComponent(trimmed)}`);
        const json = (await res.json()) as
          | { items: CorpItem[] }
          | { error: string };
        if (!res.ok) {
          setItems([]);
          setError("error" in json ? json.error : "검색 중 오류가 발생했습니다.");
          return;
        }
        setItems("items" in json ? json.items : []);
      } catch {
        setItems([]);
        setError("검색 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => window.clearTimeout(handle);
  }, [trimmed]);

  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 px-4 py-12 dark:bg-black">
      <main className="w-full max-w-3xl">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              재무 데이터 시각화
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              회사명을 검색해서 <span className="font-medium">corp_code</span>를
              찾고, OpenDART 재무 정보를 시각화합니다.
            </p>
          </div>

          <div className="mt-6">
            <label className="text-sm font-medium">회사명</label>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="예: 삼성전자"
              className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none ring-0 focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-zinc-600"
            />

            <div className="mt-3 flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
              {loading ? <span>검색 중...</span> : null}
              {error ? <span className="text-red-600">{error}</span> : null}
              {!loading && !error && trimmed && items.length === 0 ? (
                <span>검색 결과가 없습니다.</span>
              ) : null}
            </div>

            {items.length > 0 ? (
              <ul className="mt-4 divide-y divide-zinc-100 overflow-hidden rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
                {items.map((it) => (
                  <li key={it.corp_code} className="bg-white dark:bg-zinc-950">
                    <Link
                      href={`/corp/${it.corp_code}`}
                      className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">
                          {it.corp_name}
                        </div>
                        <div className="mt-0.5 flex flex-wrap gap-x-2 gap-y-1 text-xs text-zinc-600 dark:text-zinc-400">
                          <span className="font-mono">{it.corp_code}</span>
                          {it.stock_code ? (
                            <span className="font-mono">{it.stock_code}</span>
                          ) : null}
                          {it.corp_eng_name ? (
                            <span className="truncate">{it.corp_eng_name}</span>
                          ) : null}
                        </div>
                      </div>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        보기
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>

        <div className="mt-6 text-xs text-zinc-500 dark:text-zinc-400">
          서버에 <span className="font-mono">DATABASE_URL</span>이 설정되어 있어야
          검색이 동작합니다.
        </div>
      </main>
    </div>
  );
}
