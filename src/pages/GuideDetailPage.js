import { Link, Navigate, useParams } from 'react-router-dom';
import { PageShell } from '../components/common/PageShell';
import { getGuideBySlug } from '../config/guideContent';
import { ROUTE_PATHS } from '../config/routes';
import { useLocale } from '../i18n/LocaleContext';

export function GuideDetailPage() {
  const { guideSlug } = useParams();
  const { localizePath } = useLocale();
  const guide = getGuideBySlug(guideSlug);

  if (!guide) {
    return <Navigate to={localizePath(ROUTE_PATHS.guides)} replace />;
  }

  return (
    <PageShell
      title={guide.title}
      description={guide.description}
      actions={<Link className="secondary-button" to={localizePath(ROUTE_PATHS.guides)}>목록</Link>}
    >
      <article className="guide-detail">
        <ul className="guide-detail__keywords" aria-label="관련 검색어">
          {guide.keywords.map((keyword) => <li key={keyword}>{keyword}</li>)}
        </ul>
        {guide.sections.map((section) => (
          <section key={section.heading} className="seo-content-page__section">
            <h2>{section.heading}</h2>
            <p>{section.body}</p>
          </section>
        ))}
        <section className="guide-detail__bridgework-link" aria-label="BridgeWork 서비스 연결">
          <h2>BridgeWork에서 접근성 기반 일자리 추천 확인하기</h2>
          <p>
            BridgeWork는 장애 유형과 이동 접근성을 고려한 일자리 추천 서비스입니다. 장애인 채용 공고를 직무 조건, 출퇴근 가능성,
            대중교통 접근성, 근무환경 접근성 기준으로 함께 비교할 수 있습니다.
          </p>
          <Link className="primary-button" to={localizePath(ROUTE_PATHS.root)}>홈으로 이동</Link>
        </section>
      </article>
    </PageShell>
  );
}
