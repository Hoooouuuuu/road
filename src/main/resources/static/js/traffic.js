// ✅ 전역 상태
let map;
let cctvMarkers = [];
let hls = null;
let currentVideoUrl = '';
let busPanelVisible = false;
let busInterval = null;

let bikePanelActive = false; // 따릉이 ON/OFF 상태

let routeActive = false; // 길찾기 ON/OFF 상태

const ITS_API_KEY = '75731da029fa4deba688db1cd5aeb59e';

// ✅ 도로명 추출
function extractRoadName(name) {
  if (!name) return '';
  const match = name.match(/\[(.*?)\]/);
  return match ? match[1].trim() : '';
}

// ✅ 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
  console.log('✅ DOM 완전 로드됨');
  const btn = document.getElementById('sidebarBusBtn');
  const panel = document.getElementById('busFilterPanel');

  console.log('📌 sidebarBusBtn:', btn);
  console.log('📌 busFilterPanel:', panel);
  map = new naver.maps.Map('map', {
    center: new naver.maps.LatLng(37.5665, 126.9780),
    zoom: 14
  });

  // ✅ 혹은 다음과 같이 안전하게 처리
  if (typeof marker !== 'undefined') {
    naver.maps.Event.addListener(marker, 'click', function () {
      infoWindow.open(map, marker);
    });
  }

  // CCTV 버튼
  document.getElementById('sidebarCctvBtn').addEventListener('click', () => {
    const panel = document.getElementById('cctvFilterPanel');

    const isVisible = getComputedStyle(panel).display !== 'none';
    panel.style.display = isVisible ? 'none' : 'flex';

    if (!isVisible) {
      // 열릴 때: 마커 갱신
      applyCctvFilter();
    } else {
      // 닫힐 때: 마커 제거 & 검색 초기화
      clearCctvMarkers();
      document.getElementById('roadSearchInput').value = '';
      document.getElementById('roadList').innerHTML = '';
    }
  });

  // 버스 버튼
  document.getElementById('sidebarBusBtn').addEventListener('click', () => {
    const panel = document.getElementById('busFilterPanel');
    if (!panel) {
      console.warn("❌ busFilterPanel 요소 없음");
      return;
    }

    busPanelVisible = !busPanelVisible;

    if (busPanelVisible) {
      panel.style.display = 'block';

      // ✅ 패널 열리면 버스 정보 로딩
      window.loadBusPositions();
      busInterval = setInterval(window.loadBusPositions, 15000);

    } else {
      panel.style.display = 'none';

      // ✅ 패널 닫힐 때 마커 제거 + 인터벌 제거
      console.log("🛑 버스 패널 닫힘, 마커 & 인터벌 제거");
      window.clearBusMarkers();
      if (busInterval) {
        clearInterval(busInterval);
        busInterval = null;
      }
    }
  });

  // 따릉이 버튼
  document.getElementById('sidebarBikeBtn').addEventListener('click', () => {
    bikePanelActive = !bikePanelActive;
  
    if (bikePanelActive) {
      console.log("🚲 따릉이 ON");
      window.moveToMyLocation();          // 내 위치로 이동
      window.loadBikeStations();         // 마커 로딩
    } else {
      console.log("🚲 따릉이 OFF");
      window.clearBikeStations();        // 마커 제거
      if (window.userPositionMarker) {
        window.userPositionMarker.setMap(null);
        window.userPositionMarker = null;
      }
    }
  });
});

  // 길찾기
  document.getElementById('sidebarRouteBtn').addEventListener('click', () => {
    const panel = document.getElementById('routeFilterPanel');
    const isVisible = getComputedStyle(panel).display !== 'none';

    if (!isVisible) {
      console.log("🧭 길찾기 패널 ON");
      panel.style.display = 'flex';
    } else {
      console.log("🧭 길찾기 패널 OFF");
      panel.style.display = 'none';
      resetRoutePanel();
    }
  });


document.getElementById('closeVideoBtn')?.addEventListener('click', hideVideo);
document.getElementById('fullscreenBtn')?.addEventListener('click', () => {
  document.getElementById('cctvVideo')?.requestFullscreen?.();
});

document.getElementById('openNewTabBtn')?.addEventListener('click', () => {
  if (!currentVideoUrl) return;
  const title = document.getElementById('videoTitle').textContent;
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
          hls.loadSource('${currentVideoUrl}');
          hls.attachMedia(video);
          hls.on(Hls.Events.MANIFEST_PARSED, () => video.play());
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = '${currentVideoUrl}';
          video.play();
        }
      </script>
      </body></html>
    `);



  // ✅ 지도 이동 시 마커 갱신
  naver.maps.Event.addListener(map, 'idle', () => {
    if (bikeOn) window.loadBikeStations();
    const cctvPanel = document.getElementById('cctvFilterPanel');
    if (cctvPanel && cctvPanel.style.display === 'flex') {
      applyCctvFilter();
    }
  });
});

// ✅ CCTV 필터
function applyCctvFilter() {
  const keyword = document.getElementById('roadSearchInput').value.trim();
  if (!keyword) loadRoadList();
}

// ✅ CCTV 마커 필터링
function filterCctvLayer(roadName, roadType, onComplete) {
  clearCctvMarkers();

  const bounds = map.getBounds();  // ✅ 네이버 LatLngBounds 객체
  const sw = bounds._sw;
  const ne = bounds._ne;

  const minX = sw.lng();
  const maxX = ne.lng();
  const minY = sw.lat();
  const maxY = ne.lat();

  const url = `https://openapi.its.go.kr:9443/cctvInfo?apiKey=${ITS_API_KEY}&type=${roadType}&cctvType=1&minX=${minX}&maxX=${maxX}&minY=${minY}&maxY=${maxY}&getType=json`;

  fetch(url)
    .then(res => res.json())
    .then(data => {
      const raw = data.response?.data;
      const cctvs = Array.isArray(raw) ? raw : raw ? [raw] : [];

      const markerImage = {
        url: '/image/cctv-icon.png',
        size: new naver.maps.Size(44, 70),
        anchor: new naver.maps.Point(22, 70)
      };

      cctvs.forEach(item => {
        const lat = parseFloat(item.coordy);
        const lng = parseFloat(item.coordx);
        const name = item.cctvname;
        const video = item.cctvurl;
        const road = extractRoadName(name);
        if (!lat || !lng || !video) return;
        if (roadName && (!road || !road.includes(roadName))) return;

        const marker = new naver.maps.Marker({
          map,
          position: new naver.maps.LatLng(lat, lng),
          title: name,
          icon: markerImage
        });

        naver.maps.Event.addListener(marker, 'click', () => {
          currentVideoUrl = video;
          playVideo(video, name, marker.getPosition());
        });

        cctvMarkers.push(marker);
      });

      if (cctvMarkers.length === 0) {
        alert('조건에 맞는 CCTV가 없습니다.');
      }
    })
    .catch(err => console.error('ITS CCTV 로딩 실패:', err))
    .finally(() => {
      if (typeof onComplete === 'function') onComplete();
    });
}

function clearCctvMarkers() {
  cctvMarkers.forEach(marker => marker.setMap(null));
  cctvMarkers = [];
}

// ✅ 도로 리스트
function loadRoadList() {
  const keyword = document.getElementById('roadSearchInput').value.trim();
  const isHighway = document.getElementById('highway').checked;
  const selectedType = isHighway ? 'ex' : 'its';

  let minX = 124.6, maxX = 132.0, minY = 33.0, maxY = 39.0;

  if (!keyword) {
    const bounds = map.getBounds();
    const sw = bounds._sw;
    const ne = bounds._ne;

    minX = sw.lng();
    maxX = ne.lng();
    minY = sw.lat();
    maxY = ne.lat();
  }

  const url = `https://openapi.its.go.kr:9443/cctvInfo?apiKey=${ITS_API_KEY}&type=${selectedType}&cctvType=1&minX=${minX}&maxX=${maxX}&minY=${minY}&maxY=${maxY}&getType=json`;

  fetch(url)
    .then(res => res.json())
    .then(data => {
      const raw = data.response?.data;
      const cctvs = Array.isArray(raw) ? raw : raw ? [raw] : [];

      const roadSet = new Set();

      cctvs.forEach(item => {
        const road = extractRoadName(item.cctvname);
        if (!road) return;
        if (!keyword || road.includes(keyword)) {
          roadSet.add(road);
        }
      });

      const roadList = document.getElementById('roadList');
      roadList.innerHTML = '';

      if (roadSet.size === 0) {
        const li = document.createElement('li');
        li.className = 'list-group-item text-muted';
        li.textContent = '검색 결과가 없습니다.';
        roadList.appendChild(li);
        return;
      }

      Array.from(roadSet).sort().forEach(name => {
        const li = document.createElement('li');
        li.className = 'list-group-item list-group-item-action';
        li.textContent = name;
        li.addEventListener('click', () => {
          showSpinner();
          const type = document.getElementById('highway').checked ? 'ex' : 'its';
          filterCctvLayer(name, type, hideSpinner);
        });
        roadList.appendChild(li);
      });
    })
    .catch(err => console.error('도로 리스트 로딩 실패:', err));
}

// ✅ 영상 재생 & 닫기
function playVideo(url, name, position) {
  const videoContainer = document.getElementById('videoContainer');
  const cctvVideo = document.getElementById('cctvVideo');
  const videoTitle = document.getElementById('videoTitle');

  videoTitle.textContent = name || '영상 없음';
  selectedMarkerPosition = position;

  if (hls) hls.destroy();
  hls = new Hls();
  hls.loadSource(url);
  hls.attachMedia(cctvVideo);
  hls.on(Hls.Events.MANIFEST_PARSED, () => {
    cctvVideo.play().catch(console.warn);
  });

  videoContainer.style.display = 'block';
  cctvVideo.style.display = 'block';

  // ✅ 좌표 → 픽셀 위치 변환 (네이버 방식)
  const projection = map.getProjection();
  const point = projection.fromCoordToOffset(position);
  videoContainer.style.left = `${point.x + 10}px`;
  videoContainer.style.top = `${point.y + 10}px`;

  makeVideoContainerDraggable();
}

function hideVideo() {
  if (hls) {
    hls.destroy();
    hls = null;
  }
  const cctvVideo = document.getElementById('cctvVideo');
  cctvVideo.pause();
  cctvVideo.src = '';
  document.getElementById('videoContainer').style.display = 'none';
}

// ✅ 영상창 드래그
function makeVideoContainerDraggable() {
  const container = document.getElementById('videoContainer');
  let offsetX = 0, offsetY = 0;
  let isDragging = false;

  container.addEventListener('mousedown', (e) => {
    isDragging = true;
    offsetX = e.clientX - container.getBoundingClientRect().left;
    offsetY = e.clientY - container.getBoundingClientRect().top;
    container.style.cursor = 'move';
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const newLeft = e.clientX - offsetX;
    const newTop = e.clientY - offsetY;
    const maxLeft = window.innerWidth - container.offsetWidth;
    const maxTop = window.innerHeight - container.offsetHeight;
    container.style.left = Math.min(Math.max(0, newLeft), maxLeft) + 'px';
    container.style.top = Math.min(Math.max(0, newTop), maxTop) + 'px';
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
    container.style.cursor = 'default';
  });
}

function showSpinner() {
  document.getElementById('loadingSpinner').style.display = 'block';
}

function hideSpinner() {
  document.getElementById('loadingSpinner').style.display = 'none';
}
console.log("🚀 map 생성 완료");
map = new naver.maps.Map('map', {
  center: new naver.maps.LatLng(37.5665, 126.9780),
  zoom: 14
});
console.log("🚀 initRouteEvents 호출 직전");
window.initRouteEvents(); // 👈 이 타이밍에 실행해야 안전