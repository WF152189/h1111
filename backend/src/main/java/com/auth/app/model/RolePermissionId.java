package com.auth.app.model;

import lombok.*;
import java.io.Serializable;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@EqualsAndHashCode
public class RolePermissionId implements Serializable {
    private String roleId;
    private String resource;
    private String action;
}
