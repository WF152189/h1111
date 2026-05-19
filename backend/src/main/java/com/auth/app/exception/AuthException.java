package com.auth.app.exception;

import org.springframework.http.HttpStatus;
import lombok.Getter;

@Getter
public class AuthException extends RuntimeException {

    private final HttpStatus status;
    private final String errorCode;

    public AuthException(HttpStatus status, String errorCode, String message) {
        super(message);
        this.status = status;
        this.errorCode = errorCode;
    }

    // 401系
    public static AuthException tokenExpired() {
        return new AuthException(HttpStatus.UNAUTHORIZED, "TOKEN_EXPIRED", "業務JWTの有効期限が切れています");
    }

    public static AuthException tokenInvalid() {
        return new AuthException(HttpStatus.UNAUTHORIZED, "TOKEN_INVALID", "業務JWTが無効です");
    }

    public static AuthException rtExpired() {
        return new AuthException(HttpStatus.UNAUTHORIZED, "RT_EXPIRED", "リフレッシュトークンの有効期限が切れています");
    }

    public static AuthException rtRevoked() {
        return new AuthException(HttpStatus.UNAUTHORIZED, "RT_REVOKED", "リフレッシュトークンは無効化されています");
    }

    public static AuthException entraTokenInvalid() {
        return new AuthException(HttpStatus.UNAUTHORIZED, "ENTRA_JWT_INVALID", "Entra JWTの署名検証に失敗しました");
    }

    public static AuthException entraJwtExpired() {
        return new AuthException(HttpStatus.UNAUTHORIZED, "ENTRA_JWT_EXPIRED", "Entra JWTの有効期限が切れています");
    }

    public static AuthException userNotFound() {
        return new AuthException(HttpStatus.UNAUTHORIZED, "USER_NOT_FOUND", "Entra JWTのユーザーが見つかりません");
    }

    public static AuthException internalAuthFailed() {
        return new AuthException(HttpStatus.UNAUTHORIZED, "INTERNAL_AUTH_FAILED", "内部認証に失敗しました");
    }

    // 403系
    public static AuthException forbidden() {
        return new AuthException(HttpStatus.FORBIDDEN, "FORBIDDEN", "この操作に必要な権限がありません");
    }

    public static AuthException userInactive() {
        return new AuthException(HttpStatus.FORBIDDEN, "USER_INACTIVE", "ユーザーアカウントが無効です");
    }
}
