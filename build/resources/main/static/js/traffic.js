// traffic.js

let map;
let busPanelVisible = false;
let busInterval = null;
let bikePanelActive = false;
let trafficLayerActive = false;

document.addEventListener('DOMContentLoaded', () => {
  console.log('✅ DOMContentLoaded');

  // ✅ 지도 초기화
  map = new naver.maps.Map('map', {
    center: new naver.maps.LatLng(37.5665, 126.9780),
    zoom: 14
  });

  window.map = map;

  // ✅ CCTV 버튼
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

  // ✅ 버스 버튼
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

  // ✅ 따릉이 버튼
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

  // ✅ 길찾기 버튼
  document.getElementById('sidebarRouteBtn')?.addEventListener('click', () => {
    const panel = document.getElementById('routeFilterPanel');
    const isVisible = panel.style.display === 'block';
    panel.style.display = isVisible ? 'none' : 'block';

    if (!isVisible) {
      window.setStartToCurrentLocation?.();
    } else {
      window.clearRoute?.();
      window.clearRouteMarkers?.();
    }
  });

  // ✅ 실시간 교통 버튼
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

  // ✅ CCTV 영상 닫기
  document.getElementById('closeVideoBtn')?.addEventListener('click', () => {
    window.hideVideo?.();
  });

  // ✅ 전체화면 버튼
  document.getElementById('fullscreenBtn')?.addEventListener('click', () => {
    document.getElementById('cctvVideo')?.requestFullscreen?.();
  });

  // ✅ 새창 열기
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


  // ✅ 지도 이동 시 마커 갱신
  naver.maps.Event.addListener(map, 'idle', () => {
    if (bikePanelActive) window.loadBikeStations?.();

    const cctvPanel = document.getElementById('cctvFilterPanel');
    if (cctvPanel && cctvPanel.style.display === 'flex') {
      window.applyCctvFilter?.();
    }
  });

  // ✅ 길찾기 클릭 이벤트 바인딩
  window.initRouteEvents?.();
});