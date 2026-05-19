import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

/**
 * 権限エラー情報
 */
export interface PermissionErrorInfo {
  screenId: string;
  reason: string;
}

/**
 * 権限エラー情報管理サービス
 * 
 * 画面権限ガードで権限チェックに失敗した際、
 * エラー情報を保持し、コンポーネントから参照できるようにする。
 */
@Injectable({ providedIn: 'root' })
export class PermissionErrorService {
  private errorSubject = new BehaviorSubject<PermissionErrorInfo | null>(null);
  
  /**
   * 権限エラー情報のストリーム
   */
  get error$(): Observable<PermissionErrorInfo | null> {
    return this.errorSubject.asObservable();
  }

  /**
   * 現在の権限エラー情報を取得
   */
  getError(): PermissionErrorInfo | null {
    return this.errorSubject.getValue();
  }

  /**
   * 権限エラー情報を設定
   * 
   * @param error - 権限エラー情報
   */
  setPermissionError(error: PermissionErrorInfo): void {
    this.errorSubject.next(error);
  }

  /**
   * 権限エラー情報をクリア
   */
  clearError(): void {
    this.errorSubject.next(null);
  }
}
