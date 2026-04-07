import fs from "node:fs";
import sax from "sax";
import { getServerEnv } from "@/lib/env";

export type CorpRecord = {
  corp_code: string;
  corp_name: string;
  corp_eng_name: string | null;
  stock_code: string | null;
  modify_date: string | null;
};

let cache: CorpRecord[] | null = null;
let loading: Promise<CorpRecord[]> | null = null;

function normalize(v: string | undefined | null) {
  const s = (v ?? "").trim();
  return s.length ? s : null;
}

async function loadFromXml(): Promise<CorpRecord[]> {
  const env = getServerEnv();
  const path = env.CORP_XML_PATH;
  if (!path) {
    throw new Error(
      "CORP_XML_PATH is not set. Add it to .env.local pointing to corp.xml.",
    );
  }
  if (!fs.existsSync(path)) {
    throw new Error(`corp.xml not found at CORP_XML_PATH: ${path}`);
  }

  const parser = sax.createStream(true, { trim: true });
  const list: CorpRecord[] = [];
  let currentTag: string | null = null;
  let current: Record<string, string> | null = null;

  parser.on("opentag", (node) => {
    currentTag = node.name;
    if (node.name === "list") current = {};
  });

  parser.on("text", (text) => {
    if (!current || !currentTag) return;
    current[currentTag] = (current[currentTag] ?? "") + text;
  });

  const done = new Promise<void>((resolve, reject) => {
    parser.on("closetag", (name) => {
      currentTag = null;
      if (name !== "list" || !current) return;

      const corp_code = normalize(current["corp_code"]);
      const corp_name = normalize(current["corp_name"]);
      if (corp_code && corp_name) {
        list.push({
          corp_code,
          corp_name,
          corp_eng_name: normalize(current["corp_eng_name"]),
          stock_code: normalize(current["stock_code"]),
          modify_date: normalize(current["modify_date"]),
        });
      }
      current = null;
    });

    parser.on("error", reject);
    parser.on("end", resolve);
  });

  fs.createReadStream(path, { encoding: "utf-8" }).pipe(parser);
  await done;

  // 이름 기준으로 정렬(한글/영문 섞여도 안정적 정렬)
  list.sort((a, b) => a.corp_name.localeCompare(b.corp_name));
  return list;
}

export async function getCorpIndex(): Promise<CorpRecord[]> {
  if (cache) return cache;
  if (!loading) {
    loading = loadFromXml().then((rows) => {
      cache = rows;
      return rows;
    });
  }
  return loading;
}

export async function searchCorps(query: string, limit: number): Promise<CorpRecord[]> {
  const list = await getCorpIndex();
  const q = query.trim();
  if (!q) return [];

  const lower = q.toLowerCase();

  const scored = list
    .map((c) => {
      const name = c.corp_name;
      const idx = name.indexOf(q);
      const lowerName = name.toLowerCase();
      const lowerIdx = lowerName.indexOf(lower);

      let score = 3;
      if (name === q) score = 0;
      else if (name.startsWith(q)) score = 1;
      else if (idx >= 0 || lowerIdx >= 0) score = 2;

      return { c, score };
    })
    .filter((x) => x.score < 3);

  scored.sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score;
    if (a.c.corp_name.length !== b.c.corp_name.length) {
      return a.c.corp_name.length - b.c.corp_name.length;
    }
    return a.c.corp_name.localeCompare(b.c.corp_name);
  });

  return scored.slice(0, limit).map((x) => x.c);
}

