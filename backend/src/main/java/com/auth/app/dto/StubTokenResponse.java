package com.auth.app.dto;

import lombok.*;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class StubTokenResponse {
    private String tokenType;
    private String idToken;
    private int expiresIn;
}
