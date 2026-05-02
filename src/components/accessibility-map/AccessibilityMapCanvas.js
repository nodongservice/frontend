import { LoadingView } from '../common/LoadingView';
import { StatusMessage } from '../common/StatusMessage';

function Marker({ label, type, x, y }) {
  return (
    <div className={`accessibility-map__marker is-${type}`} style={{ left: x, top: y }}>
      <span>{label}</span>
    </div>
  );
}

export function AccessibilityMapCanvas({ legend, markers, viewState, onRetry }) {
  if (viewState === 'loading') {
    return (
      <section className="accessibility-map__map-panel is-feedback">
        <LoadingView label="지역 접근성 지도를 준비하는 중입니다..." />
      </section>
    );
  }

  if (viewState === 'error') {
    return (
      <section className="accessibility-map__map-panel is-feedback">
        <StatusMessage kind="error">지도 데이터를 불러오지 못했습니다. 다시 시도해주세요.</StatusMessage>
        <button type="button" className="primary-button accessibility-map__retry-button" onClick={onRetry}>
          다시 시도
        </button>
      </section>
    );
  }

  return (
    <section className="accessibility-map__map-panel" aria-label="지역 접근성 지도">
      <div className="accessibility-map__map-toolbar">
        <button type="button" className="accessibility-map__map-control accessibility-map__map-control-strong">
          지도 레이어
        </button>
        <button type="button" className="accessibility-map__map-control">
          지하철 엘리베이터 · 지상버스 노선
        </button>
      </div>

      <div className="accessibility-map__legend" aria-label="접근성 점수 범례">
        <strong>접근성 점수</strong>
        <ul>
          {legend.map(([grade, description, tone]) => (
            <li key={grade}>
              <span className={`accessibility-map__legend-dot is-${tone}`} aria-hidden="true" />
              <b>{grade}</b>
              <span>{description}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="accessibility-map__map-surface">
        <div className="accessibility-map__map-grid" aria-hidden="true" />
        <div className="accessibility-map__district-ring" aria-hidden="true" />
        <div className="accessibility-map__route accessibility-map__route-green" aria-hidden="true" />
        <div className="accessibility-map__route accessibility-map__route-red" aria-hidden="true" />
        <div className="accessibility-map__route accessibility-map__route-blue" aria-hidden="true" />
        {markers.map((marker) => (
          <Marker key={marker.id} {...marker} />
        ))}
        <div className="accessibility-map__map-pill">60분 이내</div>
      </div>
    </section>
  );
}
