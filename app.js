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
    }

    async fetchMatches() {
        try {
            // Attempt Primary Free Source
            const response = await fetch(this.primarySource);
            if (!response.ok) throw new Error('Primary source unavailable');
            const data = await response.json();
            return this.normalizePrimaryData(data);
        } catch (error) {
            console.warn('Primary source failed, attempting fallback RSS source...', error);
            return await this.fetchFallbackMatches();
        }
    }

    // Normalizes data layer so UI doesn't care about the source
    normalizePrimaryData(apiData) {
        if (!apiData.events) return [];

        return apiData.events.map(event => {
            const homeTeam = event.competitions[0].competitors.find(c => c.homeAway === 'home');
            const awayTeam = event.competitions[0].competitors.find(c => c.homeAway === 'away');
            const isLive = event.status.type.state === 'in';

            return {
                id: event.id,
                name: event.name,
                date: event.date,
                status: isLive ? event.status.displayClock : event.status.type.detail,
                isLive: isLive,
                homeTeam: {
                    name: homeTeam.team.name,
                    score: homeTeam.score,
                    logo: homeTeam.team.logo || 'https://via.placeholder.com/30?text=Home'
                },
                awayTeam: {
                    name: awayTeam.team.name,
                    score: awayTeam.score,
                    logo: awayTeam.team.logo || 'https://via.placeholder.com/30?text=Away'
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

            // Map news/rss items into a mock match format for demonstration
            return Array.from(items).slice(0, 5).map((item, index) => ({
                id: 'fb-' + index,
                name: item.querySelector('title').textContent,
                date: new Date().toISOString(),
                status: 'FT',
                isLive: false,
                homeTeam: { name: 'Team A', score: '0', logo: 'https://via.placeholder.com/30' },
                awayTeam: { name: 'Team B', score: '0', logo: 'https://via.placeholder.com/30' }
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
        this.matches = [];

        this.init();
    }

    async init() {
        this.bindEvents();
        await this.loadData();

        // Auto-refresh every 60 seconds (No API limits to worry about)
        setInterval(() => this.loadData(), 60000);
    }

    bindEvents() {
        document.getElementById('btn-all').addEventListener('click', (e) => {
            this.toggleActiveBtn(e.target);
            this.renderMatches(this.matches);
        });
        document.getElementById('btn-live').addEventListener('click', (e) => {
            this.toggleActiveBtn(e.target);
            const liveMatches = this.matches.filter(m => m.isLive);
            this.renderMatches(liveMatches);
        });
    }

    toggleActiveBtn(target) {
        document.querySelectorAll('.controls .btn').forEach(b => b.classList.remove('active'));
        target.classList.add('active');
    }

    async loadData() {
        this.matches = await this.dataService.fetchMatches();
        this.loader.style.display = 'none';

        // Respect current filter
        const isLiveFilter = document.getElementById('btn-live').classList.contains('active');
        const matchesToRender = isLiveFilter ? this.matches.filter(m => m.isLive) : this.matches;

        this.renderMatches(matchesToRender);
        this.injectSEOStructuredData(this.matches);
    }

    renderMatches(matches) {
        if (matches.length === 0) {
            this.container.innerHTML = '<p style="text-align:center; padding: 2rem;">No matches currently available.</p>';
            return;
        }

        this.container.innerHTML = matches.map(match => `
            <article class="match-card" itemscope itemtype="http://schema.org/SportsEvent">
                <!-- Microdata for SEO -->
                <meta itemprop="name" content="${match.name}">
                <meta itemprop="startDate" content="${match.date}">

                <div class="team home" itemprop="competitor" itemscope itemtype="http://schema.org/SportsTeam">
                    <span itemprop="name">${match.homeTeam.name}</span>
                    <img src="${match.homeTeam.logo}" alt="${match.homeTeam.name} logo" class="team-logo" loading="lazy">
                </div>

                <div class="score-box">
                    <span>${match.homeTeam.score} - ${match.awayTeam.score}</span>
                    <span class="status">${match.status}</span>
                </div>

                <div class="team away" itemprop="competitor" itemscope itemtype="http://schema.org/SportsTeam">
                    <img src="${match.awayTeam.logo}" alt="${match.awayTeam.name} logo" class="team-logo" loading="lazy">
                    <span itemprop="name">${match.awayTeam.name}</span>
                </div>
            </article>
        `).join('');
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
