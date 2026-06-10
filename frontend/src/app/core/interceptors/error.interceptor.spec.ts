import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HTTP_INTERCEPTORS, HttpClient, HttpErrorResponse, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { ErrorInterceptor } from './error.interceptor';
import { TokenService } from '../services/token.service';
import { TokenRefreshService } from '../services/token-refresh.service';

describe('errorInterceptor', () => {
  let httpMock: HttpTestingController;
  let httpClient: HttpClient;
  let tokenServiceSpy: jasmine.SpyObj<TokenService>;
  let tokenRefreshServiceSpy: jasmine.SpyObj<TokenRefreshService>;
  let routerSpy: jasmine.SpyObj<Router>;

  const apiUrl = '/api/test';
  const authUrl = '/auth/validate';
  const stubUrl = '/stub/login';

  beforeEach(() => {
    // モックサービス
    tokenServiceSpy = jasmine.createSpyObj('TokenService', ['getToken']);
    tokenRefreshServiceSpy = jasmine.createSpyObj('TokenRefreshService', ['performSilentRefresh']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        { provide: TokenService, useValue: tokenServiceSpy },
        { provide: TokenRefreshService, useValue: tokenRefreshServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: HTTP_INTERCEPTORS, useClass: ErrorInterceptor, multi: true }
      ]
    });

    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('認証系APIの透過', () => {
    it('/auth/ で始まるURLはinterceptorをスキップする', () => {
      // Act
      httpClient.get(authUrl).subscribe((response) => {
        expect(response).toBeTruthy();
      });

      const req = httpMock.expectOne(authUrl);
      req.flush({ success: true });
    });

    it('/auth/ で始まるURLの401はそのまま伝播する', () => {
      httpClient.get(authUrl).subscribe({
        next: () => fail('エラーが発生するはず'),
        error: (error: HttpErrorResponse) => {
          expect(error.status).toBe(401);
        }
      });

      const req = httpMock.expectOne(authUrl);
      req.flush(null, { status: 401, statusText: 'Unauthorized' });

      expect(tokenRefreshServiceSpy.performSilentRefresh).not.toHaveBeenCalled();
      expect(routerSpy.navigate).not.toHaveBeenCalled();
    });

    it('/stub/ で始まるURLはinterceptorをスキップする', () => {
      // Act
      httpClient.get(stubUrl).subscribe((response) => {
        expect(response).toBeTruthy();
      });

      const req = httpMock.expectOne(stubUrl);
      req.flush({ success: true });
    });

    it('/stub/ で始まるURLの403はそのまま伝播する', () => {
      httpClient.get(stubUrl).subscribe({
        next: () => fail('エラーが発生するはず'),
        error: (error: HttpErrorResponse) => {
          expect(error.status).toBe(403);
        }
      });

      const req = httpMock.expectOne(stubUrl);
      req.flush(null, { status: 403, statusText: 'Forbidden' });

      expect(tokenRefreshServiceSpy.performSilentRefresh).not.toHaveBeenCalled();
      expect(routerSpy.navigate).not.toHaveBeenCalled();
    });
  });

  describe('401エラー処理（サイレント更新）', () => {
    it('401エラー時、サイレント更新成功后にリクエストをリトライする', fakeAsync(() => {
      // Arrange
      const newToken = 'new-jwt-token';
      tokenRefreshServiceSpy.performSilentRefresh.and.returnValue(Promise.resolve(newToken));

      // Act
      httpClient.get(apiUrl).subscribe((response) => {
        expect(response).toEqual({ data: 'success' });
      });

      // 1回目のリクエスト（401エラー）
      const req1 = httpMock.expectOne(apiUrl);
      req1.flush(null, { status: 401, statusText: 'Unauthorized' });

      // Promise解決を待機
      tick();

      // 2回目のリクエスト（リトライ、成功）
      const req2 = httpMock.expectOne((request) => {
        return request.url === apiUrl && 
               request.headers.has('Authorization') &&
               request.headers.get('Authorization') === `Bearer ${newToken}`;
      });
      req2.flush({ data: 'success' });

      // Assert
      expect(tokenRefreshServiceSpy.performSilentRefresh).toHaveBeenCalled();
    }));

    it('401エラー時、サイレント更新失敗するとログインページへリダイレクト', fakeAsync(() => {
      // Arrange
      tokenRefreshServiceSpy.performSilentRefresh.and.returnValue(Promise.resolve(null));

      // Act
      httpClient.get(apiUrl).subscribe({
        next: () => fail('nextは呼ばれないはず'),
        error: (error) => fail(`errorは呼ばれないはず: ${error}`),
        complete: () => {} // EMPTY が complete を呼ぶ
      });

      // 1回目のリクエスト（401エラー）
      const req = httpMock.expectOne(apiUrl);
      req.flush(null, { status: 401, statusText: 'Unauthorized' });

      // Promise解決を待機
      tick();

      // Assert
      expect(tokenRefreshServiceSpy.performSilentRefresh).toHaveBeenCalled();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/login'], {
        queryParams: {
          reason: 'session_expired',
          message: 'セッションの有効期限が切れました。再度ログインしてください。'
        }
      });
    }));

    it('401エラー時、サイレント更新がrejectするとログインページへリダイレクト', fakeAsync(() => {
      // Arrange
      tokenRefreshServiceSpy.performSilentRefresh.and.returnValue(Promise.reject(new Error('refresh failed')));

      // Act
      httpClient.get(apiUrl).subscribe({
        next: () => fail('nextは呼ばれないはず'),
        error: (error) => fail(`errorは呼ばれないはず: ${error}`),
        complete: () => {}
      });

      const req = httpMock.expectOne(apiUrl);
      req.flush(null, { status: 401, statusText: 'Unauthorized' });
      tick();

      // Assert
      expect(tokenRefreshServiceSpy.performSilentRefresh).toHaveBeenCalledTimes(1);
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/login'], {
        queryParams: {
          reason: 'session_expired',
          message: 'セッションの有効期限が切れました。再度ログインしてください。'
        }
      });
    }));

    it('複数の401エラー同時発生時、interceptorは各リクエストごとにサイレント更新を呼び出す', fakeAsync(() => {
      // Arrange
      const newToken = 'new-jwt-token';
      tokenRefreshServiceSpy.performSilentRefresh.and.returnValue(Promise.resolve(newToken));

      // Act: 2つのリクエストを同時に実行
      httpClient.get(apiUrl).subscribe();
      httpClient.get('/api/another').subscribe();

      // 両方とも401エラー
      const req1 = httpMock.expectOne(apiUrl);
      req1.flush(null, { status: 401, statusText: 'Unauthorized' });

      const req2 = httpMock.expectOne('/api/another');
      req2.flush(null, { status: 401, statusText: 'Unauthorized' });

      // Promise解決を待機
      tick();

      // リトライリクエストを処理
      const retryReq1 = httpMock.expectOne(apiUrl);
      retryReq1.flush({ data: 'success' });

      const retryReq2 = httpMock.expectOne('/api/another');
      retryReq2.flush({ data: 'success' });

      // Assert: キューイングは TokenRefreshService 側で実装される
      expect(tokenRefreshServiceSpy.performSilentRefresh).toHaveBeenCalledTimes(2);
    }));
  });

  describe('無限ループ防止（リトライ後も401）', () => {
    it('リトライ後も401エラーが返された場合、ログインページへリダイレクトする', fakeAsync(() => {
      // Arrange
      const newToken = 'new-jwt-token';
      tokenRefreshServiceSpy.performSilentRefresh.and.returnValue(Promise.resolve(newToken));

      // Act
      httpClient.get(apiUrl).subscribe({
        next: () => fail('nextは呼ばれないはず'),
        error: (error) => fail(`errorは呼ばれないはず: ${JSON.stringify(error)}`),
        complete: () => {} // EMPTY が complete を呼ぶ
      });

      // 1回目のリクエスト（401エラー）
      const req1 = httpMock.expectOne(apiUrl);
      req1.flush(null, { status: 401, statusText: 'Unauthorized' });

      // Promise解決を待機
      tick();

      // リトライリクエスト（新トークン付き）
      const req2 = httpMock.expectOne(apiUrl);
      expect(req2.request.headers.get('Authorization')).toBe(`Bearer ${newToken}`);
      // リトライ後も401エラー
      req2.flush(null, { status: 401, statusText: 'Unauthorized' });

      // Assert
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/login'], {
        queryParams: {
          reason: 'session_expired',
          message: 'セッションの有効期限が切れました。再度ログインしてください。'
        }
      });
    }));

    it('リトライ後はperformSilentRefreshを呼び出さない', fakeAsync(() => {
      // Arrange
      const newToken = 'new-jwt-token';
      tokenRefreshServiceSpy.performSilentRefresh.and.returnValue(Promise.resolve(newToken));

      // Act
      httpClient.get(apiUrl).subscribe({
        next: () => fail('nextは呼ばれないはず'),
        error: (error) => fail(`errorは呼ばれないはず: ${JSON.stringify(error)}`),
        complete: () => {} // EMPTY が complete を呼ぶ
      });

      // 1回目のリクエスト（401エラー）
      const req1 = httpMock.expectOne(apiUrl);
      req1.flush(null, { status: 401, statusText: 'Unauthorized' });

      // Promise解決を待機
      tick();

      // リトライリクエスト
      const req2 = httpMock.expectOne(apiUrl);
      // リトライ後も401エラー
      req2.flush(null, { status: 401, statusText: 'Unauthorized' });

      // Assert: performSilentRefresh は1回しか呼ばれない
      expect(tokenRefreshServiceSpy.performSilentRefresh).toHaveBeenCalledTimes(1);
    }));

    it('リトライ後の500エラーはそのまま伝播する', fakeAsync(() => {
      // Arrange
      const newToken = 'new-jwt-token';
      tokenRefreshServiceSpy.performSilentRefresh.and.returnValue(Promise.resolve(newToken));

      // Act
      httpClient.get(apiUrl).subscribe({
        next: () => fail('エラーが発生するはず'),
        error: (error: HttpErrorResponse) => {
          expect(error.status).toBe(500);
        }
      });

      const req1 = httpMock.expectOne(apiUrl);
      req1.flush(null, { status: 401, statusText: 'Unauthorized' });
      tick();

      const req2 = httpMock.expectOne(apiUrl);
      req2.flush(null, { status: 500, statusText: 'Internal Server Error' });

      expect(routerSpy.navigate).not.toHaveBeenCalled();
      expect(tokenRefreshServiceSpy.performSilentRefresh).toHaveBeenCalledTimes(1);
    }));
  });

  describe('403エラー処理（権限エラー）', () => {
    it('403エラー時、forbiddenページへリダイレクトする', () => {
      // Act
      httpClient.get(apiUrl).subscribe({
        next: () => fail('エラーが発生するはず'),
        error: (error) => fail('403エラーはEMPTYを返すため、errorハンドラは呼ばれない')
      });

      const req = httpMock.expectOne(apiUrl);
      req.flush(null, { status: 403, statusText: 'Forbidden' });

      // Assert
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/error/forbidden']);
    });

    it('403エラー時、EMPTYを返すためsubscribeのnextもerrorも呼ばれない', (done) => {
      let nextCalled = false;
      let errorCalled = false;
      let completedCalled = false;

      // Act
      httpClient.get(apiUrl).subscribe({
        next: () => { nextCalled = true; },
        error: () => { errorCalled = true; },
        complete: () => { 
          completedCalled = true;
          // Assert
          expect(nextCalled).toBeFalse();
          expect(errorCalled).toBeFalse();
          expect(completedCalled).toBeTrue();
          done();
        }
      });

      const req = httpMock.expectOne(apiUrl);
      req.flush(null, { status: 403, statusText: 'Forbidden' });
    });
  });

  describe('その他のエラー', () => {
    it('500エラーはそのまま伝播する', () => {
      // Act
      httpClient.get(apiUrl).subscribe({
        next: () => fail('エラーが発生するはず'),
        error: (error: HttpErrorResponse) => {
          // Assert
          expect(error.status).toBe(500);
        }
      });

      const req = httpMock.expectOne(apiUrl);
      req.flush(null, { status: 500, statusText: 'Internal Server Error' });
    });

    it('ネットワークエラーはそのまま伝播する', () => {
      // Arrange
      const networkError = new ProgressEvent('error');

      // Act
      httpClient.get(apiUrl).subscribe({
        next: () => fail('エラーが発生するはず'),
        error: (error: HttpErrorResponse) => {
          // Assert
          expect(error.error).toBe(networkError);
        }
      });

      const req = httpMock.expectOne(apiUrl);
      req.error(networkError);
    });

    it('404エラーはそのまま伝播する', () => {
      // Act
      httpClient.get(apiUrl).subscribe({
        next: () => fail('エラーが発生するはず'),
        error: (error: HttpErrorResponse) => {
          // Assert
          expect(error.status).toBe(404);
        }
      });

      const req = httpMock.expectOne(apiUrl);
      req.flush(null, { status: 404, statusText: 'Not Found' });
    });
  });

  describe('リトライ時のAuthorizationヘッダー', () => {
    it('サイレント更新成功后、新トークンでAuthorizationヘッダーを設定してリトライ', fakeAsync(() => {
      // Arrange
      const newToken = 'updated-jwt-token';
      tokenRefreshServiceSpy.performSilentRefresh.and.returnValue(Promise.resolve(newToken));

      // Act
      httpClient.get(apiUrl).subscribe();

      // 1回目のリクエスト（401エラー）
      const req1 = httpMock.expectOne(apiUrl);
      req1.flush(null, { status: 401, statusText: 'Unauthorized' });

      // Promise解決を待機
      tick();

      // 2回目のリクエスト（リトライ）
      const req2 = httpMock.expectOne((request) => {
        const authHeader = request.headers.get('Authorization');
        return request.url === apiUrl && authHeader === `Bearer ${newToken}`;
      });
      expect(req2.request.headers.get('Authorization')).toBe(`Bearer ${newToken}`);
      req2.flush({ success: true });
    }));

    it('元のリクエストの他のヘッダーは保持される', fakeAsync(() => {
      // Arrange
      const newToken = 'new-token';
      tokenRefreshServiceSpy.performSilentRefresh.and.returnValue(Promise.resolve(newToken));

      // Act: カスタムヘッダー付きリクエスト
      httpClient.get(apiUrl, {
        headers: { 'X-Custom-Header': 'custom-value' }
      }).subscribe();

      // 1回目のリクエスト（401エラー）
      const req1 = httpMock.expectOne(apiUrl);
      expect(req1.request.headers.get('X-Custom-Header')).toBe('custom-value');
      req1.flush(null, { status: 401, statusText: 'Unauthorized' });

      // Promise解決を待機
      tick();

      // 2回目のリクエスト（リトライ）
      const req2 = httpMock.expectOne(apiUrl);
      // カスタムヘッダーが保持されている
      expect(req2.request.headers.get('X-Custom-Header')).toBe('custom-value');
      // Authorizationヘッダーが追加されている
      expect(req2.request.headers.get('Authorization')).toBe(`Bearer ${newToken}`);
      req2.flush({ success: true });
    }));

    it('元のAuthorizationヘッダーは新トークンで上書きされる', fakeAsync(() => {
      // Arrange
      const newToken = 'new-token';
      tokenRefreshServiceSpy.performSilentRefresh.and.returnValue(Promise.resolve(newToken));

      // Act
      httpClient.get(apiUrl, {
        headers: { Authorization: 'Bearer old-token' }
      }).subscribe();

      const req1 = httpMock.expectOne(apiUrl);
      expect(req1.request.headers.get('Authorization')).toBe('Bearer old-token');
      req1.flush(null, { status: 401, statusText: 'Unauthorized' });
      tick();

      const req2 = httpMock.expectOne(apiUrl);
      expect(req2.request.headers.get('Authorization')).toBe(`Bearer ${newToken}`);
      req2.flush({ success: true });
    }));
  });

  describe('ログ出力', () => {
    it('401エラー時、警告ログを出力する', fakeAsync(() => {
      // Arrange
      spyOn(console, 'warn');
      tokenRefreshServiceSpy.performSilentRefresh.and.returnValue(Promise.resolve(null));

      // Act
      httpClient.get(apiUrl).subscribe();

      const req = httpMock.expectOne(apiUrl);
      req.flush(null, { status: 401, statusText: 'Unauthorized' });

      // Assert
      expect(console.warn).toHaveBeenCalledWith(
        '[errorInterceptor] 401エラー: サイレント更新開始'
      );
    }));

    it('403エラー時、警告ログを出力する', () => {
      // Arrange
      spyOn(console, 'warn');

      // Act
      httpClient.get(apiUrl).subscribe();

      const req = httpMock.expectOne(apiUrl);
      req.flush(null, { status: 403, statusText: 'Forbidden' });

      // Assert
      expect(console.warn).toHaveBeenCalledWith(
        '[errorInterceptor] 403エラー: 権限なし'
      );
    });

    it('サイレント更新成功時、情報ログを出力する', fakeAsync(() => {
      // Arrange
      spyOn(console, 'info');
      const newToken = 'new-token';
      tokenRefreshServiceSpy.performSilentRefresh.and.returnValue(Promise.resolve(newToken));

      // Act
      httpClient.get(apiUrl).subscribe();

      const req1 = httpMock.expectOne(apiUrl);
      req1.flush(null, { status: 401, statusText: 'Unauthorized' });

      // Promise解決を待機
      tick();

      const req2 = httpMock.expectOne(apiUrl);
      req2.flush({ success: true });

      // Assert
      expect(console.info).toHaveBeenCalledWith(
        '[errorInterceptor] トークン更新成功、リトライ'
      );
    }));
  });
});
