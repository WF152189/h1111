# 認証シーケンス図

## 基本認証フロー

```mermaid
sequenceDiagram
    actor User as ユーザー
    participant Browser as ブラウザ
    participant AWS_Auth as AWS<br/>認証コンテナー
    participant AzureAD as Azure Entra ID
    participant AWS_Content as AWS<br/>ロール管理コンテナー
    participant AWS_App as AWS<br/>アプリケーションコンテナー
    participant DB as ユーザーDB

    section アプリ起動・二重ログインチェック
        User->>Browser: 1. ショートカットで業務画面起動
        activate Browser
        Browser->>AWS_Auth: 2. コンテンツ配信リクエスト
        activate AWS_Auth
        AWS_Auth-->>Browser: 3. 業務画面(HTML/JS)返却
        deactivate AWS_Auth
        
        Browser->>Browser: 4. 二重ログインチェック<br/>(LocalStorage JWT確認)
        
        alt JWT存在かつ有効期限内
            Browser->>Browser: 5. 有効なトークンで継続
            Browser-->>User: 6. 業務画面表示
            deactivate Browser
        else JWTなし or 有効期限切れ
            Browser->>User: 5'. 未ログイン状態 → Azure AD認証へ
            deactivate Browser
        end
    end

    section Azure Entra ID認証 (OpenID Connect)
        User->>Browser: 7. Azure ADログインページ表示
        activate Browser
        
        Browser->>AzureAD: 8. 認証リクエスト<br/>(Authorization Code Flow with PKCE)<br/>client_id, redirect_uri, scope,<br/>code_challenge, state
        activate AzureAD
        
        User->>AzureAD: 9. Azure AD認証<br/>(ID/PW or MFA)
        AzureAD->>AzureAD: 10. ユーザー認証・トークン生成
        
        AzureAD-->>Browser: 11. 認可コード返却
        deactivate AzureAD
        deactivate Browser
        
        Browser->>AzureAD: 12. トークン要求<br/>(POST /token)<br/>grant_type=authorization_code,
        activate AzureAD
        code, redirect_uri, client_id,
        code_verifier
        
        AzureAD-->>Browser: 13. Entra JWTトークン返却<br/>{id_token, access_token,<br/>refresh_token, expires_in}
        deactivate AzureAD
        
        Browser->>Browser: 14. JWTをLocalStorageに保存
    end

    section AWSロール管理コンテナー認証
        Browser->>AWS_Content: 15. 認証・認可要求<br/>(Authorization: Bearer {Entra JWT})
        activate AWS_Content
        
        AWS_Content->>AWS_Content: 16. JWT署名検証<br/>(Azure AD公開鍵で検証)
        
        AWS_Content->>AWS_Content: 17. トークン検証<br/>(exp, iss, aud, nonce確認)
        
        AWS_Content->>DB: 18. ユーザー情報検索<br/>(user_id / email)
        activate DB
        DB-->>AWS_Content: 19. ユーザー情報+ロール返却
        deactivate DB
        
        AWS_Content->>AWS_Content: 20. RBACチェック<br/>(ロール→権限マッピング)
        
        alt 認可成功
            AWS_Content-->>Browser: 21. 認可成功レスポンス<br/>{user_id, roles, permissions}
            deactivate AWS_Content
            
            Browser->>Browser: 22. JWT更新<br/>(AWSトークン保存)
        else 認可失敗
            AWS_Content-->>Browser: 21'. エラーレスポンス<br/>{error: "forbidden"}
            deactivate AWS_Content
        end
    end

    section アプリケーションアクセス
        Browser->>AWS_App: 23. アプリケーションリクエスト<br/>(Authorization: Bearer {AWS JWT})
        activate AWS_App
        
        AWS_App->>AWS_Content: 24. トークン検証要求
        activate AWS_Content
        AWS_Content-->>AWS_App: 25. トークン有効・権限返却
        deactivate AWS_Content
        
        AWS_App->>AWS_App: 26. 権限チェック<br/>(エンドポイントごとに検証)
        
        AWS_App-->>Browser: 27. アプリケーションレスポンス
        deactivate AWS_App
    end

    section トークン自動更新
        Browser->>AzureAD: リフレッシュトークンで更新
        activate AzureAD
        AzureAD-->>Browser: 新規トークン発行
        deactivate AzureAD
        Browser->>Browser: LocalStorage更新
    end

    section ログアウト
        User->>Browser: ログアウト要求
        activate Browser
        Browser->>Browser: LocalStorageからJWT削除
        Browser-->>User: ログアウト完了
        deactivate Browser
    end
```

## フローの説明

### 1. ログイン処理
1. ユーザーがログイン画面にID/パスワードを入力
2. クライアントアプリが入力値を検証
3. 認証サーバーに認証リクエストを送信
4. ユーザーDBでユーザー情報を検索
5. パスワードを検証
6. 認証成功時、アクセストークン(JWT)を生成
7. クライアントにトークンを返却
8. 以降のAPIリクエストでトークンを使用

### 2. トークン更新処理
- アクセストークンが期限切れになった場合、リフレッシュトークンで新規トークンを取得

### 3. ログアウト処理
- トークンを無効化し、セッションを終了
