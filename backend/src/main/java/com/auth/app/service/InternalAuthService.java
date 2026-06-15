package com.auth.app.service;

import com.auth.app.client.HttpClient;
import com.auth.app.exception.InternalAuthException;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.Map;

/**
 * 内部認証サービス
 * 
 * 責務:
 * - 外部認可システムAPIの呼び出し
 * - 認可チェック結果の処理
 * 
 * 外部認可システム:
 * - エンドポイント: http://localhost:3000/api/authorization/check
 * - メソッド: POST
 * - リクエスト: { "userId": "ユーザーID" }
 * - レスポンス: { "authorized": true, "message": "認可成功", ... }
 */
@Service
@Slf4j
public class InternalAuthService {
    
    @Value("${external.authorization.url:http://localhost:3000/api/authorization/check}")
    private String authorizationApiUrl;

    private final HttpClient httpClient;
    private final JwtService jwtService;

    /**
     * コンストラクタ
     */
    public InternalAuthService(HttpClient httpClient, JwtService jwtService) {
        this.httpClient = httpClient;
        this.jwtService = jwtService;
    }

    /**
     * JWT検証 + userId取得
     * 
     * Authorization headerからJWTを取得し、検証後にsubクレームからuserIdを返す。
     * 
     * @param authHeader Authorization header（"Bearer <token>"）
     * @return userId（JWTのsubクレーム）
     * @throws InternalAuthException JWT検証失敗時
     */
    public String validateTokenAndGetUserId(String authHeader) {
        // Authorization headerのチェック
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw InternalAuthException.tokenNotFound();
        }
        
        String token = authHeader.substring(7);
        
        // JWTの検証 + userId取得
        try {
            Claims claims = jwtService.validateToken(token);
            String userId = claims.getSubject();
            log.debug("JWT検証成功: userId={}", userId);
            return userId;
        } catch (ExpiredJwtException e) {
            log.warn("JWT期限切れ: {}", e.getMessage());
            throw InternalAuthException.tokenExpired();
        } catch (JwtException e) {
            log.warn("JWT検証失敗: {}", e.getMessage());
            throw InternalAuthException.tokenValidationFailed(e.getMessage());
        }
    }

    /**
     * 外部認可システムで認可チェックを実行
     * 
     * フロー:
     * 1. HttpClient で外部認可システムAPIを呼び出し
     * 2. 認可結果を取得して返す
     * 
     * @param userId ユーザー識別子（Entra ID sub/oid）
     * @return AuthorizationResult 認可結果（部署・資格コード含む）
     */
    public AuthorizationResult checkAuthorization(String userId) {
        log.debug("外部認可システム呼び出し開始: userId={}, url={}", userId, authorizationApiUrl);

        // HttpClient で外部API呼び出し
        Map<String, Object> response = httpClient.post(
            authorizationApiUrl,
            Map.of("userId", userId)
        );

        log.debug("外部認可システム応答受信: userId={}, response={}", userId, response);

        // 認可結果を取得
        Boolean authorized = (Boolean) response.get("authorized");
        String department = (String) response.get("department");
        String qualificationCode = (String) response.get("qualificationCode");
        String message = (String) response.get("message");

        log.info("外部認可システム応答: userId={}, authorized={}, department={}, qualificationCode={}", 
            userId, authorized, department, qualificationCode);
        
        return new AuthorizationResult(
            authorized != null && authorized,
            department,
            qualificationCode,
            message
        );
    }

    /**
     * 認可結果DTO
     */
    @lombok.Data
    @lombok.AllArgsConstructor
    public static class AuthorizationResult {
        private boolean authorized;
        private String department;
        private String qualificationCode;
        private String message;
    }
}
