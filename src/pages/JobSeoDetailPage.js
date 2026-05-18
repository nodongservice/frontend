import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { postingApi } from '../api/postingApi';
import { PageShell } from '../components/common/PageShell';
import { ROUTE_PATHS } from '../config/routes';
import { buildAbsoluteUrl, buildAlternateUrls, DEFAULT_OG_IMAGE_PATH, SITE_NAME } from '../config/pageMetadata';
import { useLocale } from '../i18n/LocaleContext';
import {
  buildJobPostingStructuredData,
  buildPostingDescription,
  buildPostingTitle,
  normalizePostingDetail
} from '../utils/postingSeo';

const STRUCTURED_DATA_ELEMENT_ID = 'bridgework-page-jsonld';

function setMetaAttribute(selector, attribute, value) {
  let element = document.head.querySelector(selector);

  if (!element) {
    element = document.createElement('meta');
    const [, key, attrValue] = selector.match(/meta\[(name|property)="([^"]+)"\]/) || [];
    if (key && attrValue) {
      element.setAttribute(key, attrValue);
    }
    document.head.appendChild(element);
  }

  element.setAttribute(attribute, value);
}

function setLinkAttribute(selector, rel, href) {
  let element = document.head.querySelector(selector);

  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', rel);
    document.head.appendChild(element);
  }

  element.setAttribute('href', href);
}

function setStructuredData(structuredData) {
  const existing = document.head.querySelector(`#${STRUCTURED_DATA_ELEMENT_ID}`);
  const element = existing || document.createElement('script');
  element.setAttribute('id', STRUCTURED_DATA_ELEMENT_ID);
  element.setAttribute('type', 'application/ld+json');
  element.textContent = JSON.stringify(structuredData);

  if (!existing) {
    document.head.appendChild(element);
  }
}

function updatePostingMetadata(posting, pathname) {
  const title = buildPostingTitle(posting);
  const description = buildPostingDescription(posting);
  const canonicalUrl = buildAbsoluteUrl(pathname);
  const imageUrl = buildAbsoluteUrl(DEFAULT_OG_IMAGE_PATH);
  const alternateUrls = buildAlternateUrls(pathname);

  document.title = title;
  setLinkAttribute('link[rel="canonical"]', 'canonical', canonicalUrl);
  document.head.querySelectorAll('link[data-managed-alternate="true"]').forEach((element) => element.remove());
  Object.entries(alternateUrls).forEach(([hreflang, href]) => {
    const element = document.createElement('link');
    element.setAttribute('rel', 'alternate');
    element.setAttribute('hreflang', hreflang);
    element.setAttribute('href', href);
    element.setAttribute('data-managed-alternate', 'true');
    document.head.appendChild(element);
  });
  setMetaAttribute('meta[name="description"]', 'content', description);
  setMetaAttribute('meta[name="robots"]', 'content', 'index,follow');
  setMetaAttribute('meta[property="og:type"]', 'content', 'article');
  setMetaAttribute('meta[property="og:url"]', 'content', canonicalUrl);
  setMetaAttribute('meta[property="og:site_name"]', 'content', SITE_NAME);
  setMetaAttribute('meta[property="og:title"]', 'content', title);
  setMetaAttribute('meta[property="og:description"]', 'content', description);
  setMetaAttribute('meta[property="og:image"]', 'content', imageUrl);
  setMetaAttribute('meta[name="twitter:title"]', 'content', title);
  setMetaAttribute('meta[name="twitter:description"]', 'content', description);
  setMetaAttribute('meta[name="twitter:url"]', 'content', canonicalUrl);
  setMetaAttribute('meta[name="twitter:image"]', 'content', imageUrl);
  setStructuredData(buildJobPostingStructuredData(posting, pathname));
}

function JobDetailDefinitionGrid({ items }) {
  return (
    <dl className="jobs-detail__definition-grid public-job-detail__grid">
      {items.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd data-i18n-skip>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function JobSeoDetailPage() {
  const { postingId } = useParams();
  const location = useLocation();
  const { localizePath } = useLocale();
  const [viewState, setViewState] = useState('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    const loadDetail = async () => {
      setViewState('loading');
      setErrorMessage('');

      try {
        const payload = await postingApi.getPostingDetail(postingId, {
          accessToken: null,
          signal: controller.signal
        });
        const normalized = normalizePostingDetail(payload);
        setDetail(normalized);
        setViewState('success');
      } catch (error) {
        if (error.name === 'AbortError') {
          return;
        }
        setErrorMessage(error.message || '공고 상세를 불러오지 못했습니다.');
        setViewState('error');
      }
    };

    loadDetail();

    return () => controller.abort();
  }, [postingId]);

  useEffect(() => {
    if (detail) {
      updatePostingMetadata(detail, location.pathname);
    }
  }, [detail, location.pathname]);

  const accessibilityItems = useMemo(() => {
    if (!detail) {
      return [];
    }

    return [
      ['장애인 채용 여부', detail.disabilityHiring],
      ['휠체어 접근성', detail.wheelchairAccessibility],
      ['가까운 지하철/버스', detail.nearbyTransit],
      ['엘리베이터/리프트 정보', detail.elevatorLiftInfo],
      ['근무환경 접근성 요약', detail.accessibilitySummary]
    ];
  }, [detail]);

  if (viewState === 'loading') {
    return (
      <PageShell title="공고 상세 확인" description="장애인 채용 공고와 접근성 정보를 불러오고 있습니다.">
        <div className="jobs-feedback" role="status">공고 상세를 불러오는 중입니다.</div>
      </PageShell>
    );
  }

  if (viewState === 'error') {
    return (
      <PageShell title="공고 상세 확인 실패" description="요청한 장애인 채용 공고 정보를 확인하지 못했습니다.">
        <div className="jobs-feedback is-error" role="alert">{errorMessage}</div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title={detail.title}
      description={`${detail.company} · ${detail.region} · ${detail.employmentType}`}
      actions={<Link className="secondary-button" to={localizePath(ROUTE_PATHS.root)}>홈</Link>}
    >
      <article className="public-job-detail">
        <section className="public-job-detail__summary" aria-label="공고 요약">
          <div>
            <span>회사명</span>
            <strong data-i18n-skip>{detail.company}</strong>
          </div>
          <div>
            <span>지역</span>
            <strong data-i18n-skip>{detail.region}</strong>
          </div>
          <div>
            <span>고용형태</span>
            <strong data-i18n-skip>{detail.employmentType}</strong>
          </div>
          <div>
            <span>마감</span>
            <strong data-i18n-skip>{detail.dueLabel || detail.deadlineText}</strong>
          </div>
        </section>

        <section className="seo-content-page__section" aria-labelledby="job-accessibility-title">
          <h2 id="job-accessibility-title">접근성 확인 항목</h2>
          <JobDetailDefinitionGrid items={accessibilityItems} />
        </section>

        <section className="seo-content-page__section" aria-labelledby="job-basic-title">
          <h2 id="job-basic-title">공고 상세 정보</h2>
          <JobDetailDefinitionGrid items={detail.jobInfoFields} />
        </section>

        <section className="seo-content-page__section" aria-labelledby="job-ai-explanation-title">
          <h2 id="job-ai-explanation-title">AI 맞춤 추천 설명</h2>
          <div className="jobs-detail__explanation-card jobs-detail__explanation-card--quick">
            <span className="jobs-detail__eyebrow">회원 전용 AI 설명</span>
            <strong>로그인하면 개인 조건을 반영한 AI 추천 설명을 확인할 수 있어요.</strong>
            <p>공고 기본 정보와 접근성 정보는 로그인 없이 계속 확인할 수 있습니다.</p>
          </div>
        </section>

        {detail.workEnvironment.length ? (
          <section className="seo-content-page__section" aria-labelledby="job-environment-title">
            <h2 id="job-environment-title">공고 제공 근무환경</h2>
            <JobDetailDefinitionGrid items={detail.workEnvironment} />
          </section>
        ) : null}

        <section className="public-job-detail__notice">
          <h2>지원 전 확인 안내</h2>
          <p>
            BridgeWork의 접근성 정보는 지원 판단을 돕는 참고 정보입니다. 휠체어 접근성, 엘리베이터/리프트, 가까운 대중교통,
            실제 근무환경은 지원 전 채용 담당자와 현장 정보를 다시 확인하세요.
          </p>
        </section>
      </article>
    </PageShell>
  );
}
