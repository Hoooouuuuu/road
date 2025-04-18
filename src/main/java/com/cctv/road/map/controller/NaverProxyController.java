package com.cctv.road.map.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.reactive.function.client.WebClient;

import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api/proxy")
public class NaverProxyController {

  private final WebClient naverClient;
  private final WebClient seoulBusClient;
  private final WebClient kakaoClient;

  private final String API_KEY = "%2BeQx9OSSFJWXxpa7KLX3uCtS5jFahsaCrTIztoPznu%2FEWJIcRbbojkhQAPcyIwzLvyjwqgi5AmSMqv8A5IoOYg%3D%3D";

  @Value("${naver.map.client-id}")
  private String naverClientId;

  @Value("${naver.map.client-secret}")
  private String naverClientSecret;

  @Value("${kakao.rest-api-key}")
  private String kakaoRestApiKey;

  @Value("${its.api.key}")
  private String itsApiKey;

  public NaverProxyController(WebClient.Builder builder) {
    this.naverClient = builder.baseUrl("https://naveropenapi.apigw.ntruss.com").build();
    this.seoulBusClient = builder.baseUrl("http://ws.bus.go.kr").build();
    this.kakaoClient = builder.baseUrl("https://dapi.kakao.com").build();
  }

  /**
   * ✅ 네이버 길찾기 API (지도 위 경로 탐색용)
   */
  @GetMapping("/naver-direction")
  public Mono<String> getNaverDirectionRoute(
      @RequestParam double startLat,
      @RequestParam double startLng,
      @RequestParam double goalLat,
      @RequestParam double goalLng) {

    return naverClient.get()
        .uri(uriBuilder -> uriBuilder
            .path("/map-direction/v1/driving")
            .queryParam("start", startLng + "," + startLat)
            .queryParam("goal", goalLng + "," + goalLat)
            .queryParam("option", "trafast") // 도보: pedestrian, 자전거: bicycle
            .build())
        .header("X-NCP-APIGW-API-KEY-ID", naverClientId)
        .header("X-NCP-APIGW-API-KEY", naverClientSecret)
        .accept(MediaType.APPLICATION_JSON)
        .retrieve()
        .bodyToMono(String.class);
  }

  /**
   * ✅ 네이버 지오코딩 API (주소 → 좌표)
   */
  @GetMapping("/naver-geocode")
  public Mono<String> geocode(@RequestParam String query) {
    return naverClient.get()
        .uri(uriBuilder -> uriBuilder
            .path("/map-geocode/v2/geocode")
            .queryParam("query", query)
            .build())
        .header("X-NCP-APIGW-API-KEY-ID", naverClientId)
        .header("X-NCP-APIGW-API-KEY", naverClientSecret)
        .accept(MediaType.APPLICATION_JSON)
        .retrieve()
        .bodyToMono(String.class);
  }

  @GetMapping("/naver-place")
  public Mono<String> searchPlace(@RequestParam String query) {
    System.out.println("➡️ 검색 요청 URL: /map-place/v1/search?query=" + query);

    return naverClient.get()
        .uri(uriBuilder -> uriBuilder
            .path("/map-place/v1/search")
            .queryParam("query", query)
            .queryParam("coordinate", "127.1054328,37.3595953") // 중심좌표 옵션
            .build())
        .header("X-NCP-APIGW-API-KEY-ID", naverClientId)
        .header("X-NCP-APIGW-API-KEY", naverClientSecret)
        .accept(MediaType.APPLICATION_JSON)
        .retrieve()
        .onStatus(status -> status.value() >= 400, res -> {
          System.err.println("❌ 네이버 장소 검색 API 오류 상태코드: " + res.statusCode());
          return res.bodyToMono(String.class).flatMap(error -> {
            System.err.println("❌ 응답 내용: " + error);
            return Mono.error(new RuntimeException("네이버 장소 검색 실패"));
          });
        })
        .bodyToMono(String.class);
  }

  // 카카오맵에서 검색기능만 사용
  @GetMapping("/kakao-place")
  public Mono<String> searchKakaoPlace(@RequestParam String query) {
    System.out.println("💬 kakaoRestApiKey = " + kakaoRestApiKey);
    System.out.println("💬 검색 키워드 = " + query);
    return kakaoClient.get()
        .uri(uriBuilder -> uriBuilder
            .path("/v2/local/search/keyword.json")
            .queryParam("query", query)
            .build())
        .header("Authorization", "KakaoAK " + kakaoRestApiKey)
        .accept(MediaType.APPLICATION_JSON)
        .retrieve()
        .onStatus(status -> status.value() >= 400, res -> {
          System.err.println("❌ 카카오 장소 검색 API 오류 상태코드: " + res.statusCode());
          return res.bodyToMono(String.class).flatMap(error -> {
            System.err.println("❌ 응답 내용: " + error);
            return Mono.error(new RuntimeException("카카오 장소 검색 실패"));
          });
        })
        .bodyToMono(String.class);
  }

  /**
   * ✅ 서울시 버스 정류장 검색 API
   */
  @GetMapping("/busStationList")
  public Mono<String> getBusStationsByName(@RequestParam String keyword) {
    return seoulBusClient.get()
        .uri(uriBuilder -> uriBuilder
            .path("/api/rest/stationinfo/getStationByName")
            .queryParam("serviceKey", API_KEY)
            .queryParam("stSrch", keyword)
            .queryParam("resultType", "json")
            .build())
        .accept(MediaType.APPLICATION_JSON)
        .retrieve()
        .bodyToMono(String.class);
  }

  /**
   * ✅ 서울시 버스 실시간 위치 조회 API
   */
  @GetMapping("/busPos")
  public Mono<String> getBusPositions(@RequestParam String routeId) {
    return seoulBusClient.get()
        .uri(uriBuilder -> uriBuilder
            .path("/api/rest/buspos/getBusPosByRtid")
            .queryParam("serviceKey", API_KEY)
            .queryParam("busRouteId", routeId)
            .queryParam("resultType", "json")
            .build())
        .accept(MediaType.APPLICATION_JSON)
        .retrieve()
        .bodyToMono(String.class);
  }

  /**
   * ✅ 서울시 버스 정류소 목록 (중복 제거 가능)
   */
  @GetMapping("/busStopList")
  public Mono<String> getBusStops(@RequestParam String keyword) {
    return seoulBusClient.get()
        .uri(uriBuilder -> uriBuilder
            .path("/api/rest/stationinfo/getStationByName")
            .queryParam("serviceKey", API_KEY)
            .queryParam("stSrch", keyword)
            .queryParam("resultType", "json")
            .build())
        .accept(MediaType.APPLICATION_JSON)
        .retrieve()
        .bodyToMono(String.class);
  }

  /**
   * ✅ 국토교통부 ITS 실시간 도로 교통 정보 (평균 속도)
   */
  @GetMapping("/traffic-data")
  public Mono<String> getTrafficData() {
    String url = "https://openapi.its.go.kr:9443/vdsInfo?apiKey=" + itsApiKey + "&getType=json";
  
    WebClient trafficClient = WebClient.builder().baseUrl("https://openapi.its.go.kr:9443").build();
  
    return trafficClient.get()
        .uri(uriBuilder -> uriBuilder
            .path("/vdsInfo")
            .queryParam("apiKey", itsApiKey)
            .queryParam("getType", "json")
            .build())
        .accept(MediaType.APPLICATION_JSON)
        .retrieve()
        .onStatus(status -> status.isError(), res -> {
          System.err.println("❌ ITS API 호출 실패: " + res.statusCode());
          return res.bodyToMono(String.class)
              .flatMap(error -> {
                System.err.println("❌ 응답 내용: " + error);
                return Mono.error(new RuntimeException("ITS API 호출 에러"));
              });
        })
        .bodyToMono(String.class);
  }  
}
