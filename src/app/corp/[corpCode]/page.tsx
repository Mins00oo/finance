import Link from "next/link";
import { SingleAccountChart } from "@/components/SingleAccountChart";
import { AiAnalysisPanel } from "@/components/AiAnalysisPanel";

export default async function CorpPage({
  params,
}: {
  params: Promise<{ corpCode: string }>;
}) {
  const { corpCode } = await params;

  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 px-4 py-12 dark:bg-black">
      <main className="w-full max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/"
            className="text-sm text-zinc-700 underline underline-offset-4 dark:text-zinc-300"
          >
            ← 검색으로 돌아가기
          </Link>
          <div className="text-xs text-zinc-500 dark:text-zinc-400">
            corp_code: <span className="font-mono">{corpCode}</span>
          </div>
        </div>

        <SingleAccountChart corpCode={corpCode} years={5} />
        <AiAnalysisPanel corpCode={corpCode} years={5} />
      </main>
    </div>
  );
}

