import { CanActivateFn, CanActivateChildFn, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { inject } from '@angular/core';
import { AuthGuardT } from './auth.guard';
import { PermissionGuardT } from './permission.guard';

/**
 * 認証＋権限ガード（直列実行）
 * 
 * AuthGuard → PermissionGuard の順に直列実行。
 * AuthGuard が失敗した場合、PermissionGuard は実行されない。
 * 
 * 利点:
 * - ナビゲーション競合を防止
 * - 認証失敗時に無駄な権限チェックを実行しない
 * - コードの可読性向上
 * 
 * @example
 * {
 *   path: 'admin/management',
 *   canActivate: [authAndPermissionGuard],
 *   data: { screenId: 'ADMIN_MANAGEMENT_SCREEN' }
 * }
 * 
 * @param route - ルートのスナップショット
 * @param state - ルーターの現在の状態
 * @returns `true`（アクセス許可）、`false`（アクセス拒否）、または `UrlTree`（リダイレクト先）
 */
export const authAndPermissionGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  // inject() は同期的なコンテキストで呼び出す必要がある
  const authGuard = inject(AuthGuardT);
  const permGuard = inject(PermissionGuardT);
  
  // 非同期処理は Promise チェーンで実行
  return authGuard.canActivate(route, state).then((authResult): boolean | UrlTree | Promise<boolean | UrlTree> => {
    // AuthGuard が true の場合のみ PermissionGuard を実行
    if (authResult === true) {
      return permGuard.canActivate(route, state);
    }
    
    // AuthGuard が false または UrlTree の場合はそのまま返す
    return authResult;
  });
};

/**
 * 認証＋権限ガード（子ルート用・直列実行）
 * 
 * AuthGuard → PermissionGuard の順に直列実行。
 * 親ルートに設定することで、子ルート全体に認証＋権限制御を適用できる。
 * 
 * @example
 * {
 *   path: 'settings',
 *   canActivateChild: [authAndPermissionChildGuard],
 *   data: { screenId: 'SETTINGS_SCREEN' },
 *   children: [...]
 * }
 * 
 * @param childRoute - 子ルートのスナップショット
 * @param state - ルーターの現在の状態
 * @returns `true`（アクセス許可）、`false`（アクセス拒否）、または `UrlTree`（リダイレクト先）
 */
export const authAndPermissionChildGuard: CanActivateChildFn = (
  childRoute: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  // inject() は同期的なコンテキストで呼び出す必要がある
  const authGuard = inject(AuthGuardT);
  const permGuard = inject(PermissionGuardT);
  
  // 非同期処理は Promise チェーンで実行
  return authGuard.canActivate(childRoute, state).then((authResult): boolean | UrlTree | Promise<boolean | UrlTree> => {
    // AuthGuard が true の場合のみ PermissionGuard を実行
    if (authResult === true) {
      return permGuard.canActivateChild(childRoute, state);
    }
    
    // AuthGuard が false または UrlTree の場合はそのまま返す
    return authResult;
  });
};
