const fs = require('fs');
const path = require('path');

const supportedLocales = ['ko', 'en', 'ja', 'zh-CN'];
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
  process.env.SEO_POSTINGS_API_URL ||
    process.env.REACT_APP_API_BASE_URL ||
    process.env.VITE_API_BASE_URL ||
    'https://api.bridgework.cloud/api/v1'
);
const sitemapPostingLimit = Number.parseInt(process.env.SEO_POSTING_SITEMAP_LIMIT || '100', 10);
const sitemapFetchTimeoutMs = Number.parseInt(process.env.SEO_POSTING_SITEMAP_TIMEOUT_MS || '5000', 10);
const today = new Date().toISOString().slice(0, 10);
const publicDir = path.join(process.cwd(), 'public');
const buildDir = path.join(process.cwd(), 'build');
const shouldBuildHtml = process.argv.includes('--build-html');

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const toText = (value, fallback = '확인 필요') => {
  const text = String(value ?? '').trim();
  return text || fallback;
};

const parseDateForStructuredData = (value) => {
  const raw = String(value ?? '').replace(/\D/g, '');
  return raw.length === 8 ? `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}` : undefined;
};

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

const toPostingId = (posting) => posting?.postingId ?? posting?.posting_id ?? posting?.id;

const toPostingRoute = (posting) => {
  const postingId = toPostingId(posting);
  return postingId ? `/jobs/${encodeURIComponent(String(postingId))}` : '';
};

async function fetchJson(url) {
  const controller = new AbortController();
  const timeoutMs = Number.isFinite(sitemapFetchTimeoutMs) && sitemapFetchTimeoutMs > 0 ? sitemapFetchTimeoutMs : 5000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: controller.signal
    });
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }
    return unwrapApiResult(await response.json());
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchPublicPostings() {
  if (typeof fetch !== 'function') {
    console.warn('Skipping job SEO entries because fetch is unavailable in this Node runtime.');
    return [];
  }

  const limit = Number.isFinite(sitemapPostingLimit) && sitemapPostingLimit > 0 ? sitemapPostingLimit : 100;
  const url = `${apiBaseUrl}/postings/public-index?limit=${encodeURIComponent(limit)}`;

  try {
    const postings = await fetchJson(url);
    if (!Array.isArray(postings)) {
      console.warn('Skipping job SEO entries because public-index response is not a list.');
      return [];
    }
    return postings;
  } catch (error) {
    console.warn(`Skipping job SEO entries because public-index fetch failed: ${error.message}`);
    return [];
  }
}

async function fetchPostingDetail(postingId) {
  try {
    return await fetchJson(`${apiBaseUrl}/postings/${encodeURIComponent(String(postingId))}`);
  } catch (error) {
    console.warn(`Skipping static job HTML for posting ${postingId}: ${error.message}`);
    return null;
  }
}

function toJobSeoData(detail) {
  const companyName = toText(detail?.companyName);
  const jobTitle = toText(detail?.jobTitle);
  const workAddress = toText(detail?.workAddress);
  const employmentType = toText(detail?.employmentType);
  const salaryText = [detail?.salaryType, detail?.salary].filter(Boolean).join(' ') || '확인 필요';
  const title = `${jobTitle} · ${companyName} | BridgeWork`;
  const description = `${companyName} ${jobTitle} 공고입니다. 근무지역 ${workAddress}, 고용형태 ${employmentType}, 임금 ${salaryText}.`;

  return {
    postingId: detail?.postingId,
    companyName,
    jobTitle,
    workAddress,
    employmentType,
    salaryText,
    termDate: detail?.termDate,
    registeredAt: detail?.offerRegisteredAt || detail?.registeredAt,
    requiredCareer: toText(detail?.requiredCareer),
    requiredEducation: toText(detail?.requiredEducation),
    title,
    description
  };
}

function buildJobStructuredData(job, canonicalUrl) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.jobTitle,
    description: job.description,
    url: canonicalUrl,
    hiringOrganization: {
      '@type': 'Organization',
      name: job.companyName
    },
    jobLocation: {
      '@type': 'Place',
      address: job.workAddress
    },
    employmentType: job.employmentType,
    datePosted: parseDateForStructuredData(job.registeredAt),
    validThrough: parseDateForStructuredData(job.termDate),
    directApply: false
  };

  Object.keys(structuredData).forEach((key) => {
    if (structuredData[key] === undefined || structuredData[key] === '') {
      delete structuredData[key];
    }
  });

  return structuredData;
}

function replaceOrInsertHeadTag(html, pattern, replacement) {
  return pattern.test(html) ? html.replace(pattern, replacement) : html.replace('</head>', `${replacement}\n</head>`);
}

function stripManagedAlternates(html) {
  return html.replace(/<link\b[^>]*rel=["']alternate["'][^>]*>/gi, '');
}

function renderJobHtml(indexHtml, job, route, locale) {
  const canonicalUrl = `${siteUrl}${localizePath(route, locale)}`;
  const imageUrl = `${siteUrl}/og-image.png`;
  const alternates = supportedLocales
    .map((supportedLocale) => `<link rel="alternate" hreflang="${supportedLocale}" href="${siteUrl}${localizePath(route, supportedLocale)}" />`)
    .join('\n    ');
  const structuredData = JSON.stringify(buildJobStructuredData(job, canonicalUrl)).replace(/</g, '\\u003c');
  const rootContent = `<main class="seo-static-page" aria-labelledby="seo-job-title">
      <article>
        <p>BridgeWork 공개 채용공고</p>
        <h1 id="seo-job-title">${escapeHtml(job.jobTitle)}</h1>
        <p>${escapeHtml(job.companyName)}</p>
        <dl>
          <dt>근무지역</dt><dd>${escapeHtml(job.workAddress)}</dd>
          <dt>고용형태</dt><dd>${escapeHtml(job.employmentType)}</dd>
          <dt>임금</dt><dd>${escapeHtml(job.salaryText)}</dd>
          <dt>요구경력</dt><dd>${escapeHtml(job.requiredCareer)}</dd>
          <dt>요구학력</dt><dd>${escapeHtml(job.requiredEducation)}</dd>
        </dl>
      </article>
    </main>`;

  let html = stripManagedAlternates(indexHtml);
  html = replaceOrInsertHeadTag(html, /<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(job.title)}</title>`);
  html = replaceOrInsertHeadTag(html, /<meta\s+name=["']description["'][^>]*>/i, `<meta name="description" content="${escapeHtml(job.description)}" />`);
  html = replaceOrInsertHeadTag(html, /<meta\s+name=["']robots["'][^>]*>/i, '<meta name="robots" content="index,follow" />');
  html = replaceOrInsertHeadTag(html, /<link\s+rel=["']canonical["'][^>]*>/i, `<link rel="canonical" href="${canonicalUrl}" />`);
  html = replaceOrInsertHeadTag(html, /<meta\s+property=["']og:type["'][^>]*>/i, '<meta property="og:type" content="article" />');
  html = replaceOrInsertHeadTag(html, /<meta\s+property=["']og:url["'][^>]*>/i, `<meta property="og:url" content="${canonicalUrl}" />`);
  html = replaceOrInsertHeadTag(html, /<meta\s+property=["']og:title["'][^>]*>/i, `<meta property="og:title" content="${escapeHtml(job.title)}" />`);
  html = replaceOrInsertHeadTag(html, /<meta\s+property=["']og:description["'][^>]*>/i, `<meta property="og:description" content="${escapeHtml(job.description)}" />`);
  html = replaceOrInsertHeadTag(html, /<meta\s+property=["']og:image["'][^>]*>/i, `<meta property="og:image" content="${imageUrl}" />`);
  html = replaceOrInsertHeadTag(html, /<meta\s+name=["']twitter:title["'][^>]*>/i, `<meta name="twitter:title" content="${escapeHtml(job.title)}" />`);
  html = replaceOrInsertHeadTag(html, /<meta\s+name=["']twitter:description["'][^>]*>/i, `<meta name="twitter:description" content="${escapeHtml(job.description)}" />`);
  html = replaceOrInsertHeadTag(html, /<meta\s+name=["']twitter:url["'][^>]*>/i, `<meta name="twitter:url" content="${canonicalUrl}" />`);
  html = html.replace('</head>', `    ${alternates}
    <link rel="alternate" hreflang="x-default" href="${siteUrl}${localizePath(route, defaultLocale)}" />
    <script type="application/ld+json">${structuredData}</script>
  </head>`);
  html = html.replace('<div id="root"></div>', `<div id="root">${rootContent}</div>`);
  html = html.replace('<html lang="ko">', `<html lang="${locale}">`);
  return html;
}

async function writeSeoFiles(publicPostings) {
  const jobDetailRoutes = Array.from(new Set(publicPostings.map(toPostingRoute).filter(Boolean)));
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
Disallow: /zh/login
Disallow: /zh/signup
Disallow: /zh/profile
Disallow: /zh/my/
Disallow: /zh/jobs
Disallow: /zh/accessibility-map
Disallow: /zh/settings
Disallow: /zh/auth/
Disallow: /zh/api

# Public detail and policy documents are safe to crawl.
Allow: /jobs/
${supportedLocales.map((locale) => `Allow: /${locale}/jobs/`).join('\n')}
Allow: /zh/jobs/
Allow: /settings/policies/
${supportedLocales.map((locale) => `Allow: /${locale}/settings/policies/`).join('\n')}
Allow: /zh/settings/policies/

Sitemap: ${siteUrl}/sitemap.xml
`;

  fs.mkdirSync(publicDir, { recursive: true });
  fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), sitemap);
  fs.writeFileSync(path.join(publicDir, 'robots.txt'), robots);
  console.log(`Generated SEO files for ${siteUrl} with ${jobDetailRoutes.length} public job detail routes.`);
}

async function writeStaticJobHtml(publicPostings) {
  const indexPath = path.join(buildDir, 'index.html');
  if (!shouldBuildHtml || !fs.existsSync(indexPath)) {
    return;
  }

  const indexHtml = fs.readFileSync(indexPath, 'utf8');
  let written = 0;

  for (const posting of publicPostings) {
    const postingId = toPostingId(posting);
    if (!postingId) {
      continue;
    }

    const detail = await fetchPostingDetail(postingId);
    if (!detail?.postingId) {
      continue;
    }

    const job = toJobSeoData(detail);
    const route = `/jobs/${encodeURIComponent(String(postingId))}`;
    for (const locale of supportedLocales) {
      const outputDir = path.join(buildDir, locale, 'jobs', String(postingId));
      fs.mkdirSync(outputDir, { recursive: true });
      fs.writeFileSync(path.join(outputDir, 'index.html'), renderJobHtml(indexHtml, job, route, locale));
      written += 1;
    }
  }

  console.log(`Generated ${written} static job detail HTML files.`);
}

async function main() {
  const publicPostings = await fetchPublicPostings();
  await writeSeoFiles(publicPostings);
  await writeStaticJobHtml(publicPostings);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
