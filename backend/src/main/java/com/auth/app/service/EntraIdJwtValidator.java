package com.auth.app.service;

import com.auth.app.exception.AuthException;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.math.BigInteger;
import java.security.KeyFactory;
import java.security.PublicKey;
import java.security.spec.RSAPublicKeySpec;
import java.util.Base64;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Entra ID JWT検証サービス
 * 
 * 本番環境でのEntra ID JWT検証を実装
 * - JWKS（JSON Web Key Set）から公開鍵を取得
 * - 署名検証（RSA）
 * - Issuer（iss）検証
 * - Audience（aud）検証
 * - 有効期限（exp）検証
 */
@Service
@Slf4j
public class EntraIdJwtValidator {

    private final String tenantId;
    private final String clientId;
    private final String issuer;
    private final String jwksUri;
    private final boolean stubEnabled;
    
    private final JwtService jwtService;
    private final RestTemplate restTemplate;
    
    // JWKSキャッシュ（1時間有効）
    private final Map<String, CachedJwks> jwksCache = new ConcurrentHashMap<>();
    private static final long JWKS_CACHE_TTL_MS = 3600000; // 1時間

    public EntraIdJwtValidator(
            @Value("${entra.tenant-id}") String tenantId,
            @Value("${entra.client-id}") String clientId,
            @Value("${entra.issuer}") String issuer,
            @Value("${entra.jwks-uri}") String jwksUri,
            @Value("${stub.enabled}") boolean stubEnabled,
            JwtService jwtService) {
        this.tenantId = tenantId;
        this.clientId = clientId;
        this.issuer = issuer;
        this.jwksUri = jwksUri;
        this.stubEnabled = stubEnabled;
        this.jwtService = jwtService;
        this.restTemplate = new RestTemplate();
    }

    /**
     * Entra ID JWTを検証
     * 
     * 検証項目:
     * 1. 署名検証（JWKSから取得した公開鍵）
     * 2. Issuer（iss）検証
     * 3. Audience（aud）検証
     * 4. 有効期限（exp）検証
     * 
     * @param token Entra ID ID Token
     * @return 検証済みのClaims
     */
    public Claims validateEntraIdToken(String token) {
        // スタブモードの場合は簡易検証
        if (stubEnabled) {
            log.debug("スタブモード: 簡易JWT検証を実行");
            return validateStubJwt(token);
        }

        // 本番モード: 完全な検証
        log.debug("本番モード: Entra ID JWT検証を実行");
        return validateProductionJwt(token);
    }

    /**
     * 本番環境用JWT検証
     */
    private Claims validateProductionJwt(String token) {
        try {
            // JWTのヘッダーからkid（Key ID）を取得
            String kid = extractKidFromToken(token);
            log.debug("JWT kid: {}", kid);

            // JWKSから公開鍵を取得
            PublicKey publicKey = getPublicKey(kid);

            // JWT検証（署名、iss、aud、exp）
            Claims claims = Jwts.parser()
                    .verifyWith(publicKey)
                    .requireIssuer(issuer)
                    .requireAudience(clientId)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();

            // 追加の検証
            validateTokenClaims(claims);

            log.info("Entra ID JWT検証成功: sub={}, email={}", 
                    claims.getSubject(), claims.get("email", String.class));
            
            return claims;

        } catch (ExpiredJwtException e) {
            log.warn("Entra ID JWT有効期限切れ: {}", e.getMessage());
            throw AuthException.entraJwtExpired();
        } catch (JwtException e) {
            log.warn("Entra ID JWT検証失敗: {}", e.getMessage());
            throw AuthException.entraTokenInvalid();
        } catch (Exception e) {
            log.error("Entra ID JWT検証で予期せぬエラー: {}", e.getMessage(), e);
            throw AuthException.entraTokenInvalid();
        }
    }

    /**
     * スタブ環境用JWT検証
     */
    private Claims validateStubJwt(String token) {
        return jwtService.validateEntraJwt(token);
    }

    /**
     * JWTトークンからkid（Key ID）を抽出
     */
    private String extractKidFromToken(String token) {
        try {
            String[] parts = token.split("\\.");
            String headerJson = new String(Base64.getUrlDecoder().decode(parts[0]));
            
            // 簡易的なJSONパース（本番ではJSONライブラリ使用を推奨）
            int kidIndex = headerJson.indexOf("\"kid\"");
            if (kidIndex == -1) {
                throw new JwtException("JWTヘッダーにkidが含まれていません");
            }
            
            int colonIndex = headerJson.indexOf(":", kidIndex);
            int quoteStart = headerJson.indexOf("\"", colonIndex);
            int quoteEnd = headerJson.indexOf("\"", quoteStart + 1);
            
            return headerJson.substring(quoteStart + 1, quoteEnd);
        } catch (Exception e) {
            throw new JwtException("JWTヘッダーの解析に失敗しました: " + e.getMessage());
        }
    }

    /**
     * JWKSから公開鍵を取得（キャッシュ付き）
     */
    private PublicKey getPublicKey(String kid) {
        // キャッシュチェック
        CachedJwks cached = jwksCache.get(kid);
        if (cached != null && !cached.isExpired()) {
            log.debug("JWKSキャッシュを使用: kid={}", kid);
            return cached.getPublicKey();
        }

        // JWKSフェッチ
        log.info("JWKSをフェッチ: uri={}", jwksUri);
        try {
            Map<String, Object> jwks = restTemplate.getForObject(jwksUri, Map.class);
            
            if (jwks == null || !jwks.containsKey("keys")) {
                throw new JwtException("JWKSの取得に失敗しました");
            }

            // 一致するkidの鍵を探す
            @SuppressWarnings("unchecked")
            var keys = (java.util.List<Map<String, Object>>) jwks.get("keys");
            
            for (var key : keys) {
                String keyKid = (String) key.get("kid");
                if (kid.equals(keyKid)) {
                    PublicKey publicKey = buildPublicKey(key);
                    
                    // キャッシュに保存
                    jwksCache.put(kid, new CachedJwks(publicKey));
                    
                    log.info("JWKSから公開鍵を取得: kid={}", kid);
                    return publicKey;
                }
            }

            throw new JwtException("指定されたkidの公開鍵が見つかりません: " + kid);

        } catch (Exception e) {
            log.error("JWKSフェッチエラー: {}", e.getMessage(), e);
            throw new JwtException("JWKSの取得に失敗しました: " + e.getMessage());
        }
    }

    /**
     * JWKからPublicKeyを構築
     */
    private PublicKey buildPublicKey(Map<String, Object> jwk) {
        try {
            String kty = (String) jwk.get("kty");
            if (!"RSA".equals(kty)) {
                throw new JwtException("サポートされていない鍵タイプ: " + kty);
            }

            String nStr = (String) jwk.get("n");
            String eStr = (String) jwk.get("e");

            // Base64URLデコード
            byte[] nBytes = Base64.getUrlDecoder().decode(nStr);
            byte[] eBytes = Base64.getUrlDecoder().decode(eStr);

            // BigIntegerに変換
            BigInteger modulus = new BigInteger(1, nBytes);
            BigInteger exponent = new BigInteger(1, eBytes);

            // RSAPublicKeySpecを作成
            RSAPublicKeySpec spec = new RSAPublicKeySpec(modulus, exponent);
            KeyFactory factory = KeyFactory.getInstance("RSA");
            
            return factory.generatePublic(spec);

        } catch (Exception e) {
            throw new JwtException("公開鍵の構築に失敗しました: " + e.getMessage());
        }
    }

    /**
     * トークンのクレームを追加検証
     */
    private void validateTokenClaims(Claims claims) {
        // sub（Subject）の存在確認
        String subject = claims.getSubject();
        if (subject == null || subject.isEmpty()) {
            throw new JwtException("JWTにsubクレームが含まれていません");
        }

        // emailの存在確認（オプション）
        String email = claims.get("email", String.class);
        if (email != null && !email.isEmpty()) {
            log.debug("JWT email: {}", email);
        }

        // 必要に応じて追加の検証を実装
        // 例: nonce検証、acr検証等
    }

    /**
     * JWKSキャッシュエントリ
     */
    private static class CachedJwks {
        private final PublicKey publicKey;
        private final long cachedAt;

        public CachedJwks(PublicKey publicKey) {
            this.publicKey = publicKey;
            this.cachedAt = System.currentTimeMillis();
        }

        public PublicKey getPublicKey() {
            return publicKey;
        }

        public boolean isExpired() {
            return System.currentTimeMillis() - cachedAt > JWKS_CACHE_TTL_MS;
        }
    }
}
