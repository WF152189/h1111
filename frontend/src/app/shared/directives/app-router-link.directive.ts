import { Directive, HostListener, Input } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

/**
 * カスタムルーターリンクディレクティブ
 * 
 * 機能:
 * - routerLink と同じ動作
 * - クリック時に AuthService.isProgrammaticNavigation フラグを自動設定
 * - AuthGuard でプログラム遷移と直接アクセスを識別可能
 * 
 * 使用例:
 * <a appRouterLink="/dashboard">ダッシュボード</a>
 * <a appRouterLink="/settings/user">設定</a>
 */
@Directive({
  selector: '[appRouterLink]',
  standalone: true
})
export class AppRouterLinkDirective {
  @Input() appRouterLink: string | any[] = [];
  @Input() queryParams: { [key: string]: any } | undefined;
  @Input() fragment: string | undefined;
  @Input() preserveFragment: boolean = false;
  @Input() skipLocationChange: boolean = false;
  @Input() replaceUrl: boolean = false;

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  @HostListener('click', ['$event'])
  onClick(event: MouseEvent) {
    // Ctrl/Cmd/Shift キーが押されている場合はデフォルト動作（新しいタブで開く）を許可
    if (event.ctrlKey || event.metaKey || event.shiftKey) {
      return;
    }

    // イベントのデフォルト動作を防ぐ
    event.preventDefault();

    // プログラム遷移フラグを設定
    this.authService.isProgrammaticNavigation = true;

    // ナビゲーション実行
    const commands = Array.isArray(this.appRouterLink) 
      ? this.appRouterLink 
      : [this.appRouterLink];

    this.router.navigate(commands, {
      queryParams: this.queryParams,
      fragment: this.fragment,
      preserveFragment: this.preserveFragment,
      skipLocationChange: this.skipLocationChange,
      replaceUrl: this.replaceUrl
    });
  }
}
