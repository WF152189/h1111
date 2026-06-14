import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { AuthGuardT } from './auth.guard';
import { TokenService } from '../services/token.service';
import { TokenRefreshService } from '../services/token-refresh.service';
import { AuthService } from '../services/auth.service';

describe('AuthGuardT', () => {
  let guard: AuthGuardT;
  let tokenServiceSpy: jasmine.SpyObj<TokenService>;
  let tokenRefreshServiceSpy: jasmine.SpyObj<TokenRefreshService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;

  const mockRoute = {} as ActivatedRouteSnapshot;
  const mockState = { url: '/dashboard' } as RouterStateSnapshot;

  beforeEach(() => {
    const tokenSpy = jasmine.createSpyObj('TokenService', ['isTokenValid']);
    const tokenRefreshSpy = jasmine.createSpyObj('TokenRefreshService', ['performSilentRefresh']);
    const routerSpyObj = jasmine.createSpyObj('Router', ['navigate', 'createUrlTree']);
    const authSpy = jasmine.createSpyObj('AuthService', ['login']);

    // createUrlTree のモック戻り値
    routerSpyObj.createUrlTree.and.returnValue({} as UrlTree);

    TestBed.configureTestingModule({
      providers: [
        AuthGuardT,
        { provide: TokenService, useValue: tokenSpy },
        { provide: TokenRefreshService, useValue: tokenRefreshSpy },
        { provide: Router, useValue: routerSpyObj },
        { provide: AuthService, useValue: authSpy }
      ]
    });

    guard = TestBed.inject(AuthGuardT);
    tokenServiceSpy = TestBed.inject(TokenService) as jasmine.SpyObj<TokenService>;
    tokenRefreshServiceSpy = TestBed.inject(TokenRefreshService) as jasmine.SpyObj<TokenRefreshService>;
    routerSpy = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    authServiceSpy = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;

    // デフォルトの戻り値
    authServiceSpy.isProgrammaticNavigation = false;
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  describe('canActivate', () => {
    it('JWT有効 → true を返す', async () => {
      // Arrange
      tokenServiceSpy.isTokenValid.and.returnValue(true);

      // Act
      const result = await guard.canActivate(mockRoute, mockState);

      // Assert
      expect(result).toBe(true);
      expect(tokenServiceSpy.isTokenValid).toHaveBeenCalled();
      expect(tokenRefreshServiceSpy.performSilentRefresh).not.toHaveBeenCalled();
    });

    it('JWT無効 → サイレント更新成功 → true を返す', async () => {
      // Arrange
      tokenServiceSpy.isTokenValid.and.returnValue(false);
      tokenRefreshServiceSpy.performSilentRefresh.and.returnValue(Promise.resolve('new-token'));

      // Act
      const result = await guard.canActivate(mockRoute, mockState);

      // Assert
      expect(result).toBe(true);
      expect(tokenRefreshServiceSpy.performSilentRefresh).toHaveBeenCalled();
    });

    it('JWT無効 → サイレント更新失敗（null）→ プログラム遷移 → /login へリダイレクト', async () => {
      // Arrange
      tokenServiceSpy.isTokenValid.and.returnValue(false);
      tokenRefreshServiceSpy.performSilentRefresh.and.returnValue(Promise.resolve(null));
      authServiceSpy.isProgrammaticNavigation = true;

      // Act
      const result = await guard.canActivate(mockRoute, mockState);

      // Assert
      expect(result).toEqual({} as UrlTree);
      expect(routerSpy.createUrlTree).toHaveBeenCalledWith(['/login'], {
        queryParams: {
          reason: 'session_expired',
          message: 'セッションの有効期限が切れました。再度ログインしてください。'
        }
      });
    });

    it('JWT無効 → サイレント更新失敗（例外）→ プログラム遷移 → /login へリダイレクト', async () => {
      // Arrange
      tokenServiceSpy.isTokenValid.and.returnValue(false);
      tokenRefreshServiceSpy.performSilentRefresh.and.rejectWith(new Error('refresh failed'));
      authServiceSpy.isProgrammaticNavigation = true;

      // Act
      const result = await guard.canActivate(mockRoute, mockState);

      // Assert
      expect(result).toEqual({} as UrlTree);
      expect(routerSpy.createUrlTree).toHaveBeenCalledWith(['/login'], jasmine.any(Object));
    });

    it('JWT無効 → サイレント更新失敗 → 直接アクセス → Entra ID認証を実行', async () => {
      // Arrange
      tokenServiceSpy.isTokenValid.and.returnValue(false);
      tokenRefreshServiceSpy.performSilentRefresh.and.returnValue(Promise.resolve(null));
      authServiceSpy.isProgrammaticNavigation = false;

      // Act
      const result = await guard.canActivate(mockRoute, mockState);

      // Assert
      expect(result).toBe(false);
      expect(sessionStorage.getItem('redirect_url')).toBe('/dashboard');
      expect(authServiceSpy.login).toHaveBeenCalled();
      expect(routerSpy.createUrlTree).not.toHaveBeenCalled();
    });

    it('canActivate実行後、isProgrammaticNavigation がリセットされる', async () => {
      // Arrange
      tokenServiceSpy.isTokenValid.and.returnValue(false);
      tokenRefreshServiceSpy.performSilentRefresh.and.returnValue(Promise.resolve(null));
      authServiceSpy.isProgrammaticNavigation = true;

      // Act
      await guard.canActivate(mockRoute, mockState);

      // Assert
      expect(authServiceSpy.isProgrammaticNavigation).toBe(false);
    });
  });

  describe('canActivateChild', () => {
    const mockChildRoute = {} as ActivatedRouteSnapshot;

    it('JWT有効 → true を返す', async () => {
      // Arrange
      tokenServiceSpy.isTokenValid.and.returnValue(true);

      // Act
      const result = await guard.canActivateChild(mockChildRoute, mockState);

      // Assert
      expect(result).toBe(true);
    });

    it('JWT無効 → サイレント更新成功 → true を返す', async () => {
      // Arrange
      tokenServiceSpy.isTokenValid.and.returnValue(false);
      tokenRefreshServiceSpy.performSilentRefresh.and.returnValue(Promise.resolve('new-token'));

      // Act
      const result = await guard.canActivateChild(mockChildRoute, mockState);

      // Assert
      expect(result).toBe(true);
    });

    it('JWT無効 → サイレント更新失敗 → プログラム遷移 → /login へリダイレクト', async () => {
      // Arrange
      tokenServiceSpy.isTokenValid.and.returnValue(false);
      tokenRefreshServiceSpy.performSilentRefresh.and.returnValue(Promise.resolve(null));
      authServiceSpy.isProgrammaticNavigation = true;

      // Act
      const result = await guard.canActivateChild(mockChildRoute, mockState);

      // Assert
      expect(result).toEqual({} as UrlTree);
      expect(routerSpy.createUrlTree).toHaveBeenCalledWith(['/login'], jasmine.any(Object));
    });
  });
});
