import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { authAndPermissionGuard, authAndPermissionChildGuard } from './auth-and-permission.guard';
import { AuthGuardT } from './auth.guard';
import { PermissionGuardT } from './permission.guard';

describe('authAndPermissionGuard', () => {
  let authGuardSpy: jasmine.SpyObj<AuthGuardT>;
  let permissionGuardSpy: jasmine.SpyObj<PermissionGuardT>;

  const mockRoute = {} as ActivatedRouteSnapshot;
  const mockState = { url: '/dashboard' } as RouterStateSnapshot;

  beforeEach(() => {
    const authSpy = jasmine.createSpyObj('AuthGuardT', ['canActivate']);
    const permSpy = jasmine.createSpyObj('PermissionGuardT', ['canActivate', 'canActivateChild']);

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthGuardT, useValue: authSpy },
        { provide: PermissionGuardT, useValue: permSpy }
      ]
    });

    authGuardSpy = TestBed.inject(AuthGuardT) as jasmine.SpyObj<AuthGuardT>;
    permissionGuardSpy = TestBed.inject(PermissionGuardT) as jasmine.SpyObj<PermissionGuardT>;
  });

  describe('authAndPermissionGuard', () => {
    it('AuthGuard=true, PermissionGuard=true → true を返す', async () => {
      // Arrange
      authGuardSpy.canActivate.and.returnValue(Promise.resolve(true));
      permissionGuardSpy.canActivate.and.returnValue(Promise.resolve(true));

      // Act
      const result = await TestBed.runInInjectionContext(() => 
        authAndPermissionGuard(mockRoute, mockState)
      );

      // Assert
      expect(result).toBe(true);
      expect(authGuardSpy.canActivate).toHaveBeenCalled();
      expect(permissionGuardSpy.canActivate).toHaveBeenCalled();
    });

    it('AuthGuard=true, PermissionGuard=false → false を返す', async () => {
      // Arrange
      authGuardSpy.canActivate.and.returnValue(Promise.resolve(true));
      permissionGuardSpy.canActivate.and.returnValue(Promise.resolve(false));

      // Act
      const result = await TestBed.runInInjectionContext(() => 
        authAndPermissionGuard(mockRoute, mockState)
      );

      // Assert
      expect(result).toBe(false);
      expect(permissionGuardSpy.canActivate).toHaveBeenCalled();
    });

    it('AuthGuard=false → PermissionGuard は実行されない', async () => {
      // Arrange
      authGuardSpy.canActivate.and.returnValue(Promise.resolve(false));

      // Act
      const result = await TestBed.runInInjectionContext(() => 
        authAndPermissionGuard(mockRoute, mockState)
      );

      // Assert
      expect(result).toBe(false);
      expect(permissionGuardSpy.canActivate).not.toHaveBeenCalled();
    });

    it('AuthGuard=UrlTree → UrlTree を返し、PermissionGuard は実行されない', async () => {
      // Arrange
      const mockUrlTree = {} as UrlTree;
      authGuardSpy.canActivate.and.returnValue(Promise.resolve(mockUrlTree));

      // Act
      const result = await TestBed.runInInjectionContext(() => 
        authAndPermissionGuard(mockRoute, mockState)
      );

      // Assert
      expect(result).toEqual(mockUrlTree);
      expect(permissionGuardSpy.canActivate).not.toHaveBeenCalled();
    });
  });

  describe('authAndPermissionChildGuard', () => {
    const mockChildRoute = {} as ActivatedRouteSnapshot;

    it('子ルート: AuthGuard=true, PermissionGuard=true → true を返す', async () => {
      // Arrange
      authGuardSpy.canActivate.and.returnValue(Promise.resolve(true));
      permissionGuardSpy.canActivateChild.and.returnValue(Promise.resolve(true));

      // Act
      const result = await TestBed.runInInjectionContext(() => 
        authAndPermissionChildGuard(mockChildRoute, mockState)
      );

      // Assert
      expect(result).toBe(true);
      expect(authGuardSpy.canActivate).toHaveBeenCalled();
      expect(permissionGuardSpy.canActivateChild).toHaveBeenCalled();
    });

    it('子ルート: AuthGuard=true, PermissionGuard=false → false を返す', async () => {
      // Arrange
      authGuardSpy.canActivate.and.returnValue(Promise.resolve(true));
      permissionGuardSpy.canActivateChild.and.returnValue(Promise.resolve(false));

      // Act
      const result = await TestBed.runInInjectionContext(() => 
        authAndPermissionChildGuard(mockChildRoute, mockState)
      );

      // Assert
      expect(result).toBe(false);
      expect(permissionGuardSpy.canActivateChild).toHaveBeenCalled();
    });

    it('子ルート: AuthGuard=false → PermissionGuard は実行されない', async () => {
      // Arrange
      authGuardSpy.canActivate.and.returnValue(Promise.resolve(false));

      // Act
      const result = await TestBed.runInInjectionContext(() => 
        authAndPermissionChildGuard(mockChildRoute, mockState)
      );

      // Assert
      expect(result).toBe(false);
      expect(permissionGuardSpy.canActivateChild).not.toHaveBeenCalled();
    });

    it('子ルート: AuthGuard=UrlTree → UrlTree を返し、PermissionGuard は実行されない', async () => {
      // Arrange
      const mockUrlTree = {} as UrlTree;
      authGuardSpy.canActivate.and.returnValue(Promise.resolve(mockUrlTree));

      // Act
      const result = await TestBed.runInInjectionContext(() => 
        authAndPermissionChildGuard(mockChildRoute, mockState)
      );

      // Assert
      expect(result).toEqual(mockUrlTree);
      expect(permissionGuardSpy.canActivateChild).not.toHaveBeenCalled();
    });
  });
});
