import {
  formatRecommendationExplanationList,
  formatRecommendationExplanationText,
  getRecommendationGradeFromScore
} from './recommendationExplanationText';

describe('recommendationExplanationText', () => {
  it('adds grade after total recommendation score', () => {
    expect(
      formatRecommendationExplanationText(
        '봉황기업의 “인쇄, 목재, 가구 및 기타 제조 분야 단순 종사원”은 종합 추천 점수 71점으로 나와 있어요.',
        71
      )
    ).toBe('봉황기업의 “인쇄, 목재, 가구 및 기타 제조 분야 단순 종사원”은 종합 추천 점수 71점(B등급)으로 나와 있어요.');
  });

  it('removes unsupported commute data sentence', () => {
    expect(
      formatRecommendationExplanationText(
        '지원 조건은 대체로 맞습니다. 다만 근무지 주변 이동·대중교통 통근 정보는 근거 데이터가 부족해서, 지원 전 확인이 필요해요.',
        71
      )
    ).toBe('지원 조건은 대체로 맞습니다.');
  });

  it('removes trailing caution confirmation sentence from LLM summaries', () => {
    expect(
      formatRecommendationExplanationText(
        '(주)호텔롯데 롯데월드의 청소원은 종합 추천 점수 77점으로 안내되어 있어요. 공공 접근성/시설 관련 항목이 반영되어 있고, 장애인 구인 실시간 현황 원천 데이터가 확인됩니다. 다만 출입구와 실제 이동 동선 부분은 지원 전 확인이 필요합니다.',
        77
      )
    ).toBe(
      '(주)호텔롯데 롯데월드의 청소원은 종합 추천 점수 77점(B등급)으로 안내되어 있어요. 공공 접근성/시설 관련 항목이 반영되어 있고, 장애인 구인 실시간 현황 원천 데이터가 확인됩니다.'
    );
  });

  it('filters empty list items after formatting', () => {
    expect(
      formatRecommendationExplanationList([
        '다만 근무지 주변 이동·대중교통 통근 정보는 근거 데이터가 부족해서, 지원 전 확인이 필요해요.'
      ], 71)
    ).toEqual([]);
  });

  it('returns grade from score', () => {
    expect(getRecommendationGradeFromScore(71)).toBe('B등급');
  });
});
