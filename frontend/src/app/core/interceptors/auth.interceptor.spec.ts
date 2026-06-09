import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { authInterceptor } from './auth.interceptor';
import { TokenService } from '../services/token.service';

describe('authInterceptor', () => {
  let httpMock: HttpTestingController;
  let httpClient: HttpClient;
  let tokenServiceSpy: jasmine.SpyObj<TokenService>;

  const apiUrl = '/api/test';
  const authUrl = '/auth/validate';
  const stubUrl = '/stub/login';
  const businessDataUrl = '/business/data';
  const settingsUrl = '/settings/user';

  beforeEach(() => {
    // モックサービス
    tokenServiceSpy = jasmine.createSpyObj('TokenService', ['getToken']);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: TokenService, useValue: tokenServiceSpy }
      ]
    });

    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('認証系APIのスキップ', () => {
    it('/auth/ を含むURLはBearerヘッダーを付与しない', () => {
      // Arrange
      tokenServiceSpy.getToken.and.returnValue('some-token');

      // Act
      httpClient.get(authUrl).subscribe((response) => {
        expect(response).toBeTruthy();
      });

      // Assert
      const req = httpMock.expectOne(authUrl);
      expect(req.request.headers.has('Authorization')).toBeFalse();
      req.flush({ success: true });
    });

    it('/stub/ を含むURLはBearerヘッダーを付与しない', () => {
      // Arrange
      tokenServiceSpy.getToken.and.returnValue('some-token');

      // Act
      httpClient.get(stubUrl).subscribe((response) => {
        expect(response).toBeTruthy();
      });

      // Assert
      const req = httpMock.expectOne(stubUrl);
      expect(req.request.headers.has('Authorization')).toBeFalse();
      req.flush({ success: true });
    });

    it('/auth/verify はBearerヘッダーを付与しない', () => {
      // Arrange
      tokenServiceSpy.getToken.and.returnValue('some-token');

      // Act
      httpClient.post('/auth/verify', {}).subscribe((response) => {
        expect(response).toBeTruthy();
      });

      // Assert
      const req = httpMock.expectOne('/auth/verify');
      expect(req.request.headers.has('Authorization')).toBeFalse();
      req.flush({ success: true });
    });

    it('/auth/logout はBearerヘッダーを付与しない', () => {
      // Arrange
      tokenServiceSpy.getToken.and.returnValue('some-token');

      // Act
      httpClient.post('/auth/logout', {}).subscribe((response) => {
        expect(response).toBeTruthy();
      });

      // Assert
      const req = httpMock.expectOne('/auth/logout');
      expect(req.request.headers.has('Authorization')).toBeFalse();
      req.flush({ success: true });
    });
  });

  describe('業務APIへのBearerトークン付与', () => {
    it('トークンが存在する場合、業務APIにBearerヘッダーを付与する', () => {
      // Arrange
      const token = 'valid-jwt-token';
      tokenServiceSpy.getToken.and.returnValue(token);

      // Act
      httpClient.get(apiUrl).subscribe((response) => {
        expect(response).toBeTruthy();
      });

      // Assert
      const req = httpMock.expectOne(apiUrl);
      expect(req.request.headers.has('Authorization')).toBeTrue();
      expect(req.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
      req.flush({ data: 'success' });
    });

    it('/business/data にBearerヘッダーを付与する', () => {
      // Arrange
      const token = 'business-token';
      tokenServiceSpy.getToken.and.returnValue(token);

      // Act
      httpClient.get(businessDataUrl).subscribe((response) => {
        expect(response).toBeTruthy();
      });

      // Assert
      const req = httpMock.expectOne(businessDataUrl);
      expect(req.request.headers.has('Authorization')).toBeTrue();
      expect(req.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
      req.flush({ data: 'business-data' });
    });

    it('/settings/user にBearerヘッダーを付与する', () => {
      // Arrange
      const token = 'settings-token';
      tokenServiceSpy.getToken.and.returnValue(token);

      // Act
      httpClient.get(settingsUrl).subscribe((response) => {
        expect(response).toBeTruthy();
      });

      // Assert
      const req = httpMock.expectOne(settingsUrl);
      expect(req.request.headers.has('Authorization')).toBeTrue();
      expect(req.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
      req.flush({ data: 'settings' });
    });

    it('POSTリクエストにもBearerヘッダーを付与する', () => {
      // Arrange
      const token = 'post-token';
      tokenServiceSpy.getToken.and.returnValue(token);

      // Act
      httpClient.post(apiUrl, { name: 'test' }).subscribe((response) => {
        expect(response).toBeTruthy();
      });

      // Assert
      const req = httpMock.expectOne(apiUrl);
      expect(req.request.headers.has('Authorization')).toBeTrue();
      expect(req.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
      expect(req.request.body).toEqual({ name: 'test' });
      req.flush({ success: true });
    });

    it('PUTリクエストにもBearerヘッダーを付与する', () => {
      // Arrange
      const token = 'put-token';
      tokenServiceSpy.getToken.and.returnValue(token);

      // Act
      httpClient.put(apiUrl, { id: 1, name: 'updated' }).subscribe((response) => {
        expect(response).toBeTruthy();
      });

      // Assert
      const req = httpMock.expectOne(apiUrl);
      expect(req.request.headers.has('Authorization')).toBeTrue();
      expect(req.request.method).toBe('PUT');
      expect(req.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
      req.flush({ success: true });
    });

    it('DELETEリクエストにもBearerヘッダーを付与する', () => {
      // Arrange
      const token = 'delete-token';
      tokenServiceSpy.getToken.and.returnValue(token);

      // Act
      httpClient.delete(apiUrl).subscribe((response) => {
        expect(response).toBeTruthy();
      });

      // Assert
      const req = httpMock.expectOne(apiUrl);
      expect(req.request.headers.has('Authorization')).toBeTrue();
      expect(req.request.method).toBe('DELETE');
      expect(req.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
      req.flush({ success: true });
    });
  });

  describe('トークンなしの場合', () => {
    it('トークンがnullの場合、Bearerヘッダーを付与しない', () => {
      // Arrange
      tokenServiceSpy.getToken.and.returnValue(null);

      // Act
      httpClient.get(apiUrl).subscribe((response) => {
        expect(response).toBeTruthy();
      });

      // Assert
      const req = httpMock.expectOne(apiUrl);
      expect(req.request.headers.has('Authorization')).toBeFalse();
      req.flush({ data: 'no-auth' });
    });

    it('トークンがundefinedの場合、Bearerヘッダーを付与しない', () => {
      // Arrange
      tokenServiceSpy.getToken.and.returnValue(undefined as any);

      // Act
      httpClient.get(apiUrl).subscribe((response) => {
        expect(response).toBeTruthy();
      });

      // Assert
      const req = httpMock.expectOne(apiUrl);
      expect(req.request.headers.has('Authorization')).toBeFalse();
      req.flush({ data: 'no-auth' });
    });

    it('トークンが空文字の場合、Bearerヘッダーを付与しない', () => {
      // Arrange
      tokenServiceSpy.getToken.and.returnValue('');

      // Act
      httpClient.get(apiUrl).subscribe((response) => {
        expect(response).toBeTruthy();
      });

      // Assert
      const req = httpMock.expectOne(apiUrl);
      expect(req.request.headers.has('Authorization')).toBeFalse();
      req.flush({ data: 'empty-token' });
    });
  });

  describe('URL判定の境界値テスト', () => {
    it('/api/auth は業務APIとして扱う（/auth/ を含まない）', () => {
      // Arrange
      const token = 'api-auth-token';
      tokenServiceSpy.getToken.and.returnValue(token);

      // Act
      httpClient.get('/api/auth').subscribe((response) => {
        expect(response).toBeTruthy();
      });

      // Assert
      const req = httpMock.expectOne('/api/auth');
      expect(req.request.headers.has('Authorization')).toBeTrue();
      req.flush({ data: 'api-auth' });
    });

    it('/api/stub は業務APIとして扱う（/stub/ を含まない）', () => {
      // Arrange
      const token = 'api-stub-token';
      tokenServiceSpy.getToken.and.returnValue(token);

      // Act
      httpClient.get('/api/stub').subscribe((response) => {
        expect(response).toBeTruthy();
      });

      // Assert
      const req = httpMock.expectOne('/api/stub');
      expect(req.request.headers.has('Authorization')).toBeTrue();
      req.flush({ data: 'api-stub' });
    });

    it('/authorization は業務APIとして扱う（/auth/ を含まない）', () => {
      // Arrange
      const token = 'authorization-token';
      tokenServiceSpy.getToken.and.returnValue(token);

      // Act
      httpClient.get('/authorization').subscribe((response) => {
        expect(response).toBeTruthy();
      });

      // Assert
      const req = httpMock.expectOne('/authorization');
      expect(req.request.headers.has('Authorization')).toBeTrue();
      req.flush({ data: 'authorization' });
    });

    it('クエリパラメータ付きURLでも正しく判定する', () => {
      // Arrange
      const token = 'query-token';
      tokenServiceSpy.getToken.and.returnValue(token);

      // Act
      httpClient.get(`${apiUrl}?page=1&size=10`).subscribe((response) => {
        expect(response).toBeTruthy();
      });

      // Assert
      const req = httpMock.expectOne(`${apiUrl}?page=1&size=10`);
      expect(req.request.headers.has('Authorization')).toBeTrue();
      req.flush({ data: 'with-query' });
    });
  });

  describe('トークンサービスの呼び出し', () => {
    it('認証系APIではgetTokenを呼び出さない', () => {
      // Act
      httpClient.get(authUrl).subscribe();
      const req = httpMock.expectOne(authUrl);
      req.flush({ success: true });

      // Assert
      expect(tokenServiceSpy.getToken).not.toHaveBeenCalled();
    });

    it('業務APIではgetTokenを1回呼び出す', () => {
      // Arrange
      tokenServiceSpy.getToken.and.returnValue('token');

      // Act
      httpClient.get(apiUrl).subscribe();
      const req = httpMock.expectOne(apiUrl);
      req.flush({ success: true });

      // Assert
      expect(tokenServiceSpy.getToken).toHaveBeenCalledTimes(1);
    });

    it('複数の業務APIリクエストでそれぞれgetTokenを呼び出す', () => {
      // Arrange
      tokenServiceSpy.getToken.and.returnValue('token');

      // Act
      httpClient.get(apiUrl).subscribe();
      httpMock.expectOne(apiUrl).flush({});

      httpClient.get(businessDataUrl).subscribe();
      httpMock.expectOne(businessDataUrl).flush({});

      // Assert
      expect(tokenServiceSpy.getToken).toHaveBeenCalledTimes(2);
    });
  });
});
