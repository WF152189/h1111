package com.auth.app.dto;

import lombok.*;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class UserPermissionInfo {
    private String userId;
    private String email;
    private String displayName;
    private java.util.List<String> roles;
    private java.util.List<String> permissions;
}
