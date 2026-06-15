package com.auth.app.dto;

import lombok.*;

/**
 * 認証レスポンスDTO
 * 
 * 設計方針:
 * - 正常終了: HTTP 200 + success=true
 * - エラー時: HTTP 401/500 + ErrorResponse（GlobalExceptionHandler）
 */
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class AuthResponse {
    // 成功フラグ
    private boolean success;
    
    // 業務JWT（内部操作用、JSONシリアライズ時除外）
    @com.fasterxml.jackson.annotation.JsonIgnore
    private String token;
    
    /**
     * 成功レスポンスを生成
     */
    public static AuthResponse success() {
        return AuthResponse.builder()
                .success(true)
                .build();
    }
}