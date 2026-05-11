import { getPageMetadata } from './pageMetadata';

describe('getPageMetadata', () => {
  it('returns route metadata for major pages', () => {
    expect(getPageMetadata('/jobs')).toMatchObject({
      title: '맞춤 일자리 공고 | Bridge Work',
      path: '/jobs'
    });
    expect(getPageMetadata('/accessibility-map')).toMatchObject({
      title: '지역 접근성 지도 | Bridge Work',
      path: '/accessibility-map'
    });
  });

  it('returns policy document metadata for policy detail pages', () => {
    expect(getPageMetadata('/settings/policies/privacy-policy')).toMatchObject({
      title: '개인정보 처리방침 | Bridge Work',
      description: 'Bridgework가 개인정보를 처리하는 기준, 보유 기간, 이용자 권리와 안전조치를 안내합니다.'
    });
  });

  it('returns not found metadata for unknown pages', () => {
    expect(getPageMetadata('/missing-page')).toMatchObject({
      title: '페이지를 찾을 수 없습니다 | Bridge Work',
      path: '/missing-page'
    });
  });
});
