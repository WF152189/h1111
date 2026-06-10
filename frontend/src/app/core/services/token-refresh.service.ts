import { Injectable } from '@angular/core';
import { MsalService } from './msal.service';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';

/**
 * トークン更新サービス（Promiseベース）
 * 
 * 責務:
 * - サイレントトークン更新の一元管理
 * - 同時リクエストの制御（同じPromiseを共有）
 * - 更新状態の管理
 * 
 * 使用シーン:
 * - AuthGuard: JWT期限切れ時のサイレント更新
 * - errorInterceptor: 401エラー時のトークン更新
 * - コンポーネント: 必要に応じたトークン更新
 */
@Injectable({
  providedIn: 'root'
})
export class TokenRefreshService {
  private refreshPromise: Promise<string | null> | null = null;

  constructor(
    private msalService: MsalService,
    private authService: AuthService,
    private tokenService: TokenService
  ) {}

  /**
   * サイレントトークン更新実行
   * 
   * フロー:
   * 1. 更新中の場合は、同じPromiseを返す
   * 2. 新規更新なら acquireTokenSilent() → handleCallbackWithEntraJwt()
   * 3. 新JWTを返却
   * 
   * @returns 新JWT、またはnull（更新失敗）
   */
  async performSilentRefresh(): Promise<string | null> {
    // 既に更新中の場合は、同じPromiseを返す
    if (this.refreshPromise) {
      console.log('[TokenRefreshService] 既にトークン更新中、待機');
      return this.refreshPromise;
    }

    // 新規更新処理
    console.log('[TokenRefreshService] サイレント更新開始');
    this.refreshPromise = this.executeTokenRefresh();

    try {
      const result = await this.refreshPromise;
      return result;
    } finally {
      // 完了後にリセット
      this.refreshPromise = null;
      console.log('[TokenRefreshService] 更新処理完了');
    }
  }

  /**
   * 実際のトークン更新処理
   */
  private async executeTokenRefresh(): Promise<string | null> {
    try {
      // Step 1: acquireTokenSilent() でEntra ID token取得
      const entraJwt = await this.msalService.acquireTokenSilent({
        scopes: ['openid', 'profile', 'email']
      });

      if (!entraJwt) {
        console.warn('[TokenRefreshService] acquireTokenSilent() 失敗');
        return null;
      }

      // Step 2: handleCallbackWithEntraJwt() で業務JWT更新
      const result = await this.authService.handleCallbackWithEntraJwt(entraJwt);

      if (!result.success) {
        console.warn('[TokenRefreshService] 業務JWT更新失敗:', result.errorMessage);
        return null;
      }

      // Step 3: 新JWT取得
      const newToken = this.tokenService.getToken();
      
      if (!newToken) {
        console.error('[TokenRefreshService] 新JWTが見つからない');
        return null;
      }

      console.log('[TokenRefreshService] トークン更新成功');
      return newToken;

    } catch (error) {
      console.error('[TokenRefreshService] サイレント更新エラー:', error);
      return null;
    }
  }
}
