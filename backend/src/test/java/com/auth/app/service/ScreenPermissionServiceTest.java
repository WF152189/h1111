package com.auth.app.service;

import com.auth.app.client.HttpClient;
import com.auth.app.dto.PermissionCheckResult;
import com.auth.app.dto.external.Api1PermissionRequest;
import com.auth.app.dto.external.Api2PermissionRequest;
import com.auth.app.dto.external.ExternalPermissionResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.time.LocalTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

class ScreenPermissionServiceTest {

    private static final String API1_URL = "http://localhost:3001/api/screen-permission/check";
    private static final String API2_URL = "http://localhost:3002/api/screen-permission/check";
    private static final String API1_START = "08:00";
    private static final String API1_END = "21:00";
    private static final String API2_START = "00:00";  // 24時間運用（深夜0時開始）
    private static final String API2_END = "23:59";  // 24時間運用

    private final HttpClient httpClient = mock(HttpClient.class);
    private ScreenPermissionService service;

    @BeforeEach
    void setUp() {
        service = new ScreenPermissionService(API1_URL, API2_URL, httpClient);
    }

    @Nested
    @DisplayName("resolveApiUrl: 運用時間情報 → API URL解決")
    class ResolveApiUrl {

        @Nested
        @DisplayName("パターン1（両方利用可能）: API1優先、運用時間外ならAPI2")
        class Pattern1 {

            @Test
            @DisplayName("運用時間内（08:00）→ API1")
            void pattern1_at0800_returnsApi1() {
                String result = service.resolveApiUrl(API1_START, API1_END, API2_START, API2_END, LocalTime.of(8, 0));
                assertThat(result).isEqualTo(API1_URL);
            }

            @Test
            @DisplayName("運用時間内（12:00）→ API1")
            void pattern1_at1200_returnsApi1() {
                String result = service.resolveApiUrl(API1_START, API1_END, API2_START, API2_END, LocalTime.of(12, 0));
                assertThat(result).isEqualTo(API1_URL);
            }

            @Test
            @DisplayName("運用時間内（20:59）→ API1")
            void pattern1_at2059_returnsApi1() {
                String result = service.resolveApiUrl(API1_START, API1_END, API2_START, API2_END, LocalTime.of(20, 59));
                assertThat(result).isEqualTo(API1_URL);
            }

            @Test
            @DisplayName("API1運用時間外（21:00）→ API2（フォールバック）")
            void pattern1_at2100_returnsApi2() {
                String result = service.resolveApiUrl(API1_START, API1_END, API2_START, API2_END, LocalTime.of(21, 0));
                assertThat(result).isEqualTo(API2_URL);
            }

            @Test
            @DisplayName("API1運用時間外（07:59）→ API2（フォールバック）")
            void pattern1_at0759_returnsApi2() {
                String result = service.resolveApiUrl(API1_START, API1_END, API2_START, API2_END, LocalTime.of(7, 59));
                assertThat(result).isEqualTo(API2_URL);
            }

            @Test
            @DisplayName("深夜（00:00）→ API2（フォールバック）")
            void pattern1_at0000_returnsApi2() {
                String result = service.resolveApiUrl(API1_START, API1_END, API2_START, API2_END, LocalTime.of(0, 0));
                assertThat(result).isEqualTo(API2_URL);
            }

            @Test
            @DisplayName("時刻フォーマット不正 → IllegalArgumentException")
            void pattern1_invalidTimeFormat_throwsException() {
                assertThatThrownBy(() -> service.resolveApiUrl("abc", "21:00", API2_START, API2_END, LocalTime.of(12, 0)))
                        .isInstanceOf(IllegalArgumentException.class)
                        .hasMessageContaining("時刻フォーマット");
            }
        }

        @Nested
        @DisplayName("パターン2（API1のみ）: 常にAPI1")
        class Pattern2 {

            @Test
            @DisplayName("08:00 → API1")
            void pattern2_at0800_returnsApi1() {
                String result = service.resolveApiUrl(API1_START, API1_END, null, null, LocalTime.of(8, 0));
                assertThat(result).isEqualTo(API1_URL);
            }

            @Test
            @DisplayName("22:00 → API1")
            void pattern2_at2200_returnsApi1() {
                String result = service.resolveApiUrl(API1_START, API1_END, null, null, LocalTime.of(22, 0));
                assertThat(result).isEqualTo(API1_URL);
            }
        }

        @Nested
        @DisplayName("パターン3（API2のみ）: 常にAPI2")
        class Pattern3 {

            @Test
            @DisplayName("08:00 → API2")
            void pattern3_at0800_returnsApi2() {
                String result = service.resolveApiUrl(null, null, API2_START, API2_END, LocalTime.of(8, 0));
                assertThat(result).isEqualTo(API2_URL);
            }

            @Test
            @DisplayName("22:00 → API2")
            void pattern3_at2200_returnsApi2() {
                String result = service.resolveApiUrl(null, null, API2_START, API2_END, LocalTime.of(22, 0));
                assertThat(result).isEqualTo(API2_URL);
            }
        }

        @Nested
        @DisplayName("異常系")
        class Invalid {

            @Test
            @DisplayName("すべての運用時間がnull → IllegalArgumentException")
            void allNull_throwsException() {
                assertThatThrownBy(() -> service.resolveApiUrl(null, null, null, null, LocalTime.now()))
                        .isInstanceOf(IllegalArgumentException.class)
                        .hasMessageContaining("運用時間情報が不正");
            }

            @Test
            @DisplayName("api1Startのみ指定（api1Endがnull）→ パターン3扱いでAPI2")
            void partialApi1_returnsApi2() {
                // api1Startのみでapi1Endがnullの場合、hasApi1=falseとなり、
                // api2もnullなので例外
                assertThatThrownBy(() -> service.resolveApiUrl(API1_START, null, null, null, LocalTime.now()))
                        .isInstanceOf(IllegalArgumentException.class)
                        .hasMessageContaining("運用時間情報が不正");
            }
        }
    }

    @Nested
    @DisplayName("checkPermission: 外部API呼び出し + 結果返却")
    class CheckPermission {

        @Test
        @DisplayName("error.flg=false → 権限あり")
        void checkPermission_noError_returnsTrue() {
            ExternalPermissionResponse response = new ExternalPermissionResponse(
                    new ExternalPermissionResponse.BbData(),
                    new ExternalPermissionResponse.ErrorData(false, null)
            );
            when(httpClient.post(eq(API1_URL), any(), eq(ExternalPermissionResponse.class)))
                    .thenReturn(response);

            // パターン2（API1のみ）
            PermissionCheckResult result = service.checkPermission("SCREEN_1", "user001", API1_START, API1_END, null, null);

            assertThat(result.isAuthorized()).isTrue();
            assertThat(result.getErrorMessage()).isNull();
            verify(httpClient).post(eq(API1_URL), any(Api1PermissionRequest.class), eq(ExternalPermissionResponse.class));
        }

        @Test
        @DisplayName("error.flg=true → 権限なし + エラーメッセージあり")
        void checkPermission_hasError_returnsFalse() {
            ExternalPermissionResponse response = new ExternalPermissionResponse(
                    new ExternalPermissionResponse.BbData(),
                    new ExternalPermissionResponse.ErrorData(true, "権限がありません")
            );
            when(httpClient.post(eq(API2_URL), any(), eq(ExternalPermissionResponse.class)))
                    .thenReturn(response);

            // パターン3（API2のみ）
            PermissionCheckResult result = service.checkPermission("SCREEN_1", "user001", null, null, API2_START, API2_END);

            assertThat(result.isAuthorized()).isFalse();
            assertThat(result.getErrorMessage()).isEqualTo("権限がありません");
            verify(httpClient).post(eq(API2_URL), any(Api2PermissionRequest.class), eq(ExternalPermissionResponse.class));
        }

        @Test
        @DisplayName("error=null → 権限なし")
        void checkPermission_errorNull_returnsFalse() {
            ExternalPermissionResponse response = new ExternalPermissionResponse(
                    new ExternalPermissionResponse.BbData(),
                    null
            );
            when(httpClient.post(anyString(), any(), eq(ExternalPermissionResponse.class)))
                    .thenReturn(response);

            PermissionCheckResult result = service.checkPermission("SCREEN_1", "user001", API1_START, API1_END, null, null);

            assertThat(result.isAuthorized()).isFalse();
        }

        @Test
        @DisplayName("HttpClient例外はそのまま伝播")
        void checkPermission_httpException_propagates() {
            when(httpClient.post(anyString(), any(), eq(ExternalPermissionResponse.class)))
                    .thenThrow(new HttpClient.HttpClientException("connection failed"));

            assertThatThrownBy(() -> service.checkPermission("SCREEN_1", "user001", API1_START, API1_END, null, null))
                    .isInstanceOf(HttpClient.HttpClientException.class);
        }

        @Test
        @DisplayName("運用時間不正 → IllegalArgumentException が伝播")
        void checkPermission_invalidHours_propagates() {
            assertThatThrownBy(() -> service.checkPermission("SCREEN_1", "user001", null, null, null, null))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("運用時間情報が不正");
        }

        @Test
        @DisplayName("パターン1で運用時間指定 → 時間帯に応じたAPI選択")
        void checkPermission_pattern1_withHours_selectsCorrectApi() {
            ExternalPermissionResponse response = new ExternalPermissionResponse(
                    new ExternalPermissionResponse.BbData(),
                    new ExternalPermissionResponse.ErrorData(false, null)
            );
            when(httpClient.post(eq(API1_URL), any(), eq(ExternalPermissionResponse.class)))
                    .thenReturn(response);

            // 12:00 はAPI1運用時間内（08:00-21:00）→ API1
            PermissionCheckResult result = service.checkPermission("SCREEN_1", "user001", API1_START, API1_END, API2_START, API2_END);

            assertThat(result.isAuthorized()).isTrue();
            verify(httpClient).post(eq(API1_URL), any(Api1PermissionRequest.class), eq(ExternalPermissionResponse.class));
        }
    }
}
