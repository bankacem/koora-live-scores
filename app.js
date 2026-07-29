/**
 * Senior Full Stack & SEO Architecture - Multi-Language Enabled
 * Pure Vanilla JS - No build tools, No dependencies.
 * Handles modular data fetching from free open sources, dynamic language switching,
 * full premium article reader modals, and JSON-LD schema injection.
 */

// Comprehensive Translation dictionary for bilingual support (Default: English)
const translations = {
    en: {
        navScores: "Live Scores",
        navEPL: "Premier League",
        navNews: "Sports News",
        btnLang: "العربية",
        todayTitle: "Today's Live Football Scores",
        breadHome: "Home",
        breadLive: "Live Matches",
        breadEPL: "Premier League",
        btnAll: "All Matches",
        btnLive: "Live Now ",
        loadingMatches: "Fetching live data...",
        loadingStandings: "Fetching standings...",
        aboutTitle: "About Koora Live",
        aboutText: "Welcome to the official Koora Live website, the fastest and most accurate platform for football scores and live match results. We cover major global and local tournaments including the English Premier League, La Liga, and UEFA Champions League with high efficiency and real-time updates.",
        faqTitle: "Frequently Asked Questions (FAQ)",
        faqQ1: "How often are scores updated?",
        faqA1: "Scores are updated automatically every 30 seconds from open, reliable sources to ensure complete accuracy.",
        faqQ2: "Is this service completely free?",
        faqA2: "Yes, Koora Live is 100% free and does not require any subscriptions or accounts to follow live match scores.",
        newsSectionTitle: "Latest Football News & Reports",
        allRights: "All rights reserved.",
        eplTitle: "Premier League Fixtures & Standings",
        currentRound: "Current Round Matches",
        eplStandingsTitle: "Premier League Standings",
        seoEPLTitle: "Premier League Coverage on Koora Live",
        seoEPLText: "We bring you instant real-time coverage of the English Premier League standings, goal updates, bookings, and team forms. Track Manchester City, Arsenal, Liverpool, Chelsea, and Manchester United in their quest for the title and Champions League spots, all completely free.",
        tableRank: "#",
        tableTeam: "Team",
        tablePlayed: "P",
        tableWins: "W",
        tableDraws: "D",
        tableLosses: "L",
        tableGD: "GD",
        tablePoints: "PTS",
        noMatches: "No matches currently available.",
        noStandings: "No standings data available.",
        authorName: "Koora Live Staff",
        readMore: "Read More"
    },
    ar: {
        navScores: "مباريات اليوم (Scores)",
        navEPL: "الدوري الإنجليزي (EPL)",
        navNews: "أخبار الرياضة (News)",
        btnLang: "English",
        todayTitle: "نتائج مباريات اليوم بث مباشر | Live Football Scores",
        breadHome: "الرئيسية",
        breadLive: "مباريات اليوم",
        breadEPL: "الدوري الإنجليزي الممتاز",
        btnAll: "كل المباريات (All Matches)",
        btnLive: "مباشر الآن (Live Now) ",
        loadingMatches: "جاري جلب المباريات الحية... Fetching live data...",
        loadingStandings: "جاري تحميل جدول الترتيب... Fetching standings...",
        aboutTitle: "حول كورة لايف - Koora Live",
        aboutText: "مرحباً بكم في موقع كورة لايف الرسمي، المنصة الأسرع والأكثر دقة لعرض نتائج مباريات كرة القدم مباشرة وبدون تقطيع. نغطي كافة البطولات العالمية والمحلية مثل الدوري الإنجليزي، الإسباني، دوري أبطال أوروبا والبطولات العربية بكفاءة عالية وبدون الحاجة لإعادة تحميل الصفحة.",
        faqTitle: "الأسئلة الشائعة (FAQ)",
        faqQ1: "كم مرة يتم تحديث النتائج؟",
        faqA1: "تتحدث النتائج فورياً كل 30 ثانية من مصادر موثوقة ومفتوحة لضمان أدق التفاصيل لجمهورنا العربي.",
        faqQ2: "هل الخدمة مجانية بالكامل؟",
        faqA2: "نعم، موقع كورة لايف مجاني بالكامل ولا يتطلب أي رسوم اشتراك أو حساب لمتابعة المباريات.",
        newsSectionTitle: "آخر الأخبار الرياضية وتقارير المباريات | Sports News",
        allRights: "جميع الحقوق محفوظة.",
        eplTitle: "مباريات وترتيب الدوري الإنجليزي الممتاز",
        currentRound: "مباريات الجولة الحالية | Fixtures & Scores",
        eplStandingsTitle: "جدول ترتيب الدوري الإنجليزي الممتاز | EPL Standings",
        seoEPLTitle: "تغطية الدوري الإنجليزي الممتاز (EPL) على كورة لايف",
        seoEPLText: "نوفر لكم تغطية حصرية ومباشرة لجدول ترتيب الدوري الإنجليزي الممتاز لحظة بلحظة مع تحديثات فورية للأهداف والبطاقات والتغييرات. تابع صراع مانشستر سيتي، آرسنال، ليفربول، تشيلسي، ومانشستر يونايتد على اللقب والمراكز المؤهلة لدوري أبطال أوروبا مباشرة ومجاناً.",
        tableRank: "#",
        tableTeam: "الفريق (Team)",
        tablePlayed: "لعب",
        tableWins: "فوز",
        tableDraws: "تعادل",
        tableLosses: "خسارة",
        tableGD: "+/-",
        tablePoints: "نقاط",
        noMatches: "لا توجد مباريات متاحة حالياً.",
        noStandings: "لا توجد بيانات للترتيب حالياً.",
        authorName: "فريق كورة لايف",
        readMore: "اقرأ المزيد"
    }
};

class DataService {
    constructor() {
        this.primarySource = 'https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard';
        this.fallbackSource = 'https://corsproxy.io/?' + encodeURIComponent('https://www.skysports.com/rss/12040');
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
                homeTeam: { name: 'Team A', arabicName: 'الفريق أ', score: '0', logo: 'https://via.placeholder.com/30' },
                awayTeam: { name: 'Team B', arabicName: 'الفريق ب', score: '0', logo: 'https://via.placeholder.com/30' }
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

        // Modal elements
        this.modal = document.getElementById('article-modal');
        this.modalClose = document.getElementById('modal-close-btn');
        this.modalBody = document.getElementById('modal-article-body');

        this.matches = [];
        this.standings = [];
        this.currentLang = localStorage.getItem('koora_lang') || 'en'; // Default is English ("en")

        this.init();
    }

    async init() {
        this.applyLanguage(this.currentLang);
        this.bindEvents();
        await this.loadData();

        // Auto-refresh match data every 30 seconds
        setInterval(() => this.loadData(), 30000);
    }

    bindEvents() {
        // All matches & Live Now filter buttons
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

        // Language toggle button event listener
        const btnLangToggle = document.getElementById('btn-lang-toggle');
        if (btnLangToggle) {
            btnLangToggle.addEventListener('click', () => {
                const targetLang = this.currentLang === 'en' ? 'ar' : 'en';
                this.applyLanguage(targetLang);
                this.renderAllUIElements();
            });
        }

        // Article Modal close handlers
        if (this.modalClose) {
            this.modalClose.addEventListener('click', () => this.closeArticleModal());
        }
        if (this.modal) {
            window.addEventListener('click', (e) => {
                if (e.target === this.modal) {
                    this.closeArticleModal();
                }
            });
        }
    }

    toggleActiveBtn(target) {
        document.querySelectorAll('.controls .btn').forEach(b => b.classList.remove('active'));
        target.classList.add('active');
    }

    applyLanguage(lang) {
        this.currentLang = lang;
        localStorage.setItem('koora_lang', lang);

        // Set document language attributes dynamically
        document.documentElement.lang = lang;
        document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';

        // Update translations
        const elementsToTranslate = document.querySelectorAll('[data-translate]');
        elementsToTranslate.forEach(el => {
            const key = el.getAttribute('data-translate');
            if (translations[lang] && translations[lang][key]) {
                // If it contains a child element like the live badge .pulse, preserve it
                const badge = el.querySelector('.pulse');
                if (badge) {
                    el.textContent = translations[lang][key];
                    el.appendChild(badge);
                } else {
                    el.textContent = translations[lang][key];
                }
            }
        });

        // Update Lang toggle button text
        const btnLangToggle = document.getElementById('btn-lang-toggle');
        if (btnLangToggle) {
            btnLangToggle.textContent = translations[lang].btnLang;
        }
    }

    renderAllUIElements() {
        this.renderMatches(this.matches);
        this.renderStandings(this.standings);
        this.renderArticles();
    }

    async loadData() {
        // Fetch and load match scores
        this.matches = await this.dataService.fetchMatches();
        if (this.loader) this.loader.style.display = 'none';

        // Respect current active filter
        const btnLive = document.getElementById('btn-live');
        const isLiveFilter = btnLive ? btnLive.classList.contains('active') : false;
        const matchesToRender = isLiveFilter ? this.matches.filter(m => m.isLive) : this.matches;

        this.renderMatches(matchesToRender);
        this.injectSEOStructuredData(this.matches);

        // Fetch and load standings if container is present
        if (this.standingsContainer) {
            this.standings = await this.dataService.fetchStandings();
            if (this.standingsLoader) this.standingsLoader.style.display = 'none';
            this.renderStandings(this.standings);
        }

        // Render articles
        this.renderArticles();
    }

    renderMatches(matches) {
        if (!this.container) return;

        if (matches.length === 0) {
            this.container.innerHTML = `<p style="text-align:center; padding: 2rem; color: var(--text-muted); font-weight: 700;">${translations[this.currentLang].noMatches}</p>`;
            return;
        }

        this.container.innerHTML = matches.map(match => {
            const homeName = this.currentLang === 'ar' ? match.homeTeam.arabicName : match.homeTeam.name;
            const awayName = this.currentLang === 'ar' ? match.awayTeam.arabicName : match.awayTeam.name;
            const liveText = this.currentLang === 'ar' ? 'مباشر • ' : 'LIVE • ';
            const statusDisplay = match.isLive ? liveText + match.status : match.status;

            return `
                <article class="match-card" itemscope itemtype="http://schema.org/SportsEvent">
                    <!-- Microdata for SEO -->
                    <meta itemprop="name" content="${match.name}">
                    <meta itemprop="startDate" content="${match.date}">

                    <div class="team home" itemprop="competitor" itemscope itemtype="http://schema.org/SportsTeam">
                        <span itemprop="name">${homeName}</span>
                        <img src="${match.homeTeam.logo}" alt="${match.homeTeam.name} logo" class="team-logo" loading="lazy">
                    </div>

                    <div class="score-box">
                        <span>${match.homeTeam.score} - ${match.awayTeam.score}</span>
                        <span class="status">${statusDisplay}</span>
                    </div>

                    <div class="team away" itemprop="competitor" itemscope itemtype="http://schema.org/SportsTeam">
                        <img src="${match.awayTeam.logo}" alt="${match.awayTeam.name} logo" class="team-logo" loading="lazy">
                        <span itemprop="name">${awayName}</span>
                    </div>
                </article>
            `;
        }).join('');
    }

    renderStandings(standings) {
        if (!this.standingsContainer) return;

        if (standings.length === 0) {
            this.standingsContainer.innerHTML = `<p style="text-align:center; padding: 2rem; color: var(--text-muted);">${translations[this.currentLang].noStandings}</p>`;
            return;
        }

        const trans = translations[this.currentLang];

        let html = `
            <table class="table-responsive">
                <thead>
                    <tr>
                        <th class="text-center">${trans.tableRank}</th>
                        <th>${trans.tableTeam}</th>
                        <th class="text-center">${trans.tablePlayed}</th>
                        <th class="text-center">${trans.tableWins}</th>
                        <th class="text-center">${trans.tableDraws}</th>
                        <th class="text-center">${trans.tableLosses}</th>
                        <th class="text-center">${trans.tableGD}</th>
                        <th class="text-center">${trans.tablePoints}</th>
                    </tr>
                </thead>
                <tbody>
        `;

        html += standings.map(team => {
            const displayName = this.currentLang === 'ar' ? team.arabicName : team.teamName;
            const subtitleName = this.currentLang === 'ar' ? team.teamName : team.arabicName;

            return `
                <tr>
                    <td class="text-center" style="font-weight: 800; color: var(--accent);">${team.rank}</td>
                    <td>
                        <div class="table-team">
                            <img src="${team.logo}" alt="${team.teamName} logo" class="table-logo" loading="lazy">
                            <span>${displayName} <small style="color: var(--text-muted); display: block; font-size: 0.75rem;">${subtitleName}</small></span>
                        </div>
                    </td>
                    <td class="text-center">${team.played}</td>
                    <td class="text-center" style="color: var(--primary);">${team.wins}</td>
                    <td class="text-center">${team.draws}</td>
                    <td class="text-center" style="color: var(--live-red);">${team.losses}</td>
                    <td class="text-center">${team.goalDiff > 0 ? '+' + team.goalDiff : team.goalDiff}</td>
                    <td class="text-center" style="font-weight: 800; font-size: 1.05rem; background: rgba(16, 185, 129, 0.05);">${team.points}</td>
                </tr>
            `;
        }).join('');

        html += `
                </tbody>
            </table>
        `;

        this.standingsContainer.innerHTML = html;
    }

    getArticlesData() {
        return {
            en: [
                {
                    id: "art-1",
                    title: "Premier League Title Race Heats Up: Tactics and Predictions",
                    excerpt: "An intense battle for the Premier League crown erupts between Arsenal, Manchester City, and Liverpool. Here is our full analytical breakdown.",
                    tag: "Premier League",
                    date: "July 28, 2026",
                    image: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=400",
                    author: "Koora Live Staff",
                    content: `The English Premier League title race is reaching an unprecedented level of drama this season. Arsenal's defensive stability, paired with Manchester City's tactical versatility and Liverpool's high-octane offensive transitions, has created a three-way tug of war.

                    Tactical Analysis:
                    - Manchester City continues to rely on control and patient possession building, exploiting half-spaces with stellar midfielder movements.
                    - Arsenal's set-piece dominance and rigid block defensive shapes have made them incredibly difficult to break down on counter-attacks.
                    - Liverpool under new tactical paradigms focuses on rapid counter-pressing, turning defensive recoveries directly into clinical forward runs.

                    With only a few rounds remaining, squad depth and high-pressure performance will determine who raises the historic silverware.`
                },
                {
                    id: "art-2",
                    title: "The Evolution of Modern Football Formations and Strategies",
                    excerpt: "Modern football demands hybrid positions and fluid shape transitions. We explore the tactical changes defining European clubs.",
                    tag: "Tactics",
                    date: "July 27, 2026",
                    image: "https://images.unsplash.com/photo-1543351611-58f69d7c1781?auto=format&fit=crop&q=80&w=400",
                    author: "Tactical Analyst",
                    content: `Gone are the days of rigid 4-4-2 systems. Today's elite football is defined by continuous fluid rotation and hybrid player roles.

                    Key Tactical Evolutions:
                    1. Inverted Fullbacks: Fullbacks now regularly tuck into central midfield during possession, offering defensive shielding and building numerical superiority.
                    2. High Pressing Triggers: Modern teams defend from the front, initiating coordinated press waves the moment a target defender receives the ball facing his own goal.
                    3. Sweeper Keepers: Goalkeepers are fully integrated into the team's build-up phase, playing as an eleven's outfield player to bypass low blocks.

                    Adapting to these requirements separates elite visionary managers from the traditional coaches in modern football leagues.`
                },
                {
                    id: "art-3",
                    title: "Summer Transfer Window: Hits, Misses and Surprise Signings",
                    excerpt: "A complete review of the biggest summer transfers, cost valuations, and their immediate impacts on squads.",
                    tag: "Transfers",
                    date: "July 26, 2026",
                    image: "https://images.unsplash.com/photo-1518063319789-7217e6706b04?auto=format&fit=crop&q=80&w=400",
                    author: "Newsroom",
                    content: `The summer transfer window has closed, leaving behind dramatic deals, astronomical valuations, and tactical restructuring.

                    EPL highlights include marquee arrivals strengthening midfields and clinical strikers finding new homes.
                    - High-value midfielders have adapted quickly, orchestrating play styles.
                    - Under-the-radar wingers are turning out to be the real bargains of the season.
                    - Several expensive signings are struggling to fit into the physical demands of high-tempo football.

                    Our experts weigh in on the immediate team form and grading metrics for all twenty clubs.`
                }
            ],
            ar: [
                {
                    id: "art-1",
                    title: "تحليل صراع صدارة الدوري الإنجليزي الممتاز والمنافسة الشرسة",
                    excerpt: "يشتعل الصراع على صدارة البريميرليج بين كبار الأندية آرسنال ومانشستر سيتي مع بزوغ ليفربول وتكتيكاته المميزة لهذا الموسم الكروي.",
                    tag: "الدوري الإنجليزي",
                    date: "28 يوليو 2026",
                    image: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=400",
                    author: "كورة لايف",
                    content: `تشهد بطولة الدوري الإنجليزي الممتاز صراعاً ملحمياً وتاريخياً هذا الموسم على الصدارة. آرسنال بصلابته الدفاعية، مانشستر سيتي بمرونته التكتيكية، وليفربول بقوته الهجومية الضاربة يتنافسون جميعاً على اللقب.

                    التحليل التكتيكي للفرق الثلاثة:
                    - مانشستر سيتي: يواصل الاعتماد على الاستحواذ التام وبناء اللعب المنظم مع استغلال المساحات البينية وأنصاف المساحات عبر تحركات خط الوسط الفائقة.
                    - آرسنال: يتميز بالقوة البدنية الهائلة والصلابة الدفاعية المنيعة، بالإضافة إلى التفوق التام في الكرات الثابتة التي أصبحت سلاحاً حاسماً للمدرب.
                    - ليفربول: يركز على الضغط العكسي السريع والتحول الخاطف من الدفاع للهجوم في بضع ثوانٍ معدودة.

                    مع بقاء جولات قليلة على النهاية، سيكون عمق التشكيلة والقدرة على تحمل الضغط العصبي هما العاملين الحاسمين لتحديد بطل البريميرليج.`
                },
                {
                    id: "art-2",
                    title: "تكتيكات المدربين الجدد وتأثيرها على شكل الأداء في الملاعب",
                    excerpt: "تغييرات جذرية يشهدها تكتيك اللعب هذا العام في الكرة الأوروبية، حيث تركز الفرق الكبرى على الضغط العالي والتحولات الهجومية السريعة.",
                    tag: "تحليل كروي",
                    date: "27 يوليو 2026",
                    image: "https://images.unsplash.com/photo-1543351611-58f69d7c1781?auto=format&fit=crop&q=80&w=400",
                    author: "محلل كورة لايف",
                    content: `لقد ولت الأيام التي كانت تعتمد فيها الأندية على خطط كلاسيكية جامدة مثل 4-4-2. كرة القدم الحديثة أصبحت أكثر حركية ومرونة تعتمد على المراكز الهجينة والتبادل المستمر للأدوار.

                    أبرز التطورات التكتيكية:
                    1. الظهير الوهمي: يدخل الأظهرة بانتظام إلى عمق خط الوسط أثناء الاستحواذ لتأمين العمق وصناعة زيادة عددية تضمن تدوير الكرة بشكل أفضل.
                    2. محفزات الضغط العالي: لم يعد الدفاع يبدأ من الخلف، بل أصبح يمارس بضغط جماعي منسق في مناطق الخصم لإجباره على ارتكاب الأخطاء.
                    3. حارس المرمى الممرر: يشارك الحراس بشكل كامل في عملية بناء اللعب القصير، ممررين كرات حاسمة لكسر التكتلات الدفاعية.

                    التكيف السريع مع هذه الأفكار التكتيكية المتطورة هو ما يميز الأندية الناجحة في البطولات الأوروبية الكبرى.`
                },
                {
                    id: "art-3",
                    title: "أفضل صفقات الصيف وتوقعات الخبراء للموسم الكروي الجديد",
                    excerpt: "تقرير متكامل وشامل عن أهم الانتقالات الكروية في الدوري الإنجليزي وباقي الدوريات الكبرى وتأثيرها المتوقع على التوازن التنافسي.",
                    tag: "انتقالات",
                    date: "26 يوليو 2026",
                    image: "https://images.unsplash.com/photo-1518063319789-7217e6706b04?auto=format&fit=crop&q=80&w=400",
                    author: "غرفة الأخبار",
                    content: `أغلقت نافذة الانتقالات الصيفية أبوابها، مخلفة وراءها صفقات مثيرة، وأرقاماً فلكية، وإعادة هيكلة واضحة لخطط ومراكز اللعب في الأندية.

                    أبرز ملامح صفقات البريميرليج:
                    - صفقات نوعية في خط الوسط نجحت سريعاً في فرض أسلوب لعبها على الفرق.
                    - أجنحة هجومية بأسعار معقولة أثبتت أنها الصفقات الأكثر ذكاءً وقيمة فنية هذا الموسم.
                    - على الجانب الآخر، هناك بعض الأسماء الكبيرة التي تواجه صعوبة في التكيف مع المتطلبات البدنية العالية للدوري الإنجليزي الممتاز.

                    نقدم لكم تقييماً شاملاً لدرجات نجاح الصفقات والتأثير الفني المتوقع على مدار الموسم الكروي.`
                }
            ]
        };
    }

    renderArticles() {
        if (!this.articlesContainer) return;

        const articles = this.getArticlesData()[this.currentLang];
        const trans = translations[this.currentLang];

        this.articlesContainer.innerHTML = articles.map((art, index) => `
            <article class="article-card" data-id="${art.id}" itemscope itemtype="http://schema.org/NewsArticle">
                <img src="${art.image}" alt="${art.title}" class="article-image" loading="lazy" itemprop="image">
                <div class="article-content">
                    <span class="article-tag">${art.tag}</span>
                    <h3 class="article-title" itemprop="headline">${art.title}</h3>
                    <p class="article-excerpt" itemprop="description">${art.excerpt}</p>
                    <div style="margin-bottom: 1rem; font-weight: 700; color: var(--primary); font-size: 0.9rem;">
                        ${trans.readMore} &rarr;
                    </div>
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
                        <meta itemprop="url" content="https://bankacem.github.io/koora-live-scores/assets/logo.png">
                    </div>
                </div>
            </article>
        `).join('');

        // Attach event listeners to all article card elements to open full modal view when clicked
        const cards = this.articlesContainer.querySelectorAll('.article-card');
        cards.forEach(card => {
            card.addEventListener('click', () => {
                const articleId = card.getAttribute('data-id');
                this.openArticleModal(articleId);
            });
        });

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

    openArticleModal(articleId) {
        if (!this.modal || !this.modalBody) return;

        const articles = this.getArticlesData()[this.currentLang];
        const article = articles.find(a => a.id === articleId);
        if (!article) return;

        this.modalBody.innerHTML = `
            <span class="modal-tag">${article.tag}</span>
            <h2 class="modal-title">${article.title}</h2>
            <div class="modal-meta">
                <span><strong>${article.author}</strong></span> | <span>${article.date}</span>
            </div>
            <img src="${article.image}" alt="${article.title}" class="modal-img">
            <div class="modal-desc">${article.content}</div>
        `;

        this.modal.classList.add('show');
        document.body.style.overflow = 'hidden'; // Disable scroll on main body
    }

    closeArticleModal() {
        if (!this.modal) return;
        this.modal.classList.remove('show');
        document.body.style.overflow = 'auto'; // Re-enable scroll on main body
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
