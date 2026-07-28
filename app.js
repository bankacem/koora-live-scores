/**
 * Senior Full Stack & SEO Architecture
 * Pure Vanilla JS - No build tools, No dependencies.
 * Handles modular data fetching from free open sources & injects JSON-LD schemas.
 */

class DataService {
    constructor() {
        // Source 1: ESPN Open Public API (Free, CORS-enabled, No API Key, highly reliable)
        this.primarySource = 'https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard';

        // Source 2: Public RSS Feed via free open CORS proxy (Fallback)
        this.fallbackSource = 'https://corsproxy.io/?' + encodeURIComponent('https://www.skysports.com/rss/12040');

        // Source 3: ESPN Standings API (Free, CORS-enabled, highly reliable)
        this.standingsSource = 'https://site.api.espn.com/apis/v2/sports/soccer/eng.1/standings';
    }

    async fetchMatches() {
        try {
            const response = await fetch(this.primarySource);
            if (!response.ok) throw new Error('Primary source unavailable');
            const data = await response.json();
            return this.normalizePrimaryData(data);
        } catch (error) {
            console.warn('Primary source failed, attempting fallback RSS source...', error);
            return await this.fetchFallbackMatches();
        }
    }

    async fetchStandings() {
        try {
            const response = await fetch(this.standingsSource);
            if (!response.ok) throw new Error('Standings source unavailable');
            const data = await response.json();
            return this.normalizeStandingsData(data);
        } catch (error) {
            console.error('Failed to fetch standings data:', error);
            return [];
        }
    }

    // Normalizes standings data
    normalizeStandingsData(standingsData) {
        if (!standingsData.children || standingsData.children.length === 0) return [];
        const standingsList = standingsData.children[0].standings;
        if (!standingsList || !standingsList.entries) return [];

        return standingsList.entries.map(entry => {
            const team = entry.team;
            const stats = entry.stats;

            const played = stats.find(s => s.name === 'gamesPlayed')?.value ?? 0;
            const wins = stats.find(s => s.name === 'wins')?.value ?? 0;
            const draws = stats.find(s => s.name === 'ties')?.value ?? 0;
            const losses = stats.find(s => s.name === 'losses')?.value ?? 0;
            const points = stats.find(s => s.name === 'points')?.value ?? 0;
            const goalDiff = stats.find(s => s.name === 'pointDifferential')?.value ?? 0;
            const rank = stats.find(s => s.name === 'rank')?.value ?? entry.note?.rank ?? '-';

            return {
                rank: rank,
                teamName: team.displayName,
                arabicName: this.getArabicTeamName(team.displayName),
                logo: team.logos && team.logos.length > 0 ? team.logos[0].href : 'https://via.placeholder.com/30?text=EPL',
                played: parseInt(played),
                wins: parseInt(wins),
                draws: parseInt(draws),
                losses: parseInt(losses),
                goalDiff: parseInt(goalDiff),
                points: parseInt(points)
            };
        });
    }

    getArabicTeamName(englishName) {
        const teamTranslations = {
            'Arsenal': 'آرسنال',
            'Chelsea': 'تشيلسي',
            'Liverpool': 'ليفربول',
            'Manchester City': 'مانشستر سيتي',
            'Manchester United': 'مانشستر يونايتد',
            'Tottenham Hotspur': 'توتنهام هوتسبير',
            'Aston Villa': 'أستون فيلا',
            'Newcastle United': 'نيوكاسل يونايتد',
            'West Ham United': 'وست هام يونايتد',
            'Brighton & Hove Albion': 'برايتون',
            'Wolverhampton Wanderers': 'وولفرهامبتون',
            'Bournemouth': 'بورنموث',
            'AFC Bournemouth': 'بورنموث',
            'Crystal Palace': 'كريستال بالاس',
            'Fulham': 'فولهام',
            'Everton': 'إيفرتون',
            'Brentford': 'برينتفورد',
            'Nottingham Forest': 'نوتينغهام فورست',
            'Luton Town': 'لوتون تاون',
            'Burnley': 'بيرنلي',
            'Sheffield United': 'شيفيلد يونايتد',
            'Leicester City': 'ليستر سيتي',
            'Ipswich Town': 'إيبسويتش تاون',
            'Southampton': 'ساوثهامبتون',
            'Sunderland': 'سندرلاند',
            'Coventry City': 'كوفنتري سيتي',
            'Leeds United': 'ليدز يونايتد',
            'Hull City': 'هال سيتي'
        };
        return teamTranslations[englishName] || englishName;
    }

    // Normalizes data layer so UI doesn't care about the source
    normalizePrimaryData(apiData) {
        if (!apiData.events) return [];

        return apiData.events.map(event => {
            const homeCompetitor = event.competitions[0].competitors.find(c => c.homeAway === 'home');
            const awayCompetitor = event.competitions[0].competitors.find(c => c.homeAway === 'away');
            const isLive = event.status.type.state === 'in';

            return {
                id: event.id,
                name: event.name,
                date: event.date,
                status: isLive ? event.status.displayClock : event.status.type.detail,
                isLive: isLive,
                homeTeam: {
                    name: homeCompetitor.team.name,
                    arabicName: this.getArabicTeamName(homeCompetitor.team.name),
                    score: homeCompetitor.score,
                    logo: homeCompetitor.team.logo || 'https://via.placeholder.com/30?text=Home'
                },
                awayTeam: {
                    name: awayCompetitor.team.name,
                    arabicName: this.getArabicTeamName(awayCompetitor.team.name),
                    score: awayCompetitor.score,
                    logo: awayCompetitor.team.logo || 'https://via.placeholder.com/30?text=Away'
                }
            };
        });
    }

    // Legal RSS Scraping via free Proxy
    async fetchFallbackMatches() {
        try {
            const response = await fetch(this.fallbackSource);
            const text = await response.text();
            const parser = new DOMParser();
            const xml = parser.parseFromString(text, 'text/xml');
            const items = xml.querySelectorAll('item');

            return Array.from(items).slice(0, 5).map((item, index) => ({
                id: 'fb-' + index,
                name: item.querySelector('title').textContent,
                date: new Date().toISOString(),
                status: 'FT',
                isLive: false,
                homeTeam: { name: 'الفريق أ', arabicName: 'الفريق أ', score: '0', logo: 'https://via.placeholder.com/30' },
                awayTeam: { name: 'الفريق ب', arabicName: 'الفريق ب', score: '0', logo: 'https://via.placeholder.com/30' }
            }));
        } catch (error) {
            console.error('All free data sources failed.', error);
            return [];
        }
    }
}

class LivescoreApp {
    constructor() {
        this.dataService = new DataService();
        this.container = document.getElementById('match-container');
        this.loader = document.getElementById('loading-state');
        this.standingsContainer = document.getElementById('standings-container');
        this.standingsLoader = document.getElementById('standings-loading');
        this.articlesContainer = document.getElementById('articles-container');
        this.matches = [];
        this.standings = [];

        this.init();
    }

    async init() {
        this.bindEvents();
        await this.loadData();

        // Auto-refresh match data every 30 seconds
        setInterval(() => this.loadData(), 30000);
    }

    bindEvents() {
        const btnAll = document.getElementById('btn-all');
        const btnLive = document.getElementById('btn-live');

        if (btnAll) {
            btnAll.addEventListener('click', (e) => {
                this.toggleActiveBtn(e.target);
                this.renderMatches(this.matches);
            });
        }
        if (btnLive) {
            btnLive.addEventListener('click', (e) => {
                this.toggleActiveBtn(e.target);
                const liveMatches = this.matches.filter(m => m.isLive);
                this.renderMatches(liveMatches);
            });
        }
    }

    toggleActiveBtn(target) {
        document.querySelectorAll('.controls .btn').forEach(b => b.classList.remove('active'));
        target.classList.add('active');
    }

    async loadData() {
        // Load matches
        this.matches = await this.dataService.fetchMatches();
        if (this.loader) this.loader.style.display = 'none';

        // Respect current filter
        const btnLive = document.getElementById('btn-live');
        const isLiveFilter = btnLive ? btnLive.classList.contains('active') : false;
        const matchesToRender = isLiveFilter ? this.matches.filter(m => m.isLive) : this.matches;

        this.renderMatches(matchesToRender);
        this.injectSEOStructuredData(this.matches);

        // Load standings if container is present
        if (this.standingsContainer) {
            this.standings = await this.dataService.fetchStandings();
            if (this.standingsLoader) this.standingsLoader.style.display = 'none';
            this.renderStandings(this.standings);
        }

        // Render articles if container is present
        if (this.articlesContainer) {
            this.renderArticles();
        }
    }

    renderMatches(matches) {
        if (!this.container) return;

        if (matches.length === 0) {
            this.container.innerHTML = '<p style="text-align:center; padding: 2rem; color: var(--text-muted); font-weight: 700;">لا توجد مباريات متاحة حالياً.</p>';
            return;
        }

        this.container.innerHTML = matches.map(match => `
            <article class="match-card" itemscope itemtype="http://schema.org/SportsEvent">
                <!-- Microdata for SEO -->
                <meta itemprop="name" content="${match.name}">
                <meta itemprop="startDate" content="${match.date}">

                <div class="team home" itemprop="competitor" itemscope itemtype="http://schema.org/SportsTeam">
                    <span itemprop="name">${match.homeTeam.arabicName}</span>
                    <img src="${match.homeTeam.logo}" alt="${match.homeTeam.name} logo" class="team-logo" loading="lazy">
                </div>

                <div class="score-box">
                    <span>${match.homeTeam.score} - ${match.awayTeam.score}</span>
                    <span class="status">${match.isLive ? 'مباشر • ' + match.status : match.status}</span>
                </div>

                <div class="team away" itemprop="competitor" itemscope itemtype="http://schema.org/SportsTeam">
                    <img src="${match.awayTeam.logo}" alt="${match.awayTeam.name} logo" class="team-logo" loading="lazy">
                    <span itemprop="name">${match.awayTeam.arabicName}</span>
                </div>
            </article>
        `).join('');
    }

    renderStandings(standings) {
        if (!this.standingsContainer) return;

        if (standings.length === 0) {
            this.standingsContainer.innerHTML = '<p style="text-align:center; padding: 2rem; color: var(--text-muted);">لا توجد بيانات للترتيب حالياً.</p>';
            return;
        }

        let html = `
            <table class="table-responsive">
                <thead>
                    <tr>
                        <th class="text-center">#</th>
                        <th>الفريق (Team)</th>
                        <th class="text-center">لعب</th>
                        <th class="text-center">فوز</th>
                        <th class="text-center">تعادل</th>
                        <th class="text-center">خسارة</th>
                        <th class="text-center">+/-</th>
                        <th class="text-center">نقاط</th>
                    </tr>
                </thead>
                <tbody>
        `;

        html += standings.map(team => `
            <tr>
                <td class="text-center" style="font-weight: 800; color: var(--accent);">${team.rank}</td>
                <td>
                    <div class="table-team">
                        <img src="${team.logo}" alt="${team.teamName} logo" class="table-logo" loading="lazy">
                        <span>${team.arabicName} <small style="color: var(--text-muted); display: block; font-size: 0.75rem;">${team.teamName}</small></span>
                    </div>
                </td>
                <td class="text-center">${team.played}</td>
                <td class="text-center" style="color: var(--primary);">${team.wins}</td>
                <td class="text-center">${team.draws}</td>
                <td class="text-center" style="color: var(--live-red);">${team.losses}</td>
                <td class="text-center">${team.goalDiff > 0 ? '+' + team.goalDiff : team.goalDiff}</td>
                <td class="text-center" style="font-weight: 800; font-size: 1.05rem; background: rgba(16, 185, 129, 0.05);">${team.points}</td>
            </tr>
        `).join('');

        html += `
                </tbody>
            </table>
        `;

        this.standingsContainer.innerHTML = html;
    }

    renderArticles() {
        if (!this.articlesContainer) return;

        const articles = [
            {
                title: "تحليل صراع صدارة الدوري الإنجليزي الممتاز والمنافسة الشرسة",
                excerpt: "يشتعل الصراع على صدارة البريميرليج بين كبار الأندية آرسنال ومانشستر سيتي مع بزوغ ليفربول وتكتيكاته المميزة لهذا الموسم الكروي.",
                tag: "الدوري الإنجليزي",
                date: "28 يوليو 2026",
                image: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=400",
                author: "كورة لايف"
            },
            {
                title: "تكتيكات المدربين الجدد وتأثيرها على شكل الأداء في الملاعب",
                excerpt: "تغييرات جذرية يشهدها تكتيك اللعب هذا العام في الكرة الأوروبية، حيث تركز الفرق الكبرى على الضغط العالي والتحولات الهجومية السريعة.",
                tag: "تحليل كروي",
                date: "27 يوليو 2026",
                image: "https://images.unsplash.com/photo-1543351611-58f69d7c1781?auto=format&fit=crop&q=80&w=400",
                author: "محلل كورة لايف"
            },
            {
                title: "أفضل صفقات الصيف وتوقعات الخبراء للموسم الكروي الجديد",
                excerpt: "تقرير متكامل وشامل عن أهم الانتقالات الكروية في الدوري الإنجليزي وباقي الدوريات الكبرى وتأثيرها المتوقع على التوازن التنافسي.",
                tag: "انتقالات",
                date: "26 يوليو 2026",
                image: "https://images.unsplash.com/photo-1518063319789-7217e6706b04?auto=format&fit=crop&q=80&w=400",
                author: "غرفة الأخبار"
            }
        ];

        this.articlesContainer.innerHTML = articles.map((art, index) => `
            <article class="article-card" itemscope itemtype="http://schema.org/NewsArticle">
                <img src="${art.image}" alt="${art.title}" class="article-image" loading="lazy" itemprop="image">
                <div class="article-content">
                    <span class="article-tag">${art.tag}</span>
                    <h3 class="article-title" itemprop="headline">${art.title}</h3>
                    <p class="article-excerpt" itemprop="description">${art.excerpt}</p>
                    <div class="article-meta">
                        <span itemprop="author" itemscope itemtype="http://schema.org/Person">
                            <span itemprop="name">${art.author}</span>
                        </span>
                        <span>${art.date}</span>
                    </div>
                </div>
                <!-- Microdata for SEO -->
                <meta itemprop="datePublished" content="2026-07-28">
                <meta itemprop="dateModified" content="2026-07-28">
                <div itemprop="publisher" itemscope itemtype="http://schema.org/Organization">
                    <meta itemprop="name" content="كورة لايف">
                    <div itemprop="logo" itemscope itemtype="http://schema.org/ImageObject">
                        <meta itemprop="url" content="https://bankacem.github.io/Koora-live./assets/logo.png">
                    </div>
                </div>
            </article>
        `).join('');

        // Inject schema for Articles dynamically as well
        document.querySelectorAll('script.dynamic-articles-jsonld').forEach(el => el.remove());
        const schema = {
            "@context": "https://schema.org",
            "@type": "ItemList",
            "itemListElement": articles.map((art, index) => ({
                "@type": "ListItem",
                "position": index + 1,
                "item": {
                    "@type": "NewsArticle",
                    "headline": art.title,
                    "image": art.image,
                    "datePublished": "2026-07-28",
                    "description": art.excerpt,
                    "author": {
                        "@type": "Person",
                        "name": art.author
                    }
                }
            }))
        };
        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.className = 'dynamic-articles-jsonld';
        script.text = JSON.stringify(schema);
        document.head.appendChild(script);
    }

    // Advanced SEO: Dynamically inject JSON-LD schema based on live data
    injectSEOStructuredData(matches) {
        // Remove old dynamic scripts
        document.querySelectorAll('script.dynamic-jsonld').forEach(el => el.remove());

        const schema = {
            "@context": "https://schema.org",
            "@type": "ItemList",
            "itemListElement": matches.slice(0, 10).map((match, index) => ({
                "@type": "ListItem",
                "position": index + 1,
                "item": {
                    "@type": "SportsEvent",
                    "name": match.name,
                    "startDate": match.date,
                    "competitor": [
                        { "@type": "SportsTeam", "name": match.homeTeam.name },
                        { "@type": "SportsTeam", "name": match.awayTeam.name }
                    ]
                }
            }))
        };

        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.className = 'dynamic-jsonld';
        script.text = JSON.stringify(schema);
        document.head.appendChild(script);
    }
}

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    new LivescoreApp();
});
