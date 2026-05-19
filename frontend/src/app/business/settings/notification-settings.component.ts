import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-notification-settings',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="notification-settings">
      <h2>🔔 通知設定</h2>
      <p>メール通知、プッシュ通知、アラート設定を管理します。</p>
      
      <div class="settings-section">
        <h3>通知方法</h3>
        <div class="setting-item">
          <label>
            <input type="checkbox" checked />
            メール通知
          </label>
        </div>
        <div class="setting-item">
          <label>
            <input type="checkbox" />
            プッシュ通知
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
export class NotificationSettingsComponent {}
