package com.auth.app.service;

import com.auth.app.client.HttpClient;
import com.auth.app.dto.PermissionCheckResult;
import com.auth.app.dto.external.Api1PermissionRequest;
import com.auth.app.dto.external.Api2PermissionRequest;
import com.auth.app.dto.external.ExternalPermissionResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.LocalTime;

/**
 * 画面権限サービス
 * 
 * 責務:
 * - フロントエンドから受信した運用時間情報に基づいて適切な外部APIを選択
 * - 選択したAPIに対して認可チェックを依頼
 * 
 * API選択ルール（運用時間情報で判定）:
 * - パターン1（両方利用可能）: api1Start/api1End/api2Start/api2End すべて指定 → API1優先、運用時間外ならAPI2
 * - パターン2（API1のみ）: api1Start/api1End のみ指定 → 常にAPI1
 * - パターン3（API2のみ）: api2Start/api2End のみ指定 → 常にAPI2
 * 
 * 運用時間はフロントエンドの router.data から送信される。
 */
@Service
@Slf4j
public class ScreenPermissionService {

    private final String api1Url;
    private final String api2Url;
    
    private final HttpClient httpClient;

    /**
     * コンストラクタ
     */
    public ScreenPermissionService(
            @Value("${external.screen-permission.api1.url}") String api1Url,
            @Value("${external.screen-permission.api2.url}") String api2Url,
            HttpClient httpClient) {
        
        this.api1Url = api1Url;
        this.api2Url = api2Url;
        this.httpClient = httpClient;
        
        log.info("ScreenPermissionService 初期化完了: api1={}, api2={}", api1Url, api2Url);
    }

    /**
     * 画面権限チェックを実行
     * 
     * フロー:
     * 1. フロントエンドから受信した運用時間情報 + 現在時刻 → API選択
     * 2. 選択したAPIに認可チェックを依頼
     * 3. error.flg で権限判定
     * 
     * @param screenId 画面ID
     * @param userId ユーザーID
     * @param api1Start API1運用開始時刻（null可: API2のみの場合）
     * @param api1End API1運用終了時刻（null可: API2のみの場合）
     * @param api2Start API2運用開始時刻（null可: API1のみの場合）
     * @param api2End API2運用終了時刻（null可: API1のみの場合）
     * @return 権限判定結果（authorized + errorMessage）
     * @throws IllegalArgumentException 運用時間情報が不正な場合
     * @throws HttpClient.HttpClientException 外部API呼び出し失敗時
     */
    public PermissionCheckResult checkPermission(String screenId, String userId,
                                   String api1Start, String api1End,
                                   String api2Start, String api2End) {
        // 1. API選択（運用時間情報で判定）
        LocalTime now = LocalTime.now();
        String apiUrl = resolveApiUrl(api1Start, api1End, api2Start, api2End, now);
        log.info("画面権限チェックAPI選択: apiUrl={}", apiUrl);
        
        // 2. 外部API呼び出し（APIに応じたリクエスト構築）
        Object requestBody = buildRequestBody(apiUrl, screenId, userId);
        
        // 3. DTOで型安全にレスポンス受信
        ExternalPermissionResponse response = httpClient.post(
                apiUrl, requestBody, ExternalPermissionResponse.class);
        
        // 4. error.flg で権限判定
        boolean authorized = response.isAuthorized();
        String errorMessage = response.getErrorMessage();
        
        log.info("画面権限チェック結果: screenId={}, userId={}, authorized={}, errorMsg={}", 
                screenId, userId, authorized, errorMessage);
        
        return new PermissionCheckResult(authorized, errorMessage);
    }

    /**
     * API URL に応じたリクエストボディを構築
     * 
     * @param apiUrl 呼び出し先API URL
     * @param screenId 画面ID
     * @param userId ユーザーID
     * @return API専用のリクエストオブジェクト
     */
    private Object buildRequestBody(String apiUrl, String screenId, String userId) {
        if (apiUrl.equals(api1Url)) {
            // API1専用リクエスト: { "A01": { "screenId": "xxx" } }
            return new Api1PermissionRequest(
                new Api1PermissionRequest.Api1Data(screenId, null)
            );
        } else {
            // API2専用リクエスト: { "B01": { "screenId": "xxx", "userId": "xxx" } }
            return new Api2PermissionRequest(
                new Api2PermissionRequest.Api2Data(screenId, userId)
            );
        }
    }

    /**
     * 運用時間情報から適切なAPI URLを解決
     * 
     * 判定ロジック:
     * - api1Start/api1End/api2Start/api2End すべて指定 → API1優先、運用時間外ならAPI2
     * - api1Start/api1End のみ指定 → 常にAPI1
     * - api2Start/api2End のみ指定 → 常にAPI2
     * 
     * @param api1Start API1運用開始時刻（null可）
     * @param api1End API1運用終了時刻（null可）
     * @param api2Start API2運用開始時刻（null可）
     * @param api2End API2運用終了時刻（null可）
     * @param now 現在時刻
     * @return API URL
     * @throws IllegalArgumentException 運用時間情報が不正な場合
     */
    String resolveApiUrl(String api1Start, String api1End,
                         String api2Start, String api2End, LocalTime now) {
        
        boolean hasApi1 = api1Start != null && api1End != null;
        boolean hasApi2 = api2Start != null && api2End != null;
        
        if (hasApi1 && hasApi2) {
            // パターン1: 両方利用可能 → API1優先、運用時間外ならAPI2
            log.debug("パターン1（両方利用可能）: API1優先で判定");
            return resolveWithFallback(api1Start, api1End, now);
        } else if (hasApi1) {
            // パターン2: API1のみ
            log.debug("パターン2（API1のみ）: API1選択");
            return api1Url;
        } else if (hasApi2) {
            // パターン3: API2のみ
            log.debug("パターン3（API2のみ）: API2選択");
            return api2Url;
        } else {
            throw new IllegalArgumentException("運用時間情報が不正です。いずれかのAPIの運用時間が必要です");
        }
    }

    /**
     * API1優先で解決（パターン1用）
     * 
     * @param api1Start API1運用開始時刻
     * @param api1End API1運用終了時刻
     * @param now 現在時刻
     * @return API URL
     */
    private String resolveWithFallback(String api1Start, String api1End, LocalTime now) {
        if (isWithinOperatingHours(now, api1Start, api1End)) {
            log.debug("API1運用時間内（{}-{}）→ API1選択", api1Start, api1End);
            return api1Url;
        }
        log.debug("API1運用時間外 → API2選択（フォールバック）");
        return api2Url;
    }

    /**
     * 現在時刻が運用時間内かどうかをチェック
     * 
     * 24時を超える時刻（例: "31:00" = 翌日07:00）もサポート
     * 
     * @param now 現在時刻
     * @param start 運用開始時刻
     * @param end 運用終了時刻（24を超える可能性）
     * @return 運用時間内の場合true
     */
    private boolean isWithinOperatingHours(LocalTime now, String start, String end) {
        LocalTime startTime = parseTime(start);
        LocalTime endTime = parseTime(end);
        
        // start <= now < end の範囲チェック
        return !now.isBefore(startTime) && now.isBefore(endTime);
    }

    /**
     * 時刻文字列をLocalTimeに変換
     * 
     * 標準フォーマット "HH:mm" をサポート（例: "08:00", "23:59"）
     * 24時以降の値も互換性のためサポート（例: "24:00" → LocalTime.MAX）
     * 
     * @param time 時刻文字列（"HH:mm" 形式）
     * @return LocalTime
     * @throws IllegalArgumentException フォーマット不正時
     */
    private LocalTime parseTime(String time) {
        try {
            String[] parts = time.split(":");
            int hours = Integer.parseInt(parts[0]);
            int minutes = parts.length > 1 ? Integer.parseInt(parts[1]) : 0;
            
            if (hours >= 24) {
                // 24時以降は LocalTime.MAX として扱う（実質的に「翌日のいつか」）
                // 現在時刻は必ず24時未満なので、24時以降の終了時刻は常に「運用時間内」となる
                return LocalTime.MAX;
            }
            
            return LocalTime.of(hours, minutes);
        } catch (NumberFormatException | ArrayIndexOutOfBoundsException e) {
            throw new IllegalArgumentException("時刻フォーマットが不正です: " + time);
        }
    }
}
