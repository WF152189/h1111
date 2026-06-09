import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TokenService } from '../core/services/token.service';
import { AppRouterLinkDirective } from '../shared/directives/app-router-link.directive';

/**
 * 管理者用管理画面コンポーネント
 * 
 * admin001のみがアクセス可能な管理者専用画面
 * ユーザー管理、権限設定、システム設定などの機能を提供
 */
@Component({
  selector: 'app-admin-management',
  standalone: true,
  imports: [CommonModule, RouterModule, AppRouterLinkDirective],
  template: `
    <div class="admin-page">
      <a appRouterLink="/dashboard" class="back-link">← ダッシュボードに戻る</a>
      <h1>⚙️ 管理者用管理画面</h1>
      <p class="welcome">管理者ユーザー: <strong>{{ userId }}</strong></p>

      <!-- 管理機能メニュー -->
      <div class="admin-section">
        <h2>管理機能</h2>
        <div class="admin-cards">
          <div class="admin-card" (click)="navigateTo('/admin/users')">
            <div class="card-icon">👥</div>
            <h3>ユーザー管理</h3>
            <p>ユーザーの追加・削除・権限設定</p>
          </div>

          <div class="admin-card" (click)="navigateTo('/admin/permissions')">
            <div class="card-icon">🔐</div>
            <h3>権限設定</h3>
            <p>画面権限・ロールの設定</p>
          </div>

          <div class="admin-card" (click)="navigateTo('/admin/system')">
            <div class="card-icon">🔧</div>
            <h3>システム設定</h3>
            <p>システム全体の設定・ログ確認</p>
          </div>
        </div>
      </div>

      <!-- システム情報 -->
      <div class="info-section">
        <h2>システム情報</h2>
        <table class="info-table">
          <tr>
            <th>ログインユーザーID</th>
            <td>{{ userId }}</td>
          </tr>
          <tr>
            <th>メールアドレス</th>
            <td>{{ email }}</td>
          </tr>
          <tr>
            <th>表示名</th>
            <td>{{ displayName }}</td>
          </tr>
          <tr>
            <th>ロール</th>
            <td>{{ roles.join(', ') }}</td>
          </tr>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .admin-page {
      max-width: 960px;
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
      margin-bottom: 8px;
    }
    .welcome {
      color: #666;
      margin-bottom: 32px;
    }
    .admin-section {
      margin-bottom: 40px;
    }
    h2 {
      color: #34495e;
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 2px solid #3498db;
    }
    .admin-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
    }
    .admin-card {
      background: #fff;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      padding: 24px;
      cursor: pointer;
      transition: all 0.3s ease;
    }
    .admin-card:hover {
      border-color: #3498db;
      box-shadow: 0 4px 12px rgba(52, 152, 219, 0.15);
      transform: translateY(-2px);
    }
    .card-icon {
      font-size: 48px;
      margin-bottom: 12px;
    }
    .admin-card h3 {
      color: #2c3e50;
      margin: 0 0 8px 0;
      font-size: 18px;
    }
    .admin-card p {
      color: #666;
      margin: 0;
      font-size: 14px;
    }
    .info-section {
      margin-bottom: 32px;
    }
    .info-table {
      width: 100%;
      border-collapse: collapse;
      background: #fff;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .info-table th,
    .info-table td {
      padding: 12px 16px;
      text-align: left;
      border-bottom: 1px solid #e0e0e0;
    }
    .info-table th {
      background: #f5f5f5;
      font-weight: 600;
      color: #2c3e50;
      width: 200px;
    }
    .info-table td {
      color: #555;
    }
  `]
})
export class AdminManagementComponent implements OnInit {
  userId: string = '';
  email: string = '';
  displayName: string = '';
  roles: string[] = [];

  constructor(private tokenService: TokenService) {}

  ngOnInit() {
    // JWTからユーザー情報を取得
    this.loadUserInfo();
  }

  /**
   * ユーザー情報をJWTから取得
   */
  private loadUserInfo() {
    try {
      const token = this.tokenService.getToken();
      if (token) {
        const payload = this.tokenService.decodePayload(token);
        this.userId = payload.sub || '';
        this.email = payload.email || '';
        this.displayName = payload.display_name || '';
        this.roles = payload.roles || [];
      }
    } catch (error) {
      console.error('ユーザー情報の取得に失敗しました:', error);
    }
  }

  /**
   * 指定した画面に遷移
   */
  navigateTo(route: string) {
    // TODO: 実際の画面が実装されたら有効化
    console.log('遷移先:', route);
    // this.router.navigate([route]);
  }
}
