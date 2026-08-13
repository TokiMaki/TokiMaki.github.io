const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DB_PATH = path.join(ROOT, "Docs", "avatar_option_db.json");
const DEFAULT_COMBO_LIMIT = 4;
const MIN_ADOPTION_RATE = 10;

const GROUP_OVERRIDES = {
  "외전|다크나이트": "다크나이트",
  "외전|크리에이터": "크리에이터",
};

function getDfmaxPath(entry) {
  const key = `${entry.classGroup}|${entry.guideName}`;
  const group = GROUP_OVERRIDES[key] || entry.classGroup;
  const jobName = entry.guideName;
  return `/jobs/${encodeURIComponent(group)}/${encodeURIComponent(`眞 ${jobName}`)}/avatar`;
}

function stripTags(html) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function extractAdoptionRows(html, limit = DEFAULT_COMBO_LIMIT) {
  const heading = "상의 옵션 &amp; 플래티넘 엠블렘";
  const headingIndex = html.indexOf(heading);
  if (headingIndex < 0) {
    throw new Error("section not found");
  }

  const section = html.slice(headingIndex);
  const tbodyStart = section.indexOf("<tbody");
  const tbodyEnd = section.indexOf("</tbody>", tbodyStart);
  if (tbodyStart < 0 || tbodyEnd < 0) {
    throw new Error("table body not found");
  }

  const tbody = section.slice(tbodyStart, tbodyEnd);
  const rows = [...tbody.matchAll(/<tr data-slot="table-row"[\s\S]*?<\/tr>/g)]
    .map((match) => match[0])
    .map((row, index) => {
      const topMatch = row.match(/<p>([^<]+?)\s*스킬Lv\s*\+1<\/p>/);
      const platinumMatches = [...row.matchAll(/플래티넘 엠블렘\[([^\]]+)\]/g)]
        .map((match) => match[1].replace(/\]\([^)]+\)$/, "").trim())
        .filter(Boolean);
      const adoptionMatch = stripTags(row).match(/([0-9.]+)%/);

      if (!topMatch || !platinumMatches.length) {
        return null;
      }
      const platinumEmblems = platinumMatches.slice(0, 2);
      if (platinumEmblems.length === 1) {
        platinumEmblems.push(platinumEmblems[0]);
      }
      const adoptionRate = adoptionMatch ? Number(adoptionMatch[1]) : null;
      return {
        rank: index + 1,
        topOption: topMatch[1].trim(),
        platinumEmblems,
        adoptionRate,
      };
    })
    .filter(Boolean)
    .filter((row) => typeof row.adoptionRate === "number" && row.adoptionRate >= MIN_ADOPTION_RATE)
    .slice(0, limit);

  if (!rows.length) {
    throw new Error("adoption rows not found");
  }

  return rows;
}

function dedupeNames(values) {
  const result = [];
  const seen = new Set();
  for (const value of values) {
    const name = String(value || "").trim();
    const key = name.replace(/\s+/g, "").toLowerCase();
    if (!name || seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(name);
  }
  return result;
}

async function main() {
  const db = JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
  const failures = [];
  const updates = [];

  for (const entry of db.entries || []) {
    if (entry.source?.site === "manual") {
      updates.push(`${entry.classGroup} ${entry.guideName}: skipped manual entry`);
      continue;
    }
    const pathPart = getDfmaxPath(entry);
    const url = `https://dfmax.xyz${pathPart}`;
    try {
      const response = await fetch(url, {
        headers: {
          "user-agent": "Mozilla/5.0",
          "accept": "text/html",
        },
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const html = await response.text();
      const rows = extractAdoptionRows(html);
      const row = rows[0];
      entry.avatar.topOptions = [row.topOption];
      entry.avatar.platinumEmblems = [row.platinumEmblems[0]];
      entry.avatar.platinumCandidates = dedupeNames(rows.flatMap((candidate) => candidate.platinumEmblems || []));
      entry.avatar.candidateCombos = rows.map(({ adoptionRate, ...candidate }) => candidate);
      entry.source = {
        site: "dfmax.xyz",
        url,
      };
      delete entry.avatar.extractor;
      entry.avatar.needsReview = false;
      delete entry.review;
      updates.push(`${entry.classGroup} ${entry.guideName}: ${rows.length} combos, #1 ${row.topOption} / ${row.platinumEmblems.join(" + ")} (${row.adoptionRate ?? "?"}%)`);
    } catch (error) {
      failures.push(`${entry.classGroup} ${entry.guideName}: ${error.message}`);
    }
  }

  db.updatedAt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  db.sourcePolicy = "DFMAX 직업별 아바타 페이지의 '상의 옵션 & 플래티넘 엠블렘' 표에서 채택률 10% 이상 후보를 사용한다. avatar.candidateCombos에는 최대 4개 후보 조합을 보관하고, topOptions/platinumEmblems는 계산 fallback용 최상위 대표값을 보관한다.";
  db.errors = failures;
  fs.writeFileSync(DB_PATH, `${JSON.stringify(db, null, 2)}\n`, "utf8");

  console.log(updates.join("\n"));
  if (failures.length) {
    console.error("\nFailures:");
    console.error(failures.join("\n"));
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
