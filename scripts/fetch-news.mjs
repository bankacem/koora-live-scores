/**
 * Fetches real football news via publicly published RSS feeds (this is
 * exactly what RSS is for: publisher-sanctioned syndication) and stores
 * ONLY: title, a short excerpt (as already truncated by the publisher),
 * a thumbnail, and a link back to the original article.
 *
 * We deliberately never store or display full article bodies — the
 * frontend always links out to the original source. This mirrors how
 * Google News / Feedly operate and keeps us clearly on the right side
 * of copyright law and Google's policies on scraped/duplicate content.
 */
import { writeFile, mkdir } from "node:fs/promises";

const OUT_DIR = "data/news";
const MAX_ITEMS = 12;
const EXCERPT_MAX_CHARS = 200;

// One feed per language. Add more languages by adding a key here.
// If a feed ever breaks, the script just writes an empty list for that
// language instead of failing the whole run.
const FEEDS = {
  en: { url: "https://feeds.bbci.co.uk/sport/football/rss.xml", source: "BBC Sport" },
  ar: {
    url: "https://www.aljazeera.net/aljazeerarss/a7c186be-1baa-4bd4-9d80-a84db769f779/73d0e1b4-532f-45ef-b135-bfdff8b8cab9",
    source: "الجزيرة نت",
    categoryFilter: "رياضة",
  },
  fr: { url: "https://www.footmercato.net/flux-rss", source: "Foot Mercato" },
  es: { url: "https://e00-marca.uecdn.es/rss/portada.xml", source: "Marca" },
};

function decodeEntities(str) {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;/g, "'");
}

function stripCdataAndTags(raw) {
  if (!raw) return "";
  let s = raw.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
  s = s.replace(/<[^>]+>/g, " "); // strip any embedded HTML tags
  s = decodeEntities(s).replace(/\s+/g, " ").trim();
  return s;
}

function extractTag(itemXml, tag) {
  const m = itemXml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  return m ? m[1] : "";
}

function extractImage(itemXml) {
  let m = itemXml.match(/<media:thumbnail[^>]*url="([^"]+)"/i);
  if (m) return m[1];
  m = itemXml.match(/<enclosure[^>]*url="([^"]+)"[^>]*type="image/i);
  if (m) return m[1];
  m = itemXml.match(/<media:content[^>]*url="([^"]+)"/i);
  if (m) return m[1];
  return null;
}

function parseRss(xml) {
  const items = [];
  const itemMatches = xml.match(/<item[\s\S]*?<\/item>/gi) || [];
  for (const raw of itemMatches) {
    const title = stripCdataAndTags(extractTag(raw, "title"));
    const link = stripCdataAndTags(extractTag(raw, "link"));
    const description = stripCdataAndTags(extractTag(raw, "description"));
    const pubDate = stripCdataAndTags(extractTag(raw, "pubDate"));
    const category = stripCdataAndTags(extractTag(raw, "category"));
    const image = extractImage(raw);
    if (title && link) items.push({ title, link, description, pubDate, category, image });
  }
  return items;
}

async function fetchFeed(lang, cfg) {
  try {
    const res = await fetch(cfg.url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; KooraLiveBot/1.0; +https://github.com)" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();
    let items = parseRss(xml);

    if (cfg.categoryFilter) {
      items = items.filter((i) => i.category.includes(cfg.categoryFilter));
    }

    items = items.slice(0, MAX_ITEMS).map((i) => ({
      title: i.title,
      excerpt: i.description.length > EXCERPT_MAX_CHARS ? i.description.slice(0, EXCERPT_MAX_CHARS).trim() + "…" : i.description,
      link: i.link,
      image: i.image,
      pubDate: i.pubDate,
      source: cfg.source,
    }));

    console.log(`[news:${lang}] ${items.length} items from ${cfg.source}`);
    return items;
  } catch (err) {
    console.warn(`[news:${lang}] fetch failed:`, err.message);
    return [];
  }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  for (const [lang, cfg] of Object.entries(FEEDS)) {
    const items = await fetchFeed(lang, cfg);
    await writeFile(`${OUT_DIR}/${lang}.json`, JSON.stringify({ updatedAt: new Date().toISOString(), items }, null, 0));
  }
}

main().catch((err) => {
  console.error("Fatal error in fetch-news.mjs:", err);
  process.exit(1);
});
