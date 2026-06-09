import { TokenRefreshService } from './token-refresh.service';
import { MsalService } from './msal.service';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';

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
        service.performSilentRefresh().then((result) => {
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
        service.performSilentRefresh().then((result) => {
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
        service.performSilentRefresh().then((result) => {
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
        service.performSilentRefresh().then((result) => {
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
        service.performSilentRefresh().then((result) => {
          // Assert
          expect(result).toBeNull();
          expect(msalServiceSpy.acquireTokenSilent).toHaveBeenCalled();
          done();
        });
      });

      it('handleCallbackWithEntraJwt が reject → null を返す', (done) => {
        // Arrange
        msalServiceSpy.acquireTokenSilent.and.returnValue(Promise.resolve('entra-jwt'));
        authServiceSpy.handleCallbackWithEntraJwt.and.returnValue(Promise.reject(new Error('認証エラー')));

        // Act
        service.performSilentRefresh().then((result) => {
          // Assert
          expect(result).toBeNull();
          expect(msalServiceSpy.acquireTokenSilent).toHaveBeenCalled();
          expect(authServiceSpy.handleCallbackWithEntraJwt).toHaveBeenCalled();
          expect(tokenServiceSpy.getToken).not.toHaveBeenCalled();
          done();
        });
      });

      it('getToken が例外を投げる → null を返す', (done) => {
        // Arrange
        msalServiceSpy.acquireTokenSilent.and.returnValue(Promise.resolve('entra-jwt'));
        authServiceSpy.handleCallbackWithEntraJwt.and.returnValue(Promise.resolve(true));
        tokenServiceSpy.getToken.and.throwError(new Error('トークン読み取りエラー'));

        // Act
        service.performSilentRefresh().then((result) => {
          // Assert
          expect(result).toBeNull();
          expect(msalServiceSpy.acquireTokenSilent).toHaveBeenCalled();
          expect(authServiceSpy.handleCallbackWithEntraJwt).toHaveBeenCalled();
          expect(tokenServiceSpy.getToken).toHaveBeenCalled();
          done();
        });
      });

      it('acquireTokenSilent が undefined を返す → null を返す', (done) => {
        // Arrange
        msalServiceSpy.acquireTokenSilent.and.returnValue(Promise.resolve(undefined as any));

        // Act
        service.performSilentRefresh().then((result) => {
          // Assert
          expect(result).toBeNull();
          expect(authServiceSpy.handleCallbackWithEntraJwt).not.toHaveBeenCalled();
          done();
        });
      });

      it('acquireTokenSilent が空文字を返す → null を返す', (done) => {
        // Arrange
        msalServiceSpy.acquireTokenSilent.and.returnValue(Promise.resolve(''));

        // Act
        service.performSilentRefresh().then((result) => {
          // Assert
          expect(result).toBeNull();
          expect(authServiceSpy.handleCallbackWithEntraJwt).not.toHaveBeenCalled();
          done();
        });
      });
    });

    describe('状態管理', () => {
      it('更新成功後に refreshPromise が null に戻る', (done) => {
        // Arrange
        msalServiceSpy.acquireTokenSilent.and.returnValue(Promise.resolve('entra-jwt'));
        authServiceSpy.handleCallbackWithEntraJwt.and.returnValue(Promise.resolve(true));
        tokenServiceSpy.getToken.and.returnValue('jwt');

        // Act
        service.performSilentRefresh().then(() => {
          // Assert
          expect((service as any).refreshPromise).toBeNull();
          done();
        });
      });

      it('更新失敗後も refreshPromise が null に戻る', (done) => {
        // Arrange
        msalServiceSpy.acquireTokenSilent.and.returnValue(Promise.reject(new Error('エラー')));

        // Act
        service.performSilentRefresh().then(() => {
          // Assert
          expect((service as any).refreshPromise).toBeNull();
          done();
        });
      });

      it('handleCallbackWithEntraJwt 失敗後も refreshPromise が null に戻る', (done) => {
        // Arrange
        msalServiceSpy.acquireTokenSilent.and.returnValue(Promise.resolve('entra-jwt'));
        authServiceSpy.handleCallbackWithEntraJwt.and.returnValue(Promise.resolve(false));

        // Act
        service.performSilentRefresh().then(() => {
          // Assert
          expect((service as any).refreshPromise).toBeNull();
          done();
        });
      });

      it('handleCallbackWithEntraJwt が reject 後も refreshPromise が null に戻る', (done) => {
        // Arrange
        msalServiceSpy.acquireTokenSilent.and.returnValue(Promise.resolve('entra-jwt'));
        authServiceSpy.handleCallbackWithEntraJwt.and.returnValue(Promise.reject(new Error('エラー')));

        // Act
        service.performSilentRefresh().then(() => {
          // Assert
          expect((service as any).refreshPromise).toBeNull();
          done();
        });
      });

      it('getToken 例外後も refreshPromise が null に戻る', (done) => {
        // Arrange
        msalServiceSpy.acquireTokenSilent.and.returnValue(Promise.resolve('entra-jwt'));
        authServiceSpy.handleCallbackWithEntraJwt.and.returnValue(Promise.resolve(true));
        tokenServiceSpy.getToken.and.throwError(new Error('エラー'));

        // Act
        service.performSilentRefresh().then(() => {
          // Assert
          expect((service as any).refreshPromise).toBeNull();
          done();
        });
      });

      it('getToken が null を返した後、refreshPromise が null に戻る', (done) => {
        // Arrange
        msalServiceSpy.acquireTokenSilent.and.returnValue(Promise.resolve('entra-jwt'));
        authServiceSpy.handleCallbackWithEntraJwt.and.returnValue(Promise.resolve(true));
        tokenServiceSpy.getToken.and.returnValue(null);

        // Act
        service.performSilentRefresh().then(() => {
          // Assert
          expect((service as any).refreshPromise).toBeNull();
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
        service.performSilentRefresh().then(() => {
          // Assert
          expect(msalServiceSpy.acquireTokenSilent).toHaveBeenCalledWith({
            scopes: ['openid', 'profile', 'email']
          });
          done();
        });
      });
    });

    describe('状態管理', () => {
      it('更新中は refreshPromise が設定される', (done) => {
        // Arrange
        msalServiceSpy.acquireTokenSilent.and.returnValue(Promise.resolve('entra-jwt'));
        authServiceSpy.handleCallbackWithEntraJwt.and.returnValue(Promise.resolve(true));
        tokenServiceSpy.getToken.and.returnValue('jwt');

        // Act
        service.performSilentRefresh().then(() => {
          // Assert
          // 更新完了後は null に戻る
          expect((service as any).refreshPromise).toBeNull();
          done();
        });

        // 更新中にチェック
        expect((service as any).refreshPromise).not.toBeNull();
      });

      it('更新失敗時も refreshPromise が null に戻る', (done) => {
        // Arrange
        msalServiceSpy.acquireTokenSilent.and.returnValue(Promise.reject(new Error('エラー')));

        // Act
        service.performSilentRefresh().then(() => {
          // Assert
          expect((service as any).refreshPromise).toBeNull();
          done();
        });
      });
    });
  });

  describe('キュー方式（同時リクエスト）', () => {
    it('更新完了後の再実行では新たな更新処理が実行される', (done) => {
      // Arrange
      const mockEntraJwt = 'entra-jwt-123';
      const mockBusinessJwt = 'business-jwt-456';

      msalServiceSpy.acquireTokenSilent.and.returnValue(Promise.resolve(mockEntraJwt));
      authServiceSpy.handleCallbackWithEntraJwt.and.returnValue(Promise.resolve(true));
      tokenServiceSpy.getToken.and.returnValue(mockBusinessJwt);

      // Act: 1回目のリクエスト
      service.performSilentRefresh().then((result1) => {
        expect(result1).toBe(mockBusinessJwt);
        
        // 更新完了後、2回目のリクエスト（新たな更新）
        service.performSilentRefresh().then((result2) => {
          expect(result2).toBe(mockBusinessJwt);
          expect(msalServiceSpy.acquireTokenSilent).toHaveBeenCalledTimes(2);
          done();
        });
      });

      // 最初の更新中にrefreshPromiseが設定されることを確認
      expect((service as any).refreshPromise).not.toBeNull();
    });

    it('更新完了後に再度更新を実行すると、新たな更新処理が実行される', (done) => {
      // Arrange
      const mockEntraJwt = 'entra-jwt-123';
      const mockBusinessJwt = 'business-jwt-456';

      msalServiceSpy.acquireTokenSilent.and.returnValue(Promise.resolve(mockEntraJwt));
      authServiceSpy.handleCallbackWithEntraJwt.and.returnValue(Promise.resolve(true));
      tokenServiceSpy.getToken.and.returnValue(mockBusinessJwt);

      // Act: 1回目のリクエスト完了後、2回目を連続実行
      service.performSilentRefresh().then((result1) => {
        expect(result1).toBe(mockBusinessJwt);
        
        // 1回目完了直後に2回目を送信（refreshPromiseがnullに戻っている）
        service.performSilentRefresh().then((result2) => {
          expect(result2).toBe(mockBusinessJwt);
          
          // 2回とも独立した更新として実行される
          expect(msalServiceSpy.acquireTokenSilent).toHaveBeenCalledTimes(2);
          done();
        });
      });
    });

    it('更新が失敗した場合、refreshPromiseがnullに戻る', (done) => {
      // Arrange
      msalServiceSpy.acquireTokenSilent.and.returnValue(Promise.reject(new Error('ネットワークエラー')));

      // Act
      service.performSilentRefresh().then((result) => {
        // Assert
        expect(result).toBeNull();
        expect((service as any).refreshPromise).toBeNull();
        done();
      });
    });

    it('【重要】真正な同時実行: 2リクエストが同時に呼び出されると、両方が同じトークンを受け取る', (done) => {
      // Arrange
      const mockEntraJwt = 'entra-jwt-123';
      const mockBusinessJwt = 'business-jwt-456';

      // acquireTokenSilent が1秒かかるようにシミュレート
      msalServiceSpy.acquireTokenSilent.and.callFake(() => {
        return new Promise<string>((resolve) => {
          setTimeout(() => resolve(mockEntraJwt), 100);
        });
      });
      authServiceSpy.handleCallbackWithEntraJwt.and.returnValue(Promise.resolve(true));
      tokenServiceSpy.getToken.and.returnValue(mockBusinessJwt);

      // Act: 2つのリクエストを同時に実行
      let result1: string | null = null;
      let result2: string | null = null;
      let completed = 0;

      const checkDone = () => {
        completed++;
        if (completed === 2) {
          // Assert
          expect(result1).toBe(mockBusinessJwt);
          expect(result2).toBe(mockBusinessJwt);
          
          // acquireTokenSilent は1回しか呼ばれていない（キューイング成功）
          expect(msalServiceSpy.acquireTokenSilent).toHaveBeenCalledTimes(1);
          
          done();
        }
      };

      // 1つ目のリクエスト
      service.performSilentRefresh().then((result) => {
        result1 = result;
        checkDone();
      });

      // 2つ目のリクエスト（同時に実行）
      service.performSilentRefresh().then((result) => {
        result2 = result;
        checkDone();
      });

      // 最初の呼び出し直後に refreshPromise が設定されていることを確認
      expect((service as any).refreshPromise).not.toBeNull();
    });

    it('【重要】3つの同時リクエスト: 全てが同じトークンを受け取り、API呼び出しは1回', (done) => {
      // Arrange
      const mockEntraJwt = 'entra-jwt-789';
      const mockBusinessJwt = 'business-jwt-012';

      // acquireTokenSilent が少し遅延するようにシミュレート
      msalServiceSpy.acquireTokenSilent.and.callFake(() => {
        return new Promise<string>((resolve) => {
          setTimeout(() => resolve(mockEntraJwt), 50);
        });
      });
      authServiceSpy.handleCallbackWithEntraJwt.and.returnValue(Promise.resolve(true));
      tokenServiceSpy.getToken.and.returnValue(mockBusinessJwt);

      // Act: 3つのリクエストを同時に実行
      const results: (string | null)[] = [];
      let completed = 0;

      const checkDone = () => {
        completed++;
        if (completed === 3) {
          // Assert
          expect(results).toEqual([
            mockBusinessJwt,
            mockBusinessJwt,
            mockBusinessJwt
          ]);
          
          // acquireTokenSilent は1回しか呼ばれていない
          expect(msalServiceSpy.acquireTokenSilent).toHaveBeenCalledTimes(1);
          
          done();
        }
      };

      // 3つのリクエストを同時に実行
      service.performSilentRefresh().then((result) => {
        results.push(result);
        checkDone();
      });

      service.performSilentRefresh().then((result) => {
        results.push(result);
        checkDone();
      });

      service.performSilentRefresh().then((result) => {
        results.push(result);
        checkDone();
      });
    });

    it('【重要】同時リクエスト時に各依存メソッドが1回だけ呼ばれる', (done) => {
      // Arrange
      const mockEntraJwt = 'entra-jwt-verify';
      const mockBusinessJwt = 'business-jwt-verify';

      msalServiceSpy.acquireTokenSilent.and.callFake(() => {
        return new Promise<string>((resolve) => {
          setTimeout(() => resolve(mockEntraJwt), 50);
        });
      });
      authServiceSpy.handleCallbackWithEntraJwt.and.returnValue(Promise.resolve(true));
      tokenServiceSpy.getToken.and.returnValue(mockBusinessJwt);

      // Act: 5つのリクエストを同時に実行
      let completed = 0;
      const totalRequests = 5;

      const checkDone = () => {
        completed++;
        if (completed === totalRequests) {
          // Assert: 全ての依存メソッドが1回しか呼ばれていない
          expect(msalServiceSpy.acquireTokenSilent).toHaveBeenCalledTimes(1);
          expect(authServiceSpy.handleCallbackWithEntraJwt).toHaveBeenCalledTimes(1);
          expect(tokenServiceSpy.getToken).toHaveBeenCalledTimes(1);
          
          // handleCallbackWithEntraJwt には正しいEntra JWTが渡されている
          expect(authServiceSpy.handleCallbackWithEntraJwt).toHaveBeenCalledWith(mockEntraJwt);
          
          done();
        }
      };

      // 5つのリクエストを同時に実行
      for (let i = 0; i < totalRequests; i++) {
        service.performSilentRefresh().then(() => checkDone());
      }
    });

    it('【重要】同時リクエスト中に更新失敗: 全てのリクエストがnullを受け取る', (done) => {
      // Arrange
      msalServiceSpy.acquireTokenSilent.and.callFake(() => {
        return new Promise<string>((_, reject) => {
          setTimeout(() => reject(new Error('ネットワークエラー')), 50);
        });
      });

      // Act: 2つのリクエストを同時に実行
      const results: (string | null)[] = [];
      let completed = 0;

      const checkDone = () => {
        completed++;
        if (completed === 2) {
          // Assert
          expect(results).toEqual([null, null]);
          expect(msalServiceSpy.acquireTokenSilent).toHaveBeenCalledTimes(1);
          
          done();
        }
      };

      service.performSilentRefresh().then((result) => {
        results.push(result);
        checkDone();
      });

      service.performSilentRefresh().then((result) => {
        results.push(result);
        checkDone();
      });
    });

    it('【重要】同時リクエスト中に handleCallbackWithEntraJwt が false: 全てがnullを受け取る', (done) => {
      // Arrange
      msalServiceSpy.acquireTokenSilent.and.callFake(() => {
        return new Promise<string>((resolve) => {
          setTimeout(() => resolve('entra-jwt'), 50);
        });
      });
      authServiceSpy.handleCallbackWithEntraJwt.and.returnValue(Promise.resolve(false));

      // Act: 2つのリクエストを同時に実行
      const results: (string | null)[] = [];
      let completed = 0;

      const checkDone = () => {
        completed++;
        if (completed === 2) {
          // Assert
          expect(results).toEqual([null, null]);
          expect(msalServiceSpy.acquireTokenSilent).toHaveBeenCalledTimes(1);
          expect(authServiceSpy.handleCallbackWithEntraJwt).toHaveBeenCalledTimes(1);
          expect(tokenServiceSpy.getToken).not.toHaveBeenCalled();
          done();
        }
      };

      service.performSilentRefresh().then((result) => {
        results.push(result);
        checkDone();
      });

      service.performSilentRefresh().then((result) => {
        results.push(result);
        checkDone();
      });
    });

    it('【重要】同時リクエスト中に handleCallbackWithEntraJwt が reject: 全てがnullを受け取る', (done) => {
      // Arrange
      msalServiceSpy.acquireTokenSilent.and.callFake(() => {
        return new Promise<string>((resolve) => {
          setTimeout(() => resolve('entra-jwt'), 50);
        });
      });
      authServiceSpy.handleCallbackWithEntraJwt.and.returnValue(Promise.reject(new Error('認証エラー')));

      // Act: 2つのリクエストを同時に実行
      const results: (string | null)[] = [];
      let completed = 0;

      const checkDone = () => {
        completed++;
        if (completed === 2) {
          // Assert
          expect(results).toEqual([null, null]);
          expect(msalServiceSpy.acquireTokenSilent).toHaveBeenCalledTimes(1);
          expect(authServiceSpy.handleCallbackWithEntraJwt).toHaveBeenCalledTimes(1);
          expect(tokenServiceSpy.getToken).not.toHaveBeenCalled();
          done();
        }
      };

      service.performSilentRefresh().then((result) => {
        results.push(result);
        checkDone();
      });

      service.performSilentRefresh().then((result) => {
        results.push(result);
        checkDone();
      });
    });

    it('【重要】同時リクエスト中に getToken が null: 全てがnullを受け取る', (done) => {
      // Arrange
      msalServiceSpy.acquireTokenSilent.and.callFake(() => {
        return new Promise<string>((resolve) => {
          setTimeout(() => resolve('entra-jwt'), 50);
        });
      });
      authServiceSpy.handleCallbackWithEntraJwt.and.returnValue(Promise.resolve(true));
      tokenServiceSpy.getToken.and.returnValue(null);

      // Act: 2つのリクエストを同時に実行
      const results: (string | null)[] = [];
      let completed = 0;

      const checkDone = () => {
        completed++;
        if (completed === 2) {
          // Assert
          expect(results).toEqual([null, null]);
          expect(msalServiceSpy.acquireTokenSilent).toHaveBeenCalledTimes(1);
          expect(authServiceSpy.handleCallbackWithEntraJwt).toHaveBeenCalledTimes(1);
          expect(tokenServiceSpy.getToken).toHaveBeenCalledTimes(1);
          done();
        }
      };

      service.performSilentRefresh().then((result) => {
        results.push(result);
        checkDone();
      });

      service.performSilentRefresh().then((result) => {
        results.push(result);
        checkDone();
      });
    });

    it('【重要】同時リクエスト中に getToken が例外: 全てがnullを受け取る', (done) => {
      // Arrange
      msalServiceSpy.acquireTokenSilent.and.callFake(() => {
        return new Promise<string>((resolve) => {
          setTimeout(() => resolve('entra-jwt'), 50);
        });
      });
      authServiceSpy.handleCallbackWithEntraJwt.and.returnValue(Promise.resolve(true));
      tokenServiceSpy.getToken.and.throwError(new Error('トークンエラー'));

      // Act: 2つのリクエストを同時に実行
      const results: (string | null)[] = [];
      let completed = 0;

      const checkDone = () => {
        completed++;
        if (completed === 2) {
          // Assert
          expect(results).toEqual([null, null]);
          expect(msalServiceSpy.acquireTokenSilent).toHaveBeenCalledTimes(1);
          expect(authServiceSpy.handleCallbackWithEntraJwt).toHaveBeenCalledTimes(1);
          expect(tokenServiceSpy.getToken).toHaveBeenCalledTimes(1);
          done();
        }
      };

      service.performSilentRefresh().then((result) => {
        results.push(result);
        checkDone();
      });

      service.performSilentRefresh().then((result) => {
        results.push(result);
        checkDone();
      });
    });

    it('【重要】キューの動作確認: 同時リクエストは両方とも正しく完了する', (done) => {
      // Arrange
      const mockEntraJwt = 'entra-jwt-345';
      const mockBusinessJwt = 'business-jwt-678';

      // acquireTokenSilent が100msかかる
      msalServiceSpy.acquireTokenSilent.and.callFake(() => {
        return new Promise<string>((resolve) => {
          setTimeout(() => resolve(mockEntraJwt), 100);
        });
      });
      authServiceSpy.handleCallbackWithEntraJwt.and.returnValue(Promise.resolve(true));
      tokenServiceSpy.getToken.and.returnValue(mockBusinessJwt);

      // Act
      const results: (string | null)[] = [];
      let completed = 0;

      const checkDone = () => {
        completed++;
        if (completed === 2) {
          // Assert: 両方が同じトークンを受け取る
          expect(results).toEqual([mockBusinessJwt, mockBusinessJwt]);
          
          // acquireTokenSilent は1回しか呼ばれていない
          expect(msalServiceSpy.acquireTokenSilent).toHaveBeenCalledTimes(1);
          done();
        }
      };

      // 1つ目のリクエスト
      service.performSilentRefresh().then((result) => {
        results.push(result);
        checkDone();
      });

      // 2つ目のリクエスト（同時）
      service.performSilentRefresh().then((result) => {
        results.push(result);
        checkDone();
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
