import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../core/services/auth.service';
import { TokenService } from '../core/services/token.service';
import { TokenRefreshService } from '../core/services/token-refresh.service';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="login-container">
      <div class="login-card">
        <h1>🔐 認証・認可システム</h1>
        
        <!-- セッション期限切れメッセージ -->
        <div *ngIf="sessionExpiredMessage" class="alert alert-warning">
          {{ sessionExpiredMessage }}
        </div>
        
        <!-- サイレント更新中の表示 -->
        <div *ngIf="isRefreshing" class="alert alert-info">
          セッションを更新中...
        </div>
        
        <p *ngIf="!isRefreshing">業務システムへアクセスするにはログインが必要です。</p>
        <button 
          class="login-btn" 
          (click)="onLogin()"
          [disabled]="isRefreshing">
          {{ isRefreshing ? '更新中...' : 'ログイン' }}
        </button>
        <p class="info">※ スタブモード: テストユーザーを選択してログインできます</p>
      </div>
    </div>
  `,
  styles: [`
    .login-container {
      display: flex; justify-content: center; align-items: center;
      min-height: 100vh; background: #f0f2f5;
    }
    .login-card {
      background: #fff; padding: 48px; border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1); text-align: center; max-width: 450px;
    }
    h1 { color: #1a1a2e; margin-bottom: 16px; }
    p { color: #666; margin-bottom: 24px; }
    .alert {
      padding: 12px 16px; border-radius: 6px; margin-bottom: 20px;
      font-size: 14px; text-align: left;
    }
    .alert-warning {
      background: #fff3cd; border: 1px solid #ffc107; color: #856404;
    }
    .login-btn {
      background: #0078d4; color: #fff; border: none; padding: 14px 32px;
      border-radius: 6px; font-size: 16px; cursor: pointer; width: 100%;
    }
    .login-btn:hover { background: #005a9e; }
    .login-btn:disabled {
      background: #ccc;
      cursor: not-allowed;
    }
    .alert-info {
      background: #d1ecf1;
      border: 1px solid #0c5460;
      color: #0c5460;
    }
    .info { font-size: 12px; color: #999; margin-top: 24px; }
  `]
})
export class LoginComponent implements OnInit {
  sessionExpiredMessage: string | null = null;
  isRefreshing = false;

  constructor(
    private authService: AuthService,
    private tokenService: TokenService,
    private tokenRefreshService: TokenRefreshService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    console.log('[LoginComponent] ページ表示開始');
    console.log('[LoginComponent] JWT有効チェック:', this.tokenService.isTokenValid());
    
    // 既にJWT有効ならダッシュボードへ
    if (this.tokenService.isTokenValid()) {
      console.log('[LoginComponent] 既にJWT有効、ダッシュボードへ遷移')
      this.router.navigate(['/dashboard']);
      return;
    }

    // JWT期限切れの場合、サイレント更新を試みる
    this.trySilentRefresh();

    // クエリパラメータからセッション期限切れメッセージを取得
    this.route.queryParams.subscribe(params => {
      if (params['reason'] === 'session_expired') {
        this.sessionExpiredMessage = params['message'] || 'セッションの有効期限が切れました。再度ログインしてください。';
      }
    });
  }

  /**
   * サイレント更新を試みる
   */
  private trySilentRefresh() {
    this.isRefreshing = true;
    
    this.tokenRefreshService.performSilentRefresh().subscribe((newToken) => {
      this.isRefreshing = false;
      
      if (newToken) {
        // 更新成功 → ダッシュボードへ
        console.log('[LoginComponent] サイレント更新成功、ダッシュボードへ遷移');
        this.router.navigate(['/dashboard']);
      } else {
        // 更新失敗 → ログインページに留まる（ユーザーに手動ログインを促す）
        console.warn('[LoginComponent] サイレント更新失敗、ログインページを表示');
      }
    });
  }

  onLogin() {
    // 更新中はログインボタンを無効化
    if (this.isRefreshing) {
      return;
    }
    this.authService.login();
  }
}
