import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { postingApi } from '../api/postingApi';
import { LoginModal } from '../components/auth/LoginModal';
import { DefinitionGrid } from '../components/jobs/JobDetailPanel';
import { ROUTE_PATHS } from '../config/routes';
import { useAuth } from '../auth/AuthContext';
import { useLocale } from '../i18n/LocaleContext';

const toSafeText = (value, fallback = '확인 필요') => {
  const text = String(value ?? '').trim();
  return text || fallback;
};

const parseDateText = (value) => {
  const raw = String(value ?? '').replace(/\D/g, '');
  return raw.length === 8 ? `${raw.slice(0, 4)}.${raw.slice(4, 6)}.${raw.slice(6, 8)}` : '';
};

const parseDateForStructuredData = (value) => {
  const raw = String(value ?? '').replace(/\D/g, '');
  return raw.length === 8 ? `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}` : undefined;
};

const getDday = (value) => {
  const raw = String(value ?? '').replace(/\D/g, '');
  if (raw.length !== 8) {
    return '';
  }

  const deadline = new Date(Number(raw.slice(0, 4)), Number(raw.slice(4, 6)) - 1, Number(raw.slice(6, 8)));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  deadline.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((deadline.getTime() - today.getTime()) / 86400000);

  if (Number.isNaN(diffDays)) {
    return '';
  }
  if (diffDays < 0) {
    return '마감';
  }
  return diffDays === 0 ? '오늘 마감' : `D-${diffDays}`;
};

const normalizePostingDetail = (detail) => ({
  postingId: detail?.postingId,
  companyName: toSafeText(detail?.companyName),
  jobTitle: toSafeText(detail?.jobTitle),
  workAddress: toSafeText(detail?.workAddress),
  contactNumber: toSafeText(detail?.contactNumber),
  employmentType: toSafeText(detail?.employmentType),
  enterType: toSafeText(detail?.enterType),
  salaryText: [detail?.salaryType, detail?.salary].filter(Boolean).join(' ') || '확인 필요',
  termDate: detail?.termDate || '',
  dueLabel: getDday(detail?.termDate),
  registeredAt: parseDateText(detail?.offerRegisteredAt || detail?.registeredAt),
  requiredCareer: toSafeText(detail?.requiredCareer),
  requiredEducation: toSafeText(detail?.requiredEducation),
  requiredMajor: toSafeText(detail?.requiredMajor),
  requiredLicenses: toSafeText(detail?.requiredLicenses),
  agencyName: toSafeText(detail?.agencyName),
  envBothHands: toSafeText(detail?.envBothHands),
  envEyesight: toSafeText(detail?.envEyesight),
  envLstnTalk: toSafeText(detail?.envLstnTalk),
  envHandWork: toSafeText(detail?.envHandWork),
  envLiftPower: toSafeText(detail?.envLiftPower),
  envStndWalk: toSafeText(detail?.envStndWalk),
  postingStatus: detail?.postingStatus || 'ACTIVE',
  scrapCount: Number(detail?.scrapCount || 0),
  scrappedByMe: Boolean(detail?.scrappedByMe)
});

function setMeta(selector, key, value) {
  const element = document.head.querySelector(selector);
  if (element) {
    element.setAttribute(key, value);
  }
}

function setStructuredData(detail) {
  const scriptId = 'job-posting-structured-data';
  const existing = document.getElementById(scriptId);
  if (existing) {
    existing.remove();
  }

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: detail.jobTitle,
    description: `${detail.companyName} ${detail.jobTitle} 공고입니다. 근무지역 ${detail.workAddress}, 고용형태 ${detail.employmentType}, 임금 ${detail.salaryText}.`,
    hiringOrganization: {
      '@type': 'Organization',
      name: detail.companyName
    },
    jobLocation: {
      '@type': 'Place',
      address: detail.workAddress
    },
    employmentType: detail.employmentType,
    datePosted: parseDateForStructuredData(detail.registeredAt),
    validThrough: parseDateForStructuredData(detail.termDate),
    directApply: false
  };

  Object.keys(structuredData).forEach((key) => {
    if (structuredData[key] === undefined || structuredData[key] === '') {
      delete structuredData[key];
    }
  });

  const script = document.createElement('script');
  script.id = scriptId;
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(structuredData);
  document.head.appendChild(script);
}

export function JobSeoDetailPage() {
  const { postingId } = useParams();
  const { isAuthenticated, callWithAuth } = useAuth();
  const { localizePath } = useLocale();
  const [state, setState] = useState({ status: 'loading', error: '', detail: null });
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [scrapState, setScrapState] = useState({ status: 'idle', message: '' });

  useEffect(() => {
    const controller = new AbortController();

    const loadDetail = async () => {
      setState({ status: 'loading', error: '', detail: null });
      try {
        const detail = isAuthenticated
          ? await callWithAuth((accessToken) => postingApi.getPostingDetail(postingId, { accessToken, signal: controller.signal }))
          : await postingApi.getPostingDetail(postingId, { signal: controller.signal });
        setState({ status: 'success', error: '', detail: normalizePostingDetail(detail) });
      } catch (error) {
        if (error.name === 'AbortError') {
          return;
        }
        setState({ status: 'error', error: error.message || '공고 상세를 불러오지 못했습니다.', detail: null });
      }
    };

    loadDetail();

    return () => {
      controller.abort();
    };
  }, [callWithAuth, isAuthenticated, postingId]);

  useEffect(() => {
    if (!state.detail) {
      return;
    }

    const title = `${state.detail.jobTitle} · ${state.detail.companyName} | BridgeWork`;
    const description = `${state.detail.companyName} ${state.detail.jobTitle} 공고입니다. 근무지역 ${state.detail.workAddress}, 고용형태 ${state.detail.employmentType}, 기본 접근성 정보를 확인하세요.`;
    document.title = title;
    setMeta('meta[name="description"]', 'content', description);
    setMeta('meta[name="robots"]', 'content', 'index,follow');
    setMeta('meta[property="og:title"]', 'content', title);
    setMeta('meta[property="og:description"]', 'content', description);
    setStructuredData(state.detail);

    return () => {
      document.getElementById('job-posting-structured-data')?.remove();
    };
  }, [state.detail]);

  const detail = state.detail;
  const summaryItems = useMemo(() => detail ? [
    ['기업명', detail.companyName],
    ['직무명', detail.jobTitle],
    ['근무지역', detail.workAddress],
    ['임금', detail.salaryText],
    ['고용형태', detail.employmentType],
    ['모집마감일', parseDateText(detail.termDate) || '확인 필요']
  ] : [], [detail]);
  const conditionItems = useMemo(() => detail ? [
    ['입사유형', detail.enterType],
    ['요구경력', detail.requiredCareer],
    ['요구학력', detail.requiredEducation],
    ['요구전공', detail.requiredMajor],
    ['요구자격증', detail.requiredLicenses],
    ['담당기관', detail.agencyName],
    ['연락처', detail.contactNumber],
    ['공고등록일', detail.registeredAt || '확인 필요']
  ] : [], [detail]);
  const accessibilityItems = useMemo(() => detail ? [
    ['양손 사용', detail.envBothHands],
    ['시력', detail.envEyesight],
    ['듣기·말하기', detail.envLstnTalk],
    ['손작업', detail.envHandWork],
    ['들어올리기', detail.envLiftPower],
    ['서기·걷기', detail.envStndWalk]
  ] : [], [detail]);

  const handleScrap = async () => {
    if (!detail?.postingId) {
      return;
    }

    if (!isAuthenticated) {
      setIsLoginModalOpen(true);
      return;
    }

    setScrapState({ status: 'loading', message: '' });
    try {
      await callWithAuth((accessToken) => postingApi.scrapPosting(accessToken, detail.postingId));
      setState((prev) => prev.detail ? ({
        ...prev,
        detail: {
          ...prev.detail,
          scrappedByMe: true,
          scrapCount: prev.detail.scrappedByMe ? prev.detail.scrapCount : prev.detail.scrapCount + 1
        }
      }) : prev);
      setScrapState({ status: 'success', message: '공고를 스크랩했습니다.' });
    } catch (error) {
      setScrapState({ status: 'error', message: error.message || '스크랩 처리에 실패했습니다.' });
    }
  };

  return (
    <main className="main-page" aria-labelledby="job-seo-detail-title">
      <div className="main-page__inner">
        {state.status === 'loading' ? <div className="jobs-feedback" role="status">공고 상세를 불러오는 중입니다.</div> : null}
        {state.status === 'error' ? <div className="jobs-feedback is-error" role="alert">{state.error}</div> : null}
        {detail ? (
          <article className="posting-detail-modal__body">
            <header className="login-modal__heading">
              <span className="jobs-detail__eyebrow">{detail.postingStatus === 'ACTIVE' ? '진행중 공고' : '마감 공고'}</span>
              <h1 id="job-seo-detail-title" className="login-modal__title" data-i18n-skip>{detail.jobTitle}</h1>
              <p data-i18n-skip>{detail.companyName}</p>
              <div className="posting-detail-modal__summary-meta">
                <span>스크랩 {detail.scrapCount}건</span>
                {detail.dueLabel ? <span>{detail.dueLabel}</span> : null}
              </div>
            </header>

            <section className="jobs-detail__summary posting-detail-modal__key-summary" aria-label="공고 핵심 요약">
              {summaryItems.map(([label, value]) => (
                <div key={label}>
                  <span>{label}</span>
                  <strong data-i18n-skip>{value}</strong>
                </div>
              ))}
            </section>

            <section className="jobs-detail__section" aria-label="AI 추천 설명 안내">
              <div className="jobs-detail__notice jobs-detail__notice--quick" role="note">
                <span className="jobs-detail__eyebrow">회원 전용 AI 설명</span>
                <strong>로그인하면 개인 조건을 반영한 AI 추천 설명을 확인할 수 있어요.</strong>
                <p>공고 기본 정보와 작업 환경 정보는 로그인 없이 확인할 수 있습니다.</p>
              </div>
            </section>

            <section className="posting-detail-modal__info-stack">
              <div className="scrap-detail-card posting-detail-modal__info-section">
                <h2>근무 조건</h2>
                <DefinitionGrid items={conditionItems} skipValues />
              </div>
              <div className="scrap-detail-card posting-detail-modal__info-section">
                <h2>기본 접근성 정보</h2>
                <DefinitionGrid items={accessibilityItems} skipValues />
              </div>
            </section>

            <div className="home-quick__actions">
              <Link className="secondary-button" to={localizePath(ROUTE_PATHS.root)}>공고 목록 보기</Link>
              <button
                type="button"
                className="primary-button"
                onClick={handleScrap}
                disabled={scrapState.status === 'loading' || detail.scrappedByMe || detail.postingStatus !== 'ACTIVE'}
              >
                {scrapState.status === 'loading' ? '처리 중' : detail.scrappedByMe ? '스크랩 완료' : '공고 스크랩'}
              </button>
            </div>
            {scrapState.message ? (
              <div className={`jobs-feedback${scrapState.status === 'error' ? ' is-error' : ''}`} role={scrapState.status === 'error' ? 'alert' : 'status'}>
                {scrapState.message}
              </div>
            ) : null}
          </article>
        ) : null}
      </div>
      {isLoginModalOpen ? <LoginModal onClose={() => setIsLoginModalOpen(false)} /> : null}
    </main>
  );
}
