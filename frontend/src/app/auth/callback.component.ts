import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-callback',
    imports: [CommonModule],
    template: `
    <div class="callback-container">
      <div class="callback-card">
        <div *ngIf="!error" class="loading">
          <p>認証処理中...</p>
          <div class="spinner"></div>
        </div>
        <div *ngIf="error" class="error">
          <h2>⚠️ 認証エラー</h2>
          <p>{{ error }}</p>
          <p *ngIf="errorReason" class="error-detail">エラーコード: {{ errorReason }}</p>
          <button (click)="goToLogin()">ログイン画面に戻る</button>
        </div>
      </div>
    </div>
  `,
    styles: [`
    .callback-container {
      display: flex; justify-content: center; align-items: center;
      min-height: 100vh; background: #f0f2f5;
    }
    .callback-card {
      background: #fff; padding: 48px; border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1); text-align: center;
    }
    .spinner {
      border: 4px solid #f3f3f3; border-top: 4px solid #0078d4;
      border-radius: 50%; width: 40px; height: 40px;
      animation: spin 1s linear infinite; margin: 20px auto;
    }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    .error h2 { color: #d32f2f; }
    .error-detail { 
      color: #999; 
      font-size: 12px; 
      margin-top: 8px;
      font-family: monospace;
    }
    button {
      background: #0078d4; color: #fff; border: none; padding: 12px 24px;
      border-radius: 6px; cursor: pointer; margin-top: 16px;
    }
  `]
})
export class CallbackComponent implements OnInit {
  error: string | null = null;
  errorReason: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit() {
    console.log('[CallbackComponent] ngOnInit開始、URL:', window.location.href);
    
    // 非同期処理を実行（voidを返す）
    this.handleCallbackAsync();
  }

  /**
   * 非同期コールバック処理
   */
  private async handleCallbackAsync(): Promise<void> {
    try {
      // MSALパターン: パラメータはMSALが自動処理
      // handleCallback()内部でhandleRedirectPromise()が認可コードを検出
      console.log('[CallbackComponent] handleCallback() 呼び出し');
      const result = await this.authService.handleCallback();
      console.log('[CallbackComponent] handleCallback結果:', result);
      
      if (result.success) {
        // 認証成功 → 常にダッシュボードへ
        console.log('[CallbackComponent] ダッシュボードへ遷移');
        this.router.navigate(['/dashboard']);
      } else {
        // エラーコードに基づいてメッセージを表示
        this.errorReason = result.errorCode || sessionStorage.getItem('auth_error_reason');
        this.error = this.getErrorMessage(result.errorCode, result.errorMessage);
        console.error('[CallbackComponent] エラー表示:', this.error);
      }
    } catch (error) {
      console.error('[CallbackComponent] 予期せぬエラー:', error);
      this.error = '認証処理中にエラーが発生しました。';
    }
  }

  /**
   * エラーコードに応じてメッセージを返す
   * @param errorCode - エラーコード
   * @param fallbackMessage - フォールバックメッセージ
   */
  private getErrorMessage(errorCode?: string, fallbackMessage?: string): string {
    switch (errorCode) {
      case 'ENTRA_TOKEN_INVALID':
        return 'Entra IDトークンの署名検証に失敗しました。再度ログインしてください。';
      case 'ENTRA_JWT_EXPIRED':
        return 'Entra IDトークンの有効期限が切れています。再度ログインしてください。';
      case 'USER_NOT_FOUND':
        return 'ユーザーが見つかりません。管理者に問い合わせてください。';
      case 'INTERNAL_AUTH_FAILED':
        return '業務JWTの検証に失敗しました。再度ログインしてください。';
      case 'SERVER_ERROR':
        return 'サーバーエラーが発生しました。しばらく待ってから再度お試しください。';
      default:
        return fallbackMessage || '認証処理に失敗しました。もう一度お試しください。';
    }
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }
}
