package com.auth.app.service;

import com.auth.app.dto.AuthResponse;
import com.auth.app.exception.AuthException;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthenticationServiceTest {

    @Mock
    private JwtService jwtService;

    @Mock
    private EntraIdJwtValidator entraIdJwtValidator;

    @InjectMocks
    private AuthenticationService authenticationService;

    @Test
    @DisplayName("Entra JWT検証成功時はsubjectから業務JWTを発行して返す")
    void verifyAndIssueTokens_success_returnsBusinessJwt() {
        String entraJwt = "entra-jwt";
        String userId = "user123";
        String businessJwt = "business-jwt";
        Claims claims = Jwts.claims().subject(userId).build();

        when(entraIdJwtValidator.validateEntraIdToken(entraJwt)).thenReturn(claims);
        when(jwtService.generateToken(userId)).thenReturn(businessJwt);

        AuthResponse result = authenticationService.verifyAndIssueTokens(entraJwt);

        assertThat(result.getToken()).isEqualTo(businessJwt);
        verify(entraIdJwtValidator).validateEntraIdToken(entraJwt);
        verify(jwtService).generateToken(userId);
    }

    @Test
    @DisplayName("Entra JWT検証がAuthExceptionを投げた場合は業務JWTを発行せず例外を伝播する")
    void verifyAndIssueTokens_validatorThrowsAuthException_doesNotGenerateToken() {
        String entraJwt = "invalid-entra-jwt";
        AuthException exception = AuthException.entraTokenInvalid();

        when(entraIdJwtValidator.validateEntraIdToken(entraJwt)).thenThrow(exception);

        assertThatThrownBy(() -> authenticationService.verifyAndIssueTokens(entraJwt))
                .isSameAs(exception);

        verify(jwtService, never()).generateToken(anyString());
    }

    @Test
    @DisplayName("業務JWT発行で例外が発生した場合は例外を伝播する")
    void verifyAndIssueTokens_jwtServiceThrows_propagatesException() {
        String entraJwt = "entra-jwt";
        String userId = "user123";
        Claims claims = Jwts.claims().subject(userId).build();

        when(entraIdJwtValidator.validateEntraIdToken(entraJwt)).thenReturn(claims);
        when(jwtService.generateToken(userId)).thenThrow(new IllegalStateException("jwt error"));

        assertThatThrownBy(() -> authenticationService.verifyAndIssueTokens(entraJwt))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("jwt error");
    }

    @Test
    @DisplayName("logoutは例外なく完了する")
    void logout_doesNotThrow() {
        assertThatCode(() -> authenticationService.logout()).doesNotThrowAnyException();
    }
}
