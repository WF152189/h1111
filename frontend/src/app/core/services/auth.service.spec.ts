import { TestBed } from '@angular/core/testing';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';
import { MsalService } from './msal.service';

// environment の直接インポート 대신 値を定義
const testEnvironment = {
  apiBaseUrl: 'http://localhost:8080'
};

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let tokenService: jasmine.SpyObj<TokenService>;
  let msalService: jasmine.SpyObj<MsalService>;

  beforeEach(() => {
    const tokenSpy = jasmine.createSpyObj('TokenService', ['saveToken', 'getToken', 'removeToken']);
    const msalSpy = jasmine.createSpyObj('MsalService', ['loginRedirect', 'logoutRedirect', 'handleRedirectPromise', 'getActiveAccount']);

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: TokenService, useValue: tokenSpy },
        { provide: MsalService, useValue: msalSpy },
        provideHttpClient(),                   // HttpClient プロバイダー
        provideHttpClientTesting(),            // HTTPテストプロバイダー
        provideRouter([])                      // ルータープロバイダー（空ルート）
      ]
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    tokenService = TestBed.inject(TokenService) as jasmine.SpyObj<TokenService>;
    msalService = TestBed.inject(MsalService) as jasmine.SpyObj<MsalService>;

    // sessionStorage クリア
    sessionStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    sessionStorage.clear();
  });

  describe('callVerifyApi', () => {
    it('成功时应返回userId', async () => {
      // Arrange
      const entraJwt = 'fake-entra-jwt';
      const mockResponse = {
        userId: 'user123',
        email: 'test@example.com',
        displayName: 'Test User',
        roles: ['USER'],
        permissions: ['read']
      };
      const mockToken = 'fake-business-jwt';

      // Act
      const promise = service['callVerifyApi'](entraJwt);

      // httpMock を使用してレスポンスを返す
      const req = httpMock.expectOne(`${testEnvironment.apiBaseUrl}/auth/verify`);
      expect(req.request.method).toBe('POST');
      expect(req.request.headers.get('Authorization')).toBe(`Bearer ${entraJwt}`);

      req.flush(mockResponse, {
        status: 200,
        statusText: 'OK',
        headers: { 'Authorization': `Bearer ${mockToken}` }
      });

      const result = await promise;

      // Assert
      expect(result.success).toBe(true);
      expect(result.userId).toBe('user123');
      expect(tokenService.saveToken).toHaveBeenCalledWith(mockToken);
    });

    it('401エラー时应返回エラー', async () => {
      // Arrange
      const entraJwt = 'fake-entra-jwt';
      const mockError = {
        errorCode: 'TOKEN_VALIDATION_FAILED',
        message: 'JWT検証失敗'
      };

      // Act
      const promise = service['callVerifyApi'](entraJwt);

      const req = httpMock.expectOne(`${testEnvironment.apiBaseUrl}/auth/verify`);
      req.flush(mockError, { status: 401, statusText: 'Unauthorized' });

      const result = await promise;

      // Assert
      expect(result.success).toBe(false);
      expect(result.httpStatus).toBe(401);
      expect(result.message).toBe('JWT検証失敗');
    });

    it('500エラー时应返回リトライ可能エラー', async () => {
      // Arrange
      const entraJwt = 'fake-entra-jwt';

      // Act
      const promise = service['callVerifyApi'](entraJwt);

      const req = httpMock.expectOne(`${testEnvironment.apiBaseUrl}/auth/verify`);
      req.flush({}, { status: 500, statusText: 'Internal Server Error' });

      const result = await promise;

      // Assert
      expect(result.success).toBe(false);
      expect(result.httpStatus).toBe(500);
      expect(result.message).toBe('SERVER_ERROR');
    });
  });

  describe('callValidateApi', () => {
    it('成功时应返回success', async () => {
      // Arrange
      const userId = 'user123';
      tokenService.getToken.and.returnValue('fake-jwt');

      // Act
      const promise = service['callValidateApi'](userId);

      const req = httpMock.expectOne(`${testEnvironment.apiBaseUrl}/auth/validate`);
      expect(req.request.method).toBe('POST');
      expect(req.request.headers.get('Authorization')).toBe('Bearer fake-jwt');

      // バックエンドは200 + success: true を返す
      req.flush({ success: true, message: '検証成功' });

      const result = await promise;

      // Assert
      expect(result).toBe('success');
    });

    it('401エラー时应返回retry', async () => {
      // Arrange
      const userId = 'user123';
      tokenService.getToken.and.returnValue('fake-jwt');

      // Act
      const promise = service['callValidateApi'](userId);

      const req = httpMock.expectOne(`${testEnvironment.apiBaseUrl}/auth/validate`);
      req.flush({}, { status: 401, statusText: 'Unauthorized' });

      const result = await promise;

      // Assert
      expect(result).toBe('retry');
    });

    it('500エラー时应返回retry', async () => {
      // Arrange
      const userId = 'user123';
      tokenService.getToken.and.returnValue('fake-jwt');

      // Act
      const promise = service['callValidateApi'](userId);

      const req = httpMock.expectOne(`${testEnvironment.apiBaseUrl}/auth/validate`);
      req.flush({}, { status: 500, statusText: 'Internal Server Error' });

      const result = await promise;

      // Assert
      expect(result).toBe('retry');
    });

    it('トークンなしでもリクエストを送信する', async () => {
      // Arrange
      const userId = 'user123';
      tokenService.getToken.and.returnValue(null);

      // Act
      const promise = service['callValidateApi'](userId);

      const req = httpMock.expectOne(`${testEnvironment.apiBaseUrl}/auth/validate`);
      expect(req.request.headers.has('Authorization')).toBe(false);

      req.flush({ success: true });

      const result = await promise;

      // Assert
      expect(result).toBe('success');
    });
  });

  describe('retryAuthFlow', () => {
    it('リトライ上限に達した时应返回false', async () => {
      // Arrange
      sessionStorage.setItem('auth_callback_retry', '1'); // MAX_RETRY = 1

      // Act
      const operation = jasmine.createSpy('operation').and.returnValue(Promise.resolve(true));
      const result = await service['retryAuthFlow'](operation);

      // Assert
      expect(result).toBe(false);
      expect(operation).not.toHaveBeenCalled();
      // cleanup() が呼ばれるため、sessionStorage はクリアされる
      expect(sessionStorage.getItem('auth_callback_retry')).toBeNull();
    });

    it('リトライ时に応答を待つべき', async () => {
      // Arrange
      sessionStorage.setItem('auth_callback_retry', '0');
      jasmine.clock().install(); // 仮想時計

      // Act
      const operation = jasmine.createSpy('operation').and.returnValue(Promise.resolve(true));
      const promise = service['retryAuthFlow'](operation);

      // 1秒進める
      jasmine.clock().tick(1000);

      const result = await promise;

      // Assert
      expect(result).toBe(true);
      expect(operation).toHaveBeenCalled();
      expect(sessionStorage.getItem('auth_callback_retry')).toBe('1');

      jasmine.clock().uninstall();
    }, 10000); // タイムアウト延長
  });

  describe('handleCallback', () => {
    beforeEach(() => {
      sessionStorage.clear();
    });

    describe('初回実行（retryCount = 0）', () => {
      // TC-01: 初回実行 - 成功
      it('初回実行时: MSAL成功 → runAuthFlow実行 → true を返す', async () => {
        // Arrange
        sessionStorage.setItem('auth_callback_retry', '0');
        
        const mockMsalResult = {
          idToken: 'entra-id-token-123',
          accessToken: 'access-token',
          account: { localAccountId: 'user123' }
        };
        
        msalService.handleRedirectPromise.and.returnValue(Promise.resolve(mockMsalResult as any));
        spyOn(service as any, 'runAuthFlow').and.returnValue(Promise.resolve(true));

        // Act
        const result = await service.handleCallback();

        // Assert
        expect(result).toBe(true);
        expect(msalService.handleRedirectPromise).toHaveBeenCalledTimes(1);
        expect(sessionStorage.getItem('entra_jwt')).toBe('entra-id-token-123');
        expect(service['runAuthFlow']).toHaveBeenCalledWith('entra-id-token-123');
      });

      // TC-02: 初回実行 - MSAL 失敗
      it('初回実行时: MSAL返回null → false を返す', async () => {
        // Arrange
        sessionStorage.setItem('auth_callback_retry', '0');
        
        msalService.handleRedirectPromise.and.returnValue(Promise.resolve(null));

        // Act
        const result = await service.handleCallback();

        // Assert
        expect(result).toBe(false);
        expect(msalService.handleRedirectPromise).toHaveBeenCalledTimes(1);
        expect(sessionStorage.getItem('entra_jwt')).toBeNull();
      });
    });

    describe('リトライ実行（retryCount > 0）', () => {
      // TC-03: リトライ実行 - 成功
      it('リトライ実行时: JWTあり → runAuthFlow実行 → true を返す', async () => {
        // Arrange
        sessionStorage.setItem('auth_callback_retry', '1');
        sessionStorage.setItem('entra_jwt', 'cached-entra-jwt');
        
        spyOn(service as any, 'runAuthFlow').and.returnValue(Promise.resolve(true));

        // Act
        const result = await service.handleCallback();

        // Assert
        expect(result).toBe(true);
        expect(msalService.handleRedirectPromise).not.toHaveBeenCalled();
        expect(service['runAuthFlow']).toHaveBeenCalledWith('cached-entra-jwt');
      });

      // TC-04: リトライ実行 - JWT なし
      it('リトライ実行时: JWTなし → cleanup → login → false を返す', async () => {
        // Arrange
        sessionStorage.setItem('auth_callback_retry', '1');
        // entra_jwt は設定しない
        
        spyOn(service as any, 'cleanup');
        spyOn(service as any, 'login');

        // Act
        const result = await service.handleCallback();

        // Assert
        expect(result).toBe(false);
        expect(msalService.handleRedirectPromise).not.toHaveBeenCalled();
        expect(service['cleanup']).toHaveBeenCalled();
        expect(service['login']).toHaveBeenCalled();
      });
    });

    describe('例外処理', () => {
      // TC-05: 例外発生
      it('例外発生时: cleanup → false を返す', async () => {
        // Arrange
        sessionStorage.setItem('auth_callback_retry', '0');
        
        msalService.handleRedirectPromise.and.returnValue(
          Promise.reject(new Error('MSALエラー'))
        );
        
        spyOn(service as any, 'cleanup');

        // Act
        const result = await service.handleCallback();

        // Assert
        expect(result).toBe(false);
        expect(service['cleanup']).toHaveBeenCalled();
      });
    });
  });

  describe('handleCallbackWithEntraJwt', () => {
    // TC-HC-01: 成功
    it('runAuthFlow成功 → true を返す', async () => {
      // Arrange
      spyOn(service as any, 'runAuthFlow').and.returnValue(Promise.resolve(true));

      // Act
      const result = await service.handleCallbackWithEntraJwt('entra-jwt');

      // Assert
      expect(result).toBe(true);
      expect(service['runAuthFlow']).toHaveBeenCalledWith('entra-jwt');
    });

    // TC-HC-02: 失敗
    it('runAuthFlow失敗 → false を返す', async () => {
      // Arrange
      spyOn(service as any, 'runAuthFlow').and.returnValue(Promise.resolve(false));

      // Act
      const result = await service.handleCallbackWithEntraJwt('entra-jwt');

      // Assert
      expect(result).toBe(false);
      expect(service['runAuthFlow']).toHaveBeenCalledWith('entra-jwt');
    });

    // TC-HC-03: 例外発生
    it('例外発生 → cleanup → false を返す', async () => {
      // Arrange
      spyOn(service as any, 'runAuthFlow').and.throwError(new Error('認証フローエラー'));
      spyOn(service as any, 'cleanup');

      // Act
      const result = await service.handleCallbackWithEntraJwt('entra-jwt');

      // Assert
      expect(result).toBe(false);
      expect(service['cleanup']).toHaveBeenCalled();
    });
  });

  describe('runAuthFlow', () => {
    // TC-RAF-01: verify成功 → validate成功 → 成功
    it('verify成功 + validate成功 → true を返す', async () => {
      // Arrange
      spyOn(service as any, 'callVerifyApi').and.returnValue(Promise.resolve({
        success: true,
        userId: 'user123',
        httpStatus: 200
      }));
      spyOn(service as any, 'callValidateApi').and.returnValue(Promise.resolve('success'));
      spyOn(service as any, 'cleanup');

      // Act
      const result = await service['runAuthFlow']('entra-jwt');

      // Assert
      expect(result).toBe(true);
      expect(service['callVerifyApi']).toHaveBeenCalledWith('entra-jwt');
      expect(service['callValidateApi']).toHaveBeenCalledWith('user123');
      expect(service['cleanup']).toHaveBeenCalled();
    });

    // TC-RAF-02: verify 401エラー → 即座に失敗
    it('verify 401エラー → cleanup → false を返す', async () => {
      // Arrange
      spyOn(service as any, 'callVerifyApi').and.returnValue(Promise.resolve({
        success: false,
        httpStatus: 401,
        message: 'TOKEN_VALIDATION_FAILED'
      }));
      spyOn(service as any, 'callValidateApi');
      spyOn(service as any, 'cleanup');

      // Act
      const result = await service['runAuthFlow']('entra-jwt');

      // Assert
      expect(result).toBe(false);
      expect(service['callVerifyApi']).toHaveBeenCalledWith('entra-jwt');
      expect(service['callValidateApi']).not.toHaveBeenCalled();
      expect(service['cleanup']).toHaveBeenCalled();
    });

    // TC-RAF-03: verify 500エラー → リトライ
    it('verify 500エラー → リトライ実行', async () => {
      // Arrange
      spyOn(service as any, 'callVerifyApi').and.returnValue(Promise.resolve({
        success: false,
        httpStatus: 500,
        message: 'SERVER_ERROR'
      }));
      spyOn(service as any, 'retryAuthFlow').and.returnValue(Promise.resolve(true));

      // Act
      const result = await service['runAuthFlow']('entra-jwt');

      // Assert
      expect(result).toBe(true);
      expect(service['retryAuthFlow']).toHaveBeenCalled();
    });

    // TC-RAF-04: validate retry → リトライ
    it('validate retry → リトライ実行', async () => {
      // Arrange
      spyOn(service as any, 'callVerifyApi').and.returnValue(Promise.resolve({
        success: true,
        userId: 'user123',
        httpStatus: 200
      }));
      spyOn(service as any, 'callValidateApi').and.returnValue(Promise.resolve('retry'));
      spyOn(service as any, 'retryAuthFlow').and.returnValue(Promise.resolve(true));

      // Act
      const result = await service['runAuthFlow']('entra-jwt');

      // Assert
      expect(result).toBe(true);
      expect(service['callValidateApi']).toHaveBeenCalledWith('user123');
      expect(service['retryAuthFlow']).toHaveBeenCalled();
    });

    // TC-RAF-05: validate fail → 失敗
    it('validate fail → cleanup → false を返す', async () => {
      // Arrange
      spyOn(service as any, 'callVerifyApi').and.returnValue(Promise.resolve({
        success: true,
        userId: 'user123',
        httpStatus: 200
      }));
      spyOn(service as any, 'callValidateApi').and.returnValue(Promise.resolve('fail'));
      spyOn(service as any, 'cleanup');

      // Act
      const result = await service['runAuthFlow']('entra-jwt');

      // Assert
      expect(result).toBe(false);
      expect(service['callValidateApi']).toHaveBeenCalledWith('user123');
      expect(service['cleanup']).toHaveBeenCalled();
    });
  });
});
