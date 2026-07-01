package com.auth.app.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 画面権限リクエストDTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScreenPermissionRequest {
    private String screenId;
    private String typeId;
    private String api1Start;  // API1運用開始時刻（例: "08:00"）
    private String api1End;    // API1運用終了時刻（例: "21:00"）
    private String api2Start;  // API2運用開始時刻（例: "08:00"）
    private String api2End;    // API2運用終了時刻（例: "23:59"）
}
