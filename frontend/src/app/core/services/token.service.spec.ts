import { TokenService } from './token.service';

describe('TokenService', () => {
  let service: TokenService;

  beforeEach(() => {
    service = new TokenService();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('saveToken', () => {
    it('トークンをLocalStorageに保存するべき', () => {
      // Act
      service.saveToken('test-jwt-token');

      // Assert
      expect(localStorage.getItem('business_jwt')).toBe('test-jwt-token');
    });

    it('既存のトークンを上書きするべき', () => {
      // Arrange
      service.saveToken('old-token');

      // Act
      service.saveToken('new-token');

      // Assert
      expect(localStorage.getItem('business_jwt')).toBe('new-token');
    });
  });

  describe('getToken', () => {
    it('保存されたトークンを取得するべき', () => {
      // Arrange
      localStorage.setItem('business_jwt', 'stored-jwt-token');

      // Act
      const result = service.getToken();

      // Assert
      expect(result).toBe('stored-jwt-token');
    });

    it('トークンがない場合はnullを返すべき', () => {
      // Act
      const result = service.getToken();

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('removeToken', () => {
    it('トークンを削除するべき', () => {
      // Arrange
      localStorage.setItem('business_jwt', 'jwt-token');

      // Act
      service.removeToken();

      // Assert
      expect(localStorage.getItem('business_jwt')).toBeNull();
    });

    it('トークンがない場合もエラーにならないべき', () => {
      // Act & Assert
      expect(() => service.removeToken()).not.toThrow();
    });
  });

  describe('isTokenValid', () => {
    it('有効なトークンの場合、trueを返すべき', () => {
      // Arrange: 期限が未来のJWTを作成
      const futureExp = Math.floor(Date.now() / 1000) + 3600; // 1時間後
      const validToken = createMockJwt({ exp: futureExp, sub: 'user1' });
      service.saveToken(validToken);

      // Act
      const result = service.isTokenValid();

      // Assert
      expect(result).toBe(true);
    });

    it('期限切れトークンの場合、falseを返すべき', () => {
      // Arrange: 期限が過去のJWTを作成
      const pastExp = Math.floor(Date.now() / 1000) - 3600; // 1時間前
      const expiredToken = createMockJwt({ exp: pastExp, sub: 'user1' });
      service.saveToken(expiredToken);

      // Act
      const result = service.isTokenValid();

      // Assert
      expect(result).toBe(false);
    });

    it('トークンがない場合、falseを返すべき', () => {
      // Act
      const result = service.isTokenValid();

      // Assert
      expect(result).toBe(false);
    });

    it('不正なJWT形式の場合、falseを返すべき', () => {
      // Arrange
      service.saveToken('invalid-jwt-format');

      // Act
      const result = service.isTokenValid();

      // Assert
      expect(result).toBe(false);
    });

    it('expクレームがない場合、falseを返すべき', () => {
      // Arrange: expなしのJWT
      const tokenWithoutExp = createMockJwt({ sub: 'user1' });
      service.saveToken(tokenWithoutExp);

      // Act
      const result = service.isTokenValid();

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('decodePayload', () => {
    it('JWTペイロードをデコードするべき', () => {
      // Arrange
      const payload = { sub: 'user1', exp: 1234567890, name: 'Test User' };
      const token = createMockJwt(payload);

      // Act
      const result = service.decodePayload(token);

      // Assert
      expect(result.sub).toBe('user1');
      expect(result.exp).toBe(1234567890);
      expect(result.name).toBe('Test User');
    });

    it('不正なJWT形式の場合、エラーをスローするべき', () => {
      // Arrange
      const invalidToken = 'not-a-jwt';

      // Act & Assert
      expect(() => service.decodePayload(invalidToken)).toThrowError('Invalid JWT');
    });

    it('2部分しかないJWTの場合、エラーをスローするべき', () => {
      // Arrange
      const twoPartToken = 'part1.part2';

      // Act & Assert
      expect(() => service.decodePayload(twoPartToken)).toThrowError('Invalid JWT');
    });

    it('4部分あるJWTの場合、エラーをスローするべき', () => {
      // Arrange
      const fourPartToken = 'part1.part2.part3.part4';

      // Act & Assert
      expect(() => service.decodePayload(fourPartToken)).toThrowError('Invalid JWT');
    });
  });

  describe('getPermissions', () => {
    it('ペイロードから権限一覧を取得するべき', () => {
      // Arrange
      const payload = {
        sub: 'user1',
        exp: Math.floor(Date.now() / 1000) + 3600,
        permissions: ['read', 'write', 'delete']
      };
      const token = createMockJwt(payload);
      service.saveToken(token);

      // Act
      const result = service.getPermissions();

      // Assert
      expect(result).toEqual(['read', 'write', 'delete']);
    });

    it('permissionsクレームがない場合、空配列を返すべき', () => {
      // Arrange
      const payload = { sub: 'user1', exp: Math.floor(Date.now() / 1000) + 3600 };
      const token = createMockJwt(payload);
      service.saveToken(token);

      // Act
      const result = service.getPermissions();

      // Assert
      expect(result).toEqual([]);
    });

    it('トークンがない場合、空配列を返すべき', () => {
      // Act
      const result = service.getPermissions();

      // Assert
      expect(result).toEqual([]);
    });

    it('不正なJWTの場合、空配列を返すべき', () => {
      // Arrange
      service.saveToken('invalid-jwt');

      // Act
      const result = service.getPermissions();

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('getRoles', () => {
    it('ペイロードからロール一覧を取得するべき', () => {
      // Arrange
      const payload = {
        sub: 'user1',
        exp: Math.floor(Date.now() / 1000) + 3600,
        roles: ['admin', 'user']
      };
      const token = createMockJwt(payload);
      service.saveToken(token);

      // Act
      const result = service.getRoles();

      // Assert
      expect(result).toEqual(['admin', 'user']);
    });

    it('rolesクレームがない場合、空配列を返すべき', () => {
      // Arrange
      const payload = { sub: 'user1', exp: Math.floor(Date.now() / 1000) + 3600 };
      const token = createMockJwt(payload);
      service.saveToken(token);

      // Act
      const result = service.getRoles();

      // Assert
      expect(result).toEqual([]);
    });

    it('トークンがない場合、空配列を返すべき', () => {
      // Act
      const result = service.getRoles();

      // Assert
      expect(result).toEqual([]);
    });

    it('不正なJWTの場合、空配列を返すべき', () => {
      // Arrange
      service.saveToken('invalid-jwt');

      // Act
      const result = service.getRoles();

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('getUserInfo', () => {
    it('ペイロードからユーザー情報を取得するべき', () => {
      // Arrange
      const payload = {
        sub: 'user-id-123',
        email: 'test@example.com',
        display_name: 'Test User',
        exp: Math.floor(Date.now() / 1000) + 3600
      };
      const token = createMockJwt(payload);
      service.saveToken(token);

      // Act
      const result = service.getUserInfo();

      // Assert
      expect(result).toEqual({
        userId: 'user-id-123',
        email: 'test@example.com',
        displayName: 'Test User'
      });
    });

    it('トークンがない場合、nullを返すべき', () => {
      // Act
      const result = service.getUserInfo();

      // Assert
      expect(result).toBeNull();
    });

    it('不正なJWTの場合、nullを返すべき', () => {
      // Arrange
      service.saveToken('invalid-jwt');

      // Act
      const result = service.getUserInfo();

      // Assert
      expect(result).toBeNull();
    });

    it('subクレームがない場合、userIdはundefinedになるべき', () => {
      // Arrange
      const payload = {
        email: 'test@example.com',
        display_name: 'Test User',
        exp: Math.floor(Date.now() / 1000) + 3600
      };
      const token = createMockJwt(payload);
      service.saveToken(token);

      // Act
      const result = service.getUserInfo();

      // Assert
      expect(result?.userId).toBeUndefined();
    });
  });
});

/**
 * テスト用JWT生成ヘルパー
 * ヘッダー.ペイロード.署名 の3部分構成を作成
 */
function createMockJwt(payload: Record<string, any>): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = btoa(JSON.stringify(header));
  const encodedPayload = btoa(JSON.stringify(payload));
  const signature = 'mock-signature';
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}
