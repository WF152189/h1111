import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ApiService } from '../core/services/api.service';
import { PermissionService } from '../core/services/permission.service';
import { AppRouterLinkDirective } from '../shared/directives/app-router-link.directive';

@Component({
    selector: 'app-sample-data',
    imports: [CommonModule, FormsModule, RouterModule, AppRouterLinkDirective],
    template: `
    <div class="data-page">
      <a appRouterLink="/dashboard" class="back-link">← ダッシュボードに戻る</a>
      <h1>📋 業務データ管理</h1>

      <!-- データ一覧 -->
      <div class="section">
        <h2>データ一覧</h2>
        <table>
          <thead>
            <tr><th>ID</th><th>名前</th><th>ステータス</th><th *ngIf="canDelete">操作</th></tr>
          </thead>
          <tbody>
            <tr *ngFor="let item of dataList">
              <td>{{ item['id'] }}</td>
              <td>{{ item['name'] }}</td>
              <td>{{ item['status'] }}</td>
              <td *ngIf="canDelete">
                <button class="delete-btn" (click)="deleteData(item['id'])">削除</button>
              </td>
            </tr>
          </tbody>
        </table>
        <button class="refresh-btn" (click)="loadData()">再読み込み</button>
      </div>

      <!-- データ登録 -->
      <div class="section" *ngIf="canWrite">
        <h2>新規データ登録</h2>
        <div class="form">
          <input [(ngModel)]="newName" placeholder="名前" />
          <button class="add-btn" (click)="createData()">登録</button>
        </div>
      </div>

      <div class="message" *ngIf="message">{{ message }}</div>
    </div>
  `,
    styles: [`
    .data-page { max-width: 720px; margin: 0 auto; padding: 24px; }
    .back-link { color: #0078d4; text-decoration: none; display: inline-block; margin-bottom: 16px; }
    .section { margin-bottom: 32px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
    th, td { border: 1px solid #ddd; padding: 10px 14px; text-align: left; }
    th { background: #f5f5f5; }
    .form { display: flex; gap: 8px; }
    input { flex: 1; padding: 10px; border: 1px solid #ccc; border-radius: 4px; }
    .add-btn { background: #27ae60; color: #fff; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; }
    .delete-btn { background: #e74c3c; color: #fff; border: none; padding: 6px 14px; border-radius: 4px; cursor: pointer; }
    .refresh-btn { background: #0078d4; color: #fff; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; }
    .message { background: #e8f5e9; color: #2e7d32; padding: 12px; border-radius: 4px; margin-top: 16px; }
  `]
})
export class SampleDataComponent implements OnInit {
  dataList: any[] = [];
  newName = '';
  message = '';
  canWrite = false;
  canDelete = false;

  constructor(
    private apiService: ApiService,
    private permissionService: PermissionService
  ) {}

  ngOnInit() {
    this.canWrite = this.permissionService.hasPermission('user:write');
    this.canDelete = this.permissionService.hasPermission('user:delete');
    this.loadData();
  }

  loadData() {
    this.apiService.get<any[]>('/api/business/data').subscribe({
      next: (data: any) => this.dataList = data,
      error: (err: any) => console.error('データ取得失敗', err)
    });
  }

  createData() {
    if (!this.newName) return;
    this.apiService.post<any>('/api/business/data', { name: this.newName, status: 'active' }).subscribe({
      next: (res: any) => {
        this.message = `データ「${this.newName}」を登録しました (ID: ${res.id})`;
        this.newName = '';
        this.loadData();
      },
      error: (err: any) => this.message = 'データ登録に失敗しました'
    });
  }

  deleteData(id: number) {
    this.apiService.delete<any>(`/api/business/data/${id}`).subscribe({
      next: (res: any) => {
        this.message = res.message;
        this.loadData();
      },
      error: (err: any) => this.message = 'データ削除に失敗しました'
    });
  }
}
