import { TestBed } from '@angular/core/testing';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, Router } from '@angular/router';
import { AuthService, AuthResult } from './auth.service';
import { TokenService } from './token.service';
import { IMsalService, MSAL_SERVICE } from './msal.service';

const testEnvironment = {
  apiBaseUrl: 'http://localhost:8080'
};

const authSuccess = (): AuthResult => ({ success: true });
const authFailure = (message = 'failed'): AuthResult => ({
  success: false,
  errorCode: 'UNKNOWN',
  errorMessage: message
});

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let tokenService: jasmine.SpyObj<TokenService>;
  let msalService: jasmine.SpyObj<IMsalService>;
  let router: Router;

  beforeEach(() => {
    const tokenSpy = jasmine.createSpyObj('TokenService', ['saveToken', 'getToken', 'removeToken']);
    const msalSpy = jasmine.createSpyObj<IMsalService>('IMsalService', [
      'loginRedirect',
      'logoutRedirect',
      'handleRedirectPromise',
      'getActiveAccount'
    ]);

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: TokenService, useValue: tokenSpy },
        { provide: MSAL_SERVICE, useValue: msalSpy },
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([])
      ]
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    tokenService = TestBed.inject(TokenService) as jasmine.SpyObj<TokenService>;
    msalService = TestBed.inject(MSAL_SERVICE) as jasmine.SpyObj<IMsalService>;
    router = TestBed.inject(Router);
    sessionStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    sessionStorage.clear();
  });

  describe('callVerifyApi', () => {
    it('成功時は業務JWTを保存し、userIdを返す', async () => {
      const entraJwt = 'fake-entra-jwt';
      const businessJwt = 'fake-business-jwt';

      const promise = service['callVerifyApi'](entraJwt);

      const req = httpMock.expectOne(`${testEnvironment.apiBaseUrl}/auth/verify`);
      expect(req.request.method).toBe('POST');
      expect(req.request.headers.get('Authorization')).toBe(`Bearer ${entraJwt}`);
      expect(req.request.withCredentials).toBeTrue();

      req.flush({ userId: 'user123' }, {
        status: 200,
        statusText: 'OK',
        headers: { Authorization: `Bearer ${businessJwt}` }
      });

      const result = await promise;

      expect(result.success).toBeTrue();
      expect(result.userId).toBe('user123');
      expect(tokenService.saveToken).toHaveBeenCalledWith(businessJwt);
    });

    it('200だがAuthorizationヘッダーがない場合は失敗を返す', async () => {
      const promise = service['callVerifyApi']('fake-entra-jwt');

      const req = httpMock.expectOne(`${testEnvironment.apiBaseUrl}/auth/verify`);
      req.flush({ userId: 'user123' }, { status: 200, statusText: 'OK' });

      const result = await promise;

      expect(result.success).toBeFalse();
      expect(result.message).toBe('Tokenなし');
      expect(tokenService.saveToken).not.toHaveBeenCalled();
    });

    it('401エラー時は検証失敗を返す', async () => {
      const promise = service['callVerifyApi']('fake-entra-jwt');

      const req = httpMock.expectOne(`${testEnvironment.apiBaseUrl}/auth/verify`);
      req.flush({ message: 'JWT検証失敗' }, { status: 401, statusText: 'Unauthorized' });

      const result = await promise;

      expect(result.success).toBeFalse();
      expect(result.httpStatus).toBe(401);
      expect(result.message).toBe('JWT検証失敗');
    });

    it('500エラー時はリトライ対象の失敗を返す', async () => {
      const promise = service['callVerifyApi']('fake-entra-jwt');

      const req = httpMock.expectOne(`${testEnvironment.apiBaseUrl}/auth/verify`);
      req.flush({}, { status: 500, statusText: 'Internal Server Error' });

      const result = await promise;

      expect(result.success).toBeFalse();
      expect(result.httpStatus).toBe(500);
      expect(result.message).toBe('SERVER_ERROR');
    });

    it('200だがuserIdがない場合は失敗を返す', async () => {
      const promise = service['callVerifyApi']('fake-entra-jwt');

      const req = httpMock.expectOne(`${testEnvironment.apiBaseUrl}/auth/verify`);
      req.flush({}, { status: 200, statusText: 'OK' });

      const result = await promise;

      expect(result.success).toBeFalse();
      expect(result.httpStatus).toBe(200);
      expect(result.message).toBe('userId なし');
      expect(tokenService.saveToken).not.toHaveBeenCalled();
    });

    it('ネットワークエラー時はリトライ対象の失敗を返す', async () => {
      const promise = service['callVerifyApi']('fake-entra-jwt');

      const req = httpMock.expectOne(`${testEnvironment.apiBaseUrl}/auth/verify`);
      req.error(new ProgressEvent('network error'), { status: 0, statusText: 'Unknown Error' });

      const result = await promise;

      expect(result.success).toBeFalse();
      expect(result.httpStatus).toBe(0);
      expect(result.message).toBe('SERVER_ERROR');
    });

    it('401以外の4xxエラー時はUNKNOWN系の失敗を返す', async () => {
      const promise = service['callVerifyApi']('fake-entra-jwt');

      const req = httpMock.expectOne(`${testEnvironment.apiBaseUrl}/auth/verify`);
      req.flush({ message: 'FORBIDDEN' }, { status: 403, statusText: 'Forbidden' });

      const result = await promise;

      expect(result.success).toBeFalse();
      expect(result.httpStatus).toBe(403);
      expect(result.message).toBe('FORBIDDEN');
    });
  });

  describe('callValidateApi', () => {
    it('成功時はsuccessを返す', async () => {
      tokenService.getToken.and.returnValue('fake-jwt');

      const promise = service['callValidateApi']('user123');

      const req = httpMock.expectOne(`${testEnvironment.apiBaseUrl}/auth/validate`);
      expect(req.request.method).toBe('POST');
      expect(req.request.headers.get('Authorization')).toBe('Bearer fake-jwt');
      expect(req.request.withCredentials).toBeTrue();
      req.flush({ success: true, message: '検証成功' });

      const result = await promise;

      expect(result).toBe('success');
    });

    it('200だがsuccess:falseの場合はfailを返す', async () => {
      tokenService.getToken.and.returnValue('fake-jwt');

      const promise = service['callValidateApi']('user123');

      const req = httpMock.expectOne(`${testEnvironment.apiBaseUrl}/auth/validate`);
      req.flush({ success: false, message: 'sub mismatch' });

      const result = await promise;

      expect(result).toBe('fail');
    });

    it('401エラー時はretryを返す', async () => {
      tokenService.getToken.and.returnValue('fake-jwt');

      const promise = service['callValidateApi']('user123');

      const req = httpMock.expectOne(`${testEnvironment.apiBaseUrl}/auth/validate`);
      req.flush({}, { status: 401, statusText: 'Unauthorized' });

      const result = await promise;

      expect(result).toBe('retry');
    });

    it('500エラー時はretryを返す', async () => {
      tokenService.getToken.and.returnValue('fake-jwt');

      const promise = service['callValidateApi']('user123');

      const req = httpMock.expectOne(`${testEnvironment.apiBaseUrl}/auth/validate`);
      req.flush({}, { status: 500, statusText: 'Internal Server Error' });

      const result = await promise;

      expect(result).toBe('retry');
    });

    it('トークンなしでもAuthorizationなしで検証APIを呼び出す', async () => {
      tokenService.getToken.and.returnValue(null);

      const promise = service['callValidateApi']('user123');

      const req = httpMock.expectOne(`${testEnvironment.apiBaseUrl}/auth/validate`);
      expect(req.request.headers.has('Authorization')).toBeFalse();
      req.flush({ success: true });

      const result = await promise;

      expect(result).toBe('success');
    });

    it('ネットワークエラー時はretryを返す', async () => {
      tokenService.getToken.and.returnValue('fake-jwt');

      const promise = service['callValidateApi']('user123');

      const req = httpMock.expectOne(`${testEnvironment.apiBaseUrl}/auth/validate`);
      req.error(new ProgressEvent('network error'), { status: 0, statusText: 'Unknown Error' });

      const result = await promise;

      expect(result).toBe('retry');
    });

    it('401以外の4xxエラー時はfailを返す', async () => {
      tokenService.getToken.and.returnValue('fake-jwt');

      const promise = service['callValidateApi']('user123');

      const req = httpMock.expectOne(`${testEnvironment.apiBaseUrl}/auth/validate`);
      req.flush({ message: 'FORBIDDEN' }, { status: 403, statusText: 'Forbidden' });

      const result = await promise;

      expect(result).toBe('fail');
    });

    it('tokenService.getTokenが例外を投げた場合はfailを返す', async () => {
      tokenService.getToken.and.throwError(new Error('token read error'));

      const result = await service['callValidateApi']('user123');

      expect(result).toBe('fail');
      httpMock.expectNone(`${testEnvironment.apiBaseUrl}/auth/validate`);
    });
  });

  describe('retryAuthFlow', () => {
    it('リトライ上限に達した場合はSERVER_ERRORを返してcleanupする', async () => {
      sessionStorage.setItem('auth_callback_retry', '1');
      sessionStorage.setItem('entra_jwt', 'cached-entra-jwt');
      const operation = jasmine.createSpy('operation').and.returnValue(Promise.resolve(authSuccess()));

      const result = await service['retryAuthFlow'](operation);

      expect(result.success).toBeFalse();
      expect(result.errorCode).toBe('SERVER_ERROR');
      expect(operation).not.toHaveBeenCalled();
      expect(sessionStorage.getItem('auth_callback_retry')).toBeNull();
      expect(sessionStorage.getItem('entra_jwt')).toBeNull();
    });

    it('リトライ可能な場合は待機後にoperationを実行する', async () => {
      sessionStorage.setItem('auth_callback_retry', '0');
      jasmine.clock().install();
      const operation = jasmine.createSpy('operation').and.returnValue(Promise.resolve(authSuccess()));

      try {
        const promise = service['retryAuthFlow'](operation);
        jasmine.clock().tick(1000);
        const result = await promise;

        expect(result.success).toBeTrue();
        expect(operation).toHaveBeenCalled();
        expect(sessionStorage.getItem('auth_callback_retry')).toBe('1');
      } finally {
        jasmine.clock().uninstall();
      }
    }, 10000);

    it('operationがrejectした場合は例外を呼び出し元へ伝播する', async () => {
      sessionStorage.setItem('auth_callback_retry', '0');
      jasmine.clock().install();
      const operationError = new Error('retry operation failed');
      const operation = jasmine.createSpy('operation').and.returnValue(Promise.reject(operationError));

      try {
        const promise = service['retryAuthFlow'](operation);
        jasmine.clock().tick(1000);
        await expectAsync(promise).toBeRejectedWith(operationError);
        expect(operation).toHaveBeenCalled();
        expect(sessionStorage.getItem('auth_callback_retry')).toBe('1');
      } finally {
        jasmine.clock().uninstall();
      }
    }, 10000);
  });

  describe('handleCallback', () => {
    it('MSAL成功時はEntra JWTを保存してrunAuthFlowの結果を返す', async () => {
      const msalResult = {
        idToken: 'entra-id-token-123',
        accessToken: 'access-token',
        account: { localAccountId: 'user123' }
      };
      msalService.handleRedirectPromise.and.returnValue(Promise.resolve(msalResult as any));
      spyOn(service as any, 'runAuthFlow').and.returnValue(Promise.resolve(authSuccess()));

      const result = await service.handleCallback();

      expect(result.success).toBeTrue();
      expect(msalService.handleRedirectPromise).toHaveBeenCalledTimes(1);
      expect(sessionStorage.getItem('entra_jwt')).toBe('entra-id-token-123');
      expect(service['runAuthFlow']).toHaveBeenCalledWith('entra-id-token-123');
    });

    it('MSALがnullを返した場合はcleanupしてUNKNOWN失敗を返す', async () => {
      sessionStorage.setItem('auth_callback_retry', '1');
      sessionStorage.setItem('entra_jwt', 'stale-entra-jwt');
      msalService.handleRedirectPromise.and.returnValue(Promise.resolve(null));

      const result = await service.handleCallback();

      expect(result.success).toBeFalse();
      expect(result.errorCode).toBe('UNKNOWN');
      expect(msalService.handleRedirectPromise).toHaveBeenCalledTimes(1);
      expect(sessionStorage.getItem('auth_callback_retry')).toBeNull();
      expect(sessionStorage.getItem('entra_jwt')).toBeNull();
    });

    it('MSAL例外時はcleanupしてUNKNOWN失敗を返す', async () => {
      sessionStorage.setItem('auth_callback_retry', '1');
      sessionStorage.setItem('entra_jwt', 'stale-entra-jwt');
      msalService.handleRedirectPromise.and.returnValue(Promise.reject(new Error('MSALエラー')));

      const result = await service.handleCallback();

      expect(result.success).toBeFalse();
      expect(result.errorCode).toBe('UNKNOWN');
      expect(sessionStorage.getItem('auth_callback_retry')).toBeNull();
      expect(sessionStorage.getItem('entra_jwt')).toBeNull();
    });
  });

  describe('handleCallbackWithEntraJwt', () => {
    it('runAuthFlow成功時は成功結果を返す', async () => {
      spyOn(service as any, 'runAuthFlow').and.returnValue(Promise.resolve(authSuccess()));

      const result = await service.handleCallbackWithEntraJwt('entra-jwt');

      expect(result.success).toBeTrue();
      expect(service['runAuthFlow']).toHaveBeenCalledWith('entra-jwt');
    });

    it('runAuthFlow失敗時は失敗結果を返す', async () => {
      spyOn(service as any, 'runAuthFlow').and.returnValue(Promise.resolve(authFailure('認証失敗')));

      const result = await service.handleCallbackWithEntraJwt('entra-jwt');

      expect(result.success).toBeFalse();
      expect(result.errorMessage).toBe('認証失敗');
    });

    it('runAuthFlow例外時はcleanupしてUNKNOWN失敗を返す', async () => {
      sessionStorage.setItem('auth_callback_retry', '1');
      spyOn(service as any, 'runAuthFlow').and.throwError(new Error('認証フローエラー'));

      const result = await service.handleCallbackWithEntraJwt('entra-jwt');

      expect(result.success).toBeFalse();
      expect(result.errorCode).toBe('UNKNOWN');
      expect(sessionStorage.getItem('auth_callback_retry')).toBeNull();
    });
  });

  describe('runAuthFlow', () => {
    it('verify成功 + validate成功なら成功結果を返してcleanupする', async () => {
      spyOn(service as any, 'callVerifyApi').and.returnValue(Promise.resolve({
        success: true,
        userId: 'user123',
        httpStatus: 200
      }));
      spyOn(service as any, 'callValidateApi').and.returnValue(Promise.resolve('success'));
      spyOn(service as any, 'cleanup').and.callThrough();

      const result = await service['runAuthFlow']('entra-jwt');

      expect(result.success).toBeTrue();
      expect(service['callVerifyApi']).toHaveBeenCalledWith('entra-jwt');
      expect(service['callValidateApi']).toHaveBeenCalledWith('user123');
      expect(service['cleanup']).toHaveBeenCalled();
    });

    it('verify 401ならENTRA_TOKEN_INVALIDを返してvalidateしない', async () => {
      spyOn(service as any, 'callVerifyApi').and.returnValue(Promise.resolve({
        success: false,
        httpStatus: 401,
        message: 'TOKEN_VALIDATION_FAILED'
      }));
      spyOn(service as any, 'callValidateApi');
      spyOn(service as any, 'cleanup').and.callThrough();

      const result = await service['runAuthFlow']('entra-jwt');

      expect(result.success).toBeFalse();
      expect(result.errorCode).toBe('ENTRA_TOKEN_INVALID');
      expect(service['callValidateApi']).not.toHaveBeenCalled();
      expect(service['cleanup']).toHaveBeenCalled();
    });

    it('verify 500ならretryAuthFlowの結果を返す', async () => {
      spyOn(service as any, 'callVerifyApi').and.returnValue(Promise.resolve({
        success: false,
        httpStatus: 500,
        message: 'SERVER_ERROR'
      }));
      spyOn(service as any, 'retryAuthFlow').and.returnValue(Promise.resolve(authSuccess()));

      const result = await service['runAuthFlow']('entra-jwt');

      expect(result.success).toBeTrue();
      expect(service['retryAuthFlow']).toHaveBeenCalled();
    });

    it('validate retryならretryAuthFlowの結果を返す', async () => {
      spyOn(service as any, 'callVerifyApi').and.returnValue(Promise.resolve({
        success: true,
        userId: 'user123',
        httpStatus: 200
      }));
      spyOn(service as any, 'callValidateApi').and.returnValue(Promise.resolve('retry'));
      spyOn(service as any, 'retryAuthFlow').and.returnValue(Promise.resolve(authSuccess()));

      const result = await service['runAuthFlow']('entra-jwt');

      expect(result.success).toBeTrue();
      expect(service['callValidateApi']).toHaveBeenCalledWith('user123');
      expect(service['retryAuthFlow']).toHaveBeenCalled();
    });

    it('validate failならINTERNAL_AUTH_FAILEDを返してcleanupする', async () => {
      spyOn(service as any, 'callVerifyApi').and.returnValue(Promise.resolve({
        success: true,
        userId: 'user123',
        httpStatus: 200
      }));
      spyOn(service as any, 'callValidateApi').and.returnValue(Promise.resolve('fail'));
      spyOn(service as any, 'cleanup').and.callThrough();

      const result = await service['runAuthFlow']('entra-jwt');

      expect(result.success).toBeFalse();
      expect(result.errorCode).toBe('INTERNAL_AUTH_FAILED');
      expect(service['cleanup']).toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('MSALのloginRedirectを標準スコープとselect_accountで呼び出す', () => {
      service.login();

      expect(msalService.loginRedirect).toHaveBeenCalledWith({
        scopes: ['openid', 'profile', 'email'],
        prompt: 'select_account'
      });
    });
  });

  describe('logout', () => {
    it('ログアウトAPI成功後にcleanup、MSALログアウト、トークン削除、logout画面遷移を行う', async () => {
      sessionStorage.setItem('auth_callback_retry', '1');
      sessionStorage.setItem('entra_jwt', 'cached-entra-jwt');
      spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));

      const promise = service.logout();

      const req = httpMock.expectOne(`${testEnvironment.apiBaseUrl}/auth/logout`);
      expect(req.request.method).toBe('POST');
      expect(req.request.withCredentials).toBeTrue();
      req.flush({});

      await promise;

      expect(sessionStorage.getItem('auth_callback_retry')).toBeNull();
      expect(sessionStorage.getItem('entra_jwt')).toBeNull();
      expect(msalService.logoutRedirect).toHaveBeenCalled();
      expect(tokenService.removeToken).toHaveBeenCalled();
      expect(router.navigate).toHaveBeenCalledWith(['/logout']);
    });

    it('ログアウトAPIが失敗してもクライアント側ログアウト処理を継続する', async () => {
      spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));

      const promise = service.logout();

      const req = httpMock.expectOne(`${testEnvironment.apiBaseUrl}/auth/logout`);
      req.flush({}, { status: 500, statusText: 'Internal Server Error' });

      await promise;

      expect(msalService.logoutRedirect).toHaveBeenCalled();
      expect(tokenService.removeToken).toHaveBeenCalled();
      expect(router.navigate).toHaveBeenCalledWith(['/logout']);
    });
  });

  describe('getAccount', () => {
    it('MSALのアクティブアカウントを返す', () => {
      const account = {
        homeAccountId: 'home-account-id',
        environment: 'login.microsoftonline.com',
        tenantId: 'tenant-id',
        localAccountId: 'user123',
        username: 'user@example.com',
        name: 'Test User',
        idToken: 'id-token',
        idTokenClaims: {}
      };
      msalService.getActiveAccount.and.returnValue(account as any);

      const result = service.getAccount();

      expect(result).toBe(account);
      expect(msalService.getActiveAccount).toHaveBeenCalled();
    });
  });
});
