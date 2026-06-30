package com.auth.app.service;

import com.auth.app.client.HttpClient;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.LocalTime;
import java.util.Map;

/**
 * 画面権限サービス
 * external:
  screen-permission:
    api1:
      url: http://localhost:3001/api/screen-permission/check
      operating-hours:
        start: "08:00"
        end: "21:00"
    api2:
      url: http://localhost:3002/api/screen-permission/check
    type-routing:
      A: API1,API2
      B: API2
      C: API1
 * 責務:
 * - typeId と現在時刻に基づいて適切な外部APIを選択
 * - 選択したAPIに対して認可チェックを依頼
 * 
 * API選択ルール:
 * - Aタイプ: API1（運用時間内） or API2（運用時間外）
 * - Bタイプ: 常にAPI2
 * - Cタイプ: 常にAPI1
 */
@Service
@Slf4j
public class ScreenPermissionService {

    private final String api1Url;
    private final String api2Url;
    private final LocalTime api1Start;
    private final LocalTime api1End;
    
    private final HttpClient httpClient;

    /**
     * コンストラクタ
     */
    public ScreenPermissionService(
            @Value("${external.screen-permission.api1.url}") String api1Url,
            @Value("${external.screen-permission.api2.url}") String api2Url,
            @Value("${external.screen-permission.api1.operating-hours.start}") String api1Start,
            @Value("${external.screen-permission.api1.operating-hours.end}") String api1End,
            HttpClient httpClient) {
        
        this.api1Url = api1Url;
        this.api2Url = api2Url;
        this.api1Start = LocalTime.parse(api1Start);
        this.api1End = LocalTime.parse(api1End);
        this.httpClient = httpClient;
        
        log.info("ScreenPermissionService 初期化完了: api1={}, api2={}, operatingHours={}-{}", 
                api1Url, api2Url, api1Start, api1End);
    }

    /**
     * 画面権限チェックを実行
     * 
     * フロー:
     * 1. typeId + 現在時刻 → API選択
     * 2. 選択したAPIに認可チェックを依頼
     * 3. 結果を返却
     * 
     * @param screenId 画面ID
     * @param userId ユーザーID
     * @param typeId タイプID（A/B/C）
     * @return 認可結果（true=許可, false=拒否）
     * @throws IllegalArgumentException typeId が不正な場合
     * @throws HttpClient.HttpClientException 外部API呼び出し失敗時
     */
    public boolean checkPermission(String screenId, String userId, String typeId) {
        // 1. API選択
        String apiUrl = resolveApiUrl(typeId, LocalTime.now());
        log.info("画面権限チェックAPI選択: typeId={}, apiUrl={}", typeId, apiUrl);
        
        // 2. 外部API呼び出し
        Map<String, Object> requestBody = Map.of(
                "screenId", screenId,
                "userId", userId,
                "typeId", typeId
        );
        
        Map<String, Object> response = httpClient.post(apiUrl, requestBody);
        
        // 3. 結果取得
        Boolean authorized = (Boolean) response.get("authorized");
        log.info("画面権限チェック結果: screenId={}, userId={}, typeId={}, authorized={}", 
                screenId, userId, typeId, authorized);
        
        return authorized != null && authorized;
    }

    /**
     * typeId と現在時刻から適切なAPI URL を解決
     * 
     * @param typeId タイプID（A/B/C）
     * @param now 現在時刻
     * @return API URL
     * @throws IllegalArgumentException typeId が不正な場合
     */
    String resolveApiUrl(String typeId, LocalTime now) {
        if (typeId == null || typeId.isEmpty()) {
            throw new IllegalArgumentException("typeId が未設定です");
        }
        
        return switch (typeId.toUpperCase()) {
            case "A" -> resolveTypeA(now);
            case "B" -> api2Url;
            case "C" -> api1Url;
            default -> throw new IllegalArgumentException("不明なtypeId: " + typeId);
        };
    }

    /**
     * AタイプのAPI選択（時間帯で切替）
     * 
     * 運用時間内（start <= now < end）→ API1
     * 運用時間外 → API2
     */
    private String resolveTypeA(LocalTime now) {
        // start <= now < end の範囲チェック
        if (!now.isBefore(api1Start) && now.isBefore(api1End)) {
            log.debug("Aタイプ: 運用時間内（{}-{}）→ API1選択", api1Start, api1End);
            return api1Url;
        }
        log.debug("Aタイプ: 運用時間外 → API2選択");
        return api2Url;
    }
}
