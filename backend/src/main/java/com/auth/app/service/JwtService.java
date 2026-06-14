package com.auth.app.service;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.*;

@Service
public class JwtService {

    private final SecretKey signingKey;
    private final long expirationSeconds;
    private final String issuer;

    public JwtService(
            @Value("${jwt.secret}") String secret,
            @Value("${jwt.expiration-seconds}") long expirationSeconds,
            @Value("${jwt.issuer}") String issuer) {
        this.signingKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expirationSeconds = expirationSeconds;
        this.issuer = issuer;
    }

    /**
     * 業務JWTを生成する（フル情報）
     */
    public String generateToken(String userId, String email, String displayName,
                                 List<String> roles, List<String> permissions) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + expirationSeconds * 1000);

        return Jwts.builder()
                .subject(userId)
                .issuer(issuer)
                .issuedAt(now)
                .expiration(expiry)
                .claim("email", email)
                .claim("display_name", displayName)
                .claim("roles", roles)
                .claim("permissions", permissions)
                .signWith(signingKey)
                .compact();
    }

    /**
     * 業務JWTを生成する（userIdのみ）
     */
    public String generateToken(String userId) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + expirationSeconds * 1000);

        return Jwts.builder()
                .subject(userId)
                .issuer(issuer)
                .issuedAt(now)
                .expiration(expiry)
                .signWith(signingKey)
                .compact();
    }

    /**
     * 業務JWTを検証し、クレームを返す
     */
    public Claims validateToken(String token) {
        return Jwts.parser()
                .verifyWith(signingKey)
                .requireIssuer(issuer)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    /**
     * JWTからユーザーIDを抽出
     */
    public String getUserIdFromToken(String token) {
        return validateToken(token).getSubject();
    }

    /**
     * JWTからロール一覧を抽出
     */
    @SuppressWarnings("unchecked")
    public List<String> getRolesFromToken(String token) {
        Claims claims = validateToken(token);
        return claims.get("roles", List.class);
    }

    /**
     * JWTから権限一覧を抽出
     */
    @SuppressWarnings("unchecked")
    public List<String> getPermissionsFromToken(String token) {
        Claims claims = validateToken(token);
        return claims.get("permissions", List.class);
    }

    /**
     * Entra JWT（スタブ用）を生成する
     */
    public String generateEntraJwt(String userId, String email, String displayName,
                                    String entraIssuer, String clientId) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + 3600 * 1000); // 1時間

        return Jwts.builder()
                .subject(userId)
                .issuer(entraIssuer)
                .issuedAt(now)
                .expiration(expiry)
                .audience().add(clientId).and()
                .claim("email", email)
                .claim("name", displayName)
                .signWith(signingKey)
                .compact();
    }

    /**
     * Entra JWTを簡易検証（スタブモード）
     */
    public Claims validateEntraJwt(String token) {
        return Jwts.parser()
                .verifyWith(signingKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
