# 認証・認可機能 外部設計書

## 改訂履歴

| 版数 | 改訂日付 | 改訂内容 | 担当者 |
|------|----------|----------|--------|
| 0.1  | 2026-04-09 | 初版作成 | |

---

## 目次

1. はじめに
2. システム概要
3. 全体構成
4. 外部インターフェース設計
5. 認証機能設計
6. 認可機能設計
7. データ設計
8. エラー処理設計
9. セキュリティ設計
10. 非機能設計
11. 制約事項
12. 用語集

---

## 1. はじめに

### 1.1 目的
本資料は、認証・認可機能の外部インターフェースおよび動作仕様を定義し、関係者間での認識統一を図ることを目的とする。

### 1.2 対象範囲
- Azure Entra ID を利用した認証フロー
- AWS 上でのロールベースアクセス制御（RBAC）
- JWT トークンによるセッション管理
- 二重ログインチェック機能

### 1.3 対象読者
- プロジェクトマネージャー
- 開発リーダー・開発担当者
- インフラ設計者・運用担当者
- テスト担当者

### 1.4 参照資料
- OpenID Connect Core 1.0
- OAuth 2.0 RFC 6749
- JWT RFC 7519
- Azure Entra ID 技術ドキュメント
- AWS コンテナーサービス ドキュメント

---

## 2. システム概要

### 2.1 システム名
【システム名を記載】

### 2.2 システム構成
- クライアント: Web ブラウザ
- 認証基盤: Azure Entra ID（OpenID Connect）
- アプリケーション基盤: AWS コンテナー環境
  - 認証コンテナー: 静的コンテンツ配信
  - ロール管理コンテナー: 認証・認可処理
  - アプリケーションコンテナー: 業務処理

### 2.3 認証方式
- プロトコル: OpenID Connect 1.0
- フロー: Authorization Code Flow with PKCE
- トークン形式: JWT (JSON Web Token)

---

## 3. 全体構成

### 3.1 構成図
【システム構成図を記載】

### 3.2 コンポーネント一覧

| コンポーネント | 役割 | 技術スタック |
|----------------|------|--------------|
| Web ブラウザ | クライアントアプリケーション | HTML5, JavaScript |
| Azure Entra ID | IDプロバイダー | Microsoft Azure AD |
| AWS 認証コンテナー | 静的コンテンツ配信 | 【記載】 |
| AWS ロール管理コンテナー | 認証・認可処理 | 【記載】 |
| AWS アプリケーションコンテナー | 業務処理 | 【記載】 |
| ユーザーDB | ユーザー・ロール情報管理 | 【記載】 |

### 3.3 シーケンス図
【別紙: auth_sequence.puml 参照】

---

## 4. 外部インターフェース設計

### 4.1 ユーザーインターフェース

#### 4.1.1 ログイン画面
- **画面遷移元**: ショートカット起動時の初期画面
- **入力項目**:
  - ユーザーID（Azure Entra ID）
  - パスワード
  - MFAコード（設定時）
- **エラー表示**:
  - 認証エラーメッセージ
  - アカウントロック通知

#### 4.1.2 二重ログイン検知画面
- **表示条件**: LocalStorage JWT有効期限チェックで有効と判定
- **表示項目**:
  - 既にログイン中のメッセージ
  - 継続/新規ログイン選択ボタン

### 4.2 APIインターフェース

#### 4.2.1 Azure Entra ID 認証エンドポイント

**■ 認証要求エンドポイント**

| 項目 | 内容 |
|------|------|
| エンドポイント | `https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize` |
| メソッド | GET |

| パラメータ | 必須 | 型 | 説明 | 例 |
|------------|------|-----|------|-----|
| client_id | 〇 | String | アプリケーションID | 【設定値】 |
| response_type | 〇 | String | 認可コード要求 | `code` |
| redirect_uri | 〇 | String | リダイレクトURI | 【設定値】 |
| scope | 〇 | String | 要求スコープ | `openid profile email` |
| response_mode | 〇 | String | レスポンスモード | `query` |
| state | 〇 | String | CSRF対策ランダム値 | 【32桁ランダム】 |
| code_challenge | 〇 | String | PKCEチャレンジ | 【Base64URL】 |
| code_challenge_method | 〇 | String | PKCE方式 | `S256` |
| nonce | 〇 | String | リプレイ攻撃対策 | 【32桁ランダム】 |

**■ トークン要求エンドポイント**

| 項目 | 内容 |
|------|------|
| エンドポイント | `https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token` |
| メソッド | POST |
| Content-Type | `application/x-www-form-urlencoded` |

| パラメータ | 必須 | 説明 |
|------------|------|------|
| client_id | 〇 | アプリケーションID |
| grant_type | 〇 | `authorization_code` |
| code | 〇 | 認可コード |
| redirect_uri | 〇 | リダイレクトURI |
| code_verifier | 〇 | PKCEベリファイア |

**■ トークンレスポンス（成功時）**

```json
{
  "token_type": "Bearer",
  "expires_in": 3600,
  "access_token": "JWTトークン",
  "id_token": "IDトークン",
  "refresh_token": "リフレッシュトークン",
  "scope": "openid profile email"
}
```

**■ トークンリフレッシュ**

| 項目 | 内容 |
|------|------|
| エンドポイント | 同上（tokenエンドポイント） |
| grant_type | `refresh_token` |
| refresh_token | 保存済リフレッシュトークン |

#### 4.2.2 AWS ロール管理コンテナー API

**■ 認証・認可要求API**

| 項目 | 内容 |
|------|------|
| エンドポイント | `POST /auth/verify` |
| Content-Type | `application/json` |

**リクエストヘッダー**

| ヘッダー | 必須 | 説明 |
|----------|------|------|
| Authorization | 〇 | `Bearer {Entra JWTトークン}` |
| Content-Type | 〇 | `application/json` |
| X-Request-ID | △ | リクエスト識別子 |

**リクエストボディ**

```json
{
  "user_id": "string",
  "resource": "string",
  "action": "string"
}
```

| パラメータ | 必須 | 型 | 説明 |
|------------|------|-----|------|
| user_id | 〇 | String | Azure Entra IDサブジェクト |
| resource | 〇 | String | アクセス対象リソース |
| action | 〇 | String | 実行アクション |

**レスポンス（成功時）**

```json
{
  "status": "success",
  "user_id": "string",
  "roles": ["role1", "role2"],
  "permissions": ["resource1:read", "resource2:write"],
  "token": "string"
}
```

**レスポンス（エラー時）**

```json
{
  "status": "failed",
  "error_code": "string",
  "error_message": "string"
}
```

| HTTPステータス | error_code | 説明 |
|----------------|------------|------|
| 401 | UNAUTHORIZED | 認証失敗 |
| 403 | FORBIDDEN | 権限なし |
| 400 | BAD_REQUEST | リクエストエラー |
| 500 | INTERNAL_ERROR | サーバーエラー |

#### 4.2.3 AWS アプリケーションコンテナー API

**■ 業務API実行**

| 項目 | 内容 |
|------|------|
| エンドポイント | `{resource}` |
| メソッド | GET / POST / PUT / DELETE |

**リクエストヘッダー**

| ヘッダー | 必須 | 説明 |
|----------|------|------|
| Authorization | 〇 | `Bearer {AWS JWTトークン}` |
| Content-Type | 〇 | `application/json` |

---

## 5. 認証機能設計

### 5.1 二重ログインチェック仕様

#### 5.1.1 処理概要
ブラウザ起動時、LocalStorageに保存されているJWTの有効期限を確認し、ログイン状態を判定する。

#### 5.1.2 処理フロー

```
1. LocalStorageからJWTトークン取得
2. JWTのペイロードをデコード
3. expクレーム（有効期限）を確認
4. 現在時刻と比較
   - 現在時刻 < exp → ログイン継続
   - 現在時刻 >= exp → 未ログイン状態
5. 判定結果に応じて画面制御
```

#### 5.1.3 JWTトークン保存情報

| 保存先 | 保存データ | 有効期限 |
|--------|------------|----------|
| LocalStorage | Entra JWTトークン | トークンのexpに準拠 |
| LocalStorage | AWS JWTトークン | トークンのexpに準拠 |

#### 5.1.4 エラー処理

| エラーパターン | 検知方法 | 処理内容 |
|----------------|----------|----------|
| JWTが存在しない | LocalStorage空 | Azure AD認証画面へ遷移 |
| JWTの有効期限切れ | expチェック | Azure AD認証画面へ遷移 |
| JWT改ざん | 署名検証エラー | ログアウト処理・エラー表示 |

### 5.2 Azure Entra ID認証仕様

#### 5.2.1 認証フロー詳細

**Step 1: 認証要求**
```
GET /{tenant}/oauth2/v2.0/authorize
  ?client_id={CLIENT_ID}
  &response_type=code
  &redirect_uri={REDIRECT_URI}
  &scope=openid%20profile%20email
  &response_mode=query
  &state={STATE}
  &code_challenge={CODE_CHALLENGE}
  &code_challenge_method=S256
  &nonce={NONCE}
```

**Step 2: ユーザー認証**
- Microsoft ログインページ表示
- ユーザーID/パスワード入力
- MFA認証（設定時）

**Step 3: 認可コード受取**
```
HTTP/1.1 302 Found
Location: {REDIRECT_URI}?code={AUTH_CODE}&state={STATE}
```

**Step 4: トークン要求**
```
POST /{tenant}/oauth2/v2.0/token
Content-Type: application/x-www-form-urlencoded

client_id={CLIENT_ID}
&grant_type=authorization_code
&code={AUTH_CODE}
&redirect_uri={REDIRECT_URI}
&code_verifier={CODE_VERIFIER}
```

**Step 5: トークン受取・保存**
→ LocalStorageに保存

#### 5.2.2 JWTトークン検証項目

| クレーム | 検証内容 | エラー処理 |
|----------|----------|------------|
| exp | 有効期限切れチェック | 再認証要求 |
| iss | 発行者確認 | 不正トークンとして拒否 |
| aud | オーディエンス確認 | 不正トークンとして拒否 |
| nonce | 初期リクエストと一致確認 | リプレイ攻撃として拒否 |

#### 5.2.3 トークン更新仕様

| 項目 | 内容 |
|------|------|
| 更新タイミング | アクセストークン有効期限5分前 |
| 更新方法 | リフレッシュトークン使用 |
| 更新失敗時 | 再認証要求 |
| リフレッシュトークン有効期限 | 【要設定: 例 14日】 |

### 5.3 ログアウト仕様

#### 5.3.1 処理フロー

```
1. ユーザーがログアウトボタンクリック
2. LocalStorageからJWTトークン削除
   - Entra JWTトークン
   - AWS JWTトークン
   - リフレッシュトークン
3. Azure AD ログアウトエンドポイント呼出（任意）
4. ログイン画面へリダイレクト
```

---

## 6. 認可機能設計

### 6.1 RBAC（ロールベースアクセス制御）概要

#### 6.1.1 権限モデル
```
ユーザー → ロール → 権限（パーミッション）
```

#### 6.1.2 ロール定義

| ロールID | ロール名 | 説明 |
|----------|----------|------|
| ADMIN | システム管理者 | 全リソースの全操作権限 |
| MANAGER | 管理者 | 指定リソースの管理権限 |
| USER | 一般ユーザー | 基本操作権限 |
| GUEST | ゲスト | 参照のみ権限 |
| 【カスタム】 | 【任意】 | 【業務に応じて定義】 |

#### 6.1.3 権限定義

| 権限ID | リソース | アクション | 説明 |
|--------|----------|------------|------|
| user:read | user | read | ユーザー情報参照 |
| user:write | user | write | ユーザー情報更新 |
| user:delete | user | delete | ユーザー情報削除 |
| 【カスタム】 | 【任意】 | 【任意】 | 【業務に応じて定義】 |

### 6.2 認可処理フロー

#### 6.2.1 初回認可フロー

```
1. ブラウザ → ロール管理コンテナー: Entra JWT + リソース/アクション
2. ロール管理コンテナー: JWT署名検証
3. ロール管理コンテナー: JWTクレーム検証（exp, iss, aud）
4. ロール管理コンテナー → DB: user_idでユーザー情報検索
5. DB → ロール管理コンテナー: ユーザー情報+ロール返却
6. ロール管理コンテナー: ロール→権限マッピング
7. ロール管理コンテナー: リクエスト権限チェック
8. ロール管理コンテナー → ブラウザ: 認可結果 + AWS JWT発行
```

#### 6.2.2 アプリケーションアクセス時フロー

```
1. ブラウザ → アプリケーションコンテナー: AWS JWT + APIリクエスト
2. アプリケーションコンテナー → ロール管理コンテナー: トークン検証要求
3. ロール管理コンテナー: トークン有効性確認
4. ロール管理コンテナー → アプリケーションコンテナー: 権限情報返却
5. アプリケーションコンテナー: エンドポイント権限チェック
6. アプリケーションコンテナー → ブラウザ: APIレスポンス
```

### 6.3 ロールテーブル設計

#### 6.3.1 ユーザーマスタ

| カラム名 | 型 | 制約 | 説明 |
|----------|-----|------|------|
| user_id | VARCHAR(255) | PK, NOT NULL | Azure Entra IDサブジェクト |
| email | VARCHAR(255) | NOT NULL | メールアドレス |
| display_name | VARCHAR(255) | NOT NULL | 表示名 |
| is_active | BOOLEAN | NOT NULL | 有効フラグ |
| created_at | TIMESTAMP | NOT NULL | 作成日時 |
| updated_at | TIMESTAMP | NOT NULL | 更新日時 |

#### 6.3.2 ユーザーロール関連テーブル

| カラム名 | 型 | 制約 | 説明 |
|----------|-----|------|------|
| user_id | VARCHAR(255) | PK, FK | ユーザーID |
| role_id | VARCHAR(50) | PK, FK | ロールID |
| assigned_at | TIMESTAMP | NOT NULL | 付与日時 |
| assigned_by | VARCHAR(255) | | 付与者 |

#### 6.3.3 ロール権限テーブル

| カラム名 | 型 | 制約 | 説明 |
|----------|-----|------|------|
| role_id | VARCHAR(50) | PK | ロールID |
| resource | VARCHAR(100) | PK | リソース名 |
| action | VARCHAR(50) | PK | アクション名 |
| created_at | TIMESTAMP | NOT NULL | 作成日時 |

### 6.4 権限チェック実装仕様

#### 6.4.1 チェックタイミング
- APIリクエスト受信時（ミドルウェア層）
- 画面表示時（フロントエンド層）

#### 6.4.2 チェック処理

```javascript
// 疑似コード
function checkPermission(user, resource, action) {
  // 1. ユーザーのロール取得
  const roles = getUserRoles(user.user_id);
  
  // 2. ロールから権限取得
  const permissions = getRolePermissions(roles);
  
  // 3. 権限チェック
  const requiredPermission = `${resource}:${action}`;
  return permissions.includes(requiredPermission);
}
```

#### 6.4.3 エラー処理

| パターン | HTTPステータス | エラーコード | 処理 |
|----------|----------------|--------------|------|
| トークンなし | 401 | UNAUTHORIZED | ログイン画面へ |
| トークン無効 | 401 | TOKEN_EXPIRED | 再認証要求 |
| 権限なし | 403 | FORBIDDEN | エラー画面表示 |

---

## 7. データ設計

### 7.1 JWTトークン構造

#### 7.1.1 Entra ID JWT

**ヘッダー**
```json
{
  "alg": "RS256",
  "typ": "JWT",
  "kid": "キーID"
}
```

**ペイロード**
```json
{
  "aud": "client_id",
  "iss": "https://login.microsoftonline.com/{tenant}/v2.0",
  "iat": 1234567890,
  "exp": 1234571490,
  "sub": "ユーザーサブジェクトID",
  "email": "user@example.com",
  "name": "ユーザー名",
  "nonce": "ランダム文字列"
}
```

#### 7.1.2 AWS JWT（独自発行）

**ヘッダー**
```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

**ペイロード**
```json
{
  "sub": "ユーザーID",
  "roles": ["role1", "role2"],
  "permissions": ["resource:action"],
  "iat": 1234567890,
  "exp": 1234571490,
  "iss": "aws-role-container"
}
```

### 7.2 環境変数

| 変数名 | 説明 | 設定例 |
|--------|------|--------|
| AZURE_TENANT_ID | AzureテナントID | 【設定値】 |
| AZURE_CLIENT_ID | アプリケーションID | 【設定値】 |
| JWT_SECRET | JWT署名秘密鍵 | 【機密情報】 |
| DB_HOST | データベースホスト | 【設定値】 |
| DB_NAME | データベース名 | 【設定値】 |

---

## 8. エラー処理設計

### 8.1 エラー分類

#### 8.1.1 認証エラー

| エラー | HTTPステータス | 原因 | 対応 |
|--------|----------------|------|------|
| UNAUTHORIZED | 401 | トークンなし | ログイン画面へ |
| TOKEN_EXPIRED | 401 | トークン期限切れ | 再認証要求 |
| TOKEN_INVALID | 401 | トークン形式エラー | 再認証要求 |
| SIGNATURE_INVALID | 401 | 署名検証失敗 | セッション破棄 |

#### 8.1.2 認可エラー

| エラー | HTTPステータス | 原因 | 対応 |
|--------|----------------|------|------|
| FORBIDDEN | 403 | 権限なし | エラー画面表示 |
| ACCESS_DENIED | 403 | リソースアクセス拒否 | エラー画面表示 |

#### 8.1.3 システムエラー

| エラー | HTTPステータス | 原因 | 対応 |
|--------|----------------|------|------|
| INTERNAL_ERROR | 500 | サーバーエラー | エラー画面・ログ記録 |
| DATABASE_ERROR | 503 | DB接続エラー | エラー画面・管理者通知 |

### 8.2 エラーレスポンス形式

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "ユーザー向けメッセージ",
    "details": {
      "technical_detail": "技術的詳細情報"
    },
    "request_id": "リクエストID",
    "timestamp": "ISO8601"
  }
}
```

### 8.3 ログ出力仕様

#### 8.3.1 認証ログ

| 項目 | 出力内容 |
|------|----------|
| タイミング | 認証成功/失敗時 |
| ユーザーID | 認証対象ユーザー |
| IPアドレス | アクセス元IP |
| 結果 | 成否 |
| 理由 | 失敗理由 |

#### 8.3.2 認可ログ

| 項目 | 出力内容 |
|------|----------|
| タイミング | 権限チェック時 |
| ユーザーID | アクセスユーザー |
| リソース | アクセス対象 |
| アクション | 実行操作 |
| 結果 | 許可/拒否 |

---

## 9. セキュリティ設計

### 9.1 通信セキュリティ

#### 9.1.1 TLS設定
- **プロトコル**: TLS 1.2 以上
- **暗号スイート**: 強度優先
- **証明書**: 有効期限内の証明書使用

#### 9.1.2 CORS設定

| 設定項目 | 値 | 説明 |
|----------|-----|------|
| Allowed Origins | アプリケーションURL | 許可ドメイン |
| Allowed Methods | GET, POST, PUT, DELETE | 許可メソッド |
| Allowed Headers | Authorization, Content-Type | 許可ヘッダー |

### 9.2 トークンセキュリティ

#### 9.2.1 署名アルゴリズム

| トークン | アルゴリズム | 鍵長 |
|----------|--------------|------|
| Entra JWT | RS256 | 2048bit以上 |
| AWS JWT | HS256 | 256bit以上 |

#### 9.2.2 機密情報保持
- クライアントシークレット: 環境変数で管理
- JWT署名鍵: KMSまたはSecrets Manager使用
- パスワード: ハッシュ化して保存（bcrypt等）

### 9.3 ブラウザセキュリティ

#### 9.3.1 XSS対策
- Content-Security-Policy ヘッダー設定
- 入力値エスケープ処理

#### 9.3.2 CSRF対策
- stateパラメータ（Azure AD認証時）
- SameSite Cookie属性

---

## 10. 非機能設計

### 10.1 パフォーマンス要件

| 項目 | 目標値 | 測定方法 |
|------|--------|----------|
| 認証処理時間 | 3秒以内 | 認証成功時の応答時間 |
| 認可処理時間 | 1秒以内 | APIレスポンス時間 |
| 同時接続数 | 【記載】 | 同時アクセス数 |
| 可用性 | 99.9%以上 | 月間稼働率 |

### 10.2 スケーラビリティ

| 項目 | 設計方針 |
|------|----------|
| 水平スケーリング | コンテナーのオートスケーリング |
| セッション管理 | ステートレス（JWT使用） |
| DB接続プール | コネクションプーリング使用 |

### 10.3 監査要件

| 項目 | 保持期間 | 出力先 |
|------|----------|--------|
| 認証ログ | 【記載】 | CloudWatch等 |
| 認可ログ | 【記載】 | CloudWatch等 |
| システムログ | 【記載】 | CloudWatch等 |

---

## 11. 制約事項

### 11.1 技術的制約
- Azure Entra ID の仕様変更に対応する必要がある
- AWS コンテナーサービスの制限事項
- ブラウザのLocalStorage容量制限（通常5-10MB）

### 11.2 セキュリティ制約
- 社内セキュリティポリシーへの準拠
- 個人情報保護法の遵守
- 監査証跡の保持義務

### 11.3 運用制約
- 定期メンテナンスウィンドウの設定
- トークン更新時のダウンタイム考慮
- 緊急時のセッション一括無効化手段

---

## 12. 用語集

| 用語 | 説明 |
|------|------|
| JWT | JSON Web Token。認証情報をやり取りするためのオープン標準 |
| OIDC | OpenID Connect。OAuth 2.0上の認証レイヤー |
| PKCE | Proof Key for Code Exchange。認可コードインターセプション攻撃対策 |
| RBAC | Role-Based Access Control。ロールベースのアクセス制御 |
| MFA | Multi-Factor Authentication。多要素認証 |
| Azure Entra ID | MicrosoftのクラウドベースID管理サービス（旧Azure AD） |
| exp | JWTの有効期限クレーム |
| iss | JWTの発行者クレーム |
| aud | JWTのオーディエンスクレーム |
| nonce | リプレイ攻撃防止用のランダム値 |

---

## 付録

### 付録A: シーケンス図
別紙 `auth_sequence.puml` および `auth_sequence_mermaid.md` を参照

### 付録B: エラーコード一覧表

| エラーコード | HTTPステータス | 説明 | 対処方法 |
|-------------|----------------|------|----------|
| UNAUTHORIZED | 401 | 認証されていない | ログイン画面へ遷移 |
| TOKEN_EXPIRED | 401 | トークン有効期限切れ | 再認証要求 |
| TOKEN_INVALID | 401 | トークン形式不正 | 再認証要求 |
| FORBIDDEN | 403 | 権限がない | エラー画面表示 |
| INTERNAL_ERROR | 500 | システムエラー | 管理者連絡 |

### 付録C: 環境別設定値

| 項目 | 開発環境 | ステージング | 本番環境 |
|------|----------|--------------|----------|
| Azure Tenant ID | 【設定】 | 【設定】 | 【設定】 |
| Azure Client ID | 【設定】 | 【設定】 | 【設定】 |
| トークン有効期限 | 1時間 | 1時間 | 1時間 |
| リフレッシュ有効期限 | 7日 | 14日 | 14日 |

---

**文書終了**
