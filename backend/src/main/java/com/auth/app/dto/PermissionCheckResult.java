package com.auth.app.dto;

/**
 * 画面権限判定結果DTO
 * 
 * Service層からController層へ権限判定結果を渡すためのDTO
 */
public class PermissionCheckResult {

    private final boolean authorized;
    private final String errorMessage;

    public PermissionCheckResult(boolean authorized, String errorMessage) {
        this.authorized = authorized;
        this.errorMessage = errorMessage;
    }

    public boolean isAuthorized() {
        return authorized;
    }

    public String getErrorMessage() {
        return errorMessage;
    }
}
