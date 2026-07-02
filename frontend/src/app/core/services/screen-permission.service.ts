import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { firstValueFrom } from 'rxjs';

/**
 * 画面権限レスポンス
 */
export interface ScreenPermissionResult {
  authorized: boolean;
  message?: string;
  reason?: string;
}

/**
 * 画面権限チェックサービス
 * 
 * ユーザーが特定の画面にアクセスする権限を持っているかを確認する
 * バックエンドの画面権限APIと連携
 */
@Injectable({ providedIn: 'root' })
export class ScreenPermissionService {

  constructor(
    private http: HttpClient
  ) {}

  /**
   * 画面権限をチェック
   * 
   * フロー:
   * 1. バックエンドに画面権限をチェック依頼
   * 2. 結果を返却
   * 
   * @param screenId 画面ID（例: 'BUSINESS_DATA_SCREEN'）
   * @param api1Start API1運用開始時刻（API1利用時に指定）
   * @param api1End API1運用終了時刻（API1利用時に指定）
   * @param api2Start API2運用開始時刻（API2利用時に指定）
   * @param api2End API2運用終了時刻（API2利用時に指定）
   * @returns 権限チェック結果
   */
  async checkScreenPermission(
    screenId: string,
    api1Start?: string,
    api1End?: string,
    api2Start?: string,
    api2End?: string
  ): Promise<ScreenPermissionResult> {
    try {
      // バックエンドに権限チェックを依頼
      const result: ScreenPermissionResult = await firstValueFrom(
        this.http.post<ScreenPermissionResult>(
          `${environment.apiBaseUrl}/api/screens/permission/check`,
          {
            screenId,
            api1Start,
            api1End,
            api2Start,
            api2End
          },
          {
            withCredentials: true  // Cookie（RT）を自動送信
          }
        )
      );

      return result;

    } catch (error) {
      console.error('画面権限チェックでエラーが発生しました:', error);
      
      // エラー時は安全側に倒して失敗とする
      if (error instanceof HttpErrorResponse && error.status === 401) {
        // 認証エラー：セッション切れ
        return {
          authorized: false,
          reason: '認証セッションが切れています。再度ログインしてください。'
        };
      }
      
      return {
        authorized: false,
        reason: '画面権限チェックでエラーが発生しました'
      };
    }
  }
}
