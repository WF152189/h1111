import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ApiService } from '../core/services/api.service';

@Component({
    selector: 'app-menu',
    imports: [CommonModule, RouterModule],
    template: `
    <div class="menu-page">
      <a routerLink="/dashboard" class="back-link">← ダッシュボードに戻る</a>
      <h1>📑 権限情報確認</h1>

      <div class="section" *ngIf="permData">
        <h2>ユーザー情報</h2>
        <table>
          <tr><th>ユーザーID</th><td>{{ permData.userId }}</td></tr>
          <tr><th>ロール</th><td>{{ permData.roles?.join(', ') }}</td></tr>
        </table>

        <h2>保有権限一覧</h2>
        <table>
          <tr><th>権限</th></tr>
          <tr *ngFor="let p of permData.permissions"><td>{{ p }}</td></tr>
        </table>
      </div>
    </div>
  `,
    styles: [`
    .menu-page { max-width: 720px; margin: 0 auto; padding: 24px; }
    .back-link { color: #0078d4; text-decoration: none; display: inline-block; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    th, td { border: 1px solid #ddd; padding: 10px 14px; text-align: left; }
    th { background: #f5f5f5; }
  `]
})
export class MenuComponent implements OnInit {
  permData: any = null;

  constructor(private apiService: ApiService) {}

  ngOnInit() {
    this.apiService.get<any>('/api/menu/permissions').subscribe({
      next: (data: any) => this.permData = data,
      error: (err: any) => console.error('権限情報取得失敗', err)
    });
  }
}
