import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-logout-complete',
  standalone: true,
  template: `
    <div class="logout-container">
      <div class="logout-card">
        <h1>👋 ログアウト完了</h1>
        <p>安全にログアウトしました。</p>
        <button (click)="goToLogin()">再度ログイン</button>
      </div>
    </div>
  `,
  styles: [`
    .logout-container {
      display: flex; justify-content: center; align-items: center;
      min-height: 100vh; background: #f0f2f5;
    }
    .logout-card {
      background: #fff; padding: 48px; border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1); text-align: center;
    }
    h1 { color: #1a1a2e; }
    button {
      background: #0078d4; color: #fff; border: none; padding: 12px 24px;
      border-radius: 6px; cursor: pointer; margin-top: 16px; font-size: 16px;
    }
  `]
})
export class LogoutCompleteComponent {
  constructor(private router: Router) {}

  goToLogin() {
    this.router.navigate(['/login']);
  }
}
