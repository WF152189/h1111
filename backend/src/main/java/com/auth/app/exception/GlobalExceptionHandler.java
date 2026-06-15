package com.auth.app.exception;

import com.auth.app.dto.ErrorResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.UUID;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    @ExceptionHandler(AuthException.class)
    public ResponseEntity<ErrorResponse> handleAuthException(AuthException ex) {
        String requestId = UUID.randomUUID().toString();
        log.warn("認証エラー [{}]: code={}, message={}", requestId, ex.getErrorCode(), ex.getMessage());

        ErrorResponse error = ErrorResponse.of(
                ex.getErrorCode(),
                ex.getMessage(),
                requestId
        );
        return ResponseEntity.status(ex.getStatus()).body(error);
    }

    @ExceptionHandler(InternalAuthException.class)
    public ResponseEntity<ErrorResponse> handleInternalAuthException(InternalAuthException ex) {
        String requestId = UUID.randomUUID().toString();
        log.warn("内部認証エラー [{}]: code={}, message={}", requestId, ex.getErrorCode(), ex.getMessage());

        ErrorResponse error = ErrorResponse.of(
                ex.getErrorCode(),
                ex.getMessage(),
                requestId
        );
        return ResponseEntity.status(ex.getStatus()).body(error);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDeniedException(AccessDeniedException ex) {
        String requestId = UUID.randomUUID().toString();
        log.warn("権限エラー [{}]: {}", requestId, ex.getMessage());

        ErrorResponse error = ErrorResponse.of(
                "FORBIDDEN",
                "この操作に必要な権限がありません",
                requestId
        );
        return ResponseEntity.status(403).body(error);
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<ErrorResponse> handleRuntimeException(RuntimeException ex) {
        String requestId = UUID.randomUUID().toString();
        log.error("外部サービス連携エラー [{}]: {}", requestId, ex.getMessage(), ex);

        ErrorResponse error = ErrorResponse.of(
                "SERVICE_UNAVAILABLE",
                "外部サービスとの通信に失敗しました",
                requestId
        );
        return ResponseEntity.status(503).body(error);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGenericException(Exception ex) {
        String requestId = UUID.randomUUID().toString();
        log.error("内部エラー [{}]: {}", requestId, ex.getMessage(), ex);

        ErrorResponse error = ErrorResponse.of(
                "INTERNAL_ERROR",
                "システムエラーが発生しました",
                requestId
        );
        return ResponseEntity.status(500).body(error);
    }
}
