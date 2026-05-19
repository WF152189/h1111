package com.auth.app.service;

import com.auth.app.dto.AuthResponse;
import com.auth.app.dto.UserPermissionInfo;
import com.auth.app.exception.AuthException;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthenticationService {

    private final JwtService jwtService;
    private final RefreshTokenService refreshTokenService;
    private final UserService userService;
    private final EntraIdJwtValidator entraIdJwtValidator;

    /**
     * Entra JWT検証 → 業務JWT + RT発行
     * 
     * 本番環境での検証フロー:
     * 1. JWKSから公開鍵取得
     * 2. 署名検証（RSA）
     * 3. Issuer（iss）検証
     * 4. Audience（aud）検証
     * 5. 有効期限（exp）検証
     */
    public AuthResponse verifyAndIssueTokens(String entraJwt) {
        // Entra JWT検証
        // - スタブモード: 簡易検証（署名のみ）
        // - 本番モード: 完全検証（署名+iss+aud+exp）
        Claims claims;
        try {
            claims = entraIdJwtValidator.validateEntraIdToken(entraJwt);
        } catch (ExpiredJwtException e) {
            // 有効期限切れ → ENTRA_JWT_EXPIRED
            log.warn("Entra JWT有効期限切れ: {}", e.getMessage());
            throw AuthException.entraJwtExpired();
        } catch (JwtException e) {
            // 署名検証失敗、iss不一致、aud不一致等 → ENTRA_JWT_INVALID
            log.warn("Entra JWT検証失敗: {}", e.getMessage());
            throw AuthException.entraTokenInvalid();
        }

        String userId = claims.getSubject();
        log.info("Entra JWT検証成功: userId={}", userId);

        // ユーザー権限照会
        UserPermissionInfo permInfo = userService.getUserPermissionInfo(userId);
        if (permInfo == null) {
            // ユーザー未登録 → USER_NOT_FOUND
            log.warn("ユーザー未登録: userId={}", userId);
            throw AuthException.userNotFound();
        }

        // 業務JWT生成
        String businessJwt = jwtService.generateToken(
                permInfo.getUserId(),
                permInfo.getEmail(),
                permInfo.getDisplayName(),
                permInfo.getRoles(),
                permInfo.getPermissions()
        );

        log.info("業務JWT発行完了: userId={}, roles={}", userId, permInfo.getRoles());

        return AuthResponse.builder()
                .token(businessJwt)
                .userId(permInfo.getUserId())
                .email(permInfo.getEmail())
                .displayName(permInfo.getDisplayName())
                .roles(permInfo.getRoles())
                .permissions(permInfo.getPermissions())
                .build();
    }

    /**
     * RT更新 → 新規業務JWT + 新規RT発行（RTローテーション）
     */
    public AuthResponse refreshTokens(String oldRawRt) {
        // RT検証
        String userId = refreshTokenService.validateRefreshToken(oldRawRt);
        log.info("RT検証成功: userId={}", userId);

        // 最新権限照会
        UserPermissionInfo permInfo = userService.getUserPermissionInfo(userId);

        // 新規業務JWT生成
        String newBusinessJwt = jwtService.generateToken(
                permInfo.getUserId(),
                permInfo.getEmail(),
                permInfo.getDisplayName(),
                permInfo.getRoles(),
                permInfo.getPermissions()
        );

        log.info("業務JWT再発行完了: userId={}", userId);

        return AuthResponse.builder()
                .token(newBusinessJwt)
                .userId(permInfo.getUserId())
                .email(permInfo.getEmail())
                .displayName(permInfo.getDisplayName())
                .roles(permInfo.getRoles())
                .permissions(permInfo.getPermissions())
                .build();
    }

    /**
     * ログアウト（RT無効化）
     */
    public void logout(String rawRt) {
        refreshTokenService.revokeToken(rawRt);
        log.info("ログアウト: RT無効化完了");
    }
}
