package com.auth.app.service;

import com.auth.app.exception.AuthException;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

class EntraIdJwtValidatorTest {

    private static final String TENANT_ID = "tenant-id";
    private static final String CLIENT_ID = "client-id";
    private static final String ISSUER = "https://login.microsoftonline.com/tenant-id/v2.0";
    private static final String JWKS_URI = "https://login.microsoftonline.com/tenant-id/discovery/v2.0/keys";

    private final JwtService jwtService = mock(JwtService.class);

    @Nested
    @DisplayName("スタブモード")
    class StubMode {

        @Test
        @DisplayName("stub.enabled=trueの場合はJwtService.validateEntraJwtへ委譲する")
        void validateEntraIdToken_stubMode_delegatesToJwtService() {
            String token = "stub-entra-jwt";
            Claims claims = Jwts.claims().subject("user123").build();
            EntraIdJwtValidator validator = new EntraIdJwtValidator(
                    TENANT_ID, CLIENT_ID, ISSUER, JWKS_URI, true, jwtService);

            when(jwtService.validateEntraJwt(token)).thenReturn(claims);

            Claims result = validator.validateEntraIdToken(token);

            assertThat(result).isSameAs(claims);
            verify(jwtService).validateEntraJwt(token);
        }

        @Test
        @DisplayName("スタブモードでJwtServiceが例外を投げた場合はそのまま伝播する")
        void validateEntraIdToken_stubMode_propagatesJwtException() {
            String token = "invalid-stub-entra-jwt";
            JwtException exception = new JwtException("invalid");
            EntraIdJwtValidator validator = new EntraIdJwtValidator(
                    TENANT_ID, CLIENT_ID, ISSUER, JWKS_URI, true, jwtService);

            when(jwtService.validateEntraJwt(token)).thenThrow(exception);

            assertThatThrownBy(() -> validator.validateEntraIdToken(token))
                    .isSameAs(exception);
        }
    }

    @Nested
    @DisplayName("本番モード")
    class ProductionMode {

        @Test
        @DisplayName("JWT形式でない文字列を渡すとENTRA_JWT_INVALIDを投げる")
        void validateEntraIdToken_invalidJwt_throwsAuthException() {
            EntraIdJwtValidator validator = new EntraIdJwtValidator(
                    TENANT_ID, CLIENT_ID, ISSUER, JWKS_URI, false, jwtService);

            assertThatThrownBy(() -> validator.validateEntraIdToken("not-a-jwt"))
                    .isInstanceOf(AuthException.class)
                    .hasFieldOrPropertyWithValue("errorCode", "ENTRA_JWT_INVALID");
        }

        @Test
        @DisplayName("JWT形式だが署名が無効な場合はENTRA_JWT_INVALIDを投げる")
        void validateEntraIdToken_malformedSignature_throwsAuthException() {
            EntraIdJwtValidator validator = new EntraIdJwtValidator(
                    TENANT_ID, CLIENT_ID, ISSUER, JWKS_URI, false, jwtService);

            // JWT形式（header.payload.signature）だが署名が無効
            String malformedJwt = "eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJ1c2VyMTIzIn0.invalid-signature";

            assertThatThrownBy(() -> validator.validateEntraIdToken(malformedJwt))
                    .isInstanceOf(AuthException.class)
                    .hasFieldOrPropertyWithValue("errorCode", "ENTRA_JWT_INVALID");
        }

        @Nested
        @DisplayName("実装詳細: privateメソッドの検証")
        class PrivateMethodTests {

            @Test
            @DisplayName("Issuerが一致しない場合はENTRA_JWT_INVALIDを投げる")
            void validateClaims_issuerMismatch_throwsAuthException() throws Exception {
                EntraIdJwtValidator validator = new EntraIdJwtValidator(
                        TENANT_ID, CLIENT_ID, ISSUER, JWKS_URI, false, jwtService);
                com.nimbusds.jwt.JWTClaimsSet claimsSet = new com.nimbusds.jwt.JWTClaimsSet.Builder()
                        .subject("user123")
                        .issuer("https://invalid.example.com")
                        .audience(CLIENT_ID)
                        .build();

                assertThatThrownBy(() -> ReflectionTestUtils.invokeMethod(validator, "validateClaims", claimsSet))
                        .isInstanceOf(AuthException.class)
                        .hasFieldOrPropertyWithValue("errorCode", "ENTRA_JWT_INVALID");
            }

            @Test
            @DisplayName("Audienceが一致しない場合はENTRA_JWT_INVALIDを投げる")
            void validateClaims_audienceMismatch_throwsAuthException() throws Exception {
                EntraIdJwtValidator validator = new EntraIdJwtValidator(
                        TENANT_ID, CLIENT_ID, ISSUER, JWKS_URI, false, jwtService);
                com.nimbusds.jwt.JWTClaimsSet claimsSet = new com.nimbusds.jwt.JWTClaimsSet.Builder()
                        .subject("user123")
                        .issuer(ISSUER)
                        .audience("other-client-id")
                        .build();

                assertThatThrownBy(() -> ReflectionTestUtils.invokeMethod(validator, "validateClaims", claimsSet))
                        .isInstanceOf(AuthException.class)
                        .hasFieldOrPropertyWithValue("errorCode", "ENTRA_JWT_INVALID");
            }

            @Test
            @DisplayName("IssuerとAudienceが一致する場合は例外を投げない")
            void validateClaims_validClaims_doesNotThrow() throws Exception {
                EntraIdJwtValidator validator = new EntraIdJwtValidator(
                        TENANT_ID, CLIENT_ID, ISSUER, JWKS_URI, false, jwtService);
                com.nimbusds.jwt.JWTClaimsSet claimsSet = new com.nimbusds.jwt.JWTClaimsSet.Builder()
                        .subject("user123")
                        .issuer(ISSUER)
                        .audience(List.of("other-client-id", CLIENT_ID))
                        .build();

                ReflectionTestUtils.invokeMethod(validator, "validateClaims", claimsSet);
            }

            @Test
            @DisplayName("Nimbus claimsをJJWT Claimsへ変換する")
            void convertToJwtClaims_mapsNimbusClaims() throws Exception {
                EntraIdJwtValidator validator = new EntraIdJwtValidator(
                        TENANT_ID, CLIENT_ID, ISSUER, JWKS_URI, false, jwtService);
                com.nimbusds.jwt.JWTClaimsSet claimsSet = new com.nimbusds.jwt.JWTClaimsSet.Builder()
                        .subject("user123")
                        .issuer(ISSUER)
                        .audience(CLIENT_ID)
                        .claim("email", "user@example.com")
                        .build();

                Claims result = ReflectionTestUtils.invokeMethod(validator, "convertToJwtClaims", claimsSet);

                assertThat(result).isNotNull();
                assertThat(result.getSubject()).isEqualTo("user123");
                assertThat(result.getIssuer()).isEqualTo(ISSUER);
                assertThat(result.get("email", String.class)).isEqualTo("user@example.com");
            }
        }
    }
}
