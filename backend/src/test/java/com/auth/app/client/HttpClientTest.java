package com.auth.app.client;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import reactor.core.publisher.Mono;

import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class HttpClientTest {

    private HttpClient httpClient;

    @Mock
    private WebClient webClient;

    @Mock
    private WebClient.RequestBodyUriSpec requestBodyUriSpec;

    @Mock
    private WebClient.RequestBodySpec requestBodySpec;

    @Mock
    private WebClient.RequestHeadersSpec requestHeadersSpec;

    @Mock
    private WebClient.ResponseSpec responseSpec;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        
        // WebClient.Builder をモック
        WebClient.Builder builder = mock(WebClient.Builder.class);
        when(builder.build()).thenReturn(webClient);
        
        httpClient = new HttpClient(builder);
    }

    @Nested
    @DisplayName("post(url, requestBody)")
    class PostWithUrlAndBody {

        @Test
        @DisplayName("POST成功 → Mapを返す")
        void post_success() {
            // Arrange
            String url = "http://localhost:3000/api/test";
            Map<String, Object> requestBody = Map.of("key", "value");
            Map<String, Object> responseBody = Map.of("result", "success");

            when(webClient.post()).thenReturn(requestBodyUriSpec);
            when(requestBodyUriSpec.uri(url)).thenReturn(requestBodySpec);
            when(requestBodySpec.header(anyString(), anyString())).thenReturn(requestBodySpec);
            when(requestBodySpec.bodyValue(requestBody)).thenReturn(requestHeadersSpec);
            when(requestHeadersSpec.retrieve()).thenReturn(responseSpec);
            when(responseSpec.bodyToMono(any(ParameterizedTypeReference.class)))
                .thenReturn(Mono.just(responseBody));

            // Act
            Map<String, Object> result = httpClient.post(url, requestBody);

            // Assert
            assertNotNull(result);
            assertEquals("success", result.get("result"));
            verify(webClient).post();
            verify(requestBodyUriSpec).uri(url);
        }

        @Test
        @DisplayName("POST成功 → nullレスポンス → 例外スロー")
        void post_nullResponse() {
            // Arrange
            String url = "http://localhost:3000/api/test";
            Map<String, Object> requestBody = Map.of("key", "value");

            when(webClient.post()).thenReturn(requestBodyUriSpec);
            when(requestBodyUriSpec.uri(url)).thenReturn(requestBodySpec);
            when(requestBodySpec.header(anyString(), anyString())).thenReturn(requestBodySpec);
            when(requestBodySpec.bodyValue(requestBody)).thenReturn(requestHeadersSpec);
            when(requestHeadersSpec.retrieve()).thenReturn(responseSpec);
            when(responseSpec.bodyToMono(any(ParameterizedTypeReference.class)))
                .thenReturn(Mono.empty());

            // Act & Assert
            HttpClient.HttpClientException exception = assertThrows(
                HttpClient.HttpClientException.class,
                () -> httpClient.post(url, requestBody)
            );
            assertTrue(exception.getMessage().contains("空のレスポンス"));
        }

        @Test
        @DisplayName("HTTP 400 エラー → HttpClientException スロー")
        void post_http400Error() {
            // Arrange
            String url = "http://localhost:3000/api/test";
            Map<String, Object> requestBody = Map.of("key", "value");

            when(webClient.post()).thenReturn(requestBodyUriSpec);
            when(requestBodyUriSpec.uri(url)).thenReturn(requestBodySpec);
            when(requestBodySpec.header(anyString(), anyString())).thenReturn(requestBodySpec);
            when(requestBodySpec.bodyValue(requestBody)).thenReturn(requestHeadersSpec);
            when(requestHeadersSpec.retrieve()).thenReturn(responseSpec);
            when(responseSpec.bodyToMono(any(ParameterizedTypeReference.class)))
                .thenReturn(Mono.error(WebClientResponseException.create(
                    400, "Bad Request", null, null, null)));

            // Act & Assert
            HttpClient.HttpClientException exception = assertThrows(
                HttpClient.HttpClientException.class,
                () -> httpClient.post(url, requestBody)
            );
            assertTrue(exception.getMessage().contains("400"));
        }

        @Test
        @DisplayName("HTTP 500 エラー → HttpClientException スロー")
        void post_http500Error() {
            // Arrange
            String url = "http://localhost:3000/api/test";
            Map<String, Object> requestBody = Map.of("key", "value");

            when(webClient.post()).thenReturn(requestBodyUriSpec);
            when(requestBodyUriSpec.uri(url)).thenReturn(requestBodySpec);
            when(requestBodySpec.header(anyString(), anyString())).thenReturn(requestBodySpec);
            when(requestBodySpec.bodyValue(requestBody)).thenReturn(requestHeadersSpec);
            when(requestHeadersSpec.retrieve()).thenReturn(responseSpec);
            when(responseSpec.bodyToMono(any(ParameterizedTypeReference.class)))
                .thenReturn(Mono.error(WebClientResponseException.create(
                    500, "Internal Server Error", null, null, null)));

            // Act & Assert
            HttpClient.HttpClientException exception = assertThrows(
                HttpClient.HttpClientException.class,
                () -> httpClient.post(url, requestBody)
            );
            assertTrue(exception.getMessage().contains("500"));
        }

        @Test
        @DisplayName("ネットワークエラー → HttpClientException スロー")
        void post_networkError() {
            // Arrange
            String url = "http://localhost:3000/api/test";
            Map<String, Object> requestBody = Map.of("key", "value");

            when(webClient.post()).thenReturn(requestBodyUriSpec);
            when(requestBodyUriSpec.uri(url)).thenReturn(requestBodySpec);
            when(requestBodySpec.header(anyString(), anyString())).thenReturn(requestBodySpec);
            when(requestBodySpec.bodyValue(requestBody)).thenReturn(requestHeadersSpec);
            when(requestHeadersSpec.retrieve()).thenReturn(responseSpec);
            when(responseSpec.bodyToMono(any(ParameterizedTypeReference.class)))
                .thenReturn(Mono.error(new RuntimeException("Connection refused")));

            // Act & Assert
            HttpClient.HttpClientException exception = assertThrows(
                HttpClient.HttpClientException.class,
                () -> httpClient.post(url, requestBody)
            );
            assertTrue(exception.getMessage().contains("通信に失敗"));
        }
    }

    @Nested
    @DisplayName("post(url, requestBody, additionalHeaders)")
    class PostWithCustomHeaders {

        @Test
        @DisplayName("カスタムヘッダー付きPOST成功")
        void post_withCustomHeaders() {
            // Arrange
            String url = "http://localhost:3000/api/test";
            Map<String, Object> requestBody = Map.of("key", "value");
            Map<String, String> additionalHeaders = Map.of(
                "X-Custom-Header", "custom-value",
                "Authorization", "Bearer token"
            );
            Map<String, Object> responseBody = Map.of("result", "success");

            when(webClient.post()).thenReturn(requestBodyUriSpec);
            when(requestBodyUriSpec.uri(url)).thenReturn(requestBodySpec);
            when(requestBodySpec.header(anyString(), anyString())).thenReturn(requestBodySpec);
            when(requestBodySpec.bodyValue(requestBody)).thenReturn(requestHeadersSpec);
            when(requestHeadersSpec.retrieve()).thenReturn(responseSpec);
            when(responseSpec.bodyToMono(any(ParameterizedTypeReference.class)))
                .thenReturn(Mono.just(responseBody));

            // Act
            Map<String, Object> result = httpClient.post(url, requestBody, additionalHeaders);

            // Assert
            assertNotNull(result);
            assertEquals("success", result.get("result"));
            
            // カスタムヘッダーが設定されたことを確認
            verify(requestBodySpec).header("X-Custom-Header", "custom-value");
            verify(requestBodySpec).header("Authorization", "Bearer token");
        }

        @Test
        @DisplayName("nullヘッダー → 通常のPOST")
        void post_nullHeaders() {
            // Arrange
            String url = "http://localhost:3000/api/test";
            Map<String, Object> requestBody = Map.of("key", "value");
            Map<String, Object> responseBody = Map.of("result", "success");

            when(webClient.post()).thenReturn(requestBodyUriSpec);
            when(requestBodyUriSpec.uri(url)).thenReturn(requestBodySpec);
            when(requestBodySpec.header(anyString(), anyString())).thenReturn(requestBodySpec);
            when(requestBodySpec.bodyValue(requestBody)).thenReturn(requestHeadersSpec);
            when(requestHeadersSpec.retrieve()).thenReturn(responseSpec);
            when(responseSpec.bodyToMono(any(ParameterizedTypeReference.class)))
                .thenReturn(Mono.just(responseBody));

            // Act
            Map<String, Object> result = httpClient.post(url, requestBody, null);

            // Assert
            assertNotNull(result);
        }

        @Test
        @DisplayName("空のヘッダー → 通常のPOST")
        void post_emptyHeaders() {
            // Arrange
            String url = "http://localhost:3000/api/test";
            Map<String, Object> requestBody = Map.of("key", "value");
            Map<String, String> additionalHeaders = Map.of();
            Map<String, Object> responseBody = Map.of("result", "success");

            when(webClient.post()).thenReturn(requestBodyUriSpec);
            when(requestBodyUriSpec.uri(url)).thenReturn(requestBodySpec);
            when(requestBodySpec.header(anyString(), anyString())).thenReturn(requestBodySpec);
            when(requestBodySpec.bodyValue(requestBody)).thenReturn(requestHeadersSpec);
            when(requestHeadersSpec.retrieve()).thenReturn(responseSpec);
            when(responseSpec.bodyToMono(any(ParameterizedTypeReference.class)))
                .thenReturn(Mono.just(responseBody));

            // Act
            Map<String, Object> result = httpClient.post(url, requestBody, additionalHeaders);

            // Assert
            assertNotNull(result);
        }
    }

    @Nested
    @DisplayName("HttpClientException")
    class ExceptionTest {

        @Test
        @DisplayName("メッセージ付き例外")
        void exception_withMessage() {
            HttpClient.HttpClientException exception = new HttpClient.HttpClientException("test error");
            assertEquals("test error", exception.getMessage());
        }

        @Test
        @DisplayName("メッセージ+原因付き例外")
        void exception_withMessageAndCause() {
            Throwable cause = new RuntimeException("cause");
            HttpClient.HttpClientException exception = new HttpClient.HttpClientException("test error", cause);
            assertEquals("test error", exception.getMessage());
            assertEquals(cause, exception.getCause());
        }
    }
}
