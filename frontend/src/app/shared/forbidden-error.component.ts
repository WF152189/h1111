import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-forbidden-error',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="error-container">
      <div class="error-card">
        <div class="icon">🚫</div>
        <h1>アクセス権限がありません</h1>
        <p *ngIf="screenId">画面ID: <strong>{{ screenId }}</strong></p>
        <p *ngIf="reason" class="reason">{{ reason }}</p>
        <p *ngIf="!reason">この画面にアクセスする権限がありません。<br>必要な権限について管理者にお問い合わせください。</p>
        <button class="primary-btn" (click)="goToDashboard()">ダッシュボードへ戻る</button>
      </div>
    </div>
  `,
  styles: [`
    .error-container {
      display: flex; justify-content: center; align-items: center;
      min-height: 100vh; background: #f0f2f5;
    }
    .error-card {
      background: #fff; padding: 48px; border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1); text-align: center; max-width: 500px;
    }
    .icon { font-size: 64px; margin-bottom: 16px; }
    h1 { color: #e65100; margin-bottom: 16px; }
    p { color: #666; margin-bottom: 12px; line-height: 1.6; }
    .reason { color: #333; font-weight: 500; background: #fff3cd; padding: 8px 12px; border-radius: 4px; }
    .primary-btn {
      background: #0078d4; color: #fff; border: none; padding: 14px 32px;
      border-radius: 6px; font-size: 16px; cursor: pointer; margin-top: 16px;
    }
    .primary-btn:hover { background: #005a9e; }
  `]
})
export class ForbiddenErrorComponent implements OnInit {
  screenId: string | null = null;
  reason: string | null = null;

  constructor(
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    // クエリパラメータから画面IDと拒否理由を取得
    this.screenId = this.route.snapshot.queryParamMap.get('screenId');
    this.reason = this.route.snapshot.queryParamMap.get('reason');
  }

  goToDashboard() {
    this.router.navigate(['/dashboard']);
  }
}
