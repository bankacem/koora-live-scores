/**
 * Central configuration for all covered competitions.
 * `slug` maps to ESPN's internal soccer league codes (unofficial, no key required).
 * Add a new competition by adding one object here — both the data-fetcher
 * and the frontend read from this single source of truth (frontend has a
 * mirrored copy in assets/leagues.js, keep them in sync).
 */
export const LEAGUES = [
  { id: "epl",   slug: "eng.1",          nameEn: "Premier League",      nameAr: "الدوري الإنجليزي الممتاز", country: "gb",  hasStandings: true },
  { id: "laliga",slug: "esp.1",          nameEn: "La Liga",             nameAr: "الدوري الإسباني",          country: "es",  hasStandings: true },
  { id: "seriea",slug: "ita.1",          nameEn: "Serie A",             nameAr: "الدوري الإيطالي",           country: "it",  hasStandings: true },
  { id: "bundes",slug: "ger.1",          nameEn: "Bundesliga",          nameAr: "الدوري الألماني",           country: "de",  hasStandings: true },
  { id: "ligue1",slug: "fra.1",          nameEn: "Ligue 1",             nameAr: "الدوري الفرنسي",            country: "fr",  hasStandings: true },
  { id: "ucl",   slug: "uefa.champions", nameEn: "Champions League",    nameAr: "دوري أبطال أوروبا",         country: "eu",  hasStandings: false },
  { id: "uel",   slug: "uefa.europa",    nameEn: "Europa League",       nameAr: "الدوري الأوروبي",           country: "eu",  hasStandings: false },
  { id: "ksa",   slug: "ksa.1",          nameEn: "Saudi Pro League",    nameAr: "الدوري السعودي للمحترفين",   country: "sa",  hasStandings: true },
  { id: "egypt", slug: "egy.1",          nameEn: "Egyptian Premier League", nameAr: "الدوري المصري الممتاز", country: "eg",  hasStandings: true },
  { id: "wc",    slug: "fifa.world",     nameEn: "FIFA World Cup",      nameAr: "كأس العالم",                country: "un",  hasStandings: false },
];
