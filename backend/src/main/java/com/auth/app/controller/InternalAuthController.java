package com.auth.app.controller;

import com.auth.app.exception.InternalAuthException;
import com.auth.app.service.InternalAuthService;
import com.auth.app.service.JwtService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * 内部認証コントローラー
 * 
 * Entra IDのsubクレームを検証し、业务用システムへの認可をチェックする
 */
@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
@Slf4j
public class InternalAuthController {

    private final InternalAuthService internalAuthService;
    private final JwtService jwtService;
    
    @Value("${stub.enabled}")
    private boolean stubEnabled;

    /**
     * POST /auth/validate
     * Entra ID subクレーム検証API
     * 
     * フロー:
     * 1. InternalAuthService でJWT検証 + userId取得
     * 2. userIdのフォーマット・有効性を検証
     * 3. 業務システムへの認可是否存在をチェック
     * 4. 認可失敗時は success=false を返す
     * 5. 部署・資格コードを含むJWTを再生成
     * 6. 検証結果を返す
     * 
     * @param request 空のJSONオブジェクト（{}）
     * @return 検証結果
     */
    @PostMapping("/validate")
    public ResponseEntity<ValidationResponse> validate(
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) {
        
        // スタブモード: 検証成功としてレスポンスを返す
        if (stubEnabled) {
            log.info("[スタブ] sub検証成功としてレスポンスを返します");
            
            return ResponseEntity.ok(
                ValidationResponse.builder()
                    .success(true)
                    .message("[スタブ] 検証成功")
                    .build()
            );
        }
        
        // 本番モード: 通常の検証処理
        // Step 1: JWT検証 + userId取得（サービス層で処理）
        String authHeader = httpRequest.getHeader("Authorization");
        String userId = internalAuthService.validateTokenAndGetUserId(authHeader);
        
        // Step 2: userIdのフォーマット検証（GUID形式であることを確認）
        if (!isValidSubFormat(userId)) {
            log.warn("userIdフォーマットが無効: userId={}", userId);
            throw InternalAuthException.tokenValidationFailed("userIdのフォーマットが無効です");
        }
        
        // Step 3: 外部認可システムで認可チェック
        InternalAuthService.AuthorizationResult authResult;
        try {
            authResult = internalAuthService.checkAuthorization(userId);
        } catch (Exception e) {
            // 外部認可システムとの通信失敗 → 503 Service Unavailable
            log.error("外部認可システム呼び出しエラー: userId={}, error={}", userId, e.getMessage());
            throw new RuntimeException("外部認可システムとの通信に失敗しました", e);
        }
        
        // Step 4: 認可結果チェック
        if (!authResult.isAuthorized()) {
            log.warn("認可失敗: userId={}, message={}", userId, authResult.getMessage());
            return ResponseEntity.ok(
                ValidationResponse.builder()
                    .success(false)
                    .message(authResult.getMessage() != null ? authResult.getMessage() : "権限がありません")
                    .build()
            );
        }
        
        // Step 5: JWT再生成（部署・資格コードを含む）
        String newToken = jwtService.generateTokenWithClaims(
            userId,
            authResult.getDepartment(),
            authResult.getQualificationCode()
        );
        
        // Authorizationヘッダーに新JWTを設定
        httpResponse.addHeader("Authorization", "Bearer " + newToken);
        
        // Step 6: 検証成功を返す
        log.info("sub検証成功: userId={}, department={}, qualificationCode={}", 
            userId, authResult.getDepartment(), authResult.getQualificationCode());
        return ResponseEntity.ok(
            ValidationResponse.builder()
                .success(true)
                .message("検証成功")
                .build()
        );
    }

    /**
     * subのフォーマット検証（GUID形式）
     */
    private boolean isValidSubFormat(String sub) {
        // GUID形式: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (32文字+4ハイフン)
        // または単なる文字列（開発環境用）
        if (sub.matches("[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}")) {
            return true;
        }
        // 開発環境用の簡易チェック（英数字のみ）
        if (sub.matches("[a-zA-Z0-9]+")) {
            return true;
        }
        return false;
    }

    /**
     * 検証レスポンスDTO
     */
    @lombok.Data
    @lombok.Builder
    public static class ValidationResponse {
        private boolean success;
        private String message;
    }
}