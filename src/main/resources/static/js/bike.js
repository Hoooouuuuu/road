// 🚲 따릉이 마커 관련 전역 상태
let bikeMarkers = [];
let allBikeStations = [];
let bikeRoutePolyline = null; // 경로 선
let bikeRouteLabel = null;    // 경로 시간 라벨

window.userPositionMarker = null;
window.recommendedStation = null;
window.activeInfoWindow = null;
window.userLat = null;
window.userLng = null;
window.skipBikeRecommendation = false;

// ✅ 마커 모두 제거
window.clearBikeStations = function () {
  bikeMarkers.forEach(m => m.marker.setMap(null));
  bikeMarkers = [];

  if (window.activeInfoWindow) {
    window.activeInfoWindow.close();
    window.activeInfoWindow = null;
  }

  // ✅ 경로 제거
  if (bikeRoutePolyline) {
    bikeRoutePolyline.setMap(null);
    bikeRoutePolyline = null;
  }

  // ✅ 경로 라벨 제거
  if (bikeRouteLabel) {
    bikeRouteLabel.close();
    bikeRouteLabel = null;
  }
};

// ✅ 거리 계산 함수
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c * 1000;
}

// ✅ 내 위치로 이동하고 추천 마커 띄우기
window.moveToMyLocation = function (skipRecommendation = false) {
  if (!navigator.geolocation) return alert("위치 정보를 지원하지 않습니다.");

  navigator.geolocation.getCurrentPosition(pos => {
    // ✅ 전역으로 위치 저장
    window.userLat = pos.coords.latitude;
    window.userLng = pos.coords.longitude;
    const userPos = new naver.maps.LatLng(window.userLat, window.userLng);

    if (window.userPositionMarker) window.userPositionMarker.setMap(null);
    window.userPositionMarker = new naver.maps.Marker({
      position: userPos,
      map,
      title: '내 위치',
      zIndex: 999
    });

    map.panTo(userPos);

    // ✅ 대여소 불러오기 (비동기)
    window.loadBikeStations();

    // ✅ 추천 생략 옵션 처리 (true면 추천 안 함)
    window.skipBikeRecommendation = skipRecommendation;
  }, () => alert("위치 정보를 가져올 수 없습니다."));
};

window.recommendNearestStation = function () {
  if (!window.userLat || !window.userLng) return;

  const nearby = bikeMarkers
    .map(m => ({
      ...m,
      distance: getDistance(window.userLat, window.userLng, m.position.lat(), m.position.lng())
    }))
    .filter(m => m.distance <= 500)
    .sort((a, b) => a.distance - b.distance);

  if (!nearby.length) {
    alert('500m 이내에 추천 가능한 대여소가 없습니다.');
    return;
  }

  const best = nearby[0];
  window.recommendedStation = {
    stationLatitude: best.position.lat(),
    stationLongitude: best.position.lng(),
    stationName: best.name
  };

  map.panTo(best.position);

  const content = `
    <div style="padding:8px; font-size:14px; line-height:1.6;">
      <strong style="color:#0d6efd;">🚲 추천 대여소: ${best.name}</strong><br/>
      거리: ${Math.round(best.distance)}m<br/>
      <div class="mt-2 d-flex gap-2">
        <button onclick="goToNaverRoute()" class="btn btn-sm btn-outline-primary">🧭 안내</button>
      </div>
    </div>
  `;

  if (window.activeInfoWindow) window.activeInfoWindow.close();
  window.activeInfoWindow = new naver.maps.InfoWindow({
    content,
    position: best.position
  });
  window.activeInfoWindow.open(map, best.marker);
};

// ✅ 내부 길찾기
window.goToNaverRoute = function () {
  if (!navigator.geolocation) return alert("위치 정보를 지원하지 않습니다.");

  navigator.geolocation.getCurrentPosition(pos => {
    const userLat = pos.coords.latitude;
    const userLng = pos.coords.longitude;

    if (!window.recommendedStation) {
      alert('추천 대여소가 없습니다.');
      return;
    }

    const { stationLatitude, stationLongitude } = window.recommendedStation;

    const apiUrl = `/api/proxy/naver-direction?startLat=${userLat}&startLng=${userLng}&goalLat=${stationLatitude}&goalLng=${stationLongitude}`;

    fetch(apiUrl)
      .then(res => res.json())
      .then(data => {
        const route = data?.route?.trafast?.[0];

        if (!route?.path) return alert("경로를 불러올 수 없습니다.");

        const durationMin = Math.round(route.summary?.duration / 60000); // 소요 시간 계산
        const path = route.path;
        const linePath = path.map(([lng, lat]) => new naver.maps.LatLng(lat, lng));

        bikeRoutePolyline = new naver.maps.Polyline({
          path: linePath,
          map: map,
          strokeColor: '#0d6efd',
          strokeWeight: 6,
          strokeOpacity: 0.9,
          strokeStyle: 'solid'
        });

        // 중간 지점 계산
        const midpointIndex = Math.floor(path.length / 2);
        const [midLng, midLat] = path[midpointIndex];
        const midpoint = new naver.maps.LatLng(midLat, midLng);

        bikeRouteLabel = new naver.maps.InfoWindow({
          content: `<div style="font-size:14px; padding:6px 12px;">🕒 예상 소요시간: <strong>${durationMin}분</strong></div>`,
          position: midpoint,
          pixelOffset: new naver.maps.Point(0, -20),
          backgroundColor: '#fff',
          borderColor: '#0d6efd',
          borderWidth: 1
        });
        bikeRouteLabel.open(map);

        map.panTo(new naver.maps.LatLng(stationLatitude, stationLongitude));
      })
      .catch(err => {
        console.error("❌ 경로 불러오기 실패", err);
        alert("경로 안내에 실패했습니다.");
      });

  }, () => alert("위치 정보를 가져올 수 없습니다."));
};

// ✅ API 호출해서 전체 대여소 정보 저장
window.loadBikeStations = function () {
  const apiUrl = 'http://openapi.seoul.go.kr:8088/75436b6c78776a643536507267774e/json/bikeList/1/1000/';

  fetch(apiUrl)
    .then(res => res.json())
    .then(data => {
      allBikeStations = data?.rentBikeStatus?.row || [];
      console.log("✅ 따릉이 수:", allBikeStations.length);
      window.renderVisibleBikeMarkers();
      console.log("🗺️ 현재 bounds:", map.getBounds());

      // ✅ 내 위치와 추천이 허용된 상태면 추천 실행
      if (!window.skipBikeRecommendation && window.userLat && window.userLng) {
        window.recommendNearestStation();
      }
    })
    .catch(err => {
      console.error("❌ 따릉이 API 오류", err);
      alert('따릉이 데이터를 불러오는 중 오류가 발생했습니다.');
    });
};

// ✅ 현재 보이는 범위 내 마커만 표시
window.renderVisibleBikeMarkers = function () {
  const bounds = map.getBounds();
  window.clearBikeStations();

  allBikeStations.forEach(station => {
    const lat = parseFloat(station.stationLatitude);
    const lng = parseFloat(station.stationLongitude);
    const name = station.stationName.replace(/^\d+\.\s*/, '');
    const bikeCount = parseInt(station.parkingBikeTotCnt);

    if (isNaN(lat) || isNaN(lng)) return;

    const position = new naver.maps.LatLng(lat, lng);

    // console.log("🔍 마커 후보:", lat, lng, bounds.hasLatLng(new naver.maps.LatLng(lat, lng)));

    if (!bounds.hasLatLng(position)) return;

    const defaultImageUrl =
      bikeCount === 0
        ? '/image/bike-marker-red.png'
        : bikeCount <= 5
          ? '/image/bike-marker-yellow.png'
          : '/image/bike-marker-green.png';

    const hoverImageUrl = `/image/bike-hover/bike-hover-${bikeCount > 9 ? '9plus' : bikeCount}.png`;

    const imageSize = new naver.maps.Size(44, 70);
    const imageAnchor = new naver.maps.Point(22, 70);

    const marker = new naver.maps.Marker({
      position,
      map,
      icon: {
        url: defaultImageUrl,
        size: imageSize,
        anchor: imageAnchor
      },
      title: name
    });

    const infoContent = `
      <div style="padding:8px; font-size:14px;">
        <strong style="color:#0d6efd;">🚲 ${name}</strong><br/>
        잔여: ${bikeCount}대<br/>
        <button onclick="goToNaverRoute()" class="btn btn-sm btn-outline-primary mt-2">🧭 안내</button>
      </div>
    `;

    const infoWindow = new naver.maps.InfoWindow({
      content: infoContent,
      position: position
    });

    naver.maps.Event.addListener(marker, 'mouseover', () => {
      marker.setIcon({
        url: hoverImageUrl,
        size: imageSize,
        anchor: imageAnchor
      });
    });

    naver.maps.Event.addListener(marker, 'mouseout', () => {
      marker.setIcon({
        url: defaultImageUrl,
        size: imageSize,
        anchor: imageAnchor
      });
    });

    naver.maps.Event.addListener(marker, 'click', () => {
      window.recommendedStation = {
        stationLatitude: lat,
        stationLongitude: lng,
        stationName: name,
        rackTotCnt: station.rackTotCnt,
        parkingBikeTotCnt: station.parkingBikeTotCnt,
        shared: station.shared
      };

      if (window.activeInfoWindow) window.activeInfoWindow.close();
      window.activeInfoWindow = infoWindow;
      infoWindow.open(map, marker);
    });

    bikeMarkers.push({ marker, name, position, bikeCount });
  });
};

window.moveToMyLocation = moveToMyLocation;
window.clearBikeStations = clearBikeStations;
window.loadBikeStations = loadBikeStations;
window.renderVisibleBikeMarkers = renderVisibleBikeMarkers;