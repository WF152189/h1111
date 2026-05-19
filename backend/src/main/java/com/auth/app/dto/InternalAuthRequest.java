package com.auth.app.dto;

import lombok.*;

/**
 * 内部認証リクエストDTO
 */
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class InternalAuthRequest {
    private String userId;
}
