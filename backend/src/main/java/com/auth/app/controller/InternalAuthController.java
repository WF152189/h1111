package com.auth.app.controller;

import com.auth.app.dto.InternalAuthResponse;
import com.auth.app.exception.AuthException;
import com.auth.app.service.JwtService;
import io.jsonwebtoken.Claims;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * 内部認証コントローラー（セキュリティ修正済み）
 * 
 * Entra ID認証後に追加の認可チェックを行う
 * セキュリティ上の改善:
 * - リクエストボディからuserIdを直接取得しない（改ざん防止）
 * - AuthorizationヘッダーのJWTから信頼できるユーザーIDを抽出
 * - JWTの署名検証を経てから認可チェックを実行
 * 
 * スタブ環境では簡易的な実装、本番環境では外部認可サーバーと連携
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Slf4j
public class InternalAuthController {

    private final JwtService jwtService;

    /**
     * POST /api/auth/internal-check
     * 内部承認チェック（セキュリティ修正済み）
     * 
     * フロー:
     * 1. Authorizationヘッダーから業務JWTを抽出（Bearer トークン）
     * 2. JWTの署名検証を実施（改ざん検知）
     * 3. JWTからユーザーIDを抽出（信頼できる情報）
     * 4. ユーザーIDで外部認可サーバーにチェック（スタブ: isUserAuthorized）
     * 
     * @return 承認結果
     */
    @PostMapping("/internal-check")
    public ResponseEntity<InternalAuthResponse> internalCheck(
            @RequestHeader("Authorization") String authHeader) {
        
        // Step 1: Bearerトークン抽出
        String businessJwt = extractBearerToken(authHeader);
        
        // Step 2: JWT署名検証 + ユーザーID抽出
        // validateToken()で署名・有効期限・issuerを自動検証
        // 検証失敗時は例外スロー（GlobalExceptionHandlerで処理）
        String userId;
        try {
            Claims claims = jwtService.validateToken(businessJwt);
            userId = claims.getSubject();
            log.info("内部認証チェック開始: userId={}", userId);
        } catch (Exception e) {
            log.warn("JWT検証に失敗しました: {}", e.getMessage());
            throw AuthException.internalAuthFailed();
        }
        
        // Step 3: 外部認可サーバーでチェック（スタブ実装）
        boolean authorized = isUserAuthorized(userId);
        
        if (authorized) {
            log.info("内部認証成功: userId={}", userId);
            return ResponseEntity.ok(
                InternalAuthResponse.builder()
                    .authorized(true)
                    .message("承認されました")
                    .build()
            );
        } else {
            log.warn("内部認証拒否: userId={}", userId);
            return ResponseEntity.ok(
                InternalAuthResponse.builder()
                    .authorized(false)
                    .reason("アクセス権限がありません")
                    .build()
            );
        }
    }
    
    /**
     * AuthorizationヘッダーからBearerトークンを抽出
     */
    private String extractBearerToken(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            log.warn("Authorizationヘッダーが無効です");
            throw AuthException.tokenInvalid();
        }
        return authHeader.substring(7);
    }
    
    /**
     * ユーザーの認可状態をチェック（スタブ実装）
     * 
     * 本番環境では外部認可サーバーAPIを呼び出す
     * 
     * @param userId チェック対象のユーザーID
     * @return 認可の成否
     */
    private boolean isUserAuthorized(String userId) {
        // スタブロジック:
        // - admin001, user001: 認可成功（通常ユーザー）
        // - denied001: 認可拒否（アクセス権限なし）
        // - error001: エラー発生（システムエラー）
        // - それ以外: 認可拒否
        
        if ("error001".equals(userId)) {
            // エラーケースのスタブ: 内部認証失敗例外をスロー
            log.error("内部認証システムエラー: userId={}", userId);
            throw AuthException.internalAuthFailed();
        }
        
        return "admin001".equals(userId) || "user001".equals(userId);
    }
}
