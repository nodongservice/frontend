const fs = require('fs');
const path = require('path');

const supportedLocales = ['ko', 'en', 'ja', 'zh'];
const defaultLocale = 'ko';
const guideSlugs = [
  'accessibility-checklist-for-disabled-job-seekers',
  'wheelchair-accessible-commute-jobs',
  'why-accessibility-job-recommendation-matters',
  'map-based-job-search-for-mobility-impaired',
  'disabled-hiring-work-environment-checklist'
];
const configuredJobIds = String(process.env.REACT_APP_SITEMAP_JOB_IDS || process.env.SITEMAP_JOB_IDS || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);
const publicRoutes = [
  '/',
  '/about',
  '/faq',
  '/guides',
  ...guideSlugs.map((slug) => `/guides/${slug}`),
  ...configuredJobIds.map((id) => `/jobs/${encodeURIComponent(id)}`),
  '/terms',
  '/privacy'
];
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

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[
  ...publicRoutes.map((route) => toUrlEntry(route, route === '/' ? '1.0' : '0.7', route === '/' ? 'weekly' : 'monthly')),
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
Disallow: /accessibility-map
Disallow: /settings
Disallow: /auth/
Disallow: /api
${['/login', '/signup', '/profile', '/my/', '/accessibility-map', '/settings', '/auth/', '/api']
  .map(disallowLocalized)
  .join('\n')}

# Public policy documents live below /settings/policies and are safe to crawl.
Allow: /settings/policies/
${supportedLocales.map((locale) => `Allow: /${locale}/settings/policies/`).join('\n')}

Sitemap: ${siteUrl}/sitemap.xml
`;

fs.mkdirSync(publicDir, { recursive: true });
fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), sitemap);
fs.writeFileSync(path.join(publicDir, 'robots.txt'), robots);

console.log(`Generated SEO files for ${siteUrl}`);
