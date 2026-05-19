package com.auth.app.dto;

import lombok.*;
import java.util.List;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class AuthResponse {
    private String token;
    private String userId;
    private String email;
    private String displayName;
    private List<String> roles;
    private List<String> permissions;
}
