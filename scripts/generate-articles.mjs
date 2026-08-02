/**
 * Turns real RSS news items into short, original, professionally written
 * articles — grounded ONLY in the facts given (title/excerpt/source), with
 * mandatory attribution and a link back to the original report. Nothing is
 * invented: no fabricated stats, quotes, or details beyond the source facts.
 *
 * Runs automatically (no human approval step, per project decision), but
 * self-throttles naturally: it only generates an article for news items it
 * hasn't seen before (tracked via data/articles/{lang}/index.json), so
 * output volume follows real news volume instead of a forced quota.
 *
 * Requires: ANTHROPIC_API_KEY env var (set as a GitHub Actions secret).
 * Optional: SITE_DIR env var — if set, also writes static HTML pages there
 * (the Pages-served code branch) so each article is a real, indexable page.
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";

const NEWS_DIR = "data/news";
const ARTICLES_DIR = "data/articles";
const MAX_NEW_PER_LANG_PER_RUN = 3;

// api.bluesminds.com is an OpenAI-compatible multi-model gateway. Diagnostics
// showed it is inconsistent per-model (a model that works one run can fail
// the next — likely load-balanced across flaky upstream channels), so we
// never rely on a single model: we try each candidate in order and use the
// first one that actually responds. Update this list any time a fresh probe
// (.github/workflows/probe-models.yml) shows different working models.
const GATEWAY_BASE_URL = "https://api.bluesminds.com/v1/chat/completions";
const MODEL_FALLBACK_CHAIN = ["gpt-4o", "gpt-5-mini", "openai/gpt-oss-20b", "qwen2.5", "gpt-4o-mini"];
const API_KEY = process.env.ANTHROPIC_API_KEY; // secret name kept as-is; value is the gateway key
const SITE_DIR = process.env.SITE_DIR || null;

const LANGS = ["en", "ar", "fr", "es"];

const SITE_NAME = { en: "Koora Live", ar: "كورة لايف", fr: "Koora Live", es: "Koora Live" };
const BY_LABEL = { en: "By", ar: "بقلم", fr: "Par", es: "Por" };
const SOURCE_LABEL = { en: "Source", ar: "المصدر", fr: "Source", es: "Fuente" };
const FULL_STORY_LABEL = {
  en: "Read the full original report at",
  ar: "لقراءة التقرير الأصلي كاملاً من",
  fr: "Lire le rapport original complet sur",
  es: "Lee el informe original completo en",
};
const BACK_LABEL = { en: "← Back to home", ar: "← العودة للرئيسية", fr: "← Retour à l'accueil", es: "← Volver al inicio" };
const FAQ_LABEL = { en: "Frequently Asked Questions", ar: "الأسئلة الشائعة", fr: "Questions fréquentes", es: "Preguntas frecuentes" };
const TABLE_CAPTION_LABEL = { en: "Quick Facts", ar: "معلومات سريعة", fr: "En bref", es: "Datos rápidos" };
const RELATED_LABEL = { en: "Related:", ar: "ذات صلة:", fr: "À lire aussi :", es: "Relacionado:" };
const HOME_LINK_LABEL = {
  en: "Live football scores — all leagues",
  ar: "نتائج مباريات مباشرة — كل البطولات",
  fr: "Scores de football en direct — toutes les ligues",
  es: "Resultados de fútbol en vivo — todas las ligas",
};

// Best-effort keyword -> league mapping for internal linking. Not exhaustive;
// falls back to a generic homepage link when no keyword matches.
const LEAGUE_KEYWORDS = [
  { id: "epl", label: { en: "Premier League", ar: "الدوري الإنجليزي", fr: "Premier League", es: "Premier League" }, keywords: ["premier league", "arsenal", "manchester", "liverpool", "chelsea", "tottenham", "الإنجليزي", "آرسنال", "ليفربول"] },
  { id: "laliga", label: { en: "La Liga", ar: "الدوري الإسباني", fr: "Liga", es: "La Liga" }, keywords: ["la liga", "real madrid", "barcelona", "برشلونة", "ريال مدريد", "الإسباني"] },
  { id: "seriea", label: { en: "Serie A", ar: "الدوري الإيطالي", fr: "Serie A", es: "Serie A" }, keywords: ["serie a", "juventus", "milan", "napoli", "الإيطالي"] },
  { id: "bundes", label: { en: "Bundesliga", ar: "الدوري الألماني", fr: "Bundesliga", es: "Bundesliga" }, keywords: ["bundesliga", "bayern", "dortmund", "الألماني"] },
  { id: "ligue1", label: { en: "Ligue 1", ar: "الدوري الفرنسي", fr: "Ligue 1", es: "Ligue 1" }, keywords: ["ligue 1", "psg", "paris saint", "الفرنسي"] },
  { id: "ucl", label: { en: "Champions League", ar: "دوري أبطال أوروبا", fr: "Ligue des Champions", es: "Champions League" }, keywords: ["champions league", "uefa", "أبطال أوروبا"] },
  { id: "ksa", label: { en: "Saudi Pro League", ar: "الدوري السعودي", fr: "Saudi Pro League", es: "Liga Saudí" }, keywords: ["saudi", "al hilal", "al nassr", "النصر", "الهلال", "السعودي"] },
  { id: "egypt", label: { en: "Egyptian Premier League", ar: "الدوري المصري", fr: "Championnat d'Égypte", es: "Liga de Egipto" }, keywords: ["egypt", "al ahly", "zamalek", "الأهلي", "الزمالك", "المصري"] },
];

function guessRelatedLeague(text) {
  const lower = text.toLowerCase();
  for (const league of LEAGUE_KEYWORDS) {
    if (league.keywords.some((k) => lower.includes(k.toLowerCase()))) return league;
  }
  return null;
}

function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

async function readJsonSafe(path, fallback) {
  try {
    return JSON.parse(await readFile(path, "utf-8"));
  } catch {
    return fallback;
  }
}

async function callGateway(system, user) {
  let lastError;
  for (const model of MODEL_FALLBACK_CHAIN) {
    try {
      const res = await fetch(GATEWAY_BASE_URL, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          max_tokens: 2600,
        }),
        signal: AbortSignal.timeout(35000),
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`HTTP ${res.status}: ${body.slice(0, 200)}`);
      }

      const data = await res.json();
      const text = data.choices?.[0]?.message?.content;
      if (!text) throw new Error("Empty response content");

      console.log(`[gateway] succeeded with model: ${model}`);
      return text.trim();
    } catch (err) {
      console.warn(`[gateway] model "${model}" failed: ${err.message} — trying next fallback`);
      lastError = err;
    }
  }
  throw new Error(`All fallback models failed. Last error: ${lastError?.message}`);
}

function stripJsonFence(raw) {
  let s = raw.replace(/```(?:json)?/g, "").trim();
  const match = s.match(/\{[\s\S]*\}/);
  return match ? match[0] : s;
}

async function generateArticle(lang, newsItem) {
  const system =
    "You are a senior football journalist and SEO editor writing in-depth, original articles for a live-scores website. " +
    "CRITICAL GROUNDING RULES (never break these): " +
    "1) The ONLY facts you may state about THIS SPECIFIC news event are the ones given below (source name, headline, excerpt). Never invent new scores, transfer fees, quotes, dates, or statistics about this specific event. " +
    "2) You MAY add well-established general/background knowledge about the clubs, players, or competitions mentioned (e.g. founding year, stadium, competition format) as long as it is common, uncontroversial knowledge — not something you are guessing about this specific event. " +
    "3) Any opinion, prediction, or interpretation must be clearly framed as analysis/commentary (e.g. 'this suggests...', 'analysts might see this as...'), never stated as a confirmed fact. " +
    "4) Write in fully original wording — never copy phrases verbatim from the source excerpt. " +
    "5) Naturally attribute the source by name at least once. " +
    "6) Write entirely in the language code: " + lang + ". " +
    "7) Target LENGTH: the combined text of intro + all sections + conclusion must be substantial and comprehensive — aim for roughly 700-900 words (this is important for content quality, achieve it through legitimate background context and analysis, not repetition or padding). " +
    "8) The FAQ answers must also only use the given facts plus safe general knowledge — no invented specifics about this event. " +
    "9) Return ONLY valid JSON, no prose outside the JSON, no markdown fences, matching EXACTLY this schema:\n" +
    "{\n" +
    '  "title": "SEO-friendly headline, naturally includes a relevant keyword",\n' +
    '  "intro": "1-2 paragraph engaging introduction summarizing the news",\n' +
    '  "sections": [\n' +
    '    {"heading": "descriptive subheading", "text": "1-3 paragraphs"},\n' +
    '    {"heading": "descriptive subheading", "text": "1-3 paragraphs"}\n' +
    "  ],\n" +
    '  "table": {"caption": "short caption", "headers": ["col1","col2"], "rows": [["...","..."],["...","..."]]} OR null if no table makes sense,\n' +
    '  "analysis": "1-2 paragraphs of clearly-framed opinion/analysis/context",\n' +
    '  "faq": [ {"question": "...", "answer": "..."}, {"question": "...", "answer": "..."}, {"question": "...", "answer": "..."} ],\n' +
    '  "conclusion": "short closing paragraph"\n' +
    "}";

  const user =
    `Source name: ${newsItem.source}\n` +
    `Original headline: ${newsItem.title}\n` +
    `Original excerpt: ${newsItem.excerpt}\n\n` +
    "Write a comprehensive, well-structured, SEO-optimized article based strictly on these facts plus safe general football knowledge, following the JSON schema exactly.";

  const raw = await callGateway(system, user);
  const parsed = JSON.parse(stripJsonFence(raw));
  if (!parsed.title || !parsed.intro || !Array.isArray(parsed.sections)) {
    throw new Error("Model response missing required fields (title/intro/sections)");
  }
  parsed.faq = Array.isArray(parsed.faq) ? parsed.faq : [];
  parsed.table = parsed.table && parsed.table.headers && parsed.table.rows ? parsed.table : null;
  parsed.analysis = parsed.analysis || "";
  parsed.conclusion = parsed.conclusion || "";
  return parsed;
}

function escapeHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function paragraphsHtml(text) {
  return String(text)
    .split("\n\n")
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `      <p>${p}</p>`)
    .join("\n");
}

function tableHtml(table) {
  if (!table) return "";
  const head = table.headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("");
  const rows = table.rows
    .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`)
    .join("\n        ");
  return `
    <figure style="margin:1.5rem 0; overflow-x:auto;">
      ${table.caption ? `<figcaption style="font-weight:700; margin-bottom:0.5rem;">${escapeHtml(table.caption)}</figcaption>` : ""}
      <table class="table-responsive">
        <thead><tr>${head}</tr></thead>
        <tbody>
        ${rows}
        </tbody>
      </table>
    </figure>`;
}

function faqHtml(faq, lang) {
  if (!faq || faq.length === 0) return "";
  const items = faq
    .map(
      (qa) => `
      <div style="margin-bottom:1.25rem;">
        <h3 style="font-size:1.05rem; margin-bottom:0.4rem;">${escapeHtml(qa.question)}</h3>
        <p>${escapeHtml(qa.answer)}</p>
      </div>`
    )
    .join("\n");
  return `
    <section style="margin-top:2.5rem; padding-top:1.5rem; border-top:1px solid var(--border);">
      <h2 style="font-size:1.3rem; margin-bottom:1rem;">${FAQ_LABEL[lang]}</h2>
      ${items}
    </section>`;
}

function faqSchema(faq) {
  if (!faq || faq.length === 0) return "";
  const mainEntity = faq.map((qa) => ({
    "@type": "Question",
    name: qa.question,
    acceptedAnswer: { "@type": "Answer", text: qa.answer },
  }));
  return `<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity })}</script>`;
}

function renderHtml({ lang, dir, siteName, article, sourceName, sourceLink, publishedAt }) {
  const relatedLeague = guessRelatedLeague(`${article.title} ${article.intro}`);
  const sectionsHtml = article.sections
    .map(
      (s) => `
    <h2 style="font-size:1.3rem; margin-top:1.75rem; margin-bottom:0.75rem;">${escapeHtml(s.heading)}</h2>
${paragraphsHtml(s.text)}`
    )
    .join("\n");

  const metaDescription = article.intro.slice(0, 155).replace(/"/g, "'");

  return `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(article.title)} | ${siteName}</title>
<meta name="description" content="${metaDescription}">
<link rel="stylesheet" href="../../styles.css">
${faqSchema(article.faq)}
</head>
<body>
<header class="site-header">
  <div class="container header-container">
    <a href="../../" class="logo">⚽ ${siteName}</a>
  </div>
</header>
<main class="container" style="max-width:780px; padding-top:2rem; padding-bottom:3rem;">
  <article>
    <h1 style="font-size:1.9rem; margin-bottom:0.75rem; line-height:1.3;">${escapeHtml(article.title)}</h1>
    <p style="color:var(--text-muted); font-size:0.85rem; margin-bottom:1.5rem;">${publishedAt} · ${BY_LABEL[lang]} ${siteName}</p>

    <div style="line-height:1.9; font-size:1rem;">
${paragraphsHtml(article.intro)}
${sectionsHtml}
${tableHtml(article.table)}
      <h2 style="font-size:1.3rem; margin-top:1.75rem; margin-bottom:0.75rem;">${lang === "ar" ? "تحليل" : lang === "fr" ? "Analyse" : lang === "es" ? "Análisis" : "Analysis"}</h2>
${paragraphsHtml(article.analysis)}
${paragraphsHtml(article.conclusion)}
    </div>

    ${faqHtml(article.faq, lang)}

    <p style="margin-top:2rem; padding-top:1rem; border-top:1px solid var(--border); font-size:0.9rem; color:var(--text-muted);">
      ${SOURCE_LABEL[lang]}: ${sourceName} — ${FULL_STORY_LABEL[lang]}
      <a href="${sourceLink}" target="_blank" rel="noopener noreferrer nofollow" style="color:var(--primary);">${sourceName}</a>
    </p>

    <p style="margin-top:0.75rem; font-size:0.9rem;">
      ${RELATED_LABEL[lang]}
      ${relatedLeague
        ? `<a href="../../?league=${relatedLeague.id}" style="color:var(--primary);">${relatedLeague.label[lang]}</a>`
        : `<a href="../../" style="color:var(--primary);">${HOME_LINK_LABEL[lang]}</a>`}
    </p>
    <p style="margin-top:0.5rem;"><a href="../../" style="color:var(--primary);">${BACK_LABEL[lang]}</a></p>
  </article>
</main>
</body>
</html>`;
}

async function processLang(lang) {
  const news = await readJsonSafe(`${NEWS_DIR}/${lang}.json`, { items: [] });
  const indexPath = `${ARTICLES_DIR}/${lang}/index.json`;
  const index = await readJsonSafe(indexPath, []);
  const seenLinks = new Set(index.map((a) => a.newsLink));

  const candidates = (news.items || []).filter((n) => !seenLinks.has(n.link)).slice(0, MAX_NEW_PER_LANG_PER_RUN);

  if (candidates.length === 0) {
    console.log(`[articles:${lang}] no new news items — nothing to generate`);
    return;
  }

  await mkdir(`${ARTICLES_DIR}/${lang}`, { recursive: true });
  if (SITE_DIR) await mkdir(`${SITE_DIR}/articles/${lang}`, { recursive: true });

  for (const item of candidates) {
    try {
      const generated = await generateArticle(lang, item);
      const slug = slugify(generated.title) || slugify(item.title) || `article-${Date.now()}`;
      const publishedAt = new Date().toISOString();

      const totalChars =
        generated.intro.length +
        generated.sections.reduce((sum, s) => sum + s.heading.length + s.text.length, 0) +
        (generated.analysis || "").length +
        (generated.conclusion || "").length +
        (generated.faq || []).reduce((sum, qa) => sum + qa.question.length + qa.answer.length, 0);

      if (totalChars < 1400) {
        console.warn(`[articles:${lang}] "${generated.title}" is short (${totalChars} chars) — publishing anyway, but consider reviewing the prompt/model.`);
      }

      const record = {
        slug,
        title: generated.title,
        excerpt: generated.intro.slice(0, 180),
        intro: generated.intro,
        sections: generated.sections,
        table: generated.table,
        analysis: generated.analysis,
        faq: generated.faq,
        conclusion: generated.conclusion,
        charCount: totalChars,
        sourceName: item.source,
        sourceLink: item.link,
        newsLink: item.link,
        publishedAt,
      };

      await writeFile(`${ARTICLES_DIR}/${lang}/${slug}.json`, JSON.stringify(record, null, 0));
      index.unshift({
        slug,
        title: record.title,
        excerpt: record.excerpt,
        sourceName: record.sourceName,
        sourceLink: record.sourceLink,
        newsLink: record.newsLink,
        publishedAt: record.publishedAt,
      });

      if (SITE_DIR) {
        const html = renderHtml({
          lang,
          dir: lang === "ar" ? "rtl" : "ltr",
          siteName: SITE_NAME[lang],
          article: generated,
          sourceName: item.source,
          sourceLink: item.link,
          publishedAt: new Date(publishedAt).toLocaleDateString(lang),
        });
        await writeFile(`${SITE_DIR}/articles/${lang}/${slug}.html`, html);
      }

      console.log(`[articles:${lang}] generated (${totalChars} chars): ${generated.title}`);
    } catch (err) {
      console.warn(`[articles:${lang}] failed for "${item.title}":`, err.message);
    }
  }

  // Keep index sorted newest-first, cap stored history for file size
  index.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  await writeFile(indexPath, JSON.stringify(index.slice(0, 200), null, 0));
}

async function rebuildSitemap() {
  if (!SITE_DIR || !existsSync(SITE_DIR)) return;

  const base = "https://bankacem.github.io/koora-live-scores";
  const leagues = ["epl", "laliga", "seriea", "bundes", "ligue1", "ucl", "ksa", "egypt"];
  const urls = [
    `  <url><loc>${base}/</loc><changefreq>always</changefreq><priority>1.0</priority></url>`,
    ...leagues.map((l) => `  <url><loc>${base}/?league=${l}</loc><changefreq>hourly</changefreq><priority>0.8</priority></url>`),
  ];

  for (const lang of LANGS) {
    const index = await readJsonSafe(`${ARTICLES_DIR}/${lang}/index.json`, []);
    for (const art of index) {
      urls.push(`  <url><loc>${base}/articles/${lang}/${art.slug}.html</loc><changefreq>daily</changefreq><priority>0.6</priority></url>`);
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
  await writeFile(`${SITE_DIR}/sitemap.xml`, xml);
  console.log(`[sitemap] regenerated with ${urls.length} URLs`);
}

async function main() {
  if (!API_KEY) {
    console.error("ANTHROPIC_API_KEY is not set — skipping article generation.");
    process.exit(0); // don't fail the whole workflow if the key isn't configured yet
  }

  await mkdir(ARTICLES_DIR, { recursive: true });
  for (const lang of LANGS) {
    await processLang(lang);
  }
  await rebuildSitemap();
}

main().catch((err) => {
  console.error("Fatal error in generate-articles.mjs:", err);
  process.exit(1);
});
