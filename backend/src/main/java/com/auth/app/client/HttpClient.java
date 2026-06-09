package com.auth.app.client;

import lombok.extern.slf4j.Slf4j;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.util.Map;

/**
 * 汎用HTTPクライアント
 * 
 * 責務:
 * - 外部システムAPI呼び出しの共通化
 * - HTTPリクエスト/レスポンスの処理
 * - エラーハンドリング
 * 
 * 使用シーン:
 * - 外部認可システムAPI呼び出し
 * - 将来的な他の外部システムAPI呼び出し
 * 
 * @example
 * // POST リクエスト
 * Map<String, Object> response = httpClient.post(
 *     "http://localhost:3000/api/authorization/check",
 *     Map.of("userId", "user123")
 * );
 */
@Component
@Slf4j
public class HttpClient {

    private final WebClient webClient;

    /**
     * コンストラクタ
     * WebClient を初期化
     */
    public HttpClient(WebClient.Builder webClientBuilder) {
        this.webClient = webClientBuilder.build();
    }

    /**
     * POST リクエストを実行
     * 
     * フロー:
     * 1. 指定されたURLにPOSTリクエストを送信
     * 2. JSON リクエストボディを送信
     * 3. JSON レスポンスを Map 形式で取得
     * 4. エラー時は例外をスロー
     * 
     * @param url リクエスト先URL
     * @param requestBody リクエストボディ（Map形式）
     * @return レスポンスボディ（Map形式）
     * @throws HttpClientException HTTP エラー時
     * @throws RuntimeException ネットワークエラー時
     */
    public Map<String, Object> post(String url, Map<String, Object> requestBody) {
        log.debug("HTTP POST リクエスト開始: url={}, body={}", url, requestBody);

        try {
            // POST リクエスト実行
            Map<String, Object> response = webClient.post()
                .uri(url)
                .header("Content-Type", "application/json")
                .bodyValue(requestBody)
                .retrieve()
                .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                .block(); // 同期的に結果を取得

            log.debug("HTTP POST レスポンス受信: url={}, response={}", url, response);

            if (response == null) {
                log.error("HTTP POST 空のレスポンス: url={}", url);
                throw new HttpClientException("外部システムから空のレスポンスが返されました");
            }

            return response;

        } catch (WebClientResponseException e) {
            // HTTP エラー（4xx, 5xx）
            log.error("HTTP POST エラー: url={}, status={}, body={}", 
                url, e.getStatusCode(), e.getResponseBodyAsString());
            throw new HttpClientException(
                "HTTP エラーが発生しました: " + e.getStatusCode() + " - " + e.getResponseBodyAsString(),
                e
            );
        } catch (HttpClientException e) {
            // 既に HttpClientException の場合は再スロー
            throw e;
        } catch (Exception e) {
            // ネットワークエラー、タイムアウトなど
            log.error("HTTP POST 例外: url={}, error={}", url, e.getMessage(), e);
            throw new HttpClientException(
                "外部システムとの通信に失敗しました: " + e.getMessage(),
                e
            );
        }
    }

    /**
     * POST リクエストを実行（ヘッダーカスタマイズ版）
     * 
     * @param url リクエスト先URL
     * @param requestBody リクエストボディ（Map形式）
     * @param additionalHeaders 追加ヘッダー（オプション）
     * @return レスポンスボディ（Map形式）
     * @throws HttpClientException HTTP エラー時
     * @throws RuntimeException ネットワークエラー時
     */
    public Map<String, Object> post(String url, Map<String, Object> requestBody, Map<String, String> additionalHeaders) {
        log.debug("HTTP POST リクエスト開始（カスタムヘッダー）: url={}, body={}, headers={}", 
            url, requestBody, additionalHeaders);

        try {
            WebClient.RequestBodySpec requestSpec = webClient.post()
                .uri(url)
                .header("Content-Type", "application/json");

            // 追加ヘッダーを設定
            if (additionalHeaders != null && !additionalHeaders.isEmpty()) {
                additionalHeaders.forEach(requestSpec::header);
            }

            // リクエスト実行
            Map<String, Object> response = requestSpec
                .bodyValue(requestBody)
                .retrieve()
                .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                .block();

            log.debug("HTTP POST レスポンス受信: url={}, response={}", url, response);

            if (response == null) {
                log.error("HTTP POST 空のレスポンス: url={}", url);
                throw new HttpClientException("外部システムから空のレスポンスが返されました");
            }

            return response;

        } catch (WebClientResponseException e) {
            log.error("HTTP POST エラー: url={}, status={}, body={}", 
                url, e.getStatusCode(), e.getResponseBodyAsString());
            throw new HttpClientException(
                "HTTP エラーが発生しました: " + e.getStatusCode() + " - " + e.getResponseBodyAsString(),
                e
            );
        } catch (HttpClientException e) {
            throw e;
        } catch (Exception e) {
            log.error("HTTP POST 例外: url={}, error={}", url, e.getMessage(), e);
            throw new HttpClientException(
                "外部システムとの通信に失敗しました: " + e.getMessage(),
                e
            );
        }
    }

    /**
     * HTTPクライアント例外クラス
     */
    public static class HttpClientException extends RuntimeException {
        
        public HttpClientException(String message) {
            super(message);
        }
        
        public HttpClientException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}
