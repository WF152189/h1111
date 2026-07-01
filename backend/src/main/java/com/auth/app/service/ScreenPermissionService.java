package com.auth.app.service;

import com.auth.app.client.HttpClient;
import com.auth.app.dto.external.Api1PermissionRequest;
import com.auth.app.dto.external.Api2PermissionRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.LocalTime;
import java.util.Map;

/**
 * 画面権限サービス
 * 
 * 責務:
 * - typeId とフロントエンドから受信した運用時間に基づいて適切な外部APIを選択
 * - 選択したAPIに対して認可チェックを依頼
 * 
 * API選択ルール:
 * - Aタイプ: API1優先、運用時間外ならAPI2（両方運用時間チェック）
 * - Bタイプ: 常にAPI2
 * - Cタイプ: 常にAPI1
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
     * 1. typeId + フロントエンドから受信した運用時間 + 現在時刻 → API選択
     * 2. 選択したAPIに認可チェックを依頼
     * 3. 結果を返却
     * 
     * @param screenId 画面ID
     * @param userId ユーザーID
     * @param typeId タイプID（A/B/C）
     * @param api1Start API1運用開始時刻（null可: B/Cタイプでは不要）
     * @param api1End API1運用終了時刻（null可: B/Cタイプでは不要）
     * @param api2Start API2運用開始時刻（null可: B/Cタイプでは不要）
     * @param api2End API2運用終了時刻（null可: B/Cタイプでは不要）
     * @return 認可結果（true=許可, false=拒否）
     * @throws IllegalArgumentException typeId が不正な場合
     * @throws HttpClient.HttpClientException 外部API呼び出し失敗時
     */
    public boolean checkPermission(String screenId, String userId, String typeId,
                                   String api1Start, String api1End,
                                   String api2Start, String api2End) {
        // 1. API選択
        LocalTime now = LocalTime.now();
        String apiUrl = resolveApiUrl(typeId, api1Start, api1End, api2Start, api2End, now);
        log.info("画面権限チェックAPI選択: typeId={}, apiUrl={}", typeId, apiUrl);
        
        // 2. 外部API呼び出し（APIに応じたリクエスト構築）
        Object requestBody = buildRequestBody(apiUrl, screenId, userId, typeId);
        
        Map<String, Object> response = httpClient.post(apiUrl, requestBody);
        
        // 3. 結果取得
        Boolean authorized = (Boolean) response.get("authorized");
        log.info("画面権限チェック結果: screenId={}, userId={}, typeId={}, authorized={}", 
                screenId, userId, typeId, authorized);
        
        return authorized != null && authorized;
    }

    /**
     * API URL に応じたリクエストボディを構築
     * 
     * @param apiUrl 呼び出し先API URL
     * @param screenId 画面ID
     * @param userId ユーザーID
     * @param typeId タイプID
     * @return API専用のリクエストオブジェクト
     */
    private Object buildRequestBody(String apiUrl, String screenId, String userId, String typeId) {
        if (apiUrl.equals(api1Url)) {
            // API1専用リクエスト: { "A01": { "screenId": "xxx", "typeId": "xxx" } }
            return new Api1PermissionRequest(
                new Api1PermissionRequest.Api1Data(screenId, typeId)
            );
        } else {
            // API2専用リクエスト: { "B01": { "screenId": "xxx", "userId": "xxx" } }
            return new Api2PermissionRequest(
                new Api2PermissionRequest.Api2Data(screenId, userId)
            );
        }
    }

    /**
     * typeId と現在時刻から適切なAPI URL を解決
     * 
     * @param typeId タイプID（A/B/C）
     * @param api1Start API1運用開始時刻（Aタイプで必須）
     * @param api1End API1運用終了時刻（Aタイプで必須）
     * @param api2Start API2運用開始時刻（Aタイプで必須）
     * @param api2End API2運用終了時刻（Aタイプで必須）
     * @param now 現在時刻
     * @return API URL
     * @throws IllegalArgumentException typeId が不正な場合
     */
    String resolveApiUrl(String typeId, String api1Start, String api1End,
                         String api2Start, String api2End, LocalTime now) {
        if (typeId == null || typeId.isEmpty()) {
            throw new IllegalArgumentException("typeId が未設定です");
        }
        
        return switch (typeId.toUpperCase()) {
            case "A" -> resolveTypeA(api1Start, api1End, api2Start, api2End, now);
            case "B" -> api2Url;
            case "C" -> api1Url;
            default -> throw new IllegalArgumentException("不明なtypeId: " + typeId);
        };
    }

    /**
     * AタイプのAPI選択（時間帯で切替）
     * 
     * 優先順位: API1 > API2
     * - API1の運用時間内 → API1
     * - API1の運用時間外でAPI2の運用時間内 → API2
     * - 両方とも運用時間外 → API2（24時間運用の想定）
     */
    private String resolveTypeA(String api1Start, String api1End,
                                String api2Start, String api2End, LocalTime now) {
        if (api1Start == null || api1End == null) {
            throw new IllegalArgumentException("AタイプにはAPI1の運用時間（api1Start, api1End）が必須です");
        }
        if (api2Start == null || api2End == null) {
            throw new IllegalArgumentException("AタイプにはAPI2の運用時間（api2Start, api2End）が必須です");
        }
        
        // API1の運用時間内かチェック
        if (isWithinOperatingHours(now, api1Start, api1End)) {
            log.debug("Aタイプ: API1運用時間内（{}-{}）→ API1選択", api1Start, api1End);
            return api1Url;
        }
        
        // API2の運用時間内かチェック
        if (isWithinOperatingHours(now, api2Start, api2End)) {
            log.debug("Aタイプ: API2運用時間内（{}-{}）→ API2選択", api2Start, api2End);
            return api2Url;
        }
        
        // 両方とも運用時間外 → デフォルトでAPI2
        log.debug("Aタイプ: 両方運用時間外 → API2選択（フォールバック）");
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
