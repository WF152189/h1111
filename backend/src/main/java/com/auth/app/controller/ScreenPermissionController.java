package com.auth.app.controller;

import com.auth.app.client.HttpClient;
import com.auth.app.dto.ScreenPermissionRequest;
import com.auth.app.dto.ScreenPermissionResponse;
import com.auth.app.service.ScreenPermissionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * 画面権限コントローラー
 * 
 * ユーザーの画面アクセス権限をチェックする
 * typeId と現在時刻に基づいて適切な外部APIを選択し、認可チェックを委託する
 */
@RestController
@RequestMapping("/api/screens")
@RequiredArgsConstructor
@Slf4j
public class ScreenPermissionController {

    private final ScreenPermissionService screenPermissionService;

    /**
     * POST /api/screens/permission/check
     * 画面権限チェック
     * 
     * フロー:
     * 1. リクエストから screenId, typeId を取得
     * 2. ScreenPermissionService でAPI選択 + 外部API呼び出し
     * 3. 結果を返却
     * 
     * @param request 画面IDとタイプIDを含むリクエスト
     * @return 権限チェック結果
     */
    @PostMapping("/permission/check")
    public ResponseEntity<ScreenPermissionResponse> checkPermission(
            @RequestBody ScreenPermissionRequest request) {
        
        String screenId = request.getScreenId();
        String typeId = request.getTypeId();
        
        // バリデーション
        if (screenId == null || screenId.isEmpty()) {
            log.warn("画面権限チェック失敗: screenIdが未設定");
            return ResponseEntity.badRequest().body(
                ScreenPermissionResponse.builder()
                    .authorized(false)
                    .reason("画面IDが無効です")
                    .build()
            );
        }
        
        if (typeId == null || typeId.isEmpty()) {
            log.warn("画面権限チェック失敗: typeIdが未設定");
            return ResponseEntity.badRequest().body(
                ScreenPermissionResponse.builder()
                    .authorized(false)
                    .reason("タイプIDが無効です")
                    .build()
            );
        }
        
        // TODO: JWTからユーザーIDを抽出
        // 本番環境では、@AuthenticationPrincipalまたはJwtAuthenticationFilterで設定された
        // SecurityContextからユーザーIDを取得する
        String userId = "eeeeeeee";
        
        log.info("画面権限チェック開始: userId={}, screenId={}, typeId={}", userId, screenId, typeId);
        
        try {
            // 外部API呼び出し（Service経由）
            boolean authorized = screenPermissionService.checkPermission(screenId, userId, typeId);
            
            if (authorized) {
                log.info("画面アクセス許可: userId={}, screenId={}, typeId={}", userId, screenId, typeId);
                return ResponseEntity.ok(
                    ScreenPermissionResponse.builder()
                        .authorized(true)
                        .message("アクセスが許可されています")
                        .build()
                );
            } else {
                log.warn("画面アクセス拒否: userId={}, screenId={}, typeId={}", userId, screenId, typeId);
                return ResponseEntity.ok(
                    ScreenPermissionResponse.builder()
                        .authorized(false)
                        .reason("この画面へのアクセス権限がありません")
                        .build()
                );
            }
            
        } catch (IllegalArgumentException e) {
            // typeId が不正
            log.warn("画面権限チェック失敗: {}", e.getMessage());
            return ResponseEntity.badRequest().body(
                ScreenPermissionResponse.builder()
                    .authorized(false)
                    .reason(e.getMessage())
                    .build()
            );
            
        } catch (HttpClient.HttpClientException e) {
            // 外部API呼び出し失敗
            log.error("外部API呼び出し失敗: {}", e.getMessage());
            return ResponseEntity.status(503).body(
                ScreenPermissionResponse.builder()
                    .authorized(false)
                    .reason("外部認可システムとの通信に失敗しました")
                    .build()
            );
        }
    }
}
