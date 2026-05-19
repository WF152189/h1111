import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-auth-error',
  standalone: true,
  template: `
    <div class="error-container">
      <div class="error-card">
        <div class="icon">🔒</div>
        <h1>認証エラー</h1>
        <p>セッションが無効または期限切れです。再度ログインしてください。</p>
        <button class="primary-btn" (click)="goToLogin()">ログイン画面へ</button>
      </div>
    </div>
  `,
  styles: [`
    .error-container {
      display: flex; justify-content: center; align-items: center;
      min-height: 100vh; background: #f0f2f5;
    }
    .error-card {
      background: #fff; padding: 48px; border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1); text-align: center; max-width: 450px;
    }
    .icon { font-size: 64px; margin-bottom: 16px; }
    h1 { color: #d32f2f; margin-bottom: 16px; }
    p { color: #666; margin-bottom: 24px; line-height: 1.6; }
    .primary-btn {
      background: #0078d4; color: #fff; border: none; padding: 14px 32px;
      border-radius: 6px; font-size: 16px; cursor: pointer;
    }
    .primary-btn:hover { background: #005a9e; }
  `]
})
export class AuthErrorComponent {
  constructor(private router: Router) {}

  goToLogin() {
    this.router.navigate(['/login']);
  }
}
