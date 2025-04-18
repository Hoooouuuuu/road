(() => {
  let trafficPolylines = [];
  let isTrafficVisible = false;

  function loadRealTimeTraffic() {
    fetch('/api/proxy/traffic-data')
      .then(res => res.json())
      .then(data => {
        const links = data?.response?.body?.items?.item || [];
        links.forEach(drawTrafficSegment);
      });
  }

  function clearRealTimeTraffic() {
    trafficPolylines.forEach(p => p.setMap(null));
    trafficPolylines = [];
  }

  function drawTrafficSegment(segment) {
    const path = segment.geometry?.coordinates?.map(([lng, lat]) => new naver.maps.LatLng(lat, lng));
    const speed = segment.speed;

    if (!path || !speed) return;

    const polyline = new naver.maps.Polyline({
      map,
      path,
      strokeColor: getTrafficColor(speed),
      strokeWeight: 6,
      strokeOpacity: 0.9
    });

    const infoWindow = new naver.maps.InfoWindow({
      content: `<div style="padding:6px;">🚗 평균속도: ${speed}km/h</div>`
    });

    naver.maps.Event.addListener(polyline, 'mouseover', () => {
      const mid = path[Math.floor(path.length / 2)];
      infoWindow.setPosition(mid);
      infoWindow.open(map);
    });

    naver.maps.Event.addListener(polyline, 'mouseout', () => {
      infoWindow.close();
    });

    trafficPolylines.push(polyline);
  }

  function getTrafficColor(speed) {
    if (speed > 60) return "#00C851";
    if (speed > 30) return "#ffbb33";
    return "#ff4444";
  }

  // ✅ 실시간 교통 버튼 토글 이벤트
  document.addEventListener("DOMContentLoaded", () => {
    const trafficBtn = document.getElementById("sidebarTrafficBtn");
    const legendBox = document.getElementById("trafficLegendBox");

    if (!trafficBtn) return;

    trafficBtn.addEventListener("click", () => {
      if (isTrafficVisible) {
        clearRealTimeTraffic();
        trafficBtn.classList.remove("active");
        if (legendBox) legendBox.style.display = "none";
      } else {
        loadRealTimeTraffic();
        trafficBtn.classList.add("active");
        if (legendBox) legendBox.style.display = "block";
      }
      isTrafficVisible = !isTrafficVisible;
    });
  });
})();
