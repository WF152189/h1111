package com.auth.app.repository;

import com.auth.app.model.StubAuthCode;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StubAuthCodeRepository extends JpaRepository<StubAuthCode, String> {
}
