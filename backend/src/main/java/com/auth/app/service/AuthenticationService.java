package com.auth.app.service;

import com.auth.app.dto.AuthResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * 認証サービス
 * 
 * 責務:
 * 1. Entra ID JWT検証 → 業務JWT発行
 * 2. ログアウト
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AuthenticationService {

    private final JwtService jwtService;
    private final EntraIdJwtValidator entraIdJwtValidator;

    /**
     * Entra JWT検証 → 業務JWT発行
     * 
     * フロー:
     * 1. EntraIdJwtValidatorでEntra JWT検証（署名・iss・aud・exp）
     * 2. JwtServiceで業務JWT生成
     */
    public AuthResponse verifyAndIssueTokens(String entraJwt) {
        log.info("=== 認証フロー開始 ===");
        
        // Step 1: Entra JWT検証（MSAL4J + Nimbus-JWT）
        var claims = entraIdJwtValidator.validateEntraIdToken(entraJwt);
        String userId = claims.getSubject();
        log.info("Entra JWT検証成功: userId={}", userId);

        // Step 2: 業務JWT生成
        String businessJwt = jwtService.generateToken(userId);

        log.info("業務JWT発行完了: userId={}", userId);
        log.info("=== 認証フロー完了 ===");

        return AuthResponse.builder()
                .token(businessJwt)
                .userId(userId)
                .build();
    }

    /**
     * ログアウト
     */
    public void logout() {
        log.info("ログアウト完了");
    }
}
