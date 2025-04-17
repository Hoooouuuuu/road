package com.cctv.road.map.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class TrafficMapController {

  @GetMapping("/pages/map/traffic")
  public String trafficMain() {
    return "pages/map/traffic";
  }
}