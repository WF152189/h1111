import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-system-settings',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="system-settings">
      <h2>🖥️ システム設定</h2>
      <p>システム全体の設定、ログ、パフォーマンスモニタリングを管理します。</p>
      
      <div class="settings-section">
        <h3>システム情報</h3>
        <table class="info-table">
          <tr><th>バージョン</th><td>v1.0.0</td></tr>
          <tr><th>環境</th><td>開発</td></tr>
          <tr><th>最終更新</th><td>2026-04-26</td></tr>
        </table>
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
    .info-table {
      width: 100%;
      border-collapse: collapse;
    }
    .info-table th, .info-table td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    .info-table th {
      background: #f0f2f5;
      color: #34495e;
      width: 150px;
    }
  `]
})
export class SystemSettingsComponent {}
