package com.auth.app.controller;

import com.auth.app.client.HttpClient;
import com.auth.app.dto.PermissionCheckResult;
import com.auth.app.dto.ScreenPermissionRequest;
import com.auth.app.dto.ScreenPermissionResponse;
import com.auth.app.service.ScreenPermissionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ScreenPermissionControllerTest {

    @Mock
    private ScreenPermissionService screenPermissionService;

    private ScreenPermissionController controller;

    @BeforeEach
    void setUp() {
        controller = new ScreenPermissionController(screenPermissionService);
    }

    @Nested
    @DisplayName("バリデーション")
    class Validation {

        @Test
        @DisplayName("screenId が null → 400 Bad Request")
        void checkPermission_nullScreenId_returns400() {
            ScreenPermissionRequest request = ScreenPermissionRequest.builder()
                    .screenId(null)
                    .build();

            ResponseEntity<ScreenPermissionResponse> result = controller.checkPermission(request);

            assertThat(result.getStatusCode().value()).isEqualTo(400);
            assertThat(result.getBody()).isNotNull();
            assertThat(result.getBody().isAuthorized()).isFalse();
            assertThat(result.getBody().getReason()).isEqualTo("画面IDが無効です");
            verifyNoInteractions(screenPermissionService);
        }

        @Test
        @DisplayName("screenId が空文字 → 400 Bad Request")
        void checkPermission_emptyScreenId_returns400() {
            ScreenPermissionRequest request = ScreenPermissionRequest.builder()
                    .screenId("")
                    .build();

            ResponseEntity<ScreenPermissionResponse> result = controller.checkPermission(request);

            assertThat(result.getStatusCode().value()).isEqualTo(400);
            assertThat(result.getBody().getReason()).isEqualTo("画面IDが無効です");
            verifyNoInteractions(screenPermissionService);
        }
    }

    @Nested
    @DisplayName("認可成功")
    class Authorized {

        @Test
        @DisplayName("Service が authorized=true を返す → 200 + authorized=true")
        void checkPermission_authorized_returns200() {
            ScreenPermissionRequest request = ScreenPermissionRequest.builder()
                    .screenId("SCREEN_1")
                    .api1Start("08:00")
                    .api1End("21:00")
                    .api2Start("00:00")
                    .api2End("23:59")
                    .build();

            PermissionCheckResult serviceResult = new PermissionCheckResult(true, null);
            when(screenPermissionService.checkPermission("SCREEN_1", "eeeeeeee", "08:00", "21:00", "00:00", "23:59"))
                    .thenReturn(serviceResult);

            ResponseEntity<ScreenPermissionResponse> result = controller.checkPermission(request);

            assertThat(result.getStatusCode().is2xxSuccessful()).isTrue();
            assertThat(result.getBody().isAuthorized()).isTrue();
            assertThat(result.getBody().getMessage()).isEqualTo("アクセスが許可されています");
            verify(screenPermissionService).checkPermission("SCREEN_1", "eeeeeeee", "08:00", "21:00", "00:00", "23:59");
        }
    }

    @Nested
    @DisplayName("認可拒否")
    class Denied {

        @Test
        @DisplayName("Service が authorized=false + errorMessage を返す → 200 + authorized=false + reason=errorMessage")
        void checkPermission_denied_withErrorMessage_returns200WithReason() {
            ScreenPermissionRequest request = ScreenPermissionRequest.builder()
                    .screenId("SCREEN_1")
                    .api2Start("00:00")
                    .api2End("23:59")
                    .build();

            PermissionCheckResult serviceResult = new PermissionCheckResult(false, "権限がありません");
            when(screenPermissionService.checkPermission("SCREEN_1", "eeeeeeee", null, null, "00:00", "23:59"))
                    .thenReturn(serviceResult);

            ResponseEntity<ScreenPermissionResponse> result = controller.checkPermission(request);

            assertThat(result.getStatusCode().is2xxSuccessful()).isTrue();
            assertThat(result.getBody().isAuthorized()).isFalse();
            assertThat(result.getBody().getReason()).isEqualTo("権限がありません");
        }

        @Test
        @DisplayName("Service が authorized=false + errorMessage=null を返す → 200 + reason=デフォルトメッセージ")
        void checkPermission_denied_withoutErrorMessage_returnsDefaultReason() {
            ScreenPermissionRequest request = ScreenPermissionRequest.builder()
                    .screenId("SCREEN_1")
                    .api2Start("00:00")
                    .api2End("23:59")
                    .build();

            PermissionCheckResult serviceResult = new PermissionCheckResult(false, null);
            when(screenPermissionService.checkPermission("SCREEN_1", "eeeeeeee", null, null, "00:00", "23:59"))
                    .thenReturn(serviceResult);

            ResponseEntity<ScreenPermissionResponse> result = controller.checkPermission(request);

            assertThat(result.getStatusCode().is2xxSuccessful()).isTrue();
            assertThat(result.getBody().isAuthorized()).isFalse();
            assertThat(result.getBody().getReason()).isEqualTo("この画面へのアクセス権限がありません");
        }
    }

    @Nested
    @DisplayName("例外処理")
    class ExceptionHandling {

        @Test
        @DisplayName("IllegalArgumentException → 400 Bad Request")
        void checkPermission_illegalArgumentException_returns400() {
            ScreenPermissionRequest request = ScreenPermissionRequest.builder()
                    .screenId("SCREEN_1")
                    .build();

            when(screenPermissionService.checkPermission("SCREEN_1", "eeeeeeee", null, null, null, null))
                    .thenThrow(new IllegalArgumentException("運用時間情報が不正です。いずれかのAPIの運用時間が必要です"));

            ResponseEntity<ScreenPermissionResponse> result = controller.checkPermission(request);

            assertThat(result.getStatusCode().value()).isEqualTo(400);
            assertThat(result.getBody().isAuthorized()).isFalse();
            assertThat(result.getBody().getReason()).isEqualTo("運用時間情報が不正です。いずれかのAPIの運用時間が必要です");
        }

        @Test
        @DisplayName("HttpClientException → 503 Service Unavailable")
        void checkPermission_httpClientException_returns503() {
            ScreenPermissionRequest request = ScreenPermissionRequest.builder()
                    .screenId("SCREEN_1")
                    .api1Start("08:00")
                    .api1End("21:00")
                    .api2Start("00:00")
                    .api2End("23:59")
                    .build();

            when(screenPermissionService.checkPermission("SCREEN_1", "eeeeeeee", "08:00", "21:00", "00:00", "23:59"))
                    .thenThrow(new HttpClient.HttpClientException("connection failed"));

            ResponseEntity<ScreenPermissionResponse> result = controller.checkPermission(request);

            assertThat(result.getStatusCode().value()).isEqualTo(503);
            assertThat(result.getBody().isAuthorized()).isFalse();
            assertThat(result.getBody().getReason()).isEqualTo("外部認可システムとの通信に失敗しました");
        }
    }
}
