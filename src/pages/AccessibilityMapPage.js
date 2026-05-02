import { AccessibilityMapCanvas } from '../components/accessibility-map/AccessibilityMapCanvas';
import { AccessibilityMapDetailPanel } from '../components/accessibility-map/AccessibilityMapDetailPanel';
import { AccessibilityMapSidebar } from '../components/accessibility-map/AccessibilityMapSidebar';
import { TrafficFilterPanel } from '../components/accessibility-map/TrafficFilterPanel';
import { StatusMessage } from '../components/common/StatusMessage';
import { useAccessibilityMapMock } from '../hooks/useAccessibilityMapMock';

export function AccessibilityMapPage() {
  const {
    jobs,
    navItems,
    personas,
    filterGroups,
    mapLegend,
    mapRadiusMeters,
    mapRoutes,
    mapMarkers,
    mapViewport,
    searchPlaceholder,
    selectedJob,
    selectedJobId,
    selectedPersona,
    selectedTab,
    viewState,
    setSelectedJobId,
    setSelectedPersona,
    setSelectedTab,
    setViewState
  } = useAccessibilityMapMock();

  return (
    <main className="accessibility-map">
      <header className="accessibility-map__topbar">
        <div className="accessibility-map__brand" aria-label="BridgeWork">
          <img className="accessibility-map__brand-logo" src="/logo.png" alt="" aria-hidden="true" />
          <img className="accessibility-map__brand-text" src="/logo-text.png" alt="Bridge Work" />
        </div>

        <label className="accessibility-map__search">
          <span className="sr-only">출발지 입력</span>
          <input type="text" placeholder={searchPlaceholder} />
        </label>

        <div className="accessibility-map__persona-tabs" role="tablist" aria-label="장애 유형 선택">
          {Object.entries(personas).map(([key, persona]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={selectedPersona === key}
              className={`accessibility-map__persona-button${selectedPersona === key ? ' is-active' : ''}`}
              onClick={() => setSelectedPersona(key)}
            >
              <strong>{persona.label}</strong>
              <span>{persona.description}</span>
            </button>
          ))}
        </div>
      </header>

      <div className="accessibility-map__layout">
        <AccessibilityMapSidebar items={navItems} />
        <TrafficFilterPanel
          filterGroups={filterGroups}
          jobs={jobs}
          persona={personas[selectedPersona]}
          selectedJobId={selectedJobId}
          viewState={viewState}
          onSelectJob={setSelectedJobId}
        />
        <AccessibilityMapCanvas
          legend={mapLegend}
          radiusMeters={mapRadiusMeters}
          routes={mapRoutes}
          markers={mapMarkers}
          viewport={mapViewport}
          viewState={viewState}
          onRetry={() => setViewState('success')}
        />
        {viewState === 'success' ? (
          <AccessibilityMapDetailPanel
            job={selectedJob}
            selectedPersonaKey={selectedPersona}
            selectedTab={selectedTab}
            onChangeTab={setSelectedTab}
          />
        ) : (
          <aside className="accessibility-map__detail-panel">
            <div className="accessibility-map__detail-content">
              {viewState === 'empty' ? (
                <StatusMessage>선택 가능한 공고가 없어 상세 정보를 표시하지 않습니다.</StatusMessage>
              ) : null}
              {viewState === 'loading' ? (
                <StatusMessage>목업 데이터를 준비하는 동안 상세 패널도 함께 대기합니다.</StatusMessage>
              ) : null}
              {viewState === 'error' ? (
                <StatusMessage kind="error">상세 데이터를 불러오지 못했습니다.</StatusMessage>
              ) : null}
            </div>
          </aside>
        )}
      </div>
    </main>
  );
}
