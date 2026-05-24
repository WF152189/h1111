import { MsalService, MsalRedirectRequest, MsalSilentRequest, MsalInstanceFactory, MSAL_INSTANCE_FACTORY, defaultMsalFactory } from './msal.service';
import { Configuration, PublicClientApplication, AuthenticationResult, AccountInfo } from '@azure/msal-browser';

describe('MsalService', () => {
  let service: MsalService;
  let mockMsalInstance: jasmine.SpyObj<PublicClientApplication>;
  let mockFactory: jasmine.Spy<MsalInstanceFactory>;

  beforeEach(() => {
    // モック MSAL インスタンス
    mockMsalInstance = jasmine.createSpyObj('PublicClientApplication', [
      'initialize',
      'loginRedirect',
      'handleRedirectPromise',
      'getActiveAccount',
      'setActiveAccount',
      'logoutRedirect',
      'acquireTokenSilent'
    ]);

    // 各メソッドのデフォルト動作
    mockMsalInstance.initialize.and.returnValue(Promise.resolve());
    mockMsalInstance.logoutRedirect.and.returnValue(Promise.resolve());

    // モックファクトリー
    mockFactory = jasmine.createSpy('msalFactory').and.returnValue(mockMsalInstance);

    // ファクトリーを注入してサービス生成
    service = new MsalService(mockFactory);
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  describe('コンストラクタ', () => {
    it('ファクトリーを使用して MSAL インスタンスを生成するべき', () => {
      expect(mockFactory).toHaveBeenCalled();
    });
  });

  describe('initialize', () => {
    it('MSAL インスタンスの初期化を実行するべき', async () => {
      // Act
      await service.initialize();

      // Assert
      expect(mockMsalInstance.initialize).toHaveBeenCalled();
    });

    it('初期化完了後にログを出力するべき', async () => {
      spyOn(console, 'log');

      await service.initialize();

      expect(console.log).toHaveBeenCalledWith('[MsalService] MSAL初期化開始');
      expect(console.log).toHaveBeenCalledWith('[MsalService] MSAL初期化完了');
    });
  });

  describe('loginRedirect', () => {
    it('scopes 指定ありで loginRedirect を呼び出すべき', async () => {
      // Arrange
      const request: MsalRedirectRequest = {
        scopes: ['openid', 'profile']
      };

      // Act
      await service.loginRedirect(request);

      // Assert
      expect(mockMsalInstance.loginRedirect).toHaveBeenCalled();
      const callArgs = mockMsalInstance.loginRedirect.calls.mostRecent().args[0];
      expect(callArgs?.scopes).toEqual(['openid', 'profile']);
      expect(callArgs?.prompt).toBe('select_account');
    });

    it('prompt 指定ありで loginRedirect を呼び出すべき', async () => {
      // Arrange
      const request: MsalRedirectRequest = {
        scopes: ['openid'],
        prompt: 'login'
      };

      // Act
      await service.loginRedirect(request);

      // Assert
      expect(mockMsalInstance.loginRedirect).toHaveBeenCalled();
      const callArgs = mockMsalInstance.loginRedirect.calls.mostRecent().args[0];
      expect(callArgs?.prompt).toBe('login');
    });

    it('state 指定ありで loginRedirect を呼び出すべき', async () => {
      // Arrange
      const request: MsalRedirectRequest = {
        scopes: ['openid'],
        state: 'custom-state-123'
      };

      // Act
      await service.loginRedirect(request);

      // Assert
      const callArgs = mockMsalInstance.loginRedirect.calls.mostRecent().args[0];
      expect(callArgs?.state).toBe('custom-state-123');
    });
  });

  describe('handleRedirectPromise', () => {
    it('認証結果あり → MsalAuthenticationResult を返す', async () => {
      // Arrange
      const mockAccount: AccountInfo = {
        homeAccountId: 'home-id',
        environment: 'login.microsoftonline.com',
        tenantId: 'tenant-id',
        username: 'test@example.com',
        name: 'Test User',
        idToken: 'id-token',
        idTokenClaims: { oid: 'user-oid' },
        localAccountId: 'local-id'
      };

      const mockResult: AuthenticationResult = {
        accessToken: 'access-token-123',
        idToken: 'id-token-123',
        idTokenClaims: {},
        account: mockAccount,
        fromCache: false,
        expiresOn: new Date(),
        tokenType: 'Bearer',
        authority: 'https://login.microsoftonline.com/tenant-id',
        uniqueId: 'unique-id',
        tenantId: 'tenant-id',
        scopes: ['openid'],
        correlationId: 'correlation-id'
      };

      mockMsalInstance.handleRedirectPromise.and.returnValue(Promise.resolve(mockResult));

      // Act
      const result = await service.handleRedirectPromise();

      // Assert
      expect(mockMsalInstance.handleRedirectPromise).toHaveBeenCalled();
      expect(mockMsalInstance.setActiveAccount).toHaveBeenCalledWith(mockAccount);
      expect(result).toBeTruthy();
      expect(result?.idToken).toBe('id-token-123');
      expect(result?.account?.username).toBe('test@example.com');
      expect(result?.accessToken).toBe('access-token-123');
    });

    it('認証結果なし → null を返す', async () => {
      // Arrange
      mockMsalInstance.handleRedirectPromise.and.returnValue(Promise.resolve(null));

      // Act
      const result = await service.handleRedirectPromise();

      // Assert
      expect(mockMsalInstance.handleRedirectPromise).toHaveBeenCalled();
      expect(mockMsalInstance.setActiveAccount).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('エラー発生 → エラースロー + sessionStorage に保存', async () => {
      // Arrange
      const mockError = {
        errorCode: 'interaction_in_progress',
        message: 'Interaction is currently in progress'
      };

      mockMsalInstance.handleRedirectPromise.and.returnValue(Promise.reject(mockError));

      // Act & Assert
      await expectAsync(service.handleRedirectPromise()).toBeRejectedWith(mockError);
      expect(sessionStorage.getItem('auth_error_reason')).toBe('interaction_in_progress');
    });
  });

  describe('getActiveAccount', () => {
    it('アクティブアカウントあり → MsalAccountInfo を返す', () => {
      // Arrange
      const mockAccount: AccountInfo = {
        homeAccountId: 'home-id',
        environment: 'login.microsoftonline.com',
        tenantId: 'tenant-id',
        username: 'test@example.com',
        name: 'Test User',
        idToken: 'id-token',
        idTokenClaims: { oid: 'user-oid' },
        localAccountId: 'local-id'
      };

      mockMsalInstance.getActiveAccount.and.returnValue(mockAccount);

      // Act
      const result = service.getActiveAccount();

      // Assert
      expect(mockMsalInstance.getActiveAccount).toHaveBeenCalled();
      expect(result).toBeTruthy();
      expect(result?.username).toBe('test@example.com');
      expect(result?.homeAccountId).toBe('home-id');
      expect(result?.tenantId).toBe('tenant-id');
    });

    it('アクティブアカウントなし → null を返す', () => {
      // Arrange
      mockMsalInstance.getActiveAccount.and.returnValue(null);

      // Act
      const result = service.getActiveAccount();

      // Assert
      expect(mockMsalInstance.getActiveAccount).toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('例外発生 → null を返す', () => {
      // Arrange
      mockMsalInstance.getActiveAccount.and.throwError(new Error('初期化未完了'));

      // Act
      const result = service.getActiveAccount();

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('logoutRedirect', () => {
    it('logoutRedirect を呼び出すべき', async () => {
      // Act
      await service.logoutRedirect();

      // Assert
      expect(mockMsalInstance.logoutRedirect).toHaveBeenCalled();
      const callArgs = mockMsalInstance.logoutRedirect.calls.mostRecent().args[0];
      expect(callArgs?.postLogoutRedirectUri).toBeDefined();
    });
  });

  describe('acquireTokenSilent', () => {
    it('アクティブアカウントでサイレント更新成功 → idToken を返す', async () => {
      // Arrange
      const mockAccount: AccountInfo = {
        homeAccountId: 'home-id',
        environment: 'login.microsoftonline.com',
        tenantId: 'tenant-id',
        username: 'test@example.com',
        name: 'Test User',
        idToken: 'id-token',
        idTokenClaims: { oid: 'user-oid' },
        localAccountId: 'local-id'
      };

      const mockResult: AuthenticationResult = {
        idToken: 'new-id-token',
        accessToken: 'new-access-token',
        idTokenClaims: {},
        account: mockAccount,
        fromCache: false,
        expiresOn: new Date(),
        tokenType: 'Bearer',
        authority: 'https://login.microsoftonline.com/tenant-id',
        uniqueId: 'unique-id',
        tenantId: 'tenant-id',
        scopes: ['openid'],
        correlationId: 'correlation-id'
      };

      mockMsalInstance.getActiveAccount.and.returnValue(mockAccount);
      mockMsalInstance.acquireTokenSilent.and.returnValue(Promise.resolve(mockResult));

      // Act
      const result = await service.acquireTokenSilent({ scopes: ['openid'] });

      // Assert
      expect(mockMsalInstance.acquireTokenSilent).toHaveBeenCalled();
      expect(result).toBe('new-id-token');
    });

    it('指定アカウントでサイレント更新成功 → idToken を返す', async () => {
      // Arrange
      const mockAccount = {
        homeAccountId: 'home-id',
        environment: 'login.microsoftonline.com',
        tenantId: 'tenant-id',
        username: 'test@example.com',
        name: 'Test User',
        idToken: 'id-token',
        idTokenClaims: { oid: 'user-oid' }
      };

      const mockResult: AuthenticationResult = {
        idToken: 'new-id-token',
        accessToken: 'new-access-token',
        idTokenClaims: {},
        account: null as any,
        fromCache: false,
        expiresOn: new Date(),
        tokenType: 'Bearer',
        authority: 'https://login.microsoftonline.com/tenant-id',
        uniqueId: 'unique-id',
        tenantId: 'tenant-id',
        scopes: ['openid'],
        correlationId: 'correlation-id'
      };

      mockMsalInstance.acquireTokenSilent.and.returnValue(Promise.resolve(mockResult));

      // Act
      const result = await service.acquireTokenSilent({ 
        scopes: ['openid'],
        account: mockAccount
      });

      // Assert
      expect(mockMsalInstance.acquireTokenSilent).toHaveBeenCalled();
      expect(result).toBe('new-id-token');
    });

    it('アカウントなし → null を返す', async () => {
      // Arrange
      mockMsalInstance.getActiveAccount.and.returnValue(null);

      // Act
      const result = await service.acquireTokenSilent({ scopes: ['openid'] });

      // Assert
      expect(mockMsalInstance.acquireTokenSilent).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('サイレント更新失敗 → null を返す', async () => {
      // Arrange
      const mockAccount: AccountInfo = {
        homeAccountId: 'home-id',
        environment: 'login.microsoftonline.com',
        tenantId: 'tenant-id',
        username: 'test@example.com',
        name: 'Test User',
        idToken: 'id-token',
        idTokenClaims: { oid: 'user-oid' },
        localAccountId: 'local-id'
      };

      mockMsalInstance.getActiveAccount.and.returnValue(mockAccount);
      mockMsalInstance.acquireTokenSilent.and.returnValue(Promise.reject(new Error('トークン更新失敗')));

      // Act
      const result = await service.acquireTokenSilent({ scopes: ['openid'] });

      // Assert
      expect(mockMsalInstance.acquireTokenSilent).toHaveBeenCalled();
      expect(result).toBeNull();
    });
  });
});
