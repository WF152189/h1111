import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TokenService } from './token.service';
import { environment } from '../../../environments/environment';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class RefreshService {

  private refreshing = false;

  constructor(
    private http: HttpClient,
    private tokenService: TokenService
  ) {}

  /**
   * RT更新要求
   * 成功時: 新JWTをLocalStorageに保存してtrue返却
   * 失敗時: false返却
   */
  async tryRefresh(): Promise<boolean> {
    if (this.refreshing) return false;
    this.refreshing = true;

    try {
      const res = await firstValueFrom(
        this.http.post(`${environment.apiBaseUrl}/auth/refresh`, {}, {
          withCredentials: true,
          observe: 'response'  // レスポンス全体（ヘッダー含む）を取得
        })
      );
      
      // レスポンスヘッダーからアクセストークンを取得
      const authHeader = res.headers.get('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.error('アクセストークンがヘッダーに設定されていません');
        return false;
      }
      
      const token = authHeader.substring(7);  // "Bearer " を除去
      this.tokenService.saveToken(token);
      return true;
    } catch (error) {
      console.error('トークン更新失敗:', error);
      return false;
    } finally {
      this.refreshing = false;
    }
  }
}
