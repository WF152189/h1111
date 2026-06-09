package com.auth.app.service;

import com.auth.app.client.HttpClient;
import com.auth.app.exception.InternalAuthException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.Map;

/**
 * 内部認証サービス
 * 
 * 責務:
 * - 外部認可システムAPIの呼び出し
 * - 認可チェック結果の処理
 * 
 * 外部認可システム:
 * - エンドポイント: http://localhost:3000/api/authorization/check
 * - メソッド: POST
 * - リクエスト: { "userId": "ユーザーID" }
 * - レスポンス: { "authorized": true, "message": "認可成功", ... }
 */
@Service
@Slf4j
public class InternalAuthService {
    
    @Value("${external.authorization.url:http://localhost:3000/api/authorization/check}")
    private String authorizationApiUrl;

    private final HttpClient httpClient;

    /**
     * コンストラクタ
     */
    public InternalAuthService(HttpClient httpClient) {
        this.httpClient = httpClient;
    }

    /**
     * 外部認可システムで認可チェックを実行
     * 
     * フロー:
     * 1. HttpClient で外部認可システムAPIを呼び出し
     * 2. 認可結果を取得
     * 3. 認可失敗の場合は例外をスロー
     * 
     * @param userId ユーザー識別子（Entra ID sub/oid）
     * @throws InternalAuthException 認可失敗時
     */
    public void checkAuthorization(String userId) {
        log.debug("外部認可システム呼び出し開始: userId={}, url={}", userId, authorizationApiUrl);

        try {
            // HttpClient で外部API呼び出し
            Map<String, Object> response = httpClient.post(
                authorizationApiUrl,
                Map.of("userId", userId)
            );

            log.debug("外部認可システム応答受信: userId={}, response={}", userId, response);

            // 認可結果をチェック
            Boolean authorized = (Boolean) response.get("authorized");
            String message = (String) response.get("message");

            if (authorized == null || !authorized) {
                log.warn("認可失敗: userId={}, message={}", userId, message);
                throw InternalAuthException.authorizationFailed(
                    message != null ? message : "認可に失敗しました"
                );
            }

            log.info("認可成功: userId={}", userId);

        } catch (HttpClient.HttpClientException e) {
            // HttpClient 例外
            log.error("外部認可システム呼び出しエラー: userId={}, error={}", userId, e.getMessage());
            throw InternalAuthException.authorizationFailed(
                "外部認可システムとの通信に失敗しました: " + e.getMessage()
            );
        } catch (Exception e) {
            // その他の例外
            log.error("予期せぬエラー: userId={}, error={}", userId, e.getMessage(), e);
            throw InternalAuthException.authorizationFailed(
                "認可チェック中にエラーが発生しました: " + e.getMessage()
            );
        }
    }
}
