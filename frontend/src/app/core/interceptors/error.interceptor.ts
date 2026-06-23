import { Injectable, inject } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpErrorResponse } from '@angular/common/http';
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
@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  private router = inject(Router);
  private tokenRefreshService = inject(TokenRefreshService);

  // 認証系・スタブ系APIのエラーは処理しない（直接透過）
  private skipUrls = ['/auth/', '/stub/'];

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<any> {
    const shouldSkip = this.skipUrls.some(url => req.url.startsWith(url));

    if (shouldSkip) {
      return next.handle(req);
    }

    // 業務APIのエラーを処理
    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          // 業務JWT無効 → サイレント更新
          console.warn('[errorInterceptor] 401エラー: サイレント更新開始');
          return this.handle401Error(req, next);
        } else if (error.status === 403) {
          // 権限エラー → forbidden ページ
          console.warn('[errorInterceptor] 403エラー: 権限なし');
          this.router.navigate(['/error/forbidden']);
          return EMPTY;
        }
        // その他のエラーはそのまま伝播
        return throwError(() => error);
      })
    );
  }

  /**
   * 401エラー処理: サイレント更新 → リトライ
   */
  private handle401Error(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<any> {
    return from(this.tokenRefreshService.performSilentRefresh()).pipe(
      catchError((error) => {
        console.error('[errorInterceptor] サイレント更新エラー、ログインページへリダイレクト', error);
        this.redirectToLogin();
        return EMPTY;
      }),
      switchMap((newToken: string | null) => {
        if (!newToken) {
          // 更新失敗 → ログインページへ
          console.warn('[errorInterceptor] サイレント更新失敗、ログインページへリダイレクト');
          this.redirectToLogin();
          return EMPTY;
        }

        // 新JWTでリクエスト再試行
        console.info('[errorInterceptor] トークン更新成功、リトライ');
        const retryReq = req.clone({
          setHeaders: { Authorization: `Bearer ${newToken}` }
        });
        return next.handle(retryReq).pipe(
          catchError((retryError: HttpErrorResponse) => {
            if (retryError.status === 401) {
              console.warn('[errorInterceptor] リトライ後も401エラー、ログインページへリダイレクト');
              this.redirectToLogin();
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
  private redirectToLogin(): void {
    this.router.navigate(['/login'], {
      queryParams: {
        reason: 'session_expired',
        message: 'セッションの有効期限が切れました。再度ログインしてください。'
      }
    });
  }
}
