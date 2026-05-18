import { POLICY_DOCUMENT_MAP } from './policyDocuments';
import { ROUTE_PATHS } from './routes';
import { SERVICE_FAQ_ITEMS } from './seoContent';
import { getGuideBySlug } from './guideContent';
import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALE_CODES,
  buildLocalizedPath,
  getLocaleFromPathname,
  isSupportedLocale,
  stripLocaleFromPathname
} from '../i18n/locales';

const trimTrailingSlash = (value) => String(value || '').replace(/\/+$/, '');
const configuredSiteUrl = trimTrailingSlash(process.env.REACT_APP_SITE_URL);
export const SITE_URL = configuredSiteUrl || 'https://www.bridgework.cloud';
export const DEFAULT_OG_IMAGE_PATH = '/og-image.png';
export const SITE_NAME = 'BridgeWork';

const DEFAULT_DESCRIPTION =
  'BridgeWork는 장애인 구직자가 이동 접근성, 근무환경, 장애 지원 정보를 바탕으로 적합한 일자리를 지도에서 찾을 수 있도록 돕는 서비스입니다.';

export const DEFAULT_PAGE_METADATA = Object.freeze({
  title: 'BridgeWork | 장애인 구직자를 위한 접근성 기반 일자리 추천',
  description: DEFAULT_DESCRIPTION,
  path: ROUTE_PATHS.root,
  imagePath: DEFAULT_OG_IMAGE_PATH,
  type: 'website',
  robots: 'index,follow'
});

const PAGE_METADATA = Object.freeze({
  [ROUTE_PATHS.root]: {
    title: 'BridgeWork | 장애인 구직자를 위한 접근성 기반 일자리 추천',
    description:
      'BridgeWork는 장애인 구직자가 이동 접근성, 근무환경, 장애 지원 정보를 바탕으로 적합한 일자리를 지도에서 찾을 수 있도록 돕는 서비스입니다.',
    structuredData: getWebSiteStructuredData
  },
  [ROUTE_PATHS.about]: {
    title: '서비스 소개 | BridgeWork',
    description:
      'BridgeWork가 장애인 구직자의 추천 이유, 접근성 정보, 데이터 부족 상황을 어떻게 안전하게 안내하는지 확인하세요.',
    structuredData: getOrganizationStructuredData
  },
  [ROUTE_PATHS.faq]: {
    title: '자주 묻는 질문 | BridgeWork',
    description:
      'BridgeWork의 맞춤 일자리 추천, 접근성 점수, 개인정보 입력, 채용 공고 색인 정책에 대한 답변을 확인하세요.',
    structuredData: getFaqStructuredData
  },
  [ROUTE_PATHS.guides]: {
    title: '장애인 일자리 접근성 가이드 | BridgeWork',
    description:
      '장애인 구직, 휠체어 접근성 일자리, 교통약자 일자리, 지도 기반 일자리 추천을 위한 BridgeWork 정보성 가이드를 확인하세요.',
    structuredData: getGuideCollectionStructuredData
  },
  [ROUTE_PATHS.jobDetail]: {
    title: '장애인 채용 공고 상세 | BridgeWork',
    description:
      '직무명, 회사명, 지역, 장애인 채용 여부, 휠체어 접근성, 대중교통, 엘리베이터/리프트, 근무환경 접근성 요약을 확인하세요.'
  },
  [ROUTE_PATHS.accessibilityMap]: {
    title: '지역 접근성 지도 | BridgeWork',
    description: '관심 공고 주변의 이동 경로, 접근성 점수, 확인이 필요한 요소를 지도와 목록으로 함께 확인하세요.',
    robots: 'noindex,nofollow'
  },
  [ROUTE_PATHS.jobs]: {
    title: '스크랩한 공고 | BridgeWork',
    description: '로그인 후 저장한 공고를 접근성 점수, 추천 이유, 마감 상태 기준으로 다시 비교하세요.',
    robots: 'noindex,nofollow'
  },
  [ROUTE_PATHS.signup]: {
    title: '회원가입 | BridgeWork',
    description: 'BridgeWork 가입 후 직무 선호도, 근무 조건, 접근성 정보를 반영한 맞춤 일자리 추천을 시작하세요.',
    robots: 'noindex,nofollow'
  },
  [ROUTE_PATHS.profile]: {
    title: '내 프로필 | BridgeWork',
    description: '희망 직무, 경력, 근무 조건, 접근성 관련 선택 정보를 관리하고 추천 기준을 업데이트하세요.',
    robots: 'noindex,nofollow'
  },
  [ROUTE_PATHS.myProfile]: {
    title: '내 프로필 | BridgeWork',
    description: '희망 직무, 경력, 근무 조건, 접근성 관련 선택 정보를 관리하고 추천 기준을 업데이트하세요.',
    robots: 'noindex,nofollow'
  },
  [ROUTE_PATHS.settings]: {
    title: '환경설정 | BridgeWork',
    description: '계정 정보, 접근성 환경, 알림, 약관 및 개인정보 설정을 한곳에서 확인하고 관리하세요.',
    robots: 'noindex,nofollow'
  },
  [ROUTE_PATHS.terms]: {
    title: '서비스 이용약관 | BridgeWork',
    description: POLICY_DOCUMENT_MAP.terms.summary
  },
  [ROUTE_PATHS.privacy]: {
    title: '개인정보 처리방침 | BridgeWork',
    description: POLICY_DOCUMENT_MAP['privacy-policy'].summary
  }
});

const NOT_FOUND_METADATA = Object.freeze({
  title: '페이지를 찾을 수 없습니다 | BridgeWork',
  description: '요청하신 페이지를 찾을 수 없습니다. BridgeWork의 일자리 추천과 접근성 정보는 홈에서 다시 확인할 수 있습니다.',
  robots: 'noindex,nofollow'
});

function getOrganizationStructuredData() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: buildAbsoluteUrl(ROUTE_PATHS.root),
    logo: buildAbsoluteUrl('/logo.png'),
    description: DEFAULT_DESCRIPTION
  };
}

function getWebSiteStructuredData() {
  return [
    getOrganizationStructuredData(),
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: SITE_NAME,
      url: buildAbsoluteUrl(ROUTE_PATHS.root),
      inLanguage: 'ko-KR',
      description: DEFAULT_DESCRIPTION
    }
  ];
}

function getFaqStructuredData() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: SERVICE_FAQ_ITEMS.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer
      }
    }))
  };
}

function getGuideCollectionStructuredData() {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: '장애인 일자리 접근성 가이드',
    description: '접근성 기반 장애인 일자리 추천과 지도 기반 일자리 검색을 돕는 정보성 가이드입니다.',
    url: buildAbsoluteUrl(ROUTE_PATHS.guides)
  };
}

function normalizePathname(pathname) {
  const normalized = String(pathname || ROUTE_PATHS.root).split('?')[0].split('#')[0] || ROUTE_PATHS.root;
  return normalized.endsWith('/') && normalized !== ROUTE_PATHS.root ? normalized.slice(0, -1) : normalized;
}

function getPolicyMetadata(pathname) {
  const prefix = '/settings/policies/';

  if (!pathname.startsWith(prefix)) {
    return null;
  }

  let policyId = pathname.slice(prefix.length);

  try {
    policyId = decodeURIComponent(policyId);
  } catch {
    return null;
  }

  const policy = POLICY_DOCUMENT_MAP[policyId];

  if (!policy) {
    return null;
  }

  return {
    title: `${policy.title} | BridgeWork`,
    description: policy.summary
  };
}

function getGuideMetadata(pathname) {
  const prefix = '/guides/';

  if (!pathname.startsWith(prefix)) {
    return null;
  }

  const guide = getGuideBySlug(pathname.slice(prefix.length));

  if (!guide) {
    return null;
  }

  return {
    title: `${guide.title} | BridgeWork`,
    description: guide.description,
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: guide.title,
      description: guide.description,
      author: {
        '@type': 'Organization',
        name: SITE_NAME
      },
      publisher: {
        '@type': 'Organization',
        name: SITE_NAME,
        logo: {
          '@type': 'ImageObject',
          url: buildAbsoluteUrl('/logo.png')
        }
      },
      mainEntityOfPage: buildAbsoluteUrl(`${ROUTE_PATHS.guides}/${guide.slug}`)
    }
  };
}

function getJobDetailMetadata(pathname) {
  if (!/^\/jobs\/[^/]+$/.test(pathname)) {
    return null;
  }

  return PAGE_METADATA[ROUTE_PATHS.jobDetail];
}

export function getPageMetadata(pathname) {
  const normalizedPathname = normalizePathname(pathname);
  const routeMetadata = PAGE_METADATA[normalizedPathname] || getPolicyMetadata(normalizedPathname) || getGuideMetadata(normalizedPathname) || getJobDetailMetadata(normalizedPathname) || NOT_FOUND_METADATA;

  return {
    ...DEFAULT_PAGE_METADATA,
    ...routeMetadata,
    path: normalizedPathname
  };
}

export function buildAbsoluteUrl(path = ROUTE_PATHS.root) {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${SITE_URL}${normalizedPath}`;
}

export function buildCanonicalPath(pathname = ROUTE_PATHS.root) {
  const normalizedPathname = normalizePathname(pathname);
  const locale = getLocaleFromPathname(normalizedPathname);
  const hasLocalePrefix = isSupportedLocale(String(normalizedPathname).split('/')[1]);
  const pathWithoutLocale = stripLocaleFromPathname(normalizedPathname);

  return buildLocalizedPath(pathWithoutLocale, hasLocalePrefix ? locale : DEFAULT_LOCALE);
}

export function buildCanonicalUrl(pathname = ROUTE_PATHS.root) {
  return buildAbsoluteUrl(buildCanonicalPath(pathname));
}

export function buildAlternateUrls(pathname = ROUTE_PATHS.root) {
  const pathWithoutLocale = stripLocaleFromPathname(normalizePathname(pathname));
  const alternateEntries = SUPPORTED_LOCALE_CODES.map((locale) => [
    locale,
    buildAbsoluteUrl(buildLocalizedPath(pathWithoutLocale, locale))
  ]);

  return Object.fromEntries([
    ...alternateEntries,
    ['x-default', buildAbsoluteUrl(buildLocalizedPath(pathWithoutLocale, DEFAULT_LOCALE))]
  ]);
}
