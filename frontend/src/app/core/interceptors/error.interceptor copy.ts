import { HttpInterceptorFn, HttpErrorResponse, HttpHandlerFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError, Observable, EMPTY, from } from 'rxjs';
import { TokenRefreshService } from '../services/token-refresh.service';

/**
 * エラー処理interceptor
 * 
 * 責務:
 * - 業務API（/auth/ と /stub/ を除いたURL）のエラーを処理
 * - 401: サイレント更新 → リトライ（1回のみ）
 * - 403: 権限エラーページへ
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
      if (error.status === 401) {
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
 * 401エラー処理: サイレント更新 → リトライ
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

      // 新JWTでリクエスト再試行
      console.info('[errorInterceptor] トークン更新成功、リトライ');
      const retryReq = req.clone({
        setHeaders: { Authorization: `Bearer ${newToken}` }
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
