import { Component } from '@angular/core';
import { AuthService } from '../core/services/auth.service';
import { TokenService } from '../core/services/token.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  template: `
    <div class="login-container">
      <div class="login-card">
        <h1>🔐 認証・認可システム</h1>
        <p>業務システムへアクセスするにはログインが必要です。</p>
        <button class="login-btn" (click)="onLogin()">
          ログイン
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
    .login-btn {
      background: #0078d4; color: #fff; border: none; padding: 14px 32px;
      border-radius: 6px; font-size: 16px; cursor: pointer; width: 100%;
    }
    .login-btn:hover { background: #005a9e; }
    .info { font-size: 12px; color: #999; margin-top: 24px; }
  `]
})
export class LoginComponent {
  constructor(
    private authService: AuthService,
    private tokenService: TokenService,
    private router: Router
  ) {}

  ngOnInit() {
    // 既にJWT有効ならダッシュボードへ
    if (this.tokenService.isTokenValid()) {
      this.router.navigate(['/dashboard']);
    }
  }

  onLogin() {
    this.authService.login();
  }
}
