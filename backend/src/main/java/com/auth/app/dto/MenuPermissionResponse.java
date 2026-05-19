package com.auth.app.dto;

import lombok.*;
import java.util.List;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class MenuPermissionResponse {
    private String userId;
    private List<String> roles;
    private List<String> permissions;
}
