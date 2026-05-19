package com.auth.app.model;

import jakarta.persistence.*;
import lombok.*;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "roles")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class Role {

    @Id
    @Column(name = "role_id")
    private String roleId;

    @Column(name = "role_name", nullable = false)
    private String roleName;

    private String description;

    @OneToMany(fetch = FetchType.EAGER)
    @JoinColumn(name = "role_id")
    @Builder.Default
    private Set<RolePermission> permissions = new HashSet<>();
}
