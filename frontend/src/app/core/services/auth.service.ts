import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { TokenService } from './token.service';
import { MsalService, MsalRedirectRequest } from './msal.service';
import { environment } from '../../../environments/environment';
import { firstValueFrom, of } from 'rxjs';
import { switchMap, tap, catchError, map } from 'rxjs/operators';

/**
 * 認証エラー種別
 */
export type AuthErrorCode = 
  | 'ENTRA_JWT_INVALID'      // Entra JWT署名検証失敗
  | 'ENTRA_JWT_EXPIRED'      // Entra JWT期限切れ
  | 'USER_NOT_FOUND'         // ユーザー未登録
  | 'INTERNAL_AUTH_FAILED'   // 内部認証失敗
  | 'INTERNAL_AUTH_DENIED'   // 内部認証拒否
  | 'UNKNOWN';               // その他

/**
 * 認証サービス - MSAL.js使用パターン
 * 
 * フロー:
 * 1. MSAL.jsでログインリダイレクト
 * 2. MSAL.jsで認可コード受信・トークン取得
 * 3. バックエンドAPIで業務JWT取得
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private msalService = inject(MsalService);
  private http = inject(HttpClient);
  private router = inject(Router);
  private tokenService = inject(TokenService);

  /**
   * ログイン開始
   */
  login(): void {
    const request: MsalRedirectRequest = {
      scopes: ['openid', 'profile', 'email'],
      prompt: 'select_account'
    };

    this.msalService.loginRedirect(request);
  }

  /**
   * コールバック処理: MSALトークン取得 → 業務JWT取得
   * 
   * フロー:
   * 1. msalInstance.handleRedirectPromise() でEntra JWT取得
   * 2. POST /auth/verify で業務JWT取得（24時間有効）
   * 
   * リカバリーフロー:
   * - /auth/verify が 401 を返した場合、Entra JWTが無効・期限切れ
   * - 無限ループ防止のため、再認証は1回のみ実行
   */
  async handleCallback(): Promise<boolean> {
    const MAX_RETRY = 1;
    const retryKey = 'auth_callback_retry';
    
    try {
      // リトライカウンター確認（無限ループ防止）
      const retryCount = parseInt(sessionStorage.getItem(retryKey) || '0', 10);
      if (retryCount >= MAX_RETRY) {
        console.error('[handleCallback] リトライ上限に到達');
        sessionStorage.removeItem(retryKey);
        return false;
      }

      // Step 1: MSALでEntra JWT取得
      console.log('[handleCallback] handleRedirectPromise() 開始');
      const msalResult = await this.msalService.handleRedirectPromise();
      console.log('[handleCallback] handleRedirectPromise() 結果:', msalResult ? '取得成功' : 'null');
      
      if (!msalResult) {
        console.error('[handleCallback] MSAL result is null → 認可コードなし');
        return false;
      }

      const entraJwt = msalResult.idToken;
      console.log('[handleCallback] ID Token取得済み、/auth/verify にリクエスト送信');

      // Step 2: Entra JWT → 業務JWT（24時間有効）→ 追加の検証API呼び出し
      try {
        await firstValueFrom(
          this.http.post(`${environment.apiBaseUrl}/auth/verify`, {}, {
            headers: { 'Authorization': `Bearer ${entraJwt}` },
            withCredentials: true,
            observe: 'response'  // レスポンス全体（ヘッダー含む）を取得
          }).pipe(
            // /auth/verify のレスポンスからトークンを抽出
            tap(authRes => {
              const authHeader = authRes.headers.get('Authorization');
              if (!authHeader || !authHeader.startsWith('Bearer ')) {
                throw new Error('Authorizationヘッダーなし');
              }
              
              const token = authHeader.substring(7);  // "Bearer " を除去
              // 業務JWTをLocalStorageに保存（24時間有効）
              this.tokenService.saveToken(token);
              console.log('[handleCallback] 業務JWT保存完了');
            }),
            // 成功後、追加の検証APIを呼び出し
            switchMap(() => {
              console.log('[handleCallback] 追加検証API呼び出し開始');
              // TODO: ここに実際の検証APIのURLを入れてください
              return this.http.post(`${environment.apiBaseUrl}/auth/validate`, {}, {
                withCredentials: true
              });
            }),
            // 追加検証APIの結果を処理
            tap(validateRes => {
              console.log('[handleCallback] 追加検証API成功:', validateRes);
              // 必要に応じて検証結果を処理
            }),
            // エラー処理
            catchError((error: HttpErrorResponse) => {
              console.error('[handleCallback] API呼び出しエラー:', error);
              
              // HTTP 401エラー時のリカバリーフロー
              if (error.status === 401) {
                const errorCode = this.extractErrorCode(error);
                console.warn('[handleCallback] APIが401:', errorCode);
                
                // リトライカウンター増分
                const retryCount = parseInt(sessionStorage.getItem(retryKey) || '0', 10);
                sessionStorage.setItem(retryKey, String(retryCount + 1));
                
                // エラー理由を記録（ユーザー表示用）
                sessionStorage.setItem('auth_error_reason', errorCode);
                
                // MSALアカウント情報クリア（無効なトークンを削除）
                this.msalService.logoutRedirect();
                
                // 即時Entra ID再認証へリダイレクト
                this.login();
                
                // エラーを投げてストリームを終了
                return of(false);
              }
              
              // 401以外は通常のエラーとして処理
              throw error;
            })
          )
        );
        
        console.log('[handleCallback] 全認証フロー完了 → true返却');
        // 成功したらリトライカウンターリセット
        sessionStorage.removeItem(retryKey);
        return true;
        
      } catch (httpError) {
        // catchError で処理されなかったエラー
        console.error('[handleCallback] 認証フローで予期せぬエラー:', httpError);
        throw httpError;
      }
    } catch (error) {
      console.error('[handleCallback] 認証失敗:', error);
      sessionStorage.removeItem('auth_callback_retry');
      return false;
    }
  }

  /**
   * HTTPエラーからエラーコードを抽出
   */
  private extractErrorCode(error: HttpErrorResponse): AuthErrorCode {
    if (error.error && error.error.code) {
      return error.error.code as AuthErrorCode;
    }
    
    // エラーメッセージから推測
    const message = error.message?.toLowerCase() || '';
    if (message.includes('signature') || message.includes('invalid')) {
      return 'ENTRA_JWT_INVALID';
    }
    if (message.includes('expir')) {
      return 'ENTRA_JWT_EXPIRED';
    }
    if (message.includes('user') || message.includes('not found')) {
      return 'USER_NOT_FOUND';
    }
    
    return 'UNKNOWN';
  }

  /**
   * ログアウト
   */
  async logout(): Promise<void> {
    try {
      // バックエンドのセッションクリア（オプション）
      await firstValueFrom(
        this.http.post(`${environment.apiBaseUrl}/auth/logout`, {}, {
          withCredentials: true
        })
      ).catch(() => {
        // エラーは無視
      });
    } catch (error) {
      console.error('ログアウトエラー:', error);
    }

    // MSALアカウント情報クリア
    this.msalService.logoutRedirect();
    
    // ローカルトークン削除
    this.tokenService.removeToken();
    
    // ログアウトページへ遷移
    this.router.navigate(['/logout']);
  }

  /**
   * MSALアカウント情報取得（ユーティリティ）
   */
  getAccount() {
    return this.msalService.getActiveAccount();
  }
}
