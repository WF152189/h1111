package com.auth.app.model;

import jakarta.persistence.*;
import lombok.*;
import java.io.Serializable;

@Entity
@Table(name = "role_permissions")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
@IdClass(RolePermissionId.class)
public class RolePermission {

    @Id
    @Column(name = "role_id")
    private String roleId;

    @Id
    private String resource;

    @Id
    private String action;

    /**
     * "resource:action" 形式の権限文字列を返す
     */
    public String toPermissionString() {
        return resource + ":" + action;
    }
}
