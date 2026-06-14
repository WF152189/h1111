import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { CallbackComponent } from './callback.component';
import { AuthResult, AuthService } from '../core/services/auth.service';

describe('CallbackComponent', () => {
  let component: CallbackComponent;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let queryParamsSubject: Subject<any>;

  beforeEach(() => {
    const authSpy = jasmine.createSpyObj<AuthService>('AuthService', ['handleCallback']);
    const routerSpyObj = jasmine.createSpyObj<Router>('Router', ['navigate']);
    queryParamsSubject = new Subject<any>();

    TestBed.configureTestingModule({
      imports: [CallbackComponent],
      providers: [
        { provide: AuthService, useValue: authSpy },
        { provide: Router, useValue: routerSpyObj },
        {
          provide: ActivatedRoute,
          useValue: { queryParams: queryParamsSubject.asObservable() }
        }
      ]
    });

    const fixture = TestBed.createComponent(CallbackComponent);
    component = fixture.componentInstance;
    authServiceSpy = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    routerSpy = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  describe('ngOnInit', () => {
    it('handleCallbackを呼び出し、成功時はダッシュボードへ遷移する', fakeAsync(() => {
      authServiceSpy.handleCallback.and.returnValue(Promise.resolve({ success: true }));

      component.ngOnInit();
      tick();

      expect(authServiceSpy.handleCallback).toHaveBeenCalled();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/dashboard']);
    }));
  });

  describe('handleCallbackAsync', () => {
    it('ENTRA_TOKEN_INVALIDの場合はエラー理由を表示し、遷移しない', fakeAsync(() => {
      const authResult: AuthResult = {
        success: false,
        errorCode: 'ENTRA_TOKEN_INVALID',
        errorMessage: 'token validation failed'
      };
      authServiceSpy.handleCallback.and.returnValue(Promise.resolve(authResult));

      component.ngOnInit();
      tick();

      expect(component.error).toBeTruthy();
      expect(component.error).not.toBe('token validation failed');
      expect(component.errorReason).toBe('ENTRA_TOKEN_INVALID');
      expect(routerSpy.navigate).not.toHaveBeenCalled();
    }));

    it('SERVER_ERRORの場合はサーバーエラー用メッセージを表示する', fakeAsync(() => {
      authServiceSpy.handleCallback.and.returnValue(Promise.resolve({
        success: false,
        errorCode: 'SERVER_ERROR',
        errorMessage: 'Internal error'
      }));

      component.ngOnInit();
      tick();

      expect(component.error).toBeTruthy();
      expect(component.error).not.toBe('Internal error');
      expect(component.errorReason).toBe('SERVER_ERROR');
    }));

    it('UNKNOWNの場合はfallbackMessageを表示する', fakeAsync(() => {
      authServiceSpy.handleCallback.and.returnValue(Promise.resolve({
        success: false,
        errorCode: 'UNKNOWN',
        errorMessage: 'custom error message'
      }));

      component.ngOnInit();
      tick();

      expect(component.error).toBe('custom error message');
      expect(component.errorReason).toBe('UNKNOWN');
    }));

    it('errorCodeがない場合はsessionStorageのauth_error_reasonをerrorReasonに使う', fakeAsync(() => {
      sessionStorage.setItem('auth_error_reason', 'interaction_required');
      authServiceSpy.handleCallback.and.returnValue(Promise.resolve({
        success: false,
        errorMessage: 'fallback message'
      }));

      component.ngOnInit();
      tick();

      expect(component.errorReason).toBe('interaction_required');
      expect(component.error).toBe('fallback message');
      expect(routerSpy.navigate).not.toHaveBeenCalled();
    }));

    it('handleCallbackが例外を投げた場合は汎用エラーを表示する', fakeAsync(() => {
      authServiceSpy.handleCallback.and.rejectWith(new Error('unexpected error'));

      component.ngOnInit();
      tick();

      expect(component.error).toBeTruthy();
      expect(routerSpy.navigate).not.toHaveBeenCalled();
    }));
  });

  describe('getErrorMessage', () => {
    it('既知のエラーコードではfallbackMessageより専用メッセージを優先する', () => {
      const codes = [
        'ENTRA_TOKEN_INVALID',
        'ENTRA_JWT_EXPIRED',
        'USER_NOT_FOUND',
        'INTERNAL_AUTH_FAILED',
        'SERVER_ERROR'
      ];

      for (const code of codes) {
        const message = (component as any).getErrorMessage(code, 'fallback');
        expect(message).toBeTruthy();
        expect(message).not.toBe('fallback');
      }
    });

    it('未知のエラーコードではfallbackMessageを返す', () => {
      const message = (component as any).getErrorMessage('UNKNOWN_CODE', 'custom message');

      expect(message).toBe('custom message');
    });

    it('未知のエラーコードかつfallbackMessageなしではデフォルトメッセージを返す', () => {
      const message = (component as any).getErrorMessage('UNKNOWN_CODE');

      expect(message).toBeTruthy();
    });
  });

  describe('goToLogin', () => {
    it('/loginへ遷移する', () => {
      component.goToLogin();

      expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
    });
  });
});
