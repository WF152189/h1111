package com.auth.app.service;

import com.auth.app.client.HttpClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.time.LocalTime;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

class ScreenPermissionServiceTest {

    private static final String API1_URL = "http://localhost:3001/api/screen-permission/check";
    private static final String API2_URL = "http://localhost:3002/api/screen-permission/check";
    private static final String API1_START = "08:00";
    private static final String API1_END = "21:00";

    private final HttpClient httpClient = mock(HttpClient.class);
    private ScreenPermissionService service;

    @BeforeEach
    void setUp() {
        service = new ScreenPermissionService(API1_URL, API2_URL, API1_START, API1_END, httpClient);
    }

    @Nested
    @DisplayName("resolveApiUrl: typeId + 時刻 → API URL解決")
    class ResolveApiUrl {

        @Nested
        @DisplayName("Aタイプ: 時間帯でAPI1/API2を切替")
        class TypeA {

            @Test
            @DisplayName("運用時間内（08:00）→ API1")
            void typeA_at0800_returnsApi1() {
                String result = service.resolveApiUrl("A", LocalTime.of(8, 0));
                assertThat(result).isEqualTo(API1_URL);
            }

            @Test
            @DisplayName("運用時間内（12:00）→ API1")
            void typeA_at1200_returnsApi1() {
                String result = service.resolveApiUrl("A", LocalTime.of(12, 0));
                assertThat(result).isEqualTo(API1_URL);
            }

            @Test
            @DisplayName("運用時間内（20:59）→ API1")
            void typeA_at2059_returnsApi1() {
                String result = service.resolveApiUrl("A", LocalTime.of(20, 59));
                assertThat(result).isEqualTo(API1_URL);
            }

            @Test
            @DisplayName("運用時間外（21:00）→ API2")
            void typeA_at2100_returnsApi2() {
                String result = service.resolveApiUrl("A", LocalTime.of(21, 0));
                assertThat(result).isEqualTo(API2_URL);
            }

            @Test
            @DisplayName("運用時間外（07:59）→ API2")
            void typeA_at0759_returnsApi2() {
                String result = service.resolveApiUrl("A", LocalTime.of(7, 59));
                assertThat(result).isEqualTo(API2_URL);
            }

            @Test
            @DisplayName("運用時間外（00:00）→ API2")
            void typeA_at0000_returnsApi2() {
                String result = service.resolveApiUrl("A", LocalTime.of(0, 0));
                assertThat(result).isEqualTo(API2_URL);
            }
        }

        @Nested
        @DisplayName("Bタイプ: 常にAPI2")
        class TypeB {

            @Test
            @DisplayName("08:00 → API2")
            void typeB_at0800_returnsApi2() {
                String result = service.resolveApiUrl("B", LocalTime.of(8, 0));
                assertThat(result).isEqualTo(API2_URL);
            }

            @Test
            @DisplayName("22:00 → API2")
            void typeB_at2200_returnsApi2() {
                String result = service.resolveApiUrl("B", LocalTime.of(22, 0));
                assertThat(result).isEqualTo(API2_URL);
            }
        }

        @Nested
        @DisplayName("Cタイプ: 常にAPI1")
        class TypeC {

            @Test
            @DisplayName("08:00 → API1")
            void typeC_at0800_returnsApi1() {
                String result = service.resolveApiUrl("C", LocalTime.of(8, 0));
                assertThat(result).isEqualTo(API1_URL);
            }

            @Test
            @DisplayName("22:00 → API1")
            void typeC_at2200_returnsApi1() {
                String result = service.resolveApiUrl("C", LocalTime.of(22, 0));
                assertThat(result).isEqualTo(API1_URL);
            }
        }

        @Nested
        @DisplayName("異常系")
        class InvalidType {

            @Test
            @DisplayName("null → IllegalArgumentException")
            void nullTypeId_throwsException() {
                assertThatThrownBy(() -> service.resolveApiUrl(null, LocalTime.now()))
                        .isInstanceOf(IllegalArgumentException.class)
                        .hasMessageContaining("typeId が未設定");
            }

            @Test
            @DisplayName("空文字 → IllegalArgumentException")
            void emptyTypeId_throwsException() {
                assertThatThrownBy(() -> service.resolveApiUrl("", LocalTime.now()))
                        .isInstanceOf(IllegalArgumentException.class)
                        .hasMessageContaining("typeId が未設定");
            }

            @Test
            @DisplayName("不明なtypeId → IllegalArgumentException")
            void unknownTypeId_throwsException() {
                assertThatThrownBy(() -> service.resolveApiUrl("X", LocalTime.now()))
                        .isInstanceOf(IllegalArgumentException.class)
                        .hasMessageContaining("不明なtypeId: X");
            }

            @Test
            @DisplayName("小文字 'a' → 大文字に変換して処理（API1）")
            void lowercaseA_returnsApi1() {
                String result = service.resolveApiUrl("a", LocalTime.of(12, 0));
                assertThat(result).isEqualTo(API1_URL);
            }
        }
    }

    @Nested
    @DisplayName("checkPermission: 外部API呼び出し + 結果返却")
    class CheckPermission {

        @Test
        @DisplayName("外部APIが authorized=true を返す → true")
        void checkPermission_authorized_returnsTrue() {
            when(httpClient.post(eq(API1_URL), any(Map.class)))
                    .thenReturn(Map.of("authorized", true));

            boolean result = service.checkPermission("SCREEN_1", "user001", "C");

            assertThat(result).isTrue();
            verify(httpClient).post(eq(API1_URL), any(Map.class));
        }

        @Test
        @DisplayName("外部APIが authorized=false を返す → false")
        void checkPermission_notAuthorized_returnsFalse() {
            when(httpClient.post(eq(API2_URL), any(Map.class)))
                    .thenReturn(Map.of("authorized", false));

            boolean result = service.checkPermission("SCREEN_1", "user001", "B");

            assertThat(result).isFalse();
        }

        @Test
        @DisplayName("外部APIが authorized=null を返す → false")
        void checkPermission_authorizedNull_returnsFalse() {
            when(httpClient.post(anyString(), any(Map.class)))
                    .thenReturn(Map.of("message", "ok"));

            boolean result = service.checkPermission("SCREEN_1", "user001", "C");

            assertThat(result).isFalse();
        }

        @Test
        @DisplayName("HttpClient例外はそのまま伝播")
        void checkPermission_httpException_propagates() {
            when(httpClient.post(anyString(), any(Map.class)))
                    .thenThrow(new HttpClient.HttpClientException("connection failed"));

            assertThatThrownBy(() -> service.checkPermission("SCREEN_1", "user001", "C"))
                    .isInstanceOf(HttpClient.HttpClientException.class);
        }

        @Test
        @DisplayName("typeId不正 → IllegalArgumentException が伝播")
        void checkPermission_invalidTypeId_propagates() {
            assertThatThrownBy(() -> service.checkPermission("SCREEN_1", "user001", "X"))
                    .isInstanceOf(IllegalArgumentException.class);
        }
    }
}
