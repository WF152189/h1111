package com.auth.app.controller;

import com.auth.app.client.HttpClient;
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
                    .typeId("A")
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
                    .typeId("A")
                    .build();

            ResponseEntity<ScreenPermissionResponse> result = controller.checkPermission(request);

            assertThat(result.getStatusCode().value()).isEqualTo(400);
            assertThat(result.getBody().getReason()).isEqualTo("画面IDが無効です");
            verifyNoInteractions(screenPermissionService);
        }

        @Test
        @DisplayName("typeId が null → 400 Bad Request")
        void checkPermission_nullTypeId_returns400() {
            ScreenPermissionRequest request = ScreenPermissionRequest.builder()
                    .screenId("SCREEN_1")
                    .typeId(null)
                    .build();

            ResponseEntity<ScreenPermissionResponse> result = controller.checkPermission(request);

            assertThat(result.getStatusCode().value()).isEqualTo(400);
            assertThat(result.getBody().getReason()).isEqualTo("タイプIDが無効です");
            verifyNoInteractions(screenPermissionService);
        }

        @Test
        @DisplayName("typeId が空文字 → 400 Bad Request")
        void checkPermission_emptyTypeId_returns400() {
            ScreenPermissionRequest request = ScreenPermissionRequest.builder()
                    .screenId("SCREEN_1")
                    .typeId("")
                    .build();

            ResponseEntity<ScreenPermissionResponse> result = controller.checkPermission(request);

            assertThat(result.getStatusCode().value()).isEqualTo(400);
            assertThat(result.getBody().getReason()).isEqualTo("タイプIDが無効です");
            verifyNoInteractions(screenPermissionService);
        }
    }

    @Nested
    @DisplayName("認可成功")
    class Authorized {

        @Test
        @DisplayName("Service が true を返す → 200 + authorized=true")
        void checkPermission_authorized_returns200() {
            ScreenPermissionRequest request = ScreenPermissionRequest.builder()
                    .screenId("SCREEN_1")
                    .typeId("A")
                    .build();

            when(screenPermissionService.checkPermission("SCREEN_1", "eeeeeeee", "A"))
                    .thenReturn(true);

            ResponseEntity<ScreenPermissionResponse> result = controller.checkPermission(request);

            assertThat(result.getStatusCode().is2xxSuccessful()).isTrue();
            assertThat(result.getBody().isAuthorized()).isTrue();
            assertThat(result.getBody().getMessage()).isEqualTo("アクセスが許可されています");
            verify(screenPermissionService).checkPermission("SCREEN_1", "eeeeeeee", "A");
        }
    }

    @Nested
    @DisplayName("認可拒否")
    class Denied {

        @Test
        @DisplayName("Service が false を返す → 200 + authorized=false")
        void checkPermission_denied_returns200WithFalse() {
            ScreenPermissionRequest request = ScreenPermissionRequest.builder()
                    .screenId("SCREEN_1")
                    .typeId("B")
                    .build();

            when(screenPermissionService.checkPermission("SCREEN_1", "eeeeeeee", "B"))
                    .thenReturn(false);

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
                    .typeId("X")
                    .build();

            when(screenPermissionService.checkPermission("SCREEN_1", "eeeeeeee", "X"))
                    .thenThrow(new IllegalArgumentException("不明なtypeId: X"));

            ResponseEntity<ScreenPermissionResponse> result = controller.checkPermission(request);

            assertThat(result.getStatusCode().value()).isEqualTo(400);
            assertThat(result.getBody().isAuthorized()).isFalse();
            assertThat(result.getBody().getReason()).isEqualTo("不明なtypeId: X");
        }

        @Test
        @DisplayName("HttpClientException → 503 Service Unavailable")
        void checkPermission_httpClientException_returns503() {
            ScreenPermissionRequest request = ScreenPermissionRequest.builder()
                    .screenId("SCREEN_1")
                    .typeId("A")
                    .build();

            when(screenPermissionService.checkPermission("SCREEN_1", "eeeeeeee", "A"))
                    .thenThrow(new HttpClient.HttpClientException("connection failed"));

            ResponseEntity<ScreenPermissionResponse> result = controller.checkPermission(request);

            assertThat(result.getStatusCode().value()).isEqualTo(503);
            assertThat(result.getBody().isAuthorized()).isFalse();
            assertThat(result.getBody().getReason()).isEqualTo("外部認可システムとの通信に失敗しました");
        }
    }
}
