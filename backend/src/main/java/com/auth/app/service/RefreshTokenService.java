package com.auth.app.service;

import com.auth.app.exception.AuthException;
import com.auth.app.model.RefreshToken;
import com.auth.app.repository.RefreshTokenRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HexFormat;

@Service
@RequiredArgsConstructor
public class RefreshTokenService {

    private final RefreshTokenRepository refreshTokenRepository;

    @Value("${rt.expiration-seconds}")
    private long rtExpirationSeconds;

    private static final SecureRandom secureRandom = new SecureRandom();

    /**
     * 新規リフレッシュトークンを生成・DB保存し、平文RTを返す
     */
    @Transactional
    public String createRefreshToken(String userId) {
        // ランダム文字列生成（Opaque RT）
        byte[] randomBytes = new byte[32];
        secureRandom.nextBytes(randomBytes);
        String rawToken = Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);

        // ハッシュ化してDB保存
        String tokenHash = hashToken(rawToken);
        RefreshToken entity = RefreshToken.builder()
                .tokenHash(tokenHash)
                .userId(userId)
                .expiresAt(LocalDateTime.now().plusSeconds(rtExpirationSeconds))
                .isRevoked(false)
                .createdAt(LocalDateTime.now())
                .build();
        refreshTokenRepository.save(entity);

        return rawToken;
    }

    /**
     * RTを検証し、ユーザーIDを返す
     */
    public String validateRefreshToken(String rawToken) {
        String tokenHash = hashToken(rawToken);
        RefreshToken entity = refreshTokenRepository.findByTokenHash(tokenHash)
                .orElseThrow(AuthException::rtExpired);

        if (entity.getIsRevoked()) {
            throw AuthException.rtRevoked();
        }
        if (entity.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw AuthException.rtExpired();
        }

        return entity.getUserId();
    }

    /**
     * RTローテーション: 旧RT無効化 → 新RT発行
     */
    @Transactional
    public String rotateRefreshToken(String oldRawToken, String userId) {
        // 旧RTを無効化
        revokeToken(oldRawToken);
        // 新RTを発行
        return createRefreshToken(userId);
    }

    /**
     * RTを無効化する
     */
    @Transactional
    public void revokeToken(String rawToken) {
        String tokenHash = hashToken(rawToken);
        refreshTokenRepository.findByTokenHash(tokenHash).ifPresent(entity -> {
            entity.setIsRevoked(true);
            refreshTokenRepository.save(entity);
        });
    }

    /**
     * ユーザーの全RTを無効化する
     */
    @Transactional
    public void revokeAllTokensForUser(String userId) {
        refreshTokenRepository.revokeAllByUserId(userId);
    }

    /**
     * SHA-256ハッシュ化
     */
    private String hashToken(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 not available", e);
        }
    }
}
