import { Injectable } from '@angular/core';
import { TokenService } from './token.service';
import { ScreenPermissionService, ScreenPermissionResult } from './screen-permission.service';

@Injectable({ providedIn: 'root' })
export class PermissionService {

  constructor(
    private tokenService: TokenService,
    private screenPermissionService: ScreenPermissionService
  ) {}

  /**
   * 指定権限を保持しているか確認（JWTベース）
   */
  hasPermission(permission: string): boolean {
    return this.tokenService.getPermissions().includes(permission);
  }

  /**
   * 指定権限のいずれかを保持しているか確認（JWTベース）
   */
  hasAnyPermission(permissions: string[]): boolean {
    const userPerms = this.tokenService.getPermissions();
    return permissions.some(p => userPerms.includes(p));
  }

  /**
   * 指定ロールを保持しているか確認（JWTベース）
   */
  hasRole(role: string): boolean {
    return this.tokenService.getRoles().includes(role);
  }

  /**
   * 画面権限をチェック（バックエンドAPI連携）
   * 
   * @param screenId 画面ID（例: 'BUSINESS_DATA_SCREEN'）
   * @returns 権限チェック結果
   */
  async checkScreenPermission(screenId: string): Promise<ScreenPermissionResult> {
    return this.screenPermissionService.checkScreenPermission(screenId);
  }
}
