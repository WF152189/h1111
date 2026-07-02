package com.auth.app.dto;

/**
 * 画面権限レスポンスDTO
 */
public class ScreenPermissionResponse {
    
    private boolean authorized;
    private String message;
    private String reason;

    public ScreenPermissionResponse() {
    }

    public ScreenPermissionResponse(boolean authorized, String message, String reason) {
        this.authorized = authorized;
        this.message = message;
        this.reason = reason;
    }

    public boolean isAuthorized() {
        return authorized;
    }

    public void setAuthorized(boolean authorized) {
        this.authorized = authorized;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private boolean authorized;
        private String message;
        private String reason;

        public Builder authorized(boolean authorized) {
            this.authorized = authorized;
            return this;
        }

        public Builder message(String message) {
            this.message = message;
            return this;
        }

        public Builder reason(String reason) {
            this.reason = reason;
            return this;
        }

        public ScreenPermissionResponse build() {
            return new ScreenPermissionResponse(authorized, message, reason);
        }
    }
}
