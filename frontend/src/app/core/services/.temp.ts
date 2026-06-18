/**
 * チェーン呼び出しのモック例
 * 
 * 状況: tokenService.getContext().setUser(user)
 * 
 * - ContextService.setUser() は ContextService のメソッド
 * - TokenService.getContext() は ContextService を返す
 * - 使用側は getContext() 経由で setUser() を呼び出す
 */

import { Injectable } from '@angular/core';

// jasmine 型定義（テスト環境では @types/jasmine から提供される）
declare const jasmine: any;

// ============================================
// 実際のサービス定義（サンプル）
// ============================================

/**
 * ContextService（サンプル）
 */
export class ContextService {
  setUser(user: User): void {
    console.log('ContextService.setUser:', user);
  }

  getUser(): User | null {
    return null;
  }
}

/**
 * User（サンプル）
 */
export class User {
  constructor(public name: string) {}
}

/**
 * TokenService（サンプル）
 */
@Injectable()
export class TokenService {
  private context: ContextService;

  constructor() {
    this.context = new ContextService();
  }

  getContext(): ContextService {
    return this.context;
  }
}

// ============================================
// テストでのモック方法
// ============================================

/**
 * 方法1: スパイチェーン
 * 
 * ContextService のモックを作成し、
 * TokenService.getContext() がそれを返すように設定
 */
export function mockWithSpyChain() {
  // jasmine.createSpyObj でモック作成
  const contextSpy = jasmine.createSpyObj('ContextService', ['setUser', 'getUser']);
  const tokenServiceSpy = jasmine.createSpyObj('TokenService', ['getContext']);

  // getContext() が contextSpy を返すように設定
  tokenServiceSpy.getContext.and.returnValue(contextSpy);

  // 使用例:
  // tokenServiceSpy.getContext().setUser(new User('test'));

  // 検証:
  // expect(contextSpy.setUser).toHaveBeenCalledWith(new User('test'));
}

/**
 * 方法2: ダミーオブジェクト
 * 
 * ContextService のダミーオブジェクトを作成し、
 * TokenService.getContext() がそれを返すように設定
 */
export function mockWithDummyObject() {
  // ダミーオブジェクト
  const contextMock = {
    setUser: jasmine.createSpy('setUser'),
    getUser: jasmine.createSpy('getUser')
  };

  const tokenServiceSpy = jasmine.createSpyObj('TokenService', ['getContext']);
  tokenServiceSpy.getContext.and.returnValue(contextMock);

  // 使用例:
  // tokenServiceSpy.getContext().setUser(new User('test'));

  // 検証:
  // expect(contextMock.setUser).toHaveBeenCalledWith(new User('test'));
}

// ============================================
// 実際のテスト例
// ============================================

/**
 * テストコンポーネント（サンプル）
 */
export class MyComponent {
  constructor(private tokenService: TokenService) {}

  saveUser(user: User): void {
    // チェーン呼び出し
    this.tokenService.getContext().setUser(user);
  }
}

/**
 * テストコード例
 * 
 * describe('MyComponent', () => {
 *   let component: MyComponent;
 *   let tokenServiceSpy: jasmine.SpyObj<TokenService>;
 *   let contextSpy: jasmine.SpyObj<ContextService>;
 * 
 *   beforeEach(() => {
 *     // ContextService のモック
 *     contextSpy = jasmine.createSpyObj('ContextService', ['setUser']);
 * 
 *     // TokenService のモック
 *     const tokenSpy = jasmine.createSpyObj('TokenService', ['getContext']);
 *     tokenSpy.getContext.and.returnValue(contextSpy);
 * 
 *     TestBed.configureTestingModule({
 *       providers: [
 *         MyComponent,
 *         { provide: TokenService, useValue: tokenSpy }
 *       ]
 *     });
 * 
 *     component = TestBed.inject(MyComponent);
 *     tokenServiceSpy = TestBed.inject(TokenService) as jasmine.SpyObj<TokenService>;
 *   });
 * 
 *   it('setUserを呼び出す', () => {
 *     const user = new User('test');
 *     
 *     component.saveUser(user);
 *     
 *     expect(contextSpy.setUser).toHaveBeenCalledWith(user);
 *   });
 * });
 */

// ============================================
// MSAL設定オブジェクトのテスト方法
// ============================================

/**
 * 現状の問題点:
 * - 設定オブジェクトがコンストラクタ内にハードコード
 * - 設定値を外部から検証できない
 * 
 * 解決策:
 * 1. 設定生成をメソッドに分離
 * 2. ファクトリー経由で設定を検証
 * 3. 環境変数をモックしてテスト
 */

import { Configuration, PublicClientApplication } from '@azure/msal-browser';
import { environment } from '../../../environments/environment';

/**
 * MSALインスタンス生成ファクトリー
 */
export type MsalInstanceFactory = (config: Configuration) => PublicClientApplication;

/**
 * MSALサービスの例（設定生成メソッド分離済み）
 */
@Injectable({ providedIn: 'root' })
export class MsalServiceExample {
  private msalInstance: PublicClientApplication;

  constructor(
    private msalFactory: MsalInstanceFactory
  ) {
    const config = this.createMsalConfig();
    this.msalInstance = this.msalFactory(config);
  }

  /**
   * MSAL設定を生成（テスト用に公開）
   */
  createMsalConfig(): Configuration {
    return {
      auth: {
        clientId: environment.clientId,
        authority: environment.authority,
        redirectUri: environment.redirectUri,
        postLogoutRedirectUri: environment.redirectUri
        // MSAL v5 では navigateToLoginRequestUrl, prompt は削除
      },
      cache: {
        cacheLocation: 'localStorage'
        // MSAL v5 では storeAuthStateInCookie は削除
      },
      system: {
        // MSAL v5 では windowHashTimeout, allowRedirectInIframe は削除
      }
    };
  }
}

// ============================================
// テスト方法1: 設定オブジェクトを分離して直接テスト
// ============================================

/**
 * 方法1: createMsalConfig() を公開メソッドにして直接テスト
 * 
 * メリット:
 * - 設定値を直接検証できる
 * - 環境変数の反映を確認できる
 * - 各設定項目を個別にテストできる
 */
export function testWithSeparatedMethod() {
  /*
  describe('MsalService - 方法1: createMsalConfig', () => {
    let service: MsalServiceExample;
    let mockFactory: jasmine.Spy<MsalInstanceFactory>;
    let mockMsalInstance: jasmine.SpyObj<PublicClientApplication>;

    beforeEach(() => {
      mockMsalInstance = jasmine.createSpyObj('PublicClientApplication', ['initialize']);
      mockFactory = jasmine.createSpy('msalFactory').and.returnValue(mockMsalInstance);
      service = new MsalServiceExample(mockFactory);
    });

    describe('createMsalConfig', () => {
      it('clientId が設定されているべき', () => {
        const config = service.createMsalConfig();
        expect(config.auth.clientId).toBe(environment.clientId);
      });

      it('authority が設定されているべき', () => {
        const config = service.createMsalConfig();
        expect(config.auth.authority).toBe(environment.authority);
      });

      it('redirectUri が設定されているべき', () => {
        const config = service.createMsalConfig();
        expect(config.auth.redirectUri).toBe(environment.redirectUri);
      });

      it('navigateToLoginRequestUrl は MSAL v5 で削除されたため設定されないべき', () => {
        const config = service.createMsalConfig();
        // MSAL v5 では auth.navigateToLoginRequestUrl は削除
        expect((config.auth as any).navigateToLoginRequestUrl).toBeUndefined();
      });

      it('prompt は MSAL v5 で削除されたため設定されないべき', () => {
        const config = service.createMsalConfig();
        // MSAL v5 では auth.prompt は削除
        expect((config.auth as any).prompt).toBeUndefined();
      });

      it('cacheLocation が localStorage であるべき', () => {
        const config = service.createMsalConfig();
        expect(config.cache?.cacheLocation).toBe('localStorage');
      });

      it('storeAuthStateInCookie は MSAL v5 で削除されたため設定されないべき', () => {
        const config = service.createMsalConfig();
        // MSAL v5 では cache.storeAuthStateInCookie は削除
        expect((config.cache as any).storeAuthStateInCookie).toBeUndefined();
      });

      it('windowHashTimeout は MSAL v5 で削除されたため設定されないべき', () => {
        const config = service.createMsalConfig();
        // MSAL v5 では system.windowHashTimeout は削除
        expect((config.system as any).windowHashTimeout).toBeUndefined();
      });
    });
  });
  */
}

// ============================================
// テスト方法2: ファクトリー経由で設定を検証
// ============================================

/**
 * 方法2: ファクトリーに渡される設定を検証
 * 
 * メリット:
 * - コンストラクタでの設定生成を確認できる
 * - ファクトリーに渡される実際の設定を検証できる
 * - jasmine.objectContaining で部分的な検証が可能
 */
export function testViaFactory() {
  /*
  describe('MsalService - 方法2: ファクトリー経由', () => {
    let service: MsalServiceExample;
    let mockMsalInstance: jasmine.SpyObj<PublicClientApplication>;
    let capturedConfig: Configuration | undefined;

    beforeEach(() => {
      mockMsalInstance = jasmine.createSpyObj('PublicClientApplication', ['initialize']);
      
      // 設定をキャプチャするファクトリー
      const capturingFactory: MsalInstanceFactory = (config: Configuration) => {
        capturedConfig = config;
        return mockMsalInstance;
      };

      service = new MsalServiceExample(capturingFactory);
    });

    it('ファクトリーに auth.clientId が渡されるべき', () => {
      expect(capturedConfig?.auth.clientId).toBe(environment.clientId);
    });

    it('ファクトリーに auth.authority が渡されるべき', () => {
      expect(capturedConfig?.auth.authority).toBe(environment.authority);
    });

    it('ファクトリーに cache.cacheLocation が渡されるべき', () => {
      expect(capturedConfig?.cache?.cacheLocation).toBe('localStorage');
    });

    // jasmine.objectContaining で部分的な検証
    it('ファクトリーに正しい設定が渡されるべき（objectContaining）', () => {
      expect(capturingFactory).toHaveBeenCalledWith(
        jasmine.objectContaining({
          auth: jasmine.objectContaining({
            clientId: environment.clientId,
            authority: environment.authority
            // MSAL v5 では navigateToLoginRequestUrl は削除
          }),
          cache: jasmine.objectContaining({
            cacheLocation: 'localStorage'
          })
        })
      );
    });
  });
  */
}

// ============================================
// テスト方法3: 環境変数をモックしてテスト
// ============================================

/**
 * 方法3: 環境変数をモックしてテスト
 * 
 * メリット:
 * - 異なる環境設定をテストできる
 * - 環境変数の反映を確認できる
 * - テストケースごとに異なる値を設定可能
 */
export function testWithEnvironmentMock() {
  /*
  import * as env from '../../../environments/environment';

  describe('MsalService - 方法3: 環境変数モック', () => {
    let service: MsalServiceExample;
    let mockFactory: jasmine.Spy<MsalInstanceFactory>;
    let mockMsalInstance: jasmine.SpyObj<PublicClientApplication>;

    beforeEach(() => {
      mockMsalInstance = jasmine.createSpyObj('PublicClientApplication', ['initialize']);
      mockFactory = jasmine.createSpy('msalFactory').and.returnValue(mockMsalInstance);
    });

    describe('異なる環境設定でテスト', () => {
      it('開発環境の clientId が設定されるべき', () => {
        // 環境変数をモック
        spyOnProperty(env, 'clientId', 'get').and.returnValue('dev-client-id');
        spyOnProperty(env, 'authority', 'get').and.returnValue('https://dev.example.com');

        service = new MsalServiceExample(mockFactory);
        const config = service.createMsalConfig();

        expect(config.auth.clientId).toBe('dev-client-id');
        expect(config.auth.authority).toBe('https://dev.example.com');
      });

      it('本番環境の clientId が設定されるべき', () => {
        // 環境変数をモック
        spyOnProperty(env, 'clientId', 'get').and.returnValue('prod-client-id');
        spyOnProperty(env, 'authority', 'get').and.returnValue('https://prod.example.com');

        service = new MsalServiceExample(mockFactory);
        const config = service.createMsalConfig();

        expect(config.auth.clientId).toBe('prod-client-id');
        expect(config.auth.authority).toBe('https://prod.example.com');
      });
    });
  });
  */
}

// ============================================
// 推奨: 方法1 + 方法2 の組み合わせ
// ============================================

/**
 * 推奨: 方法1 + 方法2 の組み合わせ
 * 
 * - 方法1: createMsalConfig() を直接テスト
 * - 方法2: ファクトリー経由で設定が渡されることをテスト
 */
export function recommendedApproach() {
  /*
  describe('MsalService - 推奨アプローチ', () => {
    let service: MsalServiceExample;
    let mockFactory: jasmine.Spy<MsalInstanceFactory>;
    let mockMsalInstance: jasmine.SpyObj<PublicClientApplication>;

    beforeEach(() => {
      mockMsalInstance = jasmine.createSpyObj('PublicClientApplication', ['initialize']);
      mockFactory = jasmine.createSpy('msalFactory').and.returnValue(mockMsalInstance);
      service = new MsalServiceExample(mockFactory);
    });

    describe('createMsalConfig (方法1)', () => {
      it('設定値が正しい', () => {
        const config = service.createMsalConfig();
        
        // auth セクション
        expect(config.auth.clientId).toBe(environment.clientId);
        expect(config.auth.authority).toBe(environment.authority);
        // MSAL v5 では navigateToLoginRequestUrl は削除
        
        // cache セクション
        expect(config.cache?.cacheLocation).toBe('localStorage');
      });
    });

    describe('コンストラクタ (方法2)', () => {
      it('ファクトリーに設定が渡される', () => {
        expect(mockFactory).toHaveBeenCalledWith(
          jasmine.objectContaining({
            auth: jasmine.objectContaining({
              clientId: environment.clientId
            })
          })
        );
      });
    });
  });
  */
}
