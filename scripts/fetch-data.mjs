/**
 * Runs inside GitHub Actions (Node 20+, native fetch available).
 * Pulls scores + standings for every league in leagues.config.mjs from
 * free, no-key sources, with a fallback chain per league, and writes
 * static JSON files under /data. The frontend NEVER calls these sources
 * directly — it only reads the JSON this script produces, served via
 * jsDelivr's CDN. This keeps the site limit-free for any number of visitors,
 * because only this single script (running on GitHub's servers) talks to
 * the upstream APIs.
 */
import { writeFile, mkdir } from "node:fs/promises";
import { LEAGUES } from "./leagues.config.mjs";

const OUT_DIR = "data";

async function fetchJson(url, timeoutMs = 8000) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { "User-Agent": "Mozilla/5.0 (compatible; KooraLiveBot/1.0)" } });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

function normalizeScoreboard(apiData) {
  if (!apiData?.events) return [];
  return apiData.events.map((event) => {
    const comp = event.competitions?.[0];
    const home = comp?.competitors?.find((c) => c.homeAway === "home");
    const away = comp?.competitors?.find((c) => c.homeAway === "away");
    const isLive = event.status?.type?.state === "in";
    return {
      id: event.id,
      name: event.name,
      shortName: event.shortName,
      date: event.date,
      status: isLive ? event.status.displayClock : event.status?.type?.detail,
      statusState: event.status?.type?.state, // pre | in | post
      isLive,
      venue: comp?.venue?.fullName ?? null,
      home: home && {
        name: home.team?.displayName,
        abbrev: home.team?.abbreviation,
        score: home.score ?? "0",
        logo: home.team?.logo ?? null,
        winner: !!home.winner,
      },
      away: away && {
        name: away.team?.displayName,
        abbrev: away.team?.abbreviation,
        score: away.score ?? "0",
        logo: away.team?.logo ?? null,
        winner: !!away.winner,
      },
    };
  });
}

function normalizeStandings(standingsData) {
  const entries = standingsData?.children?.[0]?.standings?.entries;
  if (!entries) return [];
  return entries.map((entry) => {
    const stat = (name) => entry.stats?.find((s) => s.name === name)?.value ?? 0;
    return {
      rank: stat("rank") || entry.note?.rank || "-",
      team: entry.team?.displayName,
      logo: entry.team?.logos?.[0]?.href ?? null,
      played: Math.round(stat("gamesPlayed")),
      wins: Math.round(stat("wins")),
      draws: Math.round(stat("ties")),
      losses: Math.round(stat("losses")),
      goalDiff: Math.round(stat("pointDifferential")),
      points: Math.round(stat("points")),
    };
  });
}

async function fetchLeague(league) {
  const base = `https://site.api.espn.com/apis/site/v2/sports/soccer/${league.slug}`;
  const result = { id: league.id, updatedAt: new Date().toISOString(), matches: [], standings: [] };

  try {
    const scoreboard = await fetchJson(`${base}/scoreboard`);
    result.matches = normalizeScoreboard(scoreboard);
  } catch (err) {
    console.warn(`[${league.id}] scoreboard fetch failed:`, err.message);
  }

  if (league.hasStandings) {
    try {
      const standingsUrl = `https://site.api.espn.com/apis/v2/sports/soccer/${league.slug}/standings`;
      const standings = await fetchJson(standingsUrl);
      result.standings = normalizeStandings(standings);
    } catch (err) {
      console.warn(`[${league.id}] standings fetch failed:`, err.message);
    }
  }

  return result;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const results = await Promise.all(LEAGUES.map(fetchLeague));

  // Per-league files (so the frontend only downloads what it needs)
  for (const r of results) {
    await mkdir(`${OUT_DIR}/${r.id}`, { recursive: true });
    await writeFile(`${OUT_DIR}/${r.id}/scores.json`, JSON.stringify({ updatedAt: r.updatedAt, matches: r.matches }, null, 0));
    if (r.standings.length) {
      await writeFile(`${OUT_DIR}/${r.id}/standings.json`, JSON.stringify({ updatedAt: r.updatedAt, standings: r.standings }, null, 0));
    }
  }

  // Aggregated "all leagues today" file for the homepage
  const today = new Date().toISOString().slice(0, 10);
  const combined = results.flatMap((r) =>
    r.matches
      .filter((m) => (m.date ?? "").startsWith(today) || m.isLive)
      .map((m) => ({ ...m, league: r.id }))
  );
  await writeFile(`${OUT_DIR}/all-today.json`, JSON.stringify({ updatedAt: new Date().toISOString(), matches: combined }, null, 0));

  console.log(`Wrote data for ${results.length} leagues, ${combined.length} matches today.`);
}

main().catch((err) => {
  console.error("Fatal error in fetch-data.mjs:", err);
  process.exit(1);
});
