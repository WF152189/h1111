package com.auth.app.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "stub_auth_codes")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class StubAuthCode {

    @Id
    private String code;

    @Column(name = "user_id", nullable = false)
    private String userId;

    @Column(name = "redirect_uri", nullable = false)
    private String redirectUri;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;
}
