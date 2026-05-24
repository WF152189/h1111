package com.auth.app.exception;

import lombok.Getter;

/**
 * InternalAuthController 専用例外クラス
 * 
 * 用途:
 * - /auth/validate エンドポイントでのトークン検証エラー
 * - /auth/verify エンドポイントでの内部認証エラー
 */
@Getter
public class InternalAuthException extends RuntimeException {
    
    private final String errorCode;
    private final int status;
    
    public InternalAuthException(String errorCode, String message, int status) {
        super(message);
        this.errorCode = errorCode;
        this.status = status;
    }
    
    /**
     * トークンなしエラー
     */
    public static InternalAuthException tokenNotFound() {
        return new InternalAuthException(
            "TOKEN_NOT_FOUND",
            "認証トークンが見つかりません",
            401
        );
    }
    
    /**
     * トークン形式エラー
     */
    public static InternalAuthException invalidTokenFormat() {
        return new InternalAuthException(
            "INVALID_TOKEN_FORMAT",
            "認証トークンの形式が不正です",
            401
        );
    }
    
    /**
     * トークン検証失敗（署名エラーなど）
     */
    public static InternalAuthException tokenValidationFailed(String message) {
        return new InternalAuthException(
            "TOKEN_VALIDATION_FAILED",
            message != null ? message : "認証トークンの検証に失敗しました",
            401
        );
    }
    
    /**
     * トークン期限切れ
     */
    public static InternalAuthException tokenExpired() {
        return new InternalAuthException(
            "TOKEN_EXPIRED",
            "認証トークンの有効期限が切れています",
            401
        );
    }
}
