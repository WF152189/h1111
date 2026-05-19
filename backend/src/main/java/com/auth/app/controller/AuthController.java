package com.auth.app.controller;

import com.auth.app.dto.AuthResponse;
import com.auth.app.exception.AuthException;
import com.auth.app.service.AuthenticationService;
import com.auth.app.service.RefreshTokenService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
@Slf4j
public class AuthController {

    private final AuthenticationService authenticationService;
    private final RefreshTokenService refreshTokenService;

    private static final String RT_COOKIE_NAME = "refresh_token";

    /**
     * POST /auth/verify
     * Entra JWT検証 → 業務JWT + RT発行
     */
    @PostMapping("/verify")
    public ResponseEntity<AuthResponse> verify(
            @RequestHeader("Authorization") String authHeader,
            HttpServletResponse response) {

        String entraJwt = extractBearerToken(authHeader);
        AuthResponse authResponse = authenticationService.verifyAndIssueTokens(entraJwt);

        // RT発行・Cookie設定
        String rawRt = refreshTokenService.createRefreshToken(authResponse.getUserId());
        addRefreshTokenCookie(response, rawRt);

        // アクセストークンをレスポンスヘッダーに設定
        response.addHeader("Authorization", "Bearer " + authResponse.getToken());

        log.info("認証・JWT発行完了: userId={}", authResponse.getUserId());
        
        // トークン情報を除いたレスポンスを返す
        return ResponseEntity.ok(AuthResponse.builder()
                .userId(authResponse.getUserId())
                .email(authResponse.getEmail())
                .displayName(authResponse.getDisplayName())
                .roles(authResponse.getRoles())
                .permissions(authResponse.getPermissions())
                .build());
    }

    /**
     * POST /auth/refresh
     * RT更新 → 新規業務JWT + 新規RT発行（RTローテーション）
     */
    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(
            HttpServletRequest request,
            HttpServletResponse response) {

        String oldRawRt = extractRefreshTokenFromCookie(request);
        if (oldRawRt == null) {
            throw AuthException.rtExpired();
        }

        AuthResponse authResponse = authenticationService.refreshTokens(oldRawRt);

        // RTローテーション
        String newRawRt = refreshTokenService.rotateRefreshToken(oldRawRt, authResponse.getUserId());
        addRefreshTokenCookie(response, newRawRt);

        // アクセストークンをレスポンスヘッダーに設定
        response.addHeader("Authorization", "Bearer " + authResponse.getToken());

        log.info("トークン更新完了: userId={}", authResponse.getUserId());
        
        // トークン情報を除いたレスポンスを返す
        return ResponseEntity.ok(AuthResponse.builder()
                .userId(authResponse.getUserId())
                .email(authResponse.getEmail())
                .displayName(authResponse.getDisplayName())
                .roles(authResponse.getRoles())
                .permissions(authResponse.getPermissions())
                .build());
    }

    /**
     * POST /auth/logout
     * RT無効化・Cookie削除
     */
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
            HttpServletRequest request,
            HttpServletResponse response) {

        String rawRt = extractRefreshTokenFromCookie(request);
        if (rawRt != null) {
            authenticationService.logout(rawRt);
        }

        // Cookie削除
        deleteRefreshTokenCookie(response);

        log.info("ログアウト完了");
        return ResponseEntity.ok().build();
    }

    // --- ヘルパーメソッド ---

    private String extractBearerToken(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw AuthException.entraTokenInvalid();
        }
        return authHeader.substring(7);
    }

    private String extractRefreshTokenFromCookie(HttpServletRequest request) {
        if (request.getCookies() == null) return null;
        return Arrays.stream(request.getCookies())
                .filter(c -> RT_COOKIE_NAME.equals(c.getName()))
                .map(Cookie::getValue)
                .findFirst()
                .orElse(null);
    }

    private void addRefreshTokenCookie(HttpServletResponse response, String rawRt) {
        Cookie cookie = new Cookie(RT_COOKIE_NAME, rawRt);
        cookie.setHttpOnly(true);
        cookie.setPath("/auth");
        cookie.setMaxAge(28800); // 8時間
        // cookie.setSecure(true); // HTTPS環境で有効化
        response.addCookie(cookie);
    }

    private void deleteRefreshTokenCookie(HttpServletResponse response) {
        Cookie cookie = new Cookie(RT_COOKIE_NAME, "");
        cookie.setHttpOnly(true);
        cookie.setPath("/auth");
        cookie.setMaxAge(0);
        response.addCookie(cookie);
    }
}
