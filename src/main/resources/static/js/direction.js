// ✅ direction.js - 길찾기 통합 모듈

let directionPolyline = null;
let directionInfoWindow = null;
let myLocationMarker = null;
let routeClickMarker = null;
let routeClickInfoWindow = null;
let routeActive = false;

let routeStart = { lat: null, lng: null, label: "내 위치" };
let routeGoal = { lat: null, lng: null, label: "" };

// ✅ 내 위치 설정 + 마커 찍기
navigator.geolocation.getCurrentPosition(pos => {
  routeStart.lat = pos.coords.latitude;
  routeStart.lng = pos.coords.longitude;

  const position = new naver.maps.LatLng(routeStart.lat, routeStart.lng);

  if (myLocationMarker) myLocationMarker.setMap(null);

  myLocationMarker = new naver.maps.Marker({
    position,
    map,
    icon: {
      content: `<div style="font-size: 24px;">🧍</div>`,
      anchor: new naver.maps.Point(12, 12)
    },
    title: "내 위치"
  });
}, () => {
  alert("현재 위치를 가져올 수 없습니다.");
});

/**
 * 지도 클릭 이벤트 등록 (map 초기화 이후 traffic.js에서 호출)
 */
window.initRouteEvents = function () {
  console.log("📍 initRouteEvents 실행됨 ✅");

  if (!window.map) {
    console.error("❌ map 객체가 없습니다.");
    return;
  }

  console.log("✅ map 있음, 클릭 이벤트 등록 시작");

  naver.maps.Event.addListener(map, 'click', function (e) {
    console.log("🖱️ 지도 클릭됨 ✅", e.coord.lat(), e.coord.lng());
    showRouteChoice(e.coord.lat(), e.coord.lng(), "선택한 위치");
  });
};

/**
 * 경로 탐색 실행
 */
window.findDirection = function (startLat, startLng, goalLat, goalLng, goalLabel = "목적지") {
  const url = `/api/proxy/naver-direction?startLat=${startLat}&startLng=${startLng}&goalLat=${goalLat}&goalLng=${goalLng}`;

  fetch(url)
    .then(res => res.json())
    .then(data => {
      const route = data?.route?.trafast?.[0];
      if (!route?.path) {
        alert("경로를 찾을 수 없습니다.");
        return;
      }

      const path = route.path.map(([lng, lat]) => new naver.maps.LatLng(lat, lng));

      if (directionPolyline) directionPolyline.setMap(null);
      if (directionInfoWindow) directionInfoWindow.close();

      directionPolyline = new naver.maps.Polyline({
        path,
        map,
        strokeColor: '#0d6efd',
        strokeWeight: 6,
        strokeOpacity: 0.9
      });

      const mid = path[Math.floor(path.length / 2)];
      const durationMin = Math.round(route.summary.duration / 60000);

      directionInfoWindow = new naver.maps.InfoWindow({
        content: `<div style="padding:6px 12px;">🕒 예상 소요: <strong>${durationMin}분</strong></div>`,
        position: mid
      });
      directionInfoWindow.open(map);
      map.panTo(mid);
    })
    .catch(err => {
      console.error("❌ 경로 API 실패:", err);
      alert("경로를 가져올 수 없습니다.");
    });
};

/**
 * 경로 초기화 (내 위치 마커는 유지)
 */
window.clearRoute = function () {
  if (directionPolyline) {
    directionPolyline.setMap(null);
    directionPolyline = null;
  }
  if (directionInfoWindow) {
    directionInfoWindow.close();
    directionInfoWindow = null;
  }

  routeGoal = { lat: null, lng: null, label: "" };
  routeActive = false;
};

/**
 * 전체 초기화 (검색창도 초기화)
 */
window.resetRoutePanel = function () {
  clearRoute();
  document.getElementById('routeDestination').value = '';
};

/**
 * 출발지 설정
 */
window.setAsStart = function (lat, lng, label) {
  routeStart = { lat, lng, label };
  tryFindRoute();
};

/**
 * 도착지 설정
 */
window.setAsGoal = function (lat, lng, label) {
  routeGoal = { lat, lng, label };
  tryFindRoute();
};

/**
 * 출/도 모두 설정됐을 때 경로 탐색
 */
function tryFindRoute() {
  if (routeStart.lat && routeGoal.lat) {
    findDirection(routeStart.lat, routeStart.lng, routeGoal.lat, routeGoal.lng, routeGoal.label);
    routeActive = true;
  }
}

/**
 * 장소 검색 → 출/도 설정
 */
window.searchDestination = function () {
  const keyword = document.getElementById('routeDestination').value.trim();
  if (!keyword) {
    alert("장소를 입력해주세요.");
    return;
  }

  fetch(`/api/proxy/naver-place?query=${encodeURIComponent(keyword)}`)
    .then(res => res.json())
    .then(data => {
      const place = data.places?.[0];
      if (!place) return alert("장소를 찾을 수 없습니다.");

      const lat = parseFloat(place.y);
      const lng = parseFloat(place.x);
      const label = place.name;

      showRouteChoice(lat, lng, label);
    })
    .catch(err => {
      console.error("❌ 장소 검색 실패:", err);
      alert("검색 중 오류 발생");
    });
};

/**
 * 검색 or 클릭 위치 → 출/도 설정 선택 팝업
 */
window.showRouteChoice = function (lat, lng, label) {
// 기존 마커 제거
if (routeClickMarker) routeClickMarker.setMap(null);
if (routeClickInfoWindow) routeClickInfoWindow.close();

// 📍 마커 생성 (기본 아이콘 사용)
routeClickMarker = new naver.maps.Marker({
  position: new naver.maps.LatLng(lat, lng),
  map: window.map // 꼭 window.map 사용!
});

// InfoWindow 내용
const content = `
  <div style="text-align:center;">
    <strong>${label}</strong><br/>
    <button onclick="setAsStart(${lat}, ${lng}, '${label}')">🚩 출발지로</button>
    <button onclick="setAsGoal(${lat}, ${lng}, '${label}')">🎯 도착지로</button>
  </div>
`;

// 인포윈도우 생성
routeClickInfoWindow = new naver.maps.InfoWindow({
  content,
  position: new naver.maps.LatLng(lat, lng),
  pixelOffset: new naver.maps.Point(0, -10)
});

// 마커에 붙여서 표시
routeClickInfoWindow.open(window.map, routeClickMarker);
};

naver.maps.Event.addListener(window.map, 'click', function (e) {
  console.log('🧨 지도 클릭됨:', e.coord.lat(), e.coord.lng());
});
