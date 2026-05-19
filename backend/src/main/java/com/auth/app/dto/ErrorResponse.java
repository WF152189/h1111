package com.auth.app.dto;

import lombok.*;
import java.time.Instant;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class ErrorResponse {
    private String status;
    private String errorCode;
    private String errorMessage;
    private String requestId;
    private String timestamp;

    public static ErrorResponse of(String errorCode, String errorMessage, String requestId) {
        return ErrorResponse.builder()
                .status("error")
                .errorCode(errorCode)
                .errorMessage(errorMessage)
                .requestId(requestId)
                .timestamp(Instant.now().toString())
                .build();
    }
}
