package com.auth.app.controller;

import com.auth.app.dto.StubTokenResponse;
import com.auth.app.model.User;
import com.auth.app.service.UserService;
import com.auth.app.stub.StubEntraService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/stub/entra")
@RequiredArgsConstructor
@Slf4j
public class StubEntraController {

    private final StubEntraService stubEntraService;
    private final UserService userService;

    private static final String RT_COOKIE_NAME = "refresh_token";

    /**
     * GET /stub/entra/authorize
     * 認可エンドポイント模擬（ユーザー選択画面HTML返却）
     */
    @GetMapping(value = "/authorize", produces = MediaType.TEXT_HTML_VALUE)
    public String authorize(
            @RequestParam(name = "client_id", required = false) String clientId,
            @RequestParam(name = "redirect_uri") String redirectUri,
            @RequestParam(required = false) String state,
            @RequestParam(required = false) String scope,
            @RequestParam(name = "code_challenge", required = false) String codeChallenge,
            @RequestParam(name = "code_challenge_method", required = false) String codeChallengeMethod) {

        List<User> users = userService.getAllUsers();

        StringBuilder html = new StringBuilder();
        html.append("<!DOCTYPE html><html><head><meta charset='UTF-8'>");
        html.append("<title>Entra ID スタブ - ログイン</title>");
        html.append("<style>");
        html.append("body{font-family:sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#f0f2f5;}");
        html.append(".login-box{background:#fff;padding:40px;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,0.1);width:400px;}");
        html.append("h2{color:#0078d4;margin-bottom:20px;}");
        html.append("select,button{width:100%;padding:12px;margin:8px 0;border-radius:4px;border:1px solid #ccc;font-size:16px;}");
        html.append("button{background:#0078d4;color:#fff;border:none;cursor:pointer;}");
        html.append("button:hover{background:#005a9e;}");
        html.append(".info{color:#666;font-size:13px;margin-top:16px;}");
        html.append("</style></head><body>");
        html.append("<div class='login-box'>");
        html.append("<h2>🔐 Entra ID スタブログイン</h2>");
        html.append("<p>テストユーザーを選択してログインしてください</p>");
        html.append("<form method='POST' action='/stub/entra/authorize/submit'>");
        html.append("<input type='hidden' name='redirect_uri' value='").append(escapeHtml(redirectUri)).append("'/>");
        html.append("<input type='hidden' name='state' value='").append(escapeHtml(state != null ? state : "")).append("'/>");
        html.append("<select name='user_id' required>");

        for (User user : users) {
            html.append("<option value='").append(user.getUserId()).append("'>")
                .append(escapeHtml(user.getDisplayName()))
                .append(" (").append(escapeHtml(user.getEmail())).append(")")
                .append("</option>");
        }

        html.append("</select>");
        html.append("<button type='submit'>ログイン</button>");
        html.append("</form>");
        html.append("<div class='info'>※ これはEntra IDの認証画面をシミュレートするスタブ画面です</div>");
        html.append("</div></body></html>");

        return html.toString();
    }

    /**
     * POST /stub/entra/authorize/submit
     * ユーザー選択後、認可コード発行 → redirect_uriへリダイレクト
     */
    @PostMapping("/authorize/submit")
    public ResponseEntity<Void> authorizeSubmit(
            @RequestParam(name = "user_id") String userId,
            @RequestParam(name = "redirect_uri") String redirectUri,
            @RequestParam(required = false) String state) {

        String code = stubEntraService.issueAuthorizationCode(userId, redirectUri);

        String location = redirectUri + "?code=" + code;
        if (state != null && !state.isEmpty()) {
            location += "&state=" + state;
        }

        log.info("スタブ認可コード発行完了: userId={}, redirect={}", userId, redirectUri);
        return ResponseEntity.status(302).header("Location", location).build();
    }

    /**
     * POST /stub/entra/token
     * トークンエンドポイント模擬（認可コード → Entra JWT + リフレッシュトークン返却）
     * リフレッシュトークンはHttpOnly Cookieに設定
     */
    @PostMapping("/token")
    public ResponseEntity<StubTokenResponse> token(
            @RequestParam(name = "client_id", required = false) String clientId,
            @RequestParam(name = "grant_type", required = false) String grantType,
            @RequestParam String code,
            @RequestParam(name = "redirect_uri", required = false) String redirectUri,
            @RequestParam(name = "code_verifier", required = false) String codeVerifier,
            HttpServletResponse response) {

        // 認可コードを検証し、JWTとRTを取得
        Map<String, String> tokens = stubEntraService.exchangeCodeForEntraJwt(code);
        String entraJwt = tokens.get("entraJwt");
        String refreshToken = tokens.get("refreshToken");

        // トークンレスポンス構築（RTはレスポンスボディには含めず、Cookieのみ）
        StubTokenResponse tokenResponse = StubTokenResponse.builder()
                .tokenType("Bearer")
                .idToken(entraJwt)
                .expiresIn(3600)
                .build();

        // RTをHttpOnly Cookieに設定
        addRefreshTokenCookie(response, refreshToken);

        log.info("スタブEntra JWT・RT発行完了（Cookie設定済み）");
        return ResponseEntity.ok(tokenResponse);
    }

    /**
     * GET /stub/entra/users
     * スタブ用テストユーザー一覧（フロントエンド参照用）
     */
    @GetMapping("/users")
    public ResponseEntity<List<?>> getUsers() {
        List<?> users = userService.getAllUsers().stream()
                .map(u -> java.util.Map.of(
                        "userId", u.getUserId(),
                        "email", u.getEmail(),
                        "displayName", u.getDisplayName()
                ))
                .collect(Collectors.toList());
        return ResponseEntity.ok(users);
    }

    private String escapeHtml(String input) {
        if (input == null) return "";
        return input.replace("&", "&amp;")
                    .replace("<", "&lt;")
                    .replace(">", "&gt;")
                    .replace("\"", "&quot;")
                    .replace("'", "&#39;");
    }

    /**
     * リフレッシュトークンをHttpOnly Cookieに設定
     */
    private void addRefreshTokenCookie(HttpServletResponse response, String refreshToken) {
        Cookie cookie = new Cookie(RT_COOKIE_NAME, refreshToken);
        cookie.setHttpOnly(true);
        cookie.setPath("/auth");
        cookie.setMaxAge(28800); // 8時間
        // cookie.setSecure(true); // HTTPS環境で有効化
        response.addCookie(cookie);
    }
}
