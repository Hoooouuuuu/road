package com.cctv.road.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

  @Override
  public void addResourceHandlers(ResourceHandlerRegistry registry) {
    // ✅ 정적 이미지 경로
    registry.addResourceHandler("/image/**")
        .addResourceLocations("classpath:/static/image/");

    // ✅ /api/** 경로는 정적 리소스로 빠지지 않도록 방지
    registry.addResourceHandler("/api/**")
        .addResourceLocations("classpath:/none/"); // 존재하지 않는 더미 경로
  }
}