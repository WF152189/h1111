import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { HTTP_INTERCEPTORS, HttpClient, HttpErrorResponse, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthGuardT } from '../guards/auth.guard';
import { ErrorInterceptor } from '../interceptors/error.interceptor';
import { TokenService } from '../services/token.service';
import { TokenRefreshService } from '../services/token-refresh.service';
import { AuthService } from '../services/auth.service';
import { MsalService, MSAL_SERVICE } from '../services/msal.service';

/**
 * 結合テスト: 認証フロー全体
 * 
 * 単体テストとの違い:
 * - TokenService はモックせず実装を使用（LocalStorage との連携）
 * - TokenRefreshService はモックせず実装を使用（内部で MsalService + AuthService を呼び出す）
 * - サービス間のデータ受け渡し（JWT保存 → 取得 → 検証）を統合的に検証
 */

// テスト用JWT生成ヘルパー
function createMockJwt(payload: Record<string, any>): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = btoa(JSON.stringify(header));
  const encodedPayload = btoa(JSON.stringify(payload));
  const signature = 'mock-signature';
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

describe('認証フロー結合テスト', () => {
  let guard: AuthGuardT;
  let tokenService: TokenService;  // 実装を使用
  let tokenRefreshService: TokenRefreshService;  // 実装を使用
  let msalServiceSpy: jasmine.SpyObj<MsalService>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let routerSpy: jasmine.SpyObj<Router>;

  const mockRoute = {} as ActivatedRouteSnapshot;
  const mockState = { url: '/dashboard' } as RouterStateSnapshot;

  beforeEach(() => {
    const msalSpy = jasmine.createSpyObj('MsalService', [
      'loginRedirect', 'logoutRedirect', 'handleRedirectPromise',
      'getActiveAccount', 'acquireTokenSilent'
    ]) as any;
    const authSpy = jasmine.createSpyObj('AuthService', ['login', 'handleCallbackWithEntraJwt']);
    const routerSpyObj = jasmine.createSpyObj('Router', ['navigate', 'createUrlTree']);
    routerSpyObj.createUrlTree.and.returnValue({} as UrlTree);

    TestBed.configureTestingModule({
      providers: [
        AuthGuardT,
        TokenService,           // 実装を使用
        TokenRefreshService,    // 実装を使用
        { provide: MsalService, useValue: msalSpy },
        { provide: AuthService, useValue: authSpy },
        { provide: Router, useValue: routerSpyObj }
      ]
    });

    guard = TestBed.inject(AuthGuardT);
    tokenService = TestBed.inject(TokenService);
    tokenRefreshService = TestBed.inject(TokenRefreshService);
    msalServiceSpy = TestBed.inject(MsalService) as jasmine.SpyObj<MsalService>;
    authServiceSpy = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    routerSpy = TestBed.inject(Router) as jasmine.SpyObj<Router>;

    authServiceSpy.isProgrammaticNavigation = false;
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('AuthGuard + TokenService 連携', () => {

    it('有効なJWTが保存されている → ガードが true を返す', async () => {
      // Arrange: TokenService で有効なJWTを保存
      const validToken = createMockJwt({
        sub: 'user123',
        exp: Math.floor(Date.now() / 1000) + 3600  // 1時間後
      });
      tokenService.saveToken(validToken);

      // Act
      const result = await guard.canActivate(mockRoute, mockState);

      // Assert: TokenService.isTokenValid() が true → ガードが true
      expect(result).toBe(true);
    });

    it('期限切れJWTが保存されている → サイレント更新が試行される', async () => {
      // Arrange: 期限切れJWTを保存
      const expiredToken = createMockJwt({
        sub: 'user123',
        exp: Math.floor(Date.now() / 1000) - 3600  // 1時間前
      });
      tokenService.saveToken(expiredToken);

      // サイレント更新モック
      msalServiceSpy.acquireTokenSilent.and.returnValue(Promise.resolve('new-entra-jwt'));
      authServiceSpy.handleCallbackWithEntraJwt.and.returnValue(Promise.resolve({ success: true }));

      // Act
      const result = await guard.canActivate(mockRoute, mockState);

      // Assert: サイレント更新が呼ばれた
      expect(msalServiceSpy.acquireTokenSilent).toHaveBeenCalled();
    });

    it('トークンなし → サイレント更新失敗 → ログインリダイレクト', async () => {
      // Arrange: トークンなし
      // TokenService に何も保存しない

      // サイレント更新失敗モック
      msalServiceSpy.acquireTokenSilent.and.returnValue(Promise.resolve(null));

      // プログラム遷移フラグ設定
      authServiceSpy.isProgrammaticNavigation = true;

      // Act
      const result = await guard.canActivate(mockRoute, mockState);

      // Assert
      expect(result).toBe(false);
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/login'], jasmine.objectContaining({
        state: jasmine.objectContaining({
          errorMessage: jasmine.any(String)
        })
      }));
    });

    it('/login アクセス + JWT有効 → /dashboard へリダイレクト（UrlTree）', async () => {
      // Arrange
      const validToken = createMockJwt({
        sub: 'user123',
        exp: Math.floor(Date.now() / 1000) + 3600
      });
      tokenService.saveToken(validToken);

      const loginState = { url: '/login' } as RouterStateSnapshot;
      const mockUrlTree = {} as UrlTree;
      routerSpy.createUrlTree.and.returnValue(mockUrlTree);

      // Act
      const result = await guard.canActivate(mockRoute, loginState);

      // Assert
      expect(result).toBe(mockUrlTree);
      expect(routerSpy.createUrlTree).toHaveBeenCalledWith(['/dashboard']);
    });
  });

  describe('TokenRefreshService + TokenService 連携', () => {

    it('サイレント更新成功 → TokenService に新JWTが保存される', async () => {
      // Arrange
      const newToken = createMockJwt({
        sub: 'user123',
        exp: Math.floor(Date.now() / 1000) + 3600,
        permissions: ['READ', 'WRITE'],
        roles: ['admin']
      });

      msalServiceSpy.acquireTokenSilent.and.returnValue(Promise.resolve('entra-jwt'));
      authServiceSpy.handleCallbackWithEntraJwt.and.callFake(async () => {
        // handleCallbackWithEntraJwt が内部で TokenService.saveToken() を呼ぶ想定
        tokenService.saveToken(newToken);
        return { success: true };
      });

      // Act
      const result = await tokenRefreshService.performSilentRefresh();

      // Assert: TokenService から新トークンが取得できる
      expect(result).toBe(newToken);
      expect(tokenService.getToken()).toBe(newToken);
      expect(tokenService.isTokenValid()).toBeTrue();
    });

    it('サイレント更新失敗 → TokenService のトークンは変更されない', async () => {
      // Arrange: 既存の有効トークンを保存
      const existingToken = createMockJwt({
        sub: 'user123',
        exp: Math.floor(Date.now() / 1000) + 3600
      });
      tokenService.saveToken(existingToken);

      msalServiceSpy.acquireTokenSilent.and.returnValue(Promise.resolve(null));

      // Act
      const result = await tokenRefreshService.performSilentRefresh();

      // Assert: 既存トークンは変更されない
      expect(result).toBeNull();
      expect(tokenService.getToken()).toBe(existingToken);
    });

    it('同時サイレント更新 → 同じPromiseが共有される', async () => {
      // Arrange
      const newToken = createMockJwt({
        sub: 'user123',
        exp: Math.floor(Date.now() / 1000) + 3600
      });

      msalServiceSpy.acquireTokenSilent.and.returnValue(Promise.resolve('entra-jwt'));
      authServiceSpy.handleCallbackWithEntraJwt.and.callFake(async () => {
        tokenService.saveToken(newToken);
        return { success: true };
      });

      // Act: 2つの更新を同時に開始
      const promise1 = tokenRefreshService.performSilentRefresh();
      const promise2 = tokenRefreshService.performSilentRefresh();

      const [result1, result2] = await Promise.all([promise1, promise2]);

      // Assert: 両方とも同じ結果を返す
      expect(result1).toBe(newToken);
      expect(result2).toBe(newToken);
      // acquireTokenSilent は1回しか呼ばれない
      expect(msalServiceSpy.acquireTokenSilent).toHaveBeenCalledTimes(1);
    });
  });

  describe('AuthGuard + TokenRefreshService + TokenService 連携', () => {

    it('JWT期限切れ → サイレント更新成功 → 新トークンでアクセス許可', async () => {
      // Arrange: 期限切れJWT
      const expiredToken = createMockJwt({
        sub: 'user123',
        exp: Math.floor(Date.now() / 1000) - 100
      });
      tokenService.saveToken(expiredToken);

      // サイレント更新で新トークン取得
      const newToken = createMockJwt({
        sub: 'user123',
        exp: Math.floor(Date.now() / 1000) + 3600,
        permissions: ['READ']
      });
      msalServiceSpy.acquireTokenSilent.and.returnValue(Promise.resolve('new-entra-jwt'));
      authServiceSpy.handleCallbackWithEntraJwt.and.callFake(async () => {
        tokenService.saveToken(newToken);
        return { success: true };
      });

      // Act
      const result = await guard.canActivate(mockRoute, mockState);

      // Assert
      expect(result).toBe(true);
      expect(tokenService.getToken()).toBe(newToken);
      expect(tokenService.isTokenValid()).toBeTrue();
    });

    it('JWT期限切れ → サイレント更新失敗 → プログラム遷移でログインへ', async () => {
      // Arrange: 期限切れJWT
      const expiredToken = createMockJwt({
        sub: 'user123',
        exp: Math.floor(Date.now() / 1000) - 100
      });
      tokenService.saveToken(expiredToken);

      msalServiceSpy.acquireTokenSilent.and.returnValue(Promise.resolve(null));
      authServiceSpy.isProgrammaticNavigation = true;

      // Act
      const result = await guard.canActivate(mockRoute, mockState);

      // Assert
      expect(result).toBe(false);
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/login'], jasmine.objectContaining({
        state: jasmine.objectContaining({
          errorMessage: 'セッションの有効期限が切れました。再度ログインしてください。'
        })
      }));
    });
  });
});

describe('ErrorInterceptor + TokenRefreshService + TokenService 結合テスト', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;
  let tokenService: TokenService;
  let msalServiceSpy: jasmine.SpyObj<MsalService>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let routerSpy: jasmine.SpyObj<Router>;

  const apiUrl = '/api/business/data';

  beforeEach(() => {
    const msalSpy = jasmine.createSpyObj('MsalService', [
      'loginRedirect', 'logoutRedirect', 'handleRedirectPromise',
      'getActiveAccount', 'acquireTokenSilent'
    ]) as any;
    const authSpy = jasmine.createSpyObj('AuthService', ['login', 'handleCallbackWithEntraJwt']);
    const routerSpyObj = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        TokenService,
        TokenRefreshService,
        { provide: MsalService, useValue: msalSpy },
        { provide: AuthService, useValue: authSpy },
        { provide: Router, useValue: routerSpyObj },
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        { provide: HTTP_INTERCEPTORS, useClass: ErrorInterceptor, multi: true }
      ]
    });

    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    tokenService = TestBed.inject(TokenService);
    msalServiceSpy = TestBed.inject(MsalService) as jasmine.SpyObj<MsalService>;
    authServiceSpy = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    routerSpy = TestBed.inject(Router) as jasmine.SpyObj<Router>;

    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('401 → サイレント更新成功 → 新トークンでリトライ成功', fakeAsync(() => {
    // Arrange: 有効な新トークンを準備
    const newToken = createMockJwt({
      sub: 'user123',
      exp: Math.floor(Date.now() / 1000) + 3600
    });

    msalServiceSpy.acquireTokenSilent.and.returnValue(Promise.resolve('new-entra-jwt'));
    authServiceSpy.handleCallbackWithEntraJwt.and.callFake(async () => {
      tokenService.saveToken(newToken);
      return { success: true };
    });

    // Act
    httpClient.get(apiUrl).subscribe((response) => {
      expect(response).toEqual({ data: 'success' });
    });

    // 1回目: 401
    const req1 = httpMock.expectOne(apiUrl);
    req1.flush(null, { status: 401, statusText: 'Unauthorized' });

    tick();

    // 2回目: リトライ（新トークン付き）
    const req2 = httpMock.expectOne((request) => {
      return request.url === apiUrl &&
             request.headers.get('Authorization') === `Bearer ${newToken}`;
    });
    req2.flush({ data: 'success' });

    // Assert: TokenService に新トークンが保存されている
    expect(tokenService.getToken()).toBe(newToken);
    expect(tokenService.isTokenValid()).toBeTrue();
  }));

  it('401 → サイレント更新失敗 → ログインリダイレクト', fakeAsync(() => {
    // Arrange: サイレント更新失敗
    msalServiceSpy.acquireTokenSilent.and.returnValue(Promise.resolve(null));

    httpClient.get(apiUrl).subscribe({
      next: () => fail('nextは呼ばれないはず'),
      error: () => fail('errorは呼ばれないはず'),
      complete: () => {}
    });

    const req = httpMock.expectOne(apiUrl);
    req.flush(null, { status: 401, statusText: 'Unauthorized' });

    tick();

    // Assert: ログインページへリダイレクト
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: {
        reason: 'session_expired',
        message: 'セッションの有効期限が切れました。再度ログインしてください。'
      }
    });
  }));

  it('403 → 権限エラーページへリダイレクト', () => {
    httpClient.get(apiUrl).subscribe({
      next: () => fail('error handler should be called'),
      error: () => fail('403 should return EMPTY')
    });

    const req = httpMock.expectOne(apiUrl);
    req.flush(null, { status: 403, statusText: 'Forbidden' });

    expect(routerSpy.navigate).toHaveBeenCalledWith(['/error/forbidden']);
  });

  it('/auth/ で始まるURLは401でもインターセプターが処理しない', () => {
    httpClient.get('/auth/validate').subscribe({
      next: () => fail('should fail'),
      error: (error: HttpErrorResponse) => {
        expect(error.status).toBe(401);
      }
    });

    const req = httpMock.expectOne('/auth/validate');
    req.flush(null, { status: 401, statusText: 'Unauthorized' });

    // インターセプターはスキップ → サイレント更新は呼ばれない
    expect(msalServiceSpy.acquireTokenSilent).not.toHaveBeenCalled();
    expect(routerSpy.navigate).not.toHaveBeenCalled();
  });
});
