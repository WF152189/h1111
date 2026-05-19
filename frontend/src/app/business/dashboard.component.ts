import { Component, OnInit, HostListener, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TokenService } from '../core/services/token.service';
import { PermissionService } from '../core/services/permission.service';
import { AuthService } from '../core/services/auth.service';
import { ApiService } from '../core/services/api.service';

@Component({
    selector: 'app-dashboard',
    imports: [CommonModule, RouterModule],
    template: `
    <div class="dashboard">
      <header>
        <h1>📊 業務ダッシュボード</h1>
        <div class="user-info" *ngIf="userInfo">
          <span>{{ userInfo.displayName }} ({{ userInfo.email }})</span>
          <span class="roles">ロール: {{ roles.join(', ') }}</span>
          <button class="logout-btn" (click)="onLogout()">ログアウト</button>
        </div>
      </header>

      <nav class="menu">
        <h2>メニュー</h2>
        <div class="menu-items">
          <a routerLink="/business/data" class="menu-item" *ngIf="hasPermission('user:read')">
            📋 業務データ管理
          </a>
          <a routerLink="/menu" class="menu-item">
            📑 権限情報確認
          </a>
          <a routerLink="/admin/management" class="menu-item admin-menu" *ngIf="isAdmin()">
            ⚙️ 管理者用管理画面
          </a>
          
          <!-- 設定ドロップダウンメニュー -->
          <div class="dropdown-menu" *ngIf="isAdmin()" #dropdownContainer>
            <button 
              class="menu-item dropdown-trigger" 
              (click)="toggleSettingsDropdown($event)"
              [attr.aria-expanded]="showSettingsDropdown"
              aria-haspopup="true">
              ⚙️ 設定 ▾
            </button>
            <div 
              class="dropdown-content" 
              *ngIf="showSettingsDropdown"
              #dropdownContent
              role="menu">
              <a routerLink="/settings/user" class="dropdown-item" (click)="hideSettingsDropdown()" role="menuitem">
                👤 ユーザー設定
              </a>
              <a routerLink="/settings/system" class="dropdown-item" (click)="hideSettingsDropdown()" role="menuitem">
                🖥️ システム設定
              </a>
              <a routerLink="/settings/security" class="dropdown-item" (click)="hideSettingsDropdown()" role="menuitem">
                🔒 セキュリティ設定
              </a>
              <a routerLink="/settings/notification" class="dropdown-item" (click)="hideSettingsDropdown()" role="menuitem">
                🔔 通知設定
              </a>
            </div>
          </div>
        </div>
      </nav>

      <div class="content" *ngIf="initData">
        <h2>初期データ</h2>
        <div class="info-card">
          <p><strong>ステータス:</strong> {{ initData.message }}</p>
          <p><strong>サーバー時刻:</strong> {{ initData.data?.serverTime }}</p>
          <p><strong>バージョン:</strong> {{ initData.data?.appVersion }}</p>
        </div>
      </div>

      <div class="permissions-overview">
        <h2>保有権限</h2>
        <div class="perm-list">
          <span class="perm-badge" *ngFor="let p of permissions">{{ p }}</span>
        </div>
      </div>
    </div>
  `,
    styles: [`
    .dashboard { max-width: 960px; margin: 0 auto; padding: 24px; }
    header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 16px 24px; background: #1a1a2e; color: #fff; border-radius: 8px;
      margin-bottom: 24px;
    }
    header h1 { margin: 0; font-size: 20px; }
    .user-info { display: flex; align-items: center; gap: 16px; font-size: 14px; }
    .roles { color: #aaa; }
    .logout-btn {
      background: #e74c3c; color: #fff; border: none; padding: 8px 16px;
      border-radius: 4px; cursor: pointer;
    }
    .menu { margin-bottom: 24px; }
    .menu h2 { margin-bottom: 12px; color: #333; }
    .menu-items { display: flex; gap: 16px; }
    .menu-item {
      display: block; padding: 16px 24px; background: #fff; border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1); text-decoration: none; color: #333;
      font-size: 16px; transition: transform 0.2s;
    }
    .menu-item:hover { transform: translateY(-2px); }
    .admin-menu {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #fff;
    }
    .admin-menu:hover {
      background: linear-gradient(135deg, #5568d3 0%, #6a3f91 100%);
    }
    /* ドロップダウンメニュー */
    .dropdown-menu {
      position: relative;
      display: inline-block;
    }
    .dropdown-trigger {
      cursor: pointer;
      position: relative;
    }
    .dropdown-trigger::after {
      content: '';
      display: inline-block;
      margin-left: 4px;
    }
    .dropdown-content {
      position: absolute;
      top: 100%;
      left: 0;
      background: #fff;
      border-radius: 8px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.15);
      min-width: 200px;
      z-index: 1000;
      margin-top: 4px;
      overflow: hidden;
    }
    .dropdown-item {
      display: block;
      padding: 12px 20px;
      color: #333;
      text-decoration: none;
      font-size: 14px;
      transition: background 0.2s;
      border-bottom: 1px solid #f0f0f0;
    }
    .dropdown-item:last-child {
      border-bottom: none;
    }
    .dropdown-item:hover {
      background: #f0f2f5;
      color: #0078d4;
    }
    .info-card {
      background: #fff; padding: 24px; border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .permissions-overview { margin-top: 24px; }
    .perm-list { display: flex; gap: 8px; flex-wrap: wrap; }
    .perm-badge {
      background: #e8f4fd; color: #0078d4; padding: 6px 12px;
      border-radius: 16px; font-size: 13px;
    }
  `]
})
export class DashboardComponent implements OnInit {
  userInfo: any = null;
  roles: string[] = [];
  permissions: string[] = [];
  initData: any = null;
  showSettingsDropdown = false;  // 設定ドロップダウンの表示状態
  
  @ViewChild('dropdownContainer') dropdownContainer: ElementRef | undefined;
  @ViewChild('dropdownContent') dropdownContent: ElementRef | undefined;

  constructor(
    private tokenService: TokenService,
    private permissionService: PermissionService,
    private authService: AuthService,
    private apiService: ApiService
  ) {}

  ngOnInit() {
    this.userInfo = this.tokenService.getUserInfo();
    this.roles = this.tokenService.getRoles();
    this.permissions = this.tokenService.getPermissions();
    this.loadInitData();
  }

  loadInitData() {
    this.apiService.get<any>('/api/init').subscribe({
      next: (data: any) => this.initData = data,
      error: (err: any) => console.error('初期データ取得失敗', err)
    });
  }

  hasPermission(perm: string): boolean {
    return this.permissionService.hasPermission(perm);
  }

  /**
   * 管理者かどうかを判定
   * admin001のみが管理者
   */
  isAdmin(): boolean {
    return this.userInfo?.userId === 'admin001';
  }

  /**
   * 設定ドロップダウンを表示/非表示
   * クリックイベントの伝播を停止し、ドキュメントのクリックイベントと区別する
   */
  toggleSettingsDropdown(event: Event): void {
    event.stopPropagation();  // ドキュメントへのイベント伝播を停止
    this.showSettingsDropdown = !this.showSettingsDropdown;
  }

  /**
   * 設定ドロップダウンを非表示
   */
  hideSettingsDropdown(): void {
    this.showSettingsDropdown = false;
  }

  /**
   * ドキュメント全体のクリックイベントを監視
   * ドロップダウン外側のクリックを検出してメニューを閉じる
   */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    if (!this.showSettingsDropdown) {
      return;  // ドロップダウンが閉じている場合は何もしない
    }

    // クリックされた要素がドロップダウン内かどうかをチェック
    const clickedElement = event.target as HTMLElement;
    const isInsideDropdown = this.dropdownContainer?.nativeElement.contains(clickedElement);

    if (!isInsideDropdown) {
      // ドロップダウン外側のクリック → メニューを閉じる
      this.hideSettingsDropdown();
    }
  }

  /**
   * キーボードイベントを監視（Escキーでドロップダウンを閉じる）
   */
  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.showSettingsDropdown) {
      this.hideSettingsDropdown();
    }
  }

  onLogout() {
    this.authService.logout();
  }
}
