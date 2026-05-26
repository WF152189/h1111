import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';

/**
 * 権限エラーメッセージ表示コンポーネント
 * 
 * クエリパラメータから権限エラーを受け取り、メッセージを表示
 */
@Component({
  selector: 'app-permission-error-banner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="errorMessage" class="permission-error-banner">
      <div class="error-content">
        <span class="error-icon">⚠️</span>
        <span class="error-message">{{ errorMessage }}</span>
        <button class="close-button" (click)="dismiss()">×</button>
      </div>
    </div>
  `,
  styles: [`
    .permission-error-banner {
      background: #fff3cd;
      border: 1px solid #ffc107;
      border-radius: 4px;
      padding: 12px 16px;
      margin-bottom: 16px;
      animation: slideDown 0.3s ease-out;
    }
    
    .error-content {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .error-icon {
      font-size: 18px;
    }
    
    .error-message {
      flex: 1;
      color: #856404;
      font-size: 14px;
    }
    
    .close-button {
      background: none;
      border: none;
      font-size: 20px;
      color: #856404;
      cursor: pointer;
      padding: 0 4px;
      line-height: 1;
    }
    
    .close-button:hover {
      color: #533f03;
    }
    
    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `]
})
export class PermissionErrorBannerComponent implements OnInit, OnDestroy {
  errorMessage: string | null = null;
  private queryParamSubscription: Subscription | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    // クエリパラメータを監視
    this.queryParamSubscription = this.route.queryParams.subscribe(params => {
      if (params['error'] === 'permission_denied') {
        this.errorMessage = params['message'] || 'この画面にアクセスする権限がありません。';
        
        // URLからクエリパラメータを削除（再表示防止）
        this.clearQueryParams();
      }
    });
  }

  ngOnDestroy() {
    this.queryParamSubscription?.unsubscribe();
  }

  /**
   * エラーメッセージを閉じる
   */
  dismiss() {
    this.errorMessage = null;
  }

  /**
   * クエリパラメータをクリア
   */
  private clearQueryParams() {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { error: null, message: null },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }
}
