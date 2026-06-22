import { Injectable, inject } from '@angular/core';
import { CanActivate, CanActivateChild, CanActivateFn, CanActivateChildFn, Router, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { TokenService } from '../services/token.service';
import { TokenRefreshService } from '../services/token-refresh.service';
import { AuthService } from '../services/auth.service';

/**
 * 認証ガード（関数型 + クラス委譲パターン）
 * 
 * ユーザーが認証されているかをチェック。
 * JWTが無効な場合はEntra ID認証へリダイレクト。
 * 
 * @returns
 * - `true`: 認証成功、アクセス許可（または認証不要パス）
 * - `false`: 認証失敗、Entra ID認証へリダイレクト済み（戻り値は形式的なもの）
 * 
 * @example
 * // canActivate用（親ルート・通常ルート）
 * { path: 'dashboard', component: DashboardComponent, canActivate: [AuthGuard] }
 * 
 * @example
 * // canActivateChild用（子ルート用）
 * { 
 *   path: 'settings',
 *   canActivateChild: [AuthChildGuard],
 *   children: [...]
 * }
 */

export const AuthGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot, 
  state: RouterStateSnapshot
) => {
  return inject(AuthGuardT).canActivate(route, state);
};

/**
 * 子ルート用認証ガード（関数型）
 * 
 * canActivateChild として使用。
 * 親ルートに設定することで、子ルート全体に認証を適用できる。
 */
export const AuthChildGuard: CanActivateChildFn = (
  childRoute: ActivatedRouteSnapshot, 
  state: RouterStateSnapshot
) => {
  return inject(AuthGuardT).canActivateChild(childRoute, state);
};

/**
 * 認証ガードクラス（委譲先）
 * 
 * 実際の認証ロジックを実装。
 * Angular DI コンテナに登録され、関数型ガードから委譲される。
 * CanActivate と CanActivateChild の両方を実装。
 */
@Injectable({
  providedIn: 'root'
})
export class AuthGuardT implements CanActivate, CanActivateChild {
  constructor(
    private tokenService: TokenService,
    private tokenRefreshService: TokenRefreshService,
    private router: Router,
    private authService: AuthService
  ) {}

  /**
   * ルートアクティベーションの可否を判定（親ルート・通常ルート用）
   * 
   * @param route - アクティブ化されたルートのスナップショット
   * @param state - ルーターの現在の状態
   * @returns `true`（アクセス許可）、`false`（認証失敗）、または `UrlTree`（リダイレクト先）
   * 
   * @remarks
   * MSALのloginRedirect()は内部でwindow.location.hrefを実行するため、
   * return false は到達しないデッドコード（Angularの型契約を満たすための形式）。
   */
  async canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Promise<boolean | UrlTree> {
    console.log('[AuthGuard] canActivate 開始 - 時刻:', Date.now());
    const result = await this.checkAuth(state);
    console.log('[AuthGuard] canActivate 完了 - 時刻:', Date.now(), '結果:', result);
    return result;
  }

  /**
   * 子ルートアクティベーションの可否を判定（子ルート用）
   * 
   * @param childRoute - 子ルートのスナップショット
   * @param state - ルーターの現在の状態
   * @returns `true`（アクセス許可）、`false`（認証失敗）、または `UrlTree`（リダイレクト先）
   * 
   * @remarks
   * canActivate と同一の認証ロジックを使用。
   * MSALのloginRedirect()は内部でwindow.location.hrefを実行するため、
   * return false は到達しないデッドコード（Angularの型契約を満たすための形式）。
   */
  async canActivateChild(
    childRoute: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Promise<boolean | UrlTree> {
    return this.checkAuth(state);
  }

  /**
   * 共通認証チェックロジック
   * 
   * JWTが無効な場合:
   * - プログラム遷移（メニュークリック等） → /login ページへリダイレクト（UrlTree返却）
   * - 直接アクセス（URL直接入力等） → Entra ID認証を直接実行
   * 
   * @param state - ルーターの現在の状態
   * @returns `true`（アクセス許可）、`false`（認証失敗）、または `UrlTree`（リダイレクト先）
   */
  private async checkAuth(state: RouterStateSnapshot): Promise<boolean | UrlTree> {
    // JWT有効ならアクセス許可
    console.log('[AuthGuard] checkAuth 開始 - url:', state.url);
    
    const isValid = this.tokenService.isTokenValid();
    console.log('[AuthGuard] checkAuth:', state.url, 'tokenValid:', isValid);
    if (isValid) {
      if (state.url === '/login') {
        return this.router.createUrlTree(['/dashboard']);
      }
      return true;
    }

    console.warn('[AuthGuard] JWT無効、サイレント更新試行');

    // JWT無効 → TokenRefreshService でサイレント更新
    try {
      const newToken = await this.tokenRefreshService.performSilentRefresh();

      if (newToken) {
        console.log('[AuthGuard] サイレント更新成功、アクセス許可');
        return true;
      }
      
      console.warn('[AuthGuard] サイレント更新失敗（nullトークン）');
    } catch (error) {
      console.warn('[AuthGuard] サイレント更新失敗:', error);
    }

    // ⭐ プログラム遷移フラグを読み取って、直後にリセット
    const isRouterNavigate = this.authService.isProgrammaticNavigation;
    this.authService.isProgrammaticNavigation = false;
    
    console.log('[AuthGuard] 遷移判定:', isRouterNavigate ? 'プログラム遷移' : '直接アクセス');

    if (isRouterNavigate) {
      // プログラム遷移 → /login ページへリダイレクト
      console.warn('[AuthGuard] プログラム遷移、ログインページへリダイレクト');
      this.router.navigate(['/login'], {
        state: { 
          errorMessage: 'セッションの有効期限が切れました。再度ログインしてください。'
        }
      });
      return false;  // navigate()で遷移済みなのでfalseを返す
    } else {
      // 直接アクセス → Entra ID認証を直接実行
      console.warn('[AuthGuard] 直接アクセス、Entra ID認証を直接実行');
      sessionStorage.setItem('redirect_url', state.url);
      this.authService.login();
    }
    
    // このreturnは実行されない（既にリダイレクトが発生済み）
    // AngularのCanActivateインターフェース契約を満たすための形式
    return false;
  }
}
