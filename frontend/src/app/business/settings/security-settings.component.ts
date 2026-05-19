import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-security-settings',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="security-settings">
      <h2>🔒 セキュリティ設定</h2>
      <p>認証、認可、セッション管理などのセキュリティ設定を管理します。</p>
      
      <div class="settings-section">
        <h3>認証設定</h3>
        <div class="setting-item">
          <label>
            <input type="checkbox" checked />
            二要素認証を有効にする
          </label>
        </div>
        <div class="setting-item">
          <label>
            <input type="checkbox" />
            セッションタイムアウトを有効にする
          </label>
        </div>
      </div>
    </div>
  `,
  styles: [`
    h2 { color: #2c3e50; margin-bottom: 16px; }
    p { color: #666; margin-bottom: 24px; }
    .settings-section {
      background: #f8f9fa;
      padding: 24px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    h3 { color: #34495e; margin: 0 0 16px 0; }
    .setting-item {
      padding: 12px 0;
      border-bottom: 1px solid #e0e0e0;
    }
    .setting-item:last-child {
      border-bottom: none;
    }
    label {
      display: flex;
      align-items: center;
      gap: 12px;
      cursor: pointer;
      color: #555;
    }
    input[type="checkbox"] {
      width: 20px;
      height: 20px;
      cursor: pointer;
    }
  `]
})
export class SecuritySettingsComponent {}
