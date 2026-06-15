package com.auth.app.controller;

import com.auth.app.exception.InternalAuthException;
import com.auth.app.service.InternalAuthService;
import com.auth.app.service.JwtService;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class InternalAuthControllerTest {

    private static final String AUTH_HEADER = "Bearer business-token";
    private static final String USER_ID = "user123";
    private static final String NEW_TOKEN = "new-business-token";

    @Mock
    private InternalAuthService internalAuthService;

    @Mock
    private JwtService jwtService;

    private InternalAuthController controller;
    private MockHttpServletRequest request;
    private MockHttpServletResponse response;

    @BeforeEach
    void setUp() {
        controller = new InternalAuthController(internalAuthService, jwtService);
        ReflectionTestUtils.setField(controller, "stubEnabled", false);

        request = new MockHttpServletRequest();
        response = new MockHttpServletResponse();
    }

    @Nested
    @DisplayName("stub mode")
    class StubMode {

        @Test
        @DisplayName("stub.enabled=trueなら検証処理を呼ばずsuccess=trueを返す")
        void validate_stubMode_returnsSuccessWithoutCallingServices() {
            ReflectionTestUtils.setField(controller, "stubEnabled", true);

            ResponseEntity<InternalAuthController.ValidationResponse> result =
                    controller.validate(request, response);

            assertThat(result.getStatusCode().is2xxSuccessful()).isTrue();
            assertThat(result.getBody()).isNotNull();
            assertThat(result.getBody().isSuccess()).isTrue();
            verifyNoInteractions(internalAuthService, jwtService);
        }
    }

    @Nested
    @DisplayName("production mode")
    class ProductionMode {

        @Test
        @DisplayName("JWT検証と外部認可が成功した場合はsuccess=trueと新JWTヘッダーを返す")
        void validate_authorized_returnsSuccessAndNewJwtHeader() {
            request.addHeader("Authorization", AUTH_HEADER);
            InternalAuthService.AuthorizationResult authorizationResult =
                    new InternalAuthService.AuthorizationResult(true, "sales", "Q001", "ok");

            when(internalAuthService.validateTokenAndGetUserId(AUTH_HEADER)).thenReturn(USER_ID);
            when(internalAuthService.checkAuthorization(USER_ID)).thenReturn(authorizationResult);
            when(jwtService.generateTokenWithClaims(USER_ID, "sales", "Q001")).thenReturn(NEW_TOKEN);

            ResponseEntity<InternalAuthController.ValidationResponse> result =
                    controller.validate(request, response);

            assertThat(result.getStatusCode().is2xxSuccessful()).isTrue();
            assertThat(result.getBody()).isNotNull();
            assertThat(result.getBody().isSuccess()).isTrue();
            assertThat(response.getHeader("Authorization")).isEqualTo("Bearer " + NEW_TOKEN);
            verify(internalAuthService).validateTokenAndGetUserId(AUTH_HEADER);
            verify(internalAuthService).checkAuthorization(USER_ID);
            verify(jwtService).generateTokenWithClaims(USER_ID, "sales", "Q001");
        }

        @Test
        @DisplayName("外部認可が拒否した場合はHTTP 200 + success=falseを返し新JWTは発行しない")
        void validate_denied_returnsSuccessFalseWithoutNewJwt() {
            request.addHeader("Authorization", AUTH_HEADER);
            InternalAuthService.AuthorizationResult authorizationResult =
                    new InternalAuthService.AuthorizationResult(false, null, null, "denied");

            when(internalAuthService.validateTokenAndGetUserId(AUTH_HEADER)).thenReturn(USER_ID);
            when(internalAuthService.checkAuthorization(USER_ID)).thenReturn(authorizationResult);

            ResponseEntity<InternalAuthController.ValidationResponse> result =
                    controller.validate(request, response);

            assertThat(result.getStatusCode().is2xxSuccessful()).isTrue();
            assertThat(result.getBody()).isNotNull();
            assertThat(result.getBody().isSuccess()).isFalse();
            assertThat(result.getBody().getMessage()).isEqualTo("denied");
            assertThat(response.getHeader("Authorization")).isNull();
            verify(jwtService, never()).generateTokenWithClaims(anyString(), any(), any());
        }

        @Test
        @DisplayName("認可拒否メッセージがnullの場合はデフォルトメッセージを返す")
        void validate_deniedWithoutMessage_returnsDefaultMessage() {
            request.addHeader("Authorization", AUTH_HEADER);
            InternalAuthService.AuthorizationResult authorizationResult =
                    new InternalAuthService.AuthorizationResult(false, null, null, null);

            when(internalAuthService.validateTokenAndGetUserId(AUTH_HEADER)).thenReturn(USER_ID);
            when(internalAuthService.checkAuthorization(USER_ID)).thenReturn(authorizationResult);

            ResponseEntity<InternalAuthController.ValidationResponse> result =
                    controller.validate(request, response);

            assertThat(result.getBody()).isNotNull();
            assertThat(result.getBody().isSuccess()).isFalse();
            assertThat(result.getBody().getMessage()).isNotBlank();
            verify(jwtService, never()).generateTokenWithClaims(anyString(), any(), any());
        }

        @Test
        @DisplayName("Authorizationヘッダーが不正な場合はInternalAuthExceptionを伝播する")
        void validate_invalidToken_throwsInternalAuthException() {
            when(internalAuthService.validateTokenAndGetUserId(null))
                    .thenThrow(InternalAuthException.tokenNotFound());

            assertThatThrownBy(() -> controller.validate(request, response))
                    .isInstanceOf(InternalAuthException.class)
                    .hasFieldOrPropertyWithValue("errorCode", "TOKEN_NOT_FOUND")
                    .hasFieldOrPropertyWithValue("status", HttpServletResponse.SC_UNAUTHORIZED);

            verify(internalAuthService, never()).checkAuthorization(anyString());
            verifyNoInteractions(jwtService);
        }

        @Test
        @DisplayName("JWTのsub形式が不正な場合は認可チェック前に例外を投げる")
        void validate_invalidUserIdFormat_throwsBeforeAuthorizationCheck() {
            request.addHeader("Authorization", AUTH_HEADER);
            when(internalAuthService.validateTokenAndGetUserId(AUTH_HEADER)).thenReturn("invalid-user!");

            assertThatThrownBy(() -> controller.validate(request, response))
                    .isInstanceOf(InternalAuthException.class)
                    .hasFieldOrPropertyWithValue("errorCode", "TOKEN_VALIDATION_FAILED");

            verify(internalAuthService, never()).checkAuthorization(anyString());
            verifyNoInteractions(jwtService);
        }

        @Test
        @DisplayName("外部認可チェックで例外が発生した場合はRuntimeExceptionとして伝播する")
        void validate_authorizationServiceThrows_wrapsAsRuntimeException() {
            request.addHeader("Authorization", AUTH_HEADER);
            when(internalAuthService.validateTokenAndGetUserId(AUTH_HEADER)).thenReturn(USER_ID);
            when(internalAuthService.checkAuthorization(USER_ID))
                    .thenThrow(new RuntimeException("external unavailable"));

            assertThatThrownBy(() -> controller.validate(request, response))
                    .isInstanceOf(RuntimeException.class)
                    .hasCauseInstanceOf(RuntimeException.class);

            verify(jwtService, never()).generateTokenWithClaims(anyString(), any(), any());
        }
    }
}
