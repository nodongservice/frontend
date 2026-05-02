import { useEffect, useRef, useState } from 'react';
import { NAVER_MAP_CONFIG } from '../../config/appConfig';
import { LoadingView } from '../common/LoadingView';
import { StatusMessage } from '../common/StatusMessage';

const NAVER_MAP_SCRIPT_ID = 'bridgework-naver-map-sdk';
const NAVER_MAP_READY_CALLBACK = '__bridgeworkNaverMapReady__';
const isDevelopment = process.env.NODE_ENV !== 'production';
const MARKER_COLOR_BY_TYPE = {
  station: '#6b7280',
  bus: '#f59e0b',
  office: '#2563eb',
  lift: '#8b5cf6',
  crosswalk: '#10b981'
};

function loadNaverMapScript(clientId) {
  if (!clientId) {
    return Promise.reject(new Error('missing-client-id'));
  }

  if (window.naver?.maps) {
    return Promise.resolve(window.naver.maps);
  }

  return new Promise((resolve, reject) => {
    window[NAVER_MAP_READY_CALLBACK] = () => {
      delete window[NAVER_MAP_READY_CALLBACK];
      resolve(window.naver?.maps);
    };

    const existingScript = document.getElementById(NAVER_MAP_SCRIPT_ID);

    if (existingScript) {
      existingScript.addEventListener('error', () => reject(new Error('script-load-failed')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = NAVER_MAP_SCRIPT_ID;
    script.src =
      `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${clientId}` +
      `&submodules=geocoder&callback=${NAVER_MAP_READY_CALLBACK}`;
    script.async = true;
    script.defer = true;
    script.onerror = () => reject(new Error('script-load-failed'));
    document.head.appendChild(script);
  });
}

function createMarkerIcon(type, label) {
  const background = MARKER_COLOR_BY_TYPE[type] || '#2563eb';

  return {
    content: `<div class="accessibility-map__marker is-sdk" style="background:${background};"><span>${label}</span></div>`,
    anchor: new window.naver.maps.Point(18, 18)
  };
}

export function AccessibilityMapCanvas({
  legend,
  markers,
  radiusMeters,
  routes,
  currentLocation,
  viewport,
  viewState,
  onRetry
}) {
  const mapElementRef = useRef(null);
  const mapRef = useRef(null);
  const overlaysRef = useRef([]);
  const [mapScriptStatus, setMapScriptStatus] = useState(() =>
    NAVER_MAP_CONFIG.clientId ? 'loading' : 'missing-client-id'
  );
  const [mapInitError, setMapInitError] = useState('');
  const [mapDiagnostics, setMapDiagnostics] = useState({
    scriptStatus: NAVER_MAP_CONFIG.clientId ? 'loading' : 'missing-client-id',
    hasNaverGlobal: false,
    hasMapsNamespace: false,
    hasMapConstructor: false,
    mapInstanceCreated: false,
    containerWidth: 0,
    containerHeight: 0,
    childElementCount: 0,
    renderStatus: 'not-started',
    centerLat: 0,
    centerLng: 0,
    pageOrigin: typeof window !== 'undefined' ? window.location.origin : '',
    scriptUrl: '',
    lastError: ''
  });

  const handleZoomIn = () => {
    if (!mapRef.current) {
      return;
    }

    mapRef.current.setZoom(mapRef.current.getZoom() + 1, true);
  };

  const handleZoomOut = () => {
    if (!mapRef.current) {
      return;
    }

    mapRef.current.setZoom(mapRef.current.getZoom() - 1, true);
  };

  const handleRecenterToCurrentLocation = () => {
    if (!mapRef.current || !currentLocation) {
      return;
    }

    mapRef.current.panTo(new window.naver.maps.LatLng(currentLocation.lat, currentLocation.lng));
  };

  useEffect(() => {
    let isMounted = true;

    if (!NAVER_MAP_CONFIG.clientId) {
      setMapScriptStatus('missing-client-id');
      setMapDiagnostics((prev) => ({
        ...prev,
        scriptStatus: 'missing-client-id',
        pageOrigin: typeof window !== 'undefined' ? window.location.origin : '',
        lastError: 'missing-client-id'
      }));
      return undefined;
    }

    setMapScriptStatus('loading');
    setMapInitError('');
    setMapDiagnostics((prev) => ({
      ...prev,
      scriptStatus: 'loading',
      pageOrigin: typeof window !== 'undefined' ? window.location.origin : '',
      lastError: ''
    }));

    loadNaverMapScript(NAVER_MAP_CONFIG.clientId)
      .then(() => {
        if (isMounted) {
          setMapScriptStatus('ready');
          setMapDiagnostics((prev) => ({
            ...prev,
            scriptStatus: 'ready',
            hasNaverGlobal: Boolean(window.naver),
            hasMapsNamespace: Boolean(window.naver?.maps),
            hasMapConstructor: Boolean(window.naver?.maps?.Map),
            scriptUrl: document.getElementById(NAVER_MAP_SCRIPT_ID)?.getAttribute('src') || ''
          }));
        }
      })
      .catch((error) => {
        if (isMounted) {
          setMapScriptStatus('error');
          setMapInitError(error.message || 'script-load-failed');
          setMapDiagnostics((prev) => ({
            ...prev,
            scriptStatus: 'error',
            hasNaverGlobal: Boolean(window.naver),
            hasMapsNamespace: Boolean(window.naver?.maps),
            hasMapConstructor: Boolean(window.naver?.maps?.Map),
            scriptUrl: document.getElementById(NAVER_MAP_SCRIPT_ID)?.getAttribute('src') || '',
            lastError: error.message || 'script-load-failed'
          }));
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (viewState !== 'success' || mapScriptStatus !== 'ready' || !mapElementRef.current) {
      return undefined;
    }

    const container = mapElementRef.current;
    const updateContainerDiagnostics = (lastError = '') => {
      setMapDiagnostics((prev) => ({
        ...prev,
        scriptStatus: mapScriptStatus,
        hasNaverGlobal: Boolean(window.naver),
        hasMapsNamespace: Boolean(window.naver?.maps),
        hasMapConstructor: Boolean(window.naver?.maps?.Map),
        mapInstanceCreated: Boolean(mapRef.current),
        containerWidth: container.clientWidth,
        containerHeight: container.clientHeight,
        childElementCount: container.childElementCount,
        scriptUrl: document.getElementById(NAVER_MAP_SCRIPT_ID)?.getAttribute('src') || '',
        centerLat: viewport.center.lat,
        centerLng: viewport.center.lng,
        lastError: lastError || prev.lastError
      }));
    };

    try {
      if (!window.naver?.maps?.Map) {
        throw new Error('sdk-not-ready');
      }

      if (!mapRef.current) {
        mapRef.current = new window.naver.maps.Map(mapElementRef.current, {
          center: new window.naver.maps.LatLng(viewport.center.lat, viewport.center.lng),
          zoom: viewport.zoom,
          zoomControl: true
        });

        setMapDiagnostics((prev) => ({
          ...prev,
          renderStatus: 'map-created'
        }));

        window.naver.maps.Event.addListener(mapRef.current, 'idle', () => {
          setMapDiagnostics((prev) => ({
            ...prev,
            renderStatus: 'idle'
          }));
        });

        window.naver.maps.Event.addListener(mapRef.current, 'tilesloaded', () => {
          setMapDiagnostics((prev) => ({
            ...prev,
            renderStatus: 'tilesloaded'
          }));
        });
      }

      const map = mapRef.current;

      map.setCenter(new window.naver.maps.LatLng(viewport.center.lat, viewport.center.lng));
      map.setZoom(viewport.zoom);
      window.naver.maps.Event.trigger(map, 'resize');

      overlaysRef.current.forEach((overlay) => overlay.setMap(null));
      overlaysRef.current = [];

      const districtRing = new window.naver.maps.Circle({
        map,
        center: new window.naver.maps.LatLng(viewport.center.lat, viewport.center.lng),
        radius: radiusMeters,
        strokeColor: '#4e82ed',
        strokeOpacity: 0.55,
        strokeWeight: 2,
        fillColor: '#d9e7ff',
        fillOpacity: 0.16
      });

      overlaysRef.current.push(districtRing);

      routes.forEach((route) => {
        const polyline = new window.naver.maps.Polyline({
          map,
          path: route.path.map((point) => new window.naver.maps.LatLng(point.lat, point.lng)),
          strokeColor: route.color,
          strokeWeight: route.weight,
          strokeOpacity: 0.95
        });

        overlaysRef.current.push(polyline);
      });

      markers.forEach((marker) => {
        const markerInstance = new window.naver.maps.Marker({
          map,
          position: new window.naver.maps.LatLng(marker.lat, marker.lng),
          icon: createMarkerIcon(marker.type, marker.label),
          title: marker.label
        });

        overlaysRef.current.push(markerInstance);
      });

      setMapInitError('');
      window.setTimeout(() => {
        updateContainerDiagnostics();
        if (!container.childElementCount) {
          setMapInitError('map-container-empty');
        }
      }, 500);
    } catch (error) {
      const errorCode = error.message || 'map-init-failed';
      setMapInitError(errorCode);
      updateContainerDiagnostics(errorCode);
    }

    return () => {
      overlaysRef.current.forEach((overlay) => overlay.setMap(null));
      overlaysRef.current = [];
    };
  }, [mapScriptStatus, markers, radiusMeters, routes, viewport, viewState]);

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

  if (mapScriptStatus === 'missing-client-id') {
    return (
      <section className="accessibility-map__map-panel is-feedback">
        <StatusMessage kind="error">
          네이버 지도 Client ID가 없습니다. `.env.local`에 `REACT_APP_NAVER_MAP_CLIENT_ID`를 설정해주세요.
        </StatusMessage>
      </section>
    );
  }

  if (mapScriptStatus === 'loading') {
    return (
      <section className="accessibility-map__map-panel is-feedback">
        <LoadingView label="네이버 지도를 불러오는 중입니다..." />
      </section>
    );
  }

  if (mapScriptStatus === 'error') {
    return (
      <section className="accessibility-map__map-panel is-feedback">
        <StatusMessage kind="error">
          네이버 지도 SDK를 불러오지 못했습니다. Client ID와 Web 서비스 URL 등록값을 확인해주세요.
        </StatusMessage>
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
        <div ref={mapElementRef} className="accessibility-map__naver-map" />
        <div className="accessibility-map__map-actions" aria-label="지도 조작">
          <button
            type="button"
            className="accessibility-map__map-action-button"
            onClick={handleZoomIn}
            aria-label="지도 확대"
          >
            +
          </button>
          <button
            type="button"
            className="accessibility-map__map-action-button"
            onClick={handleZoomOut}
            aria-label="지도 축소"
          >
            -
          </button>
          <button
            type="button"
            className="accessibility-map__map-action-button is-location"
            onClick={handleRecenterToCurrentLocation}
            aria-label="현재 위치로 이동"
            disabled={!currentLocation}
          >
            현위치
          </button>
        </div>
        {mapInitError ? (
          <div className="accessibility-map__map-debug" role="alert">
            <strong>지도 오류</strong>
            <p>네이버 지도 렌더 중 문제가 발생했습니다.</p>
            <ul>
              <li>error: {mapInitError}</li>
              <li>scriptStatus: {mapDiagnostics.scriptStatus}</li>
              <li>hasNaverGlobal: {String(mapDiagnostics.hasNaverGlobal)}</li>
              <li>hasMapsNamespace: {String(mapDiagnostics.hasMapsNamespace)}</li>
              <li>hasMapConstructor: {String(mapDiagnostics.hasMapConstructor)}</li>
              <li>mapInstanceCreated: {String(mapDiagnostics.mapInstanceCreated)}</li>
              <li>container: {mapDiagnostics.containerWidth} x {mapDiagnostics.containerHeight}</li>
              <li>childElementCount: {mapDiagnostics.childElementCount}</li>
              <li>renderStatus: {mapDiagnostics.renderStatus}</li>
              <li>center: {mapDiagnostics.centerLat}, {mapDiagnostics.centerLng}</li>
              <li>origin: {mapDiagnostics.pageOrigin}</li>
              <li>scriptUrl: {mapDiagnostics.scriptUrl || 'n/a'}</li>
            </ul>
          </div>
        ) : null}
        {isDevelopment && !mapInitError ? (
          <div className="accessibility-map__map-debug is-neutral" role="status" aria-live="polite">
            <strong>지도 상태</strong>
            <ul>
              <li>scriptStatus: {mapDiagnostics.scriptStatus}</li>
              <li>hasNaverGlobal: {String(mapDiagnostics.hasNaverGlobal)}</li>
              <li>hasMapsNamespace: {String(mapDiagnostics.hasMapsNamespace)}</li>
              <li>hasMapConstructor: {String(mapDiagnostics.hasMapConstructor)}</li>
              <li>mapInstanceCreated: {String(mapDiagnostics.mapInstanceCreated)}</li>
              <li>container: {mapDiagnostics.containerWidth} x {mapDiagnostics.containerHeight}</li>
              <li>childElementCount: {mapDiagnostics.childElementCount}</li>
              <li>renderStatus: {mapDiagnostics.renderStatus}</li>
              <li>center: {mapDiagnostics.centerLat}, {mapDiagnostics.centerLng}</li>
              <li>origin: {mapDiagnostics.pageOrigin}</li>
            </ul>
          </div>
        ) : null}
        <div className="accessibility-map__map-pill">60분 이내</div>
      </div>
    </section>
  );
}
