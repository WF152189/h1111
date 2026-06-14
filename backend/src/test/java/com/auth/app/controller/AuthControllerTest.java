package com.auth.app.controller;

import com.auth.app.dto.AuthResponse;
import com.auth.app.exception.AuthException;
import com.auth.app.service.AuthenticationService;
import com.auth.app.service.JwtService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AuthController.class)
@AutoConfigureMockMvc(addFilters = false)  // セキュリティフィルター無効化
@TestPropertySource(properties = {
    "stub.enabled=false",  // 本番モードでテスト
    "cors.allowed-origins=http://localhost:4200"
})
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private AuthenticationService authenticationService;

    @MockBean
    private JwtService jwtService;

    @Value("${stub.enabled}")
    private boolean stubEnabled;

    private static final String TEST_ENTRA_JWT = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.test";
    private static final String TEST_BUSINESS_JWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.business";

    @Nested
    @DisplayName("POST /auth/verify")
    class VerifyEndpoint {

        @Nested
        @DisplayName("本番モード")
        class ProductionMode {

            @Test
            @DisplayName("Entra JWT検証成功 → 200 + 業務JWT")
            void verify_success() throws Exception {
                // Arrange
                AuthResponse authResponse = AuthResponse.builder()
                        .token(TEST_BUSINESS_JWT)
                        .userId("user-123")
                        .build();

                when(authenticationService.verifyAndIssueTokens(TEST_ENTRA_JWT))
                        .thenReturn(authResponse);

                // Act & Assert
                mockMvc.perform(post("/auth/verify")
                                .header("Authorization", "Bearer " + TEST_ENTRA_JWT))
                        .andExpect(status().isOk())
                        .andExpect(header().string("Authorization", "Bearer " + TEST_BUSINESS_JWT))
                        .andExpect(jsonPath("$.userId").value("user-123"));
                // 注意: token は @JsonIgnore でJSONに含まれない

                verify(authenticationService).verifyAndIssueTokens(TEST_ENTRA_JWT);
            }

            @Test
            @DisplayName("Authorization ヘッダーなし → 500（extractBearerToken で例外）")
            void verify_noAuthHeader() throws Exception {
                // Act & Assert
                // extractBearerToken() が AuthException をスロー → 500
                mockMvc.perform(post("/auth/verify"))
                        .andExpect(status().isInternalServerError());

                verify(authenticationService, never()).verifyAndIssueTokens(anyString());
            }

            @Test
            @DisplayName("不正な Authorization ヘッダー → 401")
            void verify_invalidAuthHeader() throws Exception {
                // Act & Assert
                mockMvc.perform(post("/auth/verify")
                                .header("Authorization", "Invalid " + TEST_ENTRA_JWT))
                        .andExpect(status().isUnauthorized());

                verify(authenticationService, never()).verifyAndIssueTokens(anyString());
            }

            @Test
            @DisplayName("Entra JWT検証失敗 → 401")
            void verify_entraJwtInvalid() throws Exception {
                // Arrange
                when(authenticationService.verifyAndIssueTokens(TEST_ENTRA_JWT))
                        .thenThrow(AuthException.entraTokenInvalid());

                // Act & Assert
                mockMvc.perform(post("/auth/verify")
                                .header("Authorization", "Bearer " + TEST_ENTRA_JWT))
                        .andExpect(status().isUnauthorized());
            }

            @Test
            @DisplayName("認証サービス例外 → 500")
            void verify_serviceException() throws Exception {
                // Arrange
                when(authenticationService.verifyAndIssueTokens(TEST_ENTRA_JWT))
                        .thenThrow(new RuntimeException("Unexpected error"));

                // Act & Assert
                mockMvc.perform(post("/auth/verify")
                                .header("Authorization", "Bearer " + TEST_ENTRA_JWT))
                        .andExpect(status().isInternalServerError());
            }
        }
    }

    @Nested
    @DisplayName("POST /auth/logout")
    class LogoutEndpoint {

        @Test
        @DisplayName("ログアウト成功 → 200")
        void logout_success() throws Exception {
            // Act & Assert
            mockMvc.perform(post("/auth/logout"))
                    .andExpect(status().isOk());

            verify(authenticationService).logout();
        }

        @Test
        @DisplayName("ログアウト時に認証ヘッダー不要")
        void logout_noAuthRequired() throws Exception {
            // Act & Assert
            mockMvc.perform(post("/auth/logout"))
                    .andExpect(status().isOk());
        }
    }
}
