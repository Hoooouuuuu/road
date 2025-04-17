package com.cctv.road.map.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.reactive.function.client.WebClient;

import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api/proxy")
public class NaverProxyController {

  private final WebClient naverClient;
  private final WebClient seoulBusClient;

  private final String API_KEY = "%2BeQx9OSSFJWXxpa7KLX3uCtS5jFahsaCrTIztoPznu%2FEWJIcRbbojkhQAPcyIwzLvyjwqgi5AmSMqv8A5IoOYg%3D%3D";

  @Value("${naver.map.client-id}")
  private String naverClientId;

  @Value("${naver.map.client-secret}")
  private String naverClientSecret;

  public NaverProxyController(WebClient.Builder builder) {
    this.naverClient = builder.baseUrl("https://naveropenapi.apigw.ntruss.com").build();
    this.seoulBusClient = builder.baseUrl("http://ws.bus.go.kr").build();
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
            .queryParam("coordinate", "127.1054328,37.3595953") // 현재 좌표 넣으면 정확도 향상됨
            .build())
        .header("X-NCP-APIGW-API-KEY-ID", naverClientId)
        .header("X-NCP-APIGW-API-KEY", naverClientSecret)
        .accept(MediaType.APPLICATION_JSON)
        .retrieve()
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
}
