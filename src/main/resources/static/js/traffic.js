let map;
let busPanelVisible = false;
let busInterval = null;
let bikePanelActive = false;
let trafficLayerActive = false;
let bikeRefreshTimeout = null;
let lastBikeRefreshTime = 0;

document.addEventListener('DOMContentLoaded', () => {
  console.log('✅ DOMContentLoaded');

  // ✅ 지도 초기화 (네이버 맵)
  map = new naver.maps.Map('map', {
    center: new naver.maps.LatLng(37.5665, 126.9780),
    zoom: 14
  });

  window.map = map;

  // ✅ 사이드바: CCTV 버튼
  document.getElementById('sidebarCctvBtn')?.addEventListener('click', () => {
    const panel = document.getElementById('cctvFilterPanel');
    const isVisible = getComputedStyle(panel).display !== 'none';
    panel.style.display = isVisible ? 'none' : 'flex';

    if (!isVisible) {
      window.applyCctvFilter?.();
    } else {
      window.clearCctvMarkers?.();
      document.getElementById('roadSearchInput').value = '';
      document.getElementById('roadList').innerHTML = '';
    }
  });

  // ✅ 사이드바: 버스 버튼
  document.getElementById('sidebarBusBtn')?.addEventListener('click', () => {
    const panel = document.getElementById('busFilterPanel');
    if (!panel) return console.warn("❌ busFilterPanel 없음");

    busPanelVisible = !busPanelVisible;
    panel.style.display = busPanelVisible ? 'block' : 'none';

    if (busPanelVisible) {
      window.loadBusPositions?.();
      busInterval = setInterval(window.loadBusPositions, 15000);
    } else {
      window.clearBusMarkers?.();
      clearInterval(busInterval);
      busInterval = null;
    }
  });

  // ✅ 사이드바: 따릉이 버튼
  document.getElementById('sidebarBikeBtn')?.addEventListener('click', () => {
    bikePanelActive = !bikePanelActive;

    if (bikePanelActive) {
      console.log("🚲 따릉이 ON");
      window.moveToMyLocation?.();
    } else {
      console.log("🚲 따릉이 OFF");
      window.clearBikeStations?.();
      if (window.userPositionMarker) {
        window.userPositionMarker.setMap(null);
        window.userPositionMarker = null;
      }
    }
  });

  // ✅ 사이드바: 길찾기 버튼 클릭 시 - 패널 열고 지도 클릭 이벤트 등록/해제
  document.getElementById('sidebarRouteBtn')?.addEventListener('click', () => {
    const panel = document.getElementById('routeFilterPanel');
    const isVisible = panel.style.display === 'block';
    panel.style.display = isVisible ? 'none' : 'block';

    if (!isVisible) {
      // ✅ 길찾기 시작 시: 출발지를 내 위치로 설정하고 지도 클릭 이벤트 활성화
      window.setStartToCurrentLocation?.();
      window.initRouteEvents?.(); // ✅ 길찾기: 지도 클릭 시 출/도 설정
    } else {
      // ✅ 길찾기 닫을 때: 경로, 마커, 이벤트 해제
      window.clearRoute?.();
      window.clearRouteMarkers?.();
      window.removeRouteEvents?.(); // ✅ 길찾기: 지도 클릭 이벤트 제거
    }
  });

  // ✅ 사이드바: 실시간 교통 버튼
  document.getElementById('sidebarTrafficBtn')?.addEventListener('click', () => {
    trafficLayerActive = !trafficLayerActive;

    if (trafficLayerActive) {
      console.log("🚦 실시간 교통 ON");
      window.loadRealTimeTraffic?.();
    } else {
      console.log("🚦 실시간 교통 OFF");
      window.clearRealTimeTraffic?.();
    }
  });

  // ✅ CCTV 영상 닫기 버튼
  document.getElementById('closeVideoBtn')?.addEventListener('click', () => {
    window.hideVideo?.();
  });

  // ✅ CCTV 전체화면 버튼
  document.getElementById('fullscreenBtn')?.addEventListener('click', () => {
    document.getElementById('cctvVideo')?.requestFullscreen?.();
  });

  // ✅ CCTV 새창 열기 버튼
  document.getElementById('openNewTabBtn')?.addEventListener('click', () => {
    const videoUrl = window.currentVideoUrl;
    const title = document.getElementById('videoTitle')?.textContent || 'CCTV';
    if (!videoUrl) return;

    const encodedUrl = encodeURIComponent(videoUrl); // ✅ 안전 처리

    const win = window.open('', '_blank', 'width=800,height=600');
    win.document.write(`
      <html><head><title>${title}</title>
      <script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
      <style>body{margin:0;background:#000;} video{width:100%;height:100vh;object-fit:contain;}</style>
      </head><body>
      <video id="video" controls autoplay muted></video>
      <script>
        const video = document.getElementById('video');
        if (Hls.isSupported()) {
          const hls = new Hls();
          hls.loadSource('${encodedUrl}');
          hls.attachMedia(video);
          hls.on(Hls.Events.MANIFEST_PARSED, () => video.play());
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = '${encodedUrl}';
          video.play();
        }
      </script></body></html>
    `);
  });

  // ✅ 지도 이동(idle) 시 따릉이 마커 갱신 (디바운스 + 최소 주기 제한)
  naver.maps.Event.addListener(map, 'idle', () => {
    if (!bikePanelActive) return;

    const now = Date.now();
    const elapsed = now - lastBikeRefreshTime;

    if (elapsed < 5000) return; // 최소 5초 간격
    clearTimeout(bikeRefreshTimeout);

    bikeRefreshTimeout = setTimeout(() => {
      console.log("🚲 지도 이동에 따라 따릉이 새로고침");
      window.loadBikeStations?.();
      lastBikeRefreshTime = Date.now();
    }, 500);
  });

  // ✅ 초기 실행 시에는 길찾기 이벤트 등록 안 함 (버튼 클릭 시에만 등록됨으로 변경됨)
});
