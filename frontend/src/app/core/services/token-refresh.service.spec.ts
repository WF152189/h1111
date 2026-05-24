import { TokenRefreshService } from './token-refresh.service';
import { MsalService } from './msal.service';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';
import { of, throwError } from 'rxjs';

describe('TokenRefreshService', () => {
  let service: TokenRefreshService;
  let msalServiceSpy: jasmine.SpyObj<MsalService>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let tokenServiceSpy: jasmine.SpyObj<TokenService>;

  beforeEach(() => {
    // モックサービス
    msalServiceSpy = jasmine.createSpyObj('MsalService', ['acquireTokenSilent']);
    authServiceSpy = jasmine.createSpyObj('AuthService', ['handleCallbackWithEntraJwt']);
    tokenServiceSpy = jasmine.createSpyObj('TokenService', ['getToken']);

    // サービス生成（モックを注入）
    service = new TokenRefreshService(msalServiceSpy, authServiceSpy, tokenServiceSpy);
  });

  describe('performSilentRefresh', () => {
    describe('新規更新（初回実行）', () => {
      it('全ステップ成功 → 新JWTを返す', (done) => {
        // Arrange
        const mockEntraJwt = 'entra-jwt-123';
        const mockBusinessJwt = 'business-jwt-456';

        msalServiceSpy.acquireTokenSilent.and.returnValue(Promise.resolve(mockEntraJwt));
        authServiceSpy.handleCallbackWithEntraJwt.and.returnValue(Promise.resolve(true));
        tokenServiceSpy.getToken.and.returnValue(mockBusinessJwt);

        // Act
        service.performSilentRefresh().subscribe((result) => {
          // Assert
          expect(result).toBe(mockBusinessJwt);
          expect(msalServiceSpy.acquireTokenSilent).toHaveBeenCalled();
          expect(authServiceSpy.handleCallbackWithEntraJwt).toHaveBeenCalledWith(mockEntraJwt);
          expect(tokenServiceSpy.getToken).toHaveBeenCalled();
          done();
        });
      });

      it('acquireTokenSilent 失敗 → null を返す', (done) => {
        // Arrange
        msalServiceSpy.acquireTokenSilent.and.returnValue(Promise.resolve(null));

        // Act
        service.performSilentRefresh().subscribe((result) => {
          // Assert
          expect(result).toBeNull();
          expect(msalServiceSpy.acquireTokenSilent).toHaveBeenCalled();
          expect(authServiceSpy.handleCallbackWithEntraJwt).not.toHaveBeenCalled();
          done();
        });
      });

      it('handleCallbackWithEntraJwt 失敗 → null を返す', (done) => {
        // Arrange
        msalServiceSpy.acquireTokenSilent.and.returnValue(Promise.resolve('entra-jwt'));
        authServiceSpy.handleCallbackWithEntraJwt.and.returnValue(Promise.resolve(false));

        // Act
        service.performSilentRefresh().subscribe((result) => {
          // Assert
          expect(result).toBeNull();
          expect(msalServiceSpy.acquireTokenSilent).toHaveBeenCalled();
          expect(authServiceSpy.handleCallbackWithEntraJwt).toHaveBeenCalled();
          expect(tokenServiceSpy.getToken).not.toHaveBeenCalled();
          done();
        });
      });

      it('getToken でJWTなし → null を返す', (done) => {
        // Arrange
        msalServiceSpy.acquireTokenSilent.and.returnValue(Promise.resolve('entra-jwt'));
        authServiceSpy.handleCallbackWithEntraJwt.and.returnValue(Promise.resolve(true));
        tokenServiceSpy.getToken.and.returnValue(null);

        // Act
        service.performSilentRefresh().subscribe((result) => {
          // Assert
          expect(result).toBeNull();
          expect(msalServiceSpy.acquireTokenSilent).toHaveBeenCalled();
          expect(authServiceSpy.handleCallbackWithEntraJwt).toHaveBeenCalled();
          expect(tokenServiceSpy.getToken).toHaveBeenCalled();
          done();
        });
      });

      it('例外発生 → null を返す', (done) => {
        // Arrange
        msalServiceSpy.acquireTokenSilent.and.returnValue(Promise.reject(new Error('ネットワークエラー')));

        // Act
        service.performSilentRefresh().subscribe((result) => {
          // Assert
          expect(result).toBeNull();
          expect(msalServiceSpy.acquireTokenSilent).toHaveBeenCalled();
          done();
        });
      });
    });

    describe('状態管理', () => {
      it('更新成功後に isRefreshing が false に戻る', (done) => {
        // Arrange
        msalServiceSpy.acquireTokenSilent.and.returnValue(Promise.resolve('entra-jwt'));
        authServiceSpy.handleCallbackWithEntraJwt.and.returnValue(Promise.resolve(true));
        tokenServiceSpy.getToken.and.returnValue('jwt');

        // Act
        service.performSilentRefresh().subscribe(() => {
          // Assert
          expect((service as any).isRefreshing).toBeFalse();
          done();
        });
      });

      it('更新失敗後も isRefreshing が false に戻る', (done) => {
        // Arrange
        msalServiceSpy.acquireTokenSilent.and.returnValue(Promise.reject(new Error('エラー')));

        // Act
        service.performSilentRefresh().subscribe(() => {
          // Assert
          expect((service as any).isRefreshing).toBeFalse();
          done();
        });
      });
    });

    describe('スコープ指定', () => {
      it('固定スコープで acquireTokenSilent を呼び出す', (done) => {
        // Arrange
        msalServiceSpy.acquireTokenSilent.and.returnValue(Promise.resolve('entra-jwt'));
        authServiceSpy.handleCallbackWithEntraJwt.and.returnValue(Promise.resolve(true));
        tokenServiceSpy.getToken.and.returnValue('jwt');

        // Act
        service.performSilentRefresh().subscribe(() => {
          // Assert
          expect(msalServiceSpy.acquireTokenSilent).toHaveBeenCalledWith({
            scopes: ['openid', 'profile', 'email']
          });
          done();
        });
      });
    });

    describe('状態管理', () => {
      it('更新中は isRefreshing が true になる', (done) => {
        // Arrange
        msalServiceSpy.acquireTokenSilent.and.returnValue(Promise.resolve('entra-jwt'));
        authServiceSpy.handleCallbackWithEntraJwt.and.returnValue(Promise.resolve(true));
        tokenServiceSpy.getToken.and.returnValue('jwt');

        // Act
        service.performSilentRefresh().subscribe(() => {
          // Assert
          // 更新完了後は false に戻る
          expect((service as any).isRefreshing).toBeFalse();
          done();
        });

        // 更新中にチェック
        expect((service as any).isRefreshing).toBeTrue();
      });

      it('更新失敗時も isRefreshing が false に戻る', (done) => {
        // Arrange
        msalServiceSpy.acquireTokenSilent.and.returnValue(Promise.reject(new Error('エラー')));

        // Act
        service.performSilentRefresh().subscribe(() => {
          // Assert
          expect((service as any).isRefreshing).toBeFalse();
          done();
        });
      });
    });
  });

  describe('キュー方式（同時リクエスト）', () => {
    it('更新中に別のリクエストがキューイングされる', (done) => {
      // Arrange
      const mockEntraJwt = 'entra-jwt-123';
      const mockBusinessJwt = 'business-jwt-456';

      msalServiceSpy.acquireTokenSilent.and.returnValue(Promise.resolve(mockEntraJwt));
      authServiceSpy.handleCallbackWithEntraJwt.and.returnValue(Promise.resolve(true));
      tokenServiceSpy.getToken.and.returnValue(mockBusinessJwt);

      // Act: 1回目のリクエスト
      service.performSilentRefresh().subscribe((result1) => {
        expect(result1).toBe(mockBusinessJwt);
        
        // 更新完了後、2回目のリクエスト（新たな更新）
        service.performSilentRefresh().subscribe((result2) => {
          expect(result2).toBe(mockBusinessJwt);
          expect(msalServiceSpy.acquireTokenSilent).toHaveBeenCalledTimes(2);
          done();
        });
      });

      // 最初の更新中にisRefreshingがtrueになることを確認
      expect((service as any).isRefreshing).toBeTrue();
    });

    it('同時に複数のリクエストを送信するとキューイングされる', (done) => {
      // Arrange
      const mockEntraJwt = 'entra-jwt-123';
      const mockBusinessJwt = 'business-jwt-456';

      msalServiceSpy.acquireTokenSilent.and.returnValue(Promise.resolve(mockEntraJwt));
      authServiceSpy.handleCallbackWithEntraJwt.and.returnValue(Promise.resolve(true));
      tokenServiceSpy.getToken.and.returnValue(mockBusinessJwt);

      // Act: 1回目のリクエスト完了後、2回目を連続実行
      service.performSilentRefresh().subscribe((result1) => {
        expect(result1).toBe(mockBusinessJwt);
        
        // 1回目完了直後に2回目を送信（isRefreshingがfalseに戻っている）
        service.performSilentRefresh().subscribe((result2) => {
          expect(result2).toBe(mockBusinessJwt);
          
          // 2回とも独立した更新として実行される
          expect(msalServiceSpy.acquireTokenSilent).toHaveBeenCalledTimes(2);
          done();
        });
      });
    });

    it('更新が失敗した場合、isRefreshingがfalseに戻る', (done) => {
      // Arrange
      msalServiceSpy.acquireTokenSilent.and.returnValue(Promise.reject(new Error('ネットワークエラー')));

      // Act
      service.performSilentRefresh().subscribe((result) => {
        // Assert
        expect(result).toBeNull();
        expect((service as any).isRefreshing).toBeFalse();
        done();
      });
    });
  });

  describe('executeTokenRefresh（プライベートメソッド）', () => {
    it('正常系: 3ステップを順に実行', async () => {
      // Arrange
      const mockEntraJwt = 'entra-jwt-123';
      const mockBusinessJwt = 'business-jwt-456';

      msalServiceSpy.acquireTokenSilent.and.returnValue(Promise.resolve(mockEntraJwt));
      authServiceSpy.handleCallbackWithEntraJwt.and.returnValue(Promise.resolve(true));
      tokenServiceSpy.getToken.and.returnValue(mockBusinessJwt);

      // Act
      const result = await (service as any).executeTokenRefresh();

      // Assert
      expect(result).toBe(mockBusinessJwt);
      expect(msalServiceSpy.acquireTokenSilent).toHaveBeenCalled();
      expect(authServiceSpy.handleCallbackWithEntraJwt).toHaveBeenCalledWith(mockEntraJwt);
      expect(tokenServiceSpy.getToken).toHaveBeenCalled();
    });

    it('acquireTokenSilent 失敗 → null を返す', async () => {
      // Arrange
      msalServiceSpy.acquireTokenSilent.and.returnValue(Promise.resolve(null));

      // Act
      const result = await (service as any).executeTokenRefresh();

      // Assert
      expect(result).toBeNull();
      expect(authServiceSpy.handleCallbackWithEntraJwt).not.toHaveBeenCalled();
    });

    it('handleCallbackWithEntraJwt 失敗 → null を返す', async () => {
      // Arrange
      msalServiceSpy.acquireTokenSilent.and.returnValue(Promise.resolve('entra-jwt'));
      authServiceSpy.handleCallbackWithEntraJwt.and.returnValue(Promise.resolve(false));

      // Act
      const result = await (service as any).executeTokenRefresh();

      // Assert
      expect(result).toBeNull();
      expect(tokenServiceSpy.getToken).not.toHaveBeenCalled();
    });

    it('例外キャッチ → null を返す', async () => {
      // Arrange
      spyOn(console, 'error');
      msalServiceSpy.acquireTokenSilent.and.returnValue(Promise.reject(new Error('ネットワークエラー')));

      // Act
      const result = await (service as any).executeTokenRefresh();

      // Assert
      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith(
        '[TokenRefreshService] サイレント更新エラー:',
        jasmine.any(Error)
      );
    });
  });
});
