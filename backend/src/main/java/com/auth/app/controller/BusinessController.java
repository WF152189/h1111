package com.auth.app.controller;

import com.auth.app.dto.InitDataResponse;
import com.auth.app.dto.MenuPermissionResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class BusinessController {

    /**
     * GET /api/init
     * 業務初期データ返却（認証済みであれば権限不問）
     */
    @GetMapping("/init")
    public ResponseEntity<InitDataResponse> getInitData(Authentication auth) {
        String userId = auth.getName();

        Map<String, Object> data = new HashMap<>();
        data.put("serverTime", new Date().toString());
        data.put("appVersion", "1.0.0");

        InitDataResponse response = InitDataResponse.builder()
                .message("業務初期データ取得成功")
                .userId(userId)
                .displayName(userId)
                .data(data)
                .build();

        return ResponseEntity.ok(response);
    }

    /**
     * GET /api/menu/permissions
     * ログインユーザーのメニュー権限情報返却
     */
    @GetMapping("/menu/permissions")
    public ResponseEntity<MenuPermissionResponse> getMenuPermissions(Authentication auth) {
        String userId = auth.getName();

        List<String> roles = auth.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .filter(a -> a.startsWith("ROLE_"))
                .map(a -> a.substring(5))
                .collect(Collectors.toList());

        List<String> permissions = auth.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .filter(a -> !a.startsWith("ROLE_"))
                .collect(Collectors.toList());

        MenuPermissionResponse response = MenuPermissionResponse.builder()
                .userId(userId)
                .roles(roles)
                .permissions(permissions)
                .build();

        return ResponseEntity.ok(response);
    }

    // --- サンプル業務API ---

    /**
     * GET /api/business/data
     * サンプル業務データ一覧取得（user:read権限必要）
     */
    @GetMapping("/business/data")
    @PreAuthorize("hasAuthority('user:read')")
    public ResponseEntity<List<Map<String, Object>>> getBusinessData() {
        List<Map<String, Object>> data = new ArrayList<>();
        data.add(Map.of("id", 1, "name", "サンプルデータ1", "status", "active"));
        data.add(Map.of("id", 2, "name", "サンプルデータ2", "status", "inactive"));
        data.add(Map.of("id", 3, "name", "サンプルデータ3", "status", "active"));
        return ResponseEntity.ok(data);
    }

    /**
     * POST /api/business/data
     * サンプル業務データ登録（user:write権限必要）
     */
    @PostMapping("/business/data")
    @PreAuthorize("hasAuthority('user:write')")
    public ResponseEntity<Map<String, Object>> createBusinessData(@RequestBody Map<String, Object> body) {
        Map<String, Object> result = new HashMap<>(body);
        result.put("id", new Random().nextInt(1000));
        result.put("createdAt", new Date().toString());
        return ResponseEntity.ok(result);
    }

    /**
     * PUT /api/business/data/{id}
     * サンプル業務データ更新（user:write権限必要）
     */
    @PutMapping("/business/data/{id}")
    @PreAuthorize("hasAuthority('user:write')")
    public ResponseEntity<Map<String, Object>> updateBusinessData(
            @PathVariable int id, @RequestBody Map<String, Object> body) {
        Map<String, Object> result = new HashMap<>(body);
        result.put("id", id);
        result.put("updatedAt", new Date().toString());
        return ResponseEntity.ok(result);
    }

    /**
     * DELETE /api/business/data/{id}
     * サンプル業務データ削除（user:delete権限必要）
     */
    @DeleteMapping("/business/data/{id}")
    @PreAuthorize("hasAuthority('user:delete')")
    public ResponseEntity<Map<String, String>> deleteBusinessData(@PathVariable int id) {
        return ResponseEntity.ok(Map.of("message", "データID=" + id + "を削除しました"));
    }
}
