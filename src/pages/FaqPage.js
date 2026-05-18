import { PageShell } from '../components/common/PageShell';
import { SERVICE_FAQ_ITEMS } from '../config/seoContent';

export function FaqPage() {
  return (
    <PageShell
      title="자주 묻는 질문"
      description="BridgeWork의 장애인 일자리 추천, 접근성 점수, 개인정보 보호, 채용 공고 검색 노출 정책을 한곳에서 확인합니다."
    >
      <article className="seo-content-page">
        <section className="seo-content-page__intro" aria-label="FAQ 안내">
          <strong>BridgeWork FAQ</strong>
          <p>
            장애인 구직자가 일자리 추천 결과를 안전하게 해석하고, 접근성 정보를 확인하며,
            개인정보가 검색엔진에 노출되지 않는 범위를 이해할 수 있도록 핵심 질문을 정리했습니다.
          </p>
        </section>
        {SERVICE_FAQ_ITEMS.map((item) => (
          <section key={item.question} className="seo-content-page__section">
            <h2>{item.question}</h2>
            <p>{item.answer}</p>
          </section>
        ))}
      </article>
    </PageShell>
  );
}
