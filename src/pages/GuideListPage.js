import { Link } from 'react-router-dom';
import { PageShell } from '../components/common/PageShell';
import { SEO_GUIDES } from '../config/guideContent';
import { ROUTE_PATHS } from '../config/routes';
import { useLocale } from '../i18n/LocaleContext';

export function GuideListPage() {
  const { localizePath } = useLocale();

  return (
    <PageShell
      title="장애인 일자리 접근성 가이드"
      description="장애인 구직, 휠체어 접근성 일자리, 교통약자 일자리, 지도 기반 일자리 추천을 위한 정보를 정리했습니다."
    >
      <section className="guide-list" aria-label="장애인 일자리 접근성 가이드 목록">
        {SEO_GUIDES.map((guide) => (
          <article key={guide.slug} className="guide-list__item">
            <div>
              <h2>{guide.title}</h2>
              <p>{guide.description}</p>
              <ul aria-label="관련 검색어">
                {guide.keywords.map((keyword) => <li key={keyword}>{keyword}</li>)}
              </ul>
            </div>
            <Link className="secondary-button" to={localizePath(`${ROUTE_PATHS.guides}/${guide.slug}`)}>
              읽기
            </Link>
          </article>
        ))}
      </section>
    </PageShell>
  );
}
