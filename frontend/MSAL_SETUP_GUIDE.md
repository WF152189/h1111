# MSAL.js 切り替えガイド

## 概要

スタブ認証から本番Entra ID認証（MSAL.js）への切り替え手順を説明します。

---

## 1. Azure PortalでのEntra IDアプリケーション登録

### 1.1 アプリケーション登録

```
Azure Portal (https://portal.azure.com)
  ↓
Azure Active Directory (Entra ID)
  ↓
アプリの登録 → 新規登録
```

### 1.2 設定項目

| 項目 | 値 | 説明 |
|-----|-----|------|
| **名前** | `Your App Name` | アプリケーション名 |
| **サポートされているアカウントの種類** | `この組織ディレクトリのみに含まれるアカウント (シングルテナント)` | シングルテナント構成 |
| **リダイレクト URI** | `http://localhost:4200/callback` | 開発環境用 |

### 1.3 リダイレクト URI の追加

```
アプリ登録 → 認証 → プラットフォームの構成
  ↓
「Web」を選択
  ↓
リダイレクト URI:
  ☑ http://localhost:4200/callback        ← 開発環境
  ☑ https://your-domain.com/callback      ← 本番環境（必要に応じて）
```

### 1.4 クライアントIDとテナントIDの取得

```
アプリ登録 → 概要
  ↓
アプリケーション (クライアント) ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
ディレクトリ (テナント) ID:         xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

---

## 2. 環境設定ファイルの更新

### 2.1 開発環境（environment.ts）

```typescript
export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:8080',
  
  // MSAL設定（開発環境 - スタブ使用）
  useStub: true,  // ← スタブ使用時はtrue、本番Entra ID使用時はfalse
  entraAuthorizeUrl: 'http://localhost:8080/stub/entra/authorize',
  entraTokenUrl: 'http://localhost:8080/stub/entra/token',
  clientId: 'stub-client-id',
  redirectUri: 'http://localhost:4200/callback',
  
  // MSAL設定（本番Entra ID - 開発環境用）
  tenantId: 'YOUR_TENANT_ID',  // ← Azure Portalから取得したテナントID
  authority: 'https://login.microsoftonline.com/YOUR_TENANT_ID',
  
  // スコープ設定
  scopes: ['openid', 'profile', 'email']
};
```

### 2.2 本番環境（environment.prod.ts）

```typescript
export const environment = {
  production: true,
  apiBaseUrl: 'https://api.your-domain.com',  // ← 本番API URL
  
  // MSAL設定（本番Entra ID）
  useStub: false,  // ← 本番ではfalse
  tenantId: 'YOUR_TENANT_ID',  // ← Azure Portalから取得
  clientId: 'YOUR_CLIENT_ID',  // ← Azure Portalから取得
  redirectUri: 'https://your-domain.com/callback',  // ← 本番リダイレクトURI
  authority: 'https://login.microsoftonline.com/YOUR_TENANT_ID',
  
  // スコープ設定
  scopes: ['openid', 'profile', 'email']
};
```

---

## 3. スタブから本番への切り替え

### 3.1 開発環境で本番Entra IDを使用する場合

`environment.ts` の `useStub` を `false` に変更：

```typescript
export const environment = {
  // ...
  useStub: false,  // ← true から false に変更
  tenantId: 'actual-tenant-id-from-azure',
  clientId: 'actual-client-id-from-azure',
  redirectUri: 'http://localhost:4200/callback',
  authority: 'https://login.microsoftonline.com/actual-tenant-id',
  // ...
};
```

### 3.2 本番環境ビルド

```bash
# 本番環境用ビルド
ng build --configuration production

# dist/ フォルダに出力される
```

---

## 4. 動作確認

### 4.1 開発環境（スタブ）

```bash
# スタブ環境で起動
ng serve

# ブラウザでアクセス
http://localhost:4200

# ログイン → スタブEntra ID → コールバック → ダッシュボード
```

### 4.2 開発環境（本番Entra ID）

```bash
# environment.ts の useStub を false に変更
ng serve

# ブラウザでアクセス
http://localhost:4200

# ログイン → 実際のEntra ID → コールバック → ダッシュボード
```

### 4.3 本番環境

```bash
# 本番ビルド
ng build --configuration production

# dist/ をWebサーバーにデプロイ
# https://your-domain.com
```

---

## 5. トラブルシューティング

### 5.1 リダイレクトURIの不一致エラー

```
エラー: "The reply url specified in the request does not match..."

解決:
1. Azure Portal のリダイレクトURIを確認
2. environment.ts の redirectUri を確認
3. 完全に一致させる（末尾のスラッシュにも注意）
```

### 5.2 クライアントIDのエラー

```
エラー: "invalid_client"

解決:
1. Azure Portal でクライアントIDを再確認
2. environment.ts の clientId を更新
```

### 5.3 CORSエラー

```
エラー: "CORS policy blocked..."

解決:
1. バックエンドのCORS設定を確認
2. frontendのドメインを許可リストに追加
```

---

## 6. シングルテナント構成の特徴

### 6.1 authorityの形式

```typescript
// シングルテナント
authority: 'https://login.microsoftonline.com/YOUR_TENANT_ID'

// マルチテナント（非推奨）
authority: 'https://login.microsoftonline.com/common'
```

### 6.2 スコープ

```typescript
// 基本スコープ（推奨）
scopes: ['openid', 'profile', 'email']

// APIアクセスが必要な場合
scopes: ['openid', 'profile', 'email', 'api://your-api-id/access_as_user']
```

---

## 7. セキュリティ考慮事項

### 7.1 トークン保管

- **ID Token**: sessionStorage（MSALが自動管理）
- **業務JWT**: localStorage（アプリケーションで管理）

### 7.2 ログアウト

```typescript
// MSALのログアウト
msalInstance.logoutRedirect({
  postLogoutRedirectUri: environment.redirectUri
});

// ローカルトークン削除
localStorage.removeItem('business_jwt');
```

### 7.3 セッション管理

- セッションストレージ使用（ブラウザ閉じるとクリア）
- 24時間アクセストークン有効
- 期限切れ時 → Entra ID再認証

---

## 8. 必要な情報チェックリスト

- [ ] テナントID（Azure Portal → 概要）
- [ ] クライアントID（Azure Portal → 概要）
- [ ] リダイレクトURI（開発: `http://localhost:4200/callback`）
- [ ] リダイレクトURI（本番: `https://your-domain.com/callback`）
- [ ] シングルテナント設定確認
- [ ] スコープ設定確認（`openid`, `profile`, `email`）

---

## 9. 参考リンク

- [MSAL.js ドキュメント](https://docs.microsoft.com/ja-jp/azure/active-directory/develop/msal-js-overview)
- [Angular用MSAL](https://github.com/AzureAD/microsoft-authentication-library-for-js/tree/dev/lib/msal-angular)
- [Entra ID アプリ登録](https://docs.microsoft.com/ja-jp/azure/active-directory/develop/quickstart-register-app)
