package com.auth.app.dto;

import lombok.*;
import java.util.List;

/**
 * 認証レスポンスDTO
 * 
 * 設計方針:
 * - 正常終了: HTTP 200 + ユーザー情報
 * - エラー時: HTTP 401/500 + ErrorResponse（GlobalExceptionHandler）
 * - success フィールドは廃止
 */
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class AuthResponse {
    // ユーザー情報
    private String userId;
    private String email;
    private String displayName;
    private List<String> roles;
    private List<String> permissions;
    
    // 業務JWT（内部操作用、JSONシリアライズ時除外）
    @com.fasterxml.jackson.annotation.JsonIgnore
    private String token;
    
    /**
     * 成功レスポンスを生成
     */
    public static AuthResponse success(String userId, String email, String displayName, 
            List<String> roles, List<String> permissions) {
        return AuthResponse.builder()
                .userId(userId)
                .email(email)
                .displayName(displayName)
                .roles(roles)
                .permissions(permissions)
                .build();
    }
}