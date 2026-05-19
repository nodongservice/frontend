const fs = require('fs');
const path = require('path');

const supportedLocales = ['ko', 'en', 'ja', 'zh'];
const defaultLocale = 'ko';
const publicRoutes = ['/', '/about', '/faq', '/terms', '/privacy'];
const policyRoutes = [
  '/settings/policies/terms',
  '/settings/policies/privacy-policy',
  '/settings/policies/privacy-consent',
  '/settings/policies/sensitive-consent',
  '/settings/policies/marketing-consent',
  '/settings/policies/withdrawal-retention',
  '/settings/policies/third-party',
  '/settings/policies/outsourcing',
  '/settings/policies/location',
  '/settings/policies/cookies',
  '/settings/policies/ai-limit',
  '/settings/policies/public-data-limit',
  '/settings/policies/policy-change'
];

const trimTrailingSlash = (value) => String(value || '').replace(/\/+$/, '');
const siteUrl = trimTrailingSlash(process.env.REACT_APP_SITE_URL || process.env.VITE_SITE_URL || 'https://www.bridgework.cloud');
const apiBaseUrl = trimTrailingSlash(
  process.env.SEO_POSTINGS_API_URL
  || process.env.REACT_APP_API_BASE_URL
  || process.env.VITE_API_BASE_URL
  || 'https://api.bridgework.cloud/api/v1'
);
const sitemapPostingLimit = Number.parseInt(process.env.SEO_POSTING_SITEMAP_LIMIT || '100', 10);
const sitemapFetchTimeoutMs = Number.parseInt(process.env.SEO_POSTING_SITEMAP_TIMEOUT_MS || '5000', 10);
const today = new Date().toISOString().slice(0, 10);
const publicDir = path.join(process.cwd(), 'public');

const localizePath = (route, locale = defaultLocale) => {
  const normalizedRoute = route === '/' ? '' : route;
  return `/${locale}${normalizedRoute}`;
};

const toUrlEntry = (route, priority, changefreq) =>
  supportedLocales
    .map((locale) => `  <url>
    <loc>${siteUrl}${localizePath(route, locale)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`)
    .join('\n');

const unwrapApiResult = (payload) => payload?.result || payload?.data || payload;

const toPostingRoute = (posting) => {
  const postingId = posting?.postingId ?? posting?.posting_id ?? posting?.id;
  return postingId ? `/jobs/${encodeURIComponent(String(postingId))}` : '';
};

async function fetchPublicPostingRoutes() {
  if (typeof fetch !== 'function') {
    console.warn('Skipping job sitemap entries because fetch is unavailable in this Node runtime.');
    return [];
  }

  const limit = Number.isFinite(sitemapPostingLimit) && sitemapPostingLimit > 0 ? sitemapPostingLimit : 100;
  const url = `${apiBaseUrl}/postings/public-index?limit=${encodeURIComponent(limit)}`;
  const controller = new AbortController();
  const timeoutMs = Number.isFinite(sitemapFetchTimeoutMs) && sitemapFetchTimeoutMs > 0 ? sitemapFetchTimeoutMs : 5000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: controller.signal
    });
    if (!response.ok) {
      console.warn(`Skipping job sitemap entries because ${url} returned ${response.status}.`);
      return [];
    }

    const payload = await response.json();
    const postings = unwrapApiResult(payload);
    if (!Array.isArray(postings)) {
      console.warn('Skipping job sitemap entries because public-index response is not a list.');
      return [];
    }

    return Array.from(new Set(postings.map(toPostingRoute).filter(Boolean)));
  } catch (error) {
    console.warn(`Skipping job sitemap entries because public-index fetch failed: ${error.message}`);
    return [];
  } finally {
    clearTimeout(timeoutId);
  }
}

async function main() {
  const jobDetailRoutes = await fetchPublicPostingRoutes();
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[
  ...publicRoutes.map((route) => toUrlEntry(route, route === '/' ? '1.0' : '0.7', route === '/' ? 'weekly' : 'monthly')),
  ...jobDetailRoutes.map((route) => toUrlEntry(route, '0.8', 'daily')),
  ...policyRoutes.map((route) => toUrlEntry(route, '0.4', 'monthly'))
].join('\n')}
</urlset>
`;

  const disallowLocalized = (route) => supportedLocales.map((locale) => `Disallow: /${locale}${route}`).join('\n');

  const robots = `User-agent: *
Allow: /

# Authenticated, session-specific, or API-like client routes should not be indexed.
Disallow: /login
Disallow: /signup
Disallow: /profile
Disallow: /my/
Disallow: /jobs
Disallow: /accessibility-map
Disallow: /settings
Disallow: /auth/
Disallow: /api
${['/login', '/signup', '/profile', '/my/', '/jobs', '/accessibility-map', '/settings', '/auth/', '/api']
  .map(disallowLocalized)
  .join('\n')}

# Public policy documents live below /settings/policies and are safe to crawl.
Allow: /jobs/
${supportedLocales.map((locale) => `Allow: /${locale}/jobs/`).join('\n')}
Allow: /settings/policies/
${supportedLocales.map((locale) => `Allow: /${locale}/settings/policies/`).join('\n')}

Sitemap: ${siteUrl}/sitemap.xml
`;

  fs.mkdirSync(publicDir, { recursive: true });
  fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), sitemap);
  fs.writeFileSync(path.join(publicDir, 'robots.txt'), robots);

  console.log(`Generated SEO files for ${siteUrl} with ${jobDetailRoutes.length} public job detail routes.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
