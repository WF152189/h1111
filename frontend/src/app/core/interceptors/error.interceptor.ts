import { HttpInterceptorFn, HttpErrorResponse, HttpHandlerFn, HttpRequest, HttpContextToken } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError, Observable, EMPTY, from } from 'rxjs';
import { TokenRefreshService } from '../services/token-refresh.service';

/**
 * リトライ済みフラグ（HttpContextToken）
 * 
 * 無限ループ防止用:
 * - 401リトライ時にこのフラグを true に設定
 * - 2回目の401ではこのフラグをチェックしてログインページへ
 */
export const RETRY_TOKEN = new HttpContextToken<boolean>(() => false);

/**
 * エラー処理interceptor（Promiseベース）
 * 
 * 責務:
 * - 業務API（/auth/ と /stub/ を除いたURL）のエラーを処理
 * - 401: サイレント更新 → リトライ（1回のみ）
 * - 403: 権限エラーページへ
 * 
 * 設計原則:
 * - 認証API（/auth/*）のエラーは直接透過（ここでは処理しない）
 * - 認証エラーは auth.service.ts で個別処理
 * 
 * 無限ループ防止:
 * - リトライ後も401が返された場合、ログインページへリダイレクト
 * - context に 'retry' フラグを設定してリトライ済みを追跡
 */
export const errorInterceptor: HttpInterceptorFn = (req, next): Observable<any> => {
  const router = inject(Router);
  const tokenRefreshService = inject(TokenRefreshService);

  // 認証系・スタブ系APIのエラーは処理しない（直接透過）
  const skipUrls = ['/auth/', '/stub/'];
  const shouldSkip = skipUrls.some(url => req.url.includes(url));

  if (shouldSkip) {
    return next(req);
  }

  // 業務APIのエラーを処理
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      console.log('[errorInterceptor] catchError called, status:', error.status, 'RETRY_TOKEN:', req.context.get(RETRY_TOKEN));
      
      if (error.status === 401) {
        // リトライ済みの場合はログインページへ
        if (req.context.get(RETRY_TOKEN)) {
          console.warn('[errorInterceptor] リトライ後も401エラー、ログインページへリダイレクト');
          redirectToLogin(router);
          return EMPTY;
        }

        // 業務JWT無効 → サイレント更新
        console.warn('[errorInterceptor] 401エラー: サイレント更新開始');
        return handle401Error(req, next, tokenRefreshService, router);
        
      } else if (error.status === 403) {
        // 権限エラー → forbidden ページ
        console.warn('[errorInterceptor] 403エラー: 権限なし');
        router.navigate(['/error/forbidden']);
        // エラーを送出せず、EMPTY を返す
        return EMPTY;
      }

      // その他のエラーはそのまま伝播
      return throwError(() => error);
    })
  );
};

/**
 * 401エラー処理（Promiseベース）
 * 
 * フロー:
 * 1. TokenRefreshService でサイレント更新
 * 2. 成功したら新JWTでリクエスト再試行（retryフラグ付き）
 * 3. 失敗したらログインページへ
 */
function handle401Error(
  req: HttpRequest<any>,
  next: HttpHandlerFn,
  tokenRefreshService: TokenRefreshService,
  router: Router
): Observable<any> {
  // Promise を Observable に変換
  return from(tokenRefreshService.performSilentRefresh()).pipe(
    catchError((error) => {
      console.error('[errorInterceptor] サイレント更新エラー、ログインページへリダイレクト', error);
      redirectToLogin(router);
      return EMPTY;
    }),
    switchMap((newToken: string | null) => {
      if (!newToken) {
        // 更新失敗 → ログインページへ
        console.warn('[errorInterceptor] サイレント更新失敗、ログインページへリダイレクト');
        redirectToLogin(router);
        // エラーを送出せず、EMPTY を返す（コンポーネントへのエラー伝播を防止）
        return EMPTY;
      }

      // 新JWTでリクエスト再試行（retryフラグを設定）
      console.info('[errorInterceptor] トークン更新成功、リトライ');
      const retryReq = req.clone({
        setHeaders: { Authorization: `Bearer ${newToken}` },
        context: req.context.set(RETRY_TOKEN, true)  // リトライ済みフラグ
      });
      return next(retryReq).pipe(
        catchError((retryError: HttpErrorResponse) => {
          if (retryError.status === 401) {
            console.warn('[errorInterceptor] リトライ後も401エラー、ログインページへリダイレクト');
            redirectToLogin(router);
            return EMPTY;
          }

          return throwError(() => retryError);
        })
      );
    })
  );
}

/**
 * ログインページへリダイレクト
 */
function redirectToLogin(router: Router) {
  router.navigate(['/login'], {
    queryParams: {
      reason: 'session_expired',
      message: 'セッションの有効期限が切れました。再度ログインしてください。'
    }
  });
}
