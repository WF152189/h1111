import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { PermissionGuardT } from './permission.guard';
import { ScreenPermissionService } from '../services/screen-permission.service';
import { PermissionErrorService } from '../services/permission-error.service';

describe('PermissionGuardT', () => {
  let guard: PermissionGuardT;
  let screenPermissionServiceSpy: jasmine.SpyObj<ScreenPermissionService>;
  let permissionErrorServiceSpy: jasmine.SpyObj<PermissionErrorService>;
  let routerSpy: jasmine.SpyObj<Router>;

  const mockRoute = { data: { screenId: 'TEST_SCREEN' } } as unknown as ActivatedRouteSnapshot;
  const mockState = { url: '/dashboard' } as RouterStateSnapshot;

  beforeEach(() => {
    const screenPermSpy = jasmine.createSpyObj('ScreenPermissionService', ['checkScreenPermission']);
    const permErrorSpy = jasmine.createSpyObj('PermissionErrorService', ['setPermissionError']);
    const routerSpyObj = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        PermissionGuardT,
        { provide: ScreenPermissionService, useValue: screenPermSpy },
        { provide: PermissionErrorService, useValue: permErrorSpy },
        { provide: Router, useValue: routerSpyObj }
      ]
    });

    guard = TestBed.inject(PermissionGuardT);
    screenPermissionServiceSpy = TestBed.inject(ScreenPermissionService) as jasmine.SpyObj<ScreenPermissionService>;
    permissionErrorServiceSpy = TestBed.inject(PermissionErrorService) as jasmine.SpyObj<PermissionErrorService>;
    routerSpy = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  describe('canActivate', () => {
    it('画面ID未設定 → true を返す', fakeAsync(() => {
      // Arrange
      const routeWithoutScreenId = { data: {} } as ActivatedRouteSnapshot;
      const resultPromise = guard.canActivate(routeWithoutScreenId, mockState);
      
      // Act
      tick();
      
      // Assert
      return resultPromise.then(result => {
        expect(result).toBe(true);
        expect(screenPermissionServiceSpy.checkScreenPermission).not.toHaveBeenCalled();
      });
    }));

    it('権限あり → true を返す', fakeAsync(() => {
      // Arrange
      screenPermissionServiceSpy.checkScreenPermission.and.returnValue(
        Promise.resolve({ authorized: true })
      );
      
      // Act
      const resultPromise = guard.canActivate(mockRoute, mockState);
      tick();
      
      // Assert
      return resultPromise.then(result => {
        expect(result).toBe(true);
        expect(permissionErrorServiceSpy.setPermissionError).not.toHaveBeenCalled();
        expect(routerSpy.navigate).not.toHaveBeenCalled();
      });
    }));

    it('権限なし → false を返し、エラー情報を保存してリダイレクト', fakeAsync(() => {
      // Arrange
      screenPermissionServiceSpy.checkScreenPermission.and.returnValue(
        Promise.resolve({ authorized: false, reason: 'テスト権限エラー' })
      );
      
      // Act
      const resultPromise = guard.canActivate(mockRoute, mockState);
      tick();
      
      // Assert
      return resultPromise.then(result => {
        expect(result).toBe(false);
        expect(permissionErrorServiceSpy.setPermissionError).toHaveBeenCalledWith({
          screenId: 'TEST_SCREEN',
          reason: 'テスト権限エラー'
        });
        expect(routerSpy.navigate).toHaveBeenCalledWith(['/dashboard'], {
          queryParams: {
            error: 'permission_denied',
            message: 'テスト権限エラー'
          }
        });
      });
    }));

    it('権限なし（理由なし）→ デフォルトメッセージでリダイレクト', fakeAsync(() => {
      // Arrange
      screenPermissionServiceSpy.checkScreenPermission.and.returnValue(
        Promise.resolve({ authorized: false })
      );
      
      // Act
      const resultPromise = guard.canActivate(mockRoute, mockState);
      tick();
      
      // Assert
      return resultPromise.then(result => {
        expect(result).toBe(false);
        expect(permissionErrorServiceSpy.setPermissionError).toHaveBeenCalledWith({
          screenId: 'TEST_SCREEN',
          reason: 'この画面にアクセスする権限がありません。'
        });
      });
    }));

    it('state.url が undefined → /dashboard へリダイレクト', fakeAsync(() => {
      // Arrange
      const stateWithoutUrl = { url: '' } as RouterStateSnapshot;
      screenPermissionServiceSpy.checkScreenPermission.and.returnValue(
        Promise.resolve({ authorized: false, reason: '権限なし' })
      );
      
      // Act
      const resultPromise = guard.canActivate(mockRoute, stateWithoutUrl);
      tick();
      
      // Assert
      return resultPromise.then(result => {
        expect(result).toBe(false);
        expect(routerSpy.navigate).toHaveBeenCalledWith(['/dashboard'], jasmine.any(Object));
      });
    }));
  });

  describe('canActivateChild', () => {
    const mockChildRoute = { data: { screenId: 'CHILD_SCREEN' } } as unknown as ActivatedRouteSnapshot;

    it('子ルート: 権限あり → true を返す', fakeAsync(() => {
      // Arrange
      screenPermissionServiceSpy.checkScreenPermission.and.returnValue(
        Promise.resolve({ authorized: true })
      );
      
      // Act
      const resultPromise = guard.canActivateChild(mockChildRoute, mockState);
      tick();
      
      // Assert
      return resultPromise.then(result => {
        expect(result).toBe(true);
        expect(screenPermissionServiceSpy.checkScreenPermission).toHaveBeenCalledWith('CHILD_SCREEN');
      });
    }));

    it('子ルート: 権限なし → false を返し、リダイレクト', fakeAsync(() => {
      // Arrange
      screenPermissionServiceSpy.checkScreenPermission.and.returnValue(
        Promise.resolve({ authorized: false, reason: '子ルート権限エラー' })
      );
      
      // Act
      const resultPromise = guard.canActivateChild(mockChildRoute, mockState);
      tick();
      
      // Assert
      return resultPromise.then(result => {
        expect(result).toBe(false);
        expect(permissionErrorServiceSpy.setPermissionError).toHaveBeenCalledWith({
          screenId: 'CHILD_SCREEN',
          reason: '子ルート権限エラー'
        });
      });
    }));
  });
});
