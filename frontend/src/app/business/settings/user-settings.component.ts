import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-user-settings',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="user-settings">
      <h2>👤 ユーザー設定</h2>
      <p>ユーザーのプロフィール、パスワード、通知設定などを管理します。</p>
      
      <div class="settings-section">
        <h3>プロフィール情報</h3>
        <div class="form-group">
          <label>表示名</label>
          <input type="text" placeholder="表示名を入力" />
        </div>
        <div class="form-group">
          <label>メールアドレス</label>
          <input type="email" placeholder="メールを入力" />
        </div>
        <button class="save-btn">保存</button>
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
    .form-group {
      margin-bottom: 16px;
    }
    label {
      display: block;
      color: #555;
      font-weight: 500;
      margin-bottom: 8px;
    }
    input {
      width: 100%;
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
    }
    .save-btn {
      background: #0078d4;
      color: #fff;
      border: none;
      padding: 12px 24px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
    }
    .save-btn:hover {
      background: #005a9e;
    }
  `]
})
export class UserSettingsComponent {}
