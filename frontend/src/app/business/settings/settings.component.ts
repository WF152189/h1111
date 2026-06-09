import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterOutlet } from '@angular/router';
import { AppRouterLinkDirective } from '../../shared/directives/app-router-link.directive';

/**
 * 設定画面 親コンポーネント
 * 
 * 子ルートを持つ設定メニューのレイアウトを提供
 * admin001のみがアクセス可能
 */
@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, RouterModule, RouterOutlet, AppRouterLinkDirective],
  template: `
    <div class="settings-page">
      <a appRouterLink="/dashboard" class="back-link">← ダッシュボードに戻る</a>
      <h1>⚙️ 設定</h1>

      <div class="settings-container">
        <!-- サイドバー -->
        <nav class="settings-sidebar">
          <h2>設定メニュー</h2>
          <ul>
            <li>
              <a appRouterLink="/settings/user" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}">
                👤 ユーザー設定
              </a>
            </li>
            <li>
              <a appRouterLink="/settings/system" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}">
                🖥️ システム設定
              </a>
            </li>
            <li>
              <a appRouterLink="/settings/security" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}">
                🔒 セキュリティ設定
              </a>
            </li>
            <li>
              <a appRouterLink="/settings/notification" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}">
                🔔 通知設定
              </a>
            </li>
          </ul>
        </nav>

        <!-- メインコンテンツ -->
        <main class="settings-content">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `,
  styles: [`
    .settings-page {
      max-width: 1200px;
      margin: 0 auto;
      padding: 24px;
    }
    .back-link {
      color: #0078d4;
      text-decoration: none;
      display: inline-block;
      margin-bottom: 16px;
    }
    .back-link:hover {
      text-decoration: underline;
    }
    h1 {
      color: #2c3e50;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 2px solid #3498db;
    }
    .settings-container {
      display: grid;
      grid-template-columns: 250px 1fr;
      gap: 24px;
    }
    .settings-sidebar {
      background: #fff;
      border-radius: 8px;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      height: fit-content;
    }
    .settings-sidebar h2 {
      font-size: 16px;
      color: #34495e;
      margin: 0 0 16px 0;
      padding-bottom: 8px;
      border-bottom: 1px solid #e0e0e0;
    }
    .settings-sidebar ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .settings-sidebar li {
      margin-bottom: 4px;
    }
    .settings-sidebar a {
      display: block;
      padding: 12px 16px;
      color: #555;
      text-decoration: none;
      border-radius: 6px;
      transition: all 0.2s;
    }
    .settings-sidebar a:hover {
      background: #f0f2f5;
      color: #0078d4;
    }
    .settings-sidebar a.active {
      background: #0078d4;
      color: #fff;
    }
    .settings-content {
      background: #fff;
      border-radius: 8px;
      padding: 32px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      min-height: 400px;
    }
  `]
})
export class SettingsComponent {
}
