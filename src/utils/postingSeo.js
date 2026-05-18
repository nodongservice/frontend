import { buildAbsoluteUrl, SITE_NAME } from '../config/pageMetadata';

export const toSafeText = (value, fallback = '확인 필요') => {
  const text = String(value ?? '').trim();
  return text || fallback;
};

export const parseDateText = (value, separator = '.') => {
  const raw = String(value ?? '').replace(/\D/g, '');
  if (raw.length !== 8) {
    return '';
  }
  return [raw.slice(0, 4), raw.slice(4, 6), raw.slice(6, 8)].join(separator);
};

export const parseIsoDate = (value) => {
  const parsed = parseDateText(value, '-');
  return parsed || undefined;
};

export const parseRegionFromAddress = (value) => {
  const text = String(value ?? '').trim();
  const tokens = text.split(/\s+/).filter(Boolean);

  if (tokens.length >= 2) {
    return `${tokens[0]} ${tokens[1]}`;
  }

  return tokens[0] || '지역 확인 필요';
};

export const getDday = (value) => {
  const raw = String(value ?? '').replace(/\D/g, '');
  if (raw.length !== 8) {
    return '';
  }

  const deadline = new Date(Number(raw.slice(0, 4)), Number(raw.slice(4, 6)) - 1, Number(raw.slice(6, 8)));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  deadline.setHours(0, 0, 0, 0);

  const diffDays = Math.ceil((deadline.getTime() - today.getTime()) / 86400000);
  if (!Number.isFinite(diffDays)) {
    return '';
  }
  if (diffDays < 0) {
    return '마감';
  }
  if (diffDays === 0) {
    return '오늘 마감';
  }
  return `D-${diffDays}`;
};

const buildPresentFields = (fieldEntries) =>
  fieldEntries
    .map(([label, value]) => [label, toSafeText(value, '')])
    .filter(([, value]) => value);

export const normalizePostingDetail = (detail) => {
  if (!detail) {
    return null;
  }

  const deadlineText = parseDateText(detail.termDate) || '마감일 확인 필요';
  const registeredText = parseDateText(detail.offerRegisteredAt || detail.registeredAt) || '등록일 확인 필요';
  const workAddress = toSafeText(detail.workAddress, '근무지 주소 확인 필요');
  const hasCoordinates = detail.geoLatitude !== null && detail.geoLatitude !== undefined
    && detail.geoLongitude !== null && detail.geoLongitude !== undefined;
  const workEnvironment = buildPresentFields([
    ['양손 사용', detail.envBothHands],
    ['시력', detail.envEyesight],
    ['듣기/말하기', detail.envLstnTalk],
    ['손작업', detail.envHandWork],
    ['들어올리기', detail.envLiftPower],
    ['서기/걷기', detail.envStndWalk]
  ]);
  const disabilityHiring = detail.postingStatus === 'ACTIVE' ? '장애인 채용 공고' : '마감 또는 상태 확인 필요';

  return {
    postingId: detail.postingId,
    externalId: detail.externalId,
    title: toSafeText(detail.jobTitle, '공고명 확인 필요'),
    company: toSafeText(detail.companyName, '회사명 확인 필요'),
    workAddress,
    region: parseRegionFromAddress(detail.workAddress),
    contactNumber: toSafeText(detail.contactNumber),
    employmentType: toSafeText(detail.employmentType),
    enterType: toSafeText(detail.enterType),
    salary: [detail.salaryType, detail.salary].filter(Boolean).join(' ') || '급여 확인 필요',
    termDate: detail.termDate,
    deadlineText,
    dueLabel: getDday(detail.termDate),
    registeredText,
    registeredIsoDate: parseIsoDate(detail.offerRegisteredAt || detail.registeredAt),
    validThroughIsoDate: parseIsoDate(detail.termDate),
    requiredCareer: toSafeText(detail.requiredCareer),
    requiredEducation: toSafeText(detail.requiredEducation),
    requiredMajor: toSafeText(detail.requiredMajor),
    requiredLicenses: toSafeText(detail.requiredLicenses),
    agencyName: toSafeText(detail.agencyName),
    postingStatus: detail.postingStatus || '상태 확인 필요',
    scrapCount: Number(detail.scrapCount || 0),
    disabilityHiring,
    wheelchairAccessibility: hasCoordinates
      ? '근무지 좌표가 확인되어 주변 휠체어 접근성 정보와 함께 검토할 수 있습니다.'
      : '근무지 좌표가 없어 휠체어 접근성은 지원 전 확인이 필요합니다.',
    nearbyTransit: hasCoordinates
      ? '가까운 지하철/버스와 이동 경로는 지도 기반 접근성 화면에서 추가 확인이 필요합니다.'
      : '가까운 지하철/버스 정보는 지원 전 확인이 필요합니다.',
    elevatorLiftInfo: '엘리베이터/리프트 정보는 공공데이터와 현장 정보를 함께 확인해야 합니다.',
    accessibilitySummary: workEnvironment.length
      ? '공고 제공 작업환경 정보를 기준으로 접근성 확인 항목을 정리했습니다.'
      : '근무환경 접근성 정보가 부족해 지원 전 사업장에 직접 확인이 필요합니다.',
    workEnvironment,
    jobInfoFields: buildPresentFields([
      ['직무명', detail.jobTitle],
      ['회사명', detail.companyName],
      ['지역', parseRegionFromAddress(detail.workAddress)],
      ['근무지 주소', detail.workAddress],
      ['장애인 채용 여부', disabilityHiring],
      ['휠체어 접근성', hasCoordinates ? '지도 좌표 확인됨' : '확인 필요'],
      ['가까운 지하철/버스', hasCoordinates ? '지도 기반 추가 확인 필요' : '확인 필요'],
      ['엘리베이터/리프트 정보', '지원 전 확인 필요'],
      ['근무환경 접근성 요약', workEnvironment.length ? '공고 작업환경 정보 제공' : '추가 확인 필요'],
      ['고용형태', detail.employmentType],
      ['입사유형', detail.enterType],
      ['급여', [detail.salaryType, detail.salary].filter(Boolean).join(' ')],
      ['모집마감일', deadlineText],
      ['공고등록일', registeredText],
      ['요구경력', detail.requiredCareer],
      ['요구학력', detail.requiredEducation],
      ['요구전공', detail.requiredMajor],
      ['요구자격증', detail.requiredLicenses],
      ['담당기관', detail.agencyName],
      ['연락처', detail.contactNumber]
    ])
  };
};

export const buildPostingTitle = (posting) =>
  `${posting.title} | ${posting.company} 장애인 채용 공고 | ${SITE_NAME}`;

export const buildPostingDescription = (posting) =>
  `${posting.company} ${posting.title} 공고입니다. ${posting.region}, ${posting.employmentType}, ${posting.salary} 조건과 휠체어 접근성, 대중교통, 근무환경 접근성 확인 항목을 BridgeWork에서 확인하세요.`;

export const buildJobPostingStructuredData = (posting, pathname) => {
  if (!posting) {
    return null;
  }

  const data = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: posting.title,
    description: buildPostingDescription(posting),
    identifier: {
      '@type': 'PropertyValue',
      name: SITE_NAME,
      value: String(posting.externalId || posting.postingId)
    },
    hiringOrganization: {
      '@type': 'Organization',
      name: posting.company
    },
    employmentType: posting.employmentType,
    jobLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressCountry: 'KR',
        addressRegion: posting.region,
        streetAddress: posting.workAddress
      }
    },
    applicantLocationRequirements: {
      '@type': 'Country',
      name: 'KR'
    },
    directApply: false,
    url: buildAbsoluteUrl(pathname)
  };

  if (posting.registeredIsoDate) {
    data.datePosted = posting.registeredIsoDate;
  }

  if (posting.validThroughIsoDate) {
    data.validThrough = `${posting.validThroughIsoDate}T23:59`;
  }

  return data;
};
