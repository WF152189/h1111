import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { LoginComponent } from './login.component';
import { AuthService } from '../core/services/auth.service';
import { TokenRefreshService } from '../core/services/token-refresh.service';
import { TokenService } from '../core/services/token.service';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let tokenServiceSpy: jasmine.SpyObj<TokenService>;
  let tokenRefreshServiceSpy: jasmine.SpyObj<TokenRefreshService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let queryParamsSubject: Subject<any>;

  beforeEach(() => {
    const authSpy = jasmine.createSpyObj<AuthService>('AuthService', ['login']);
    const tokenSpy = jasmine.createSpyObj<TokenService>('TokenService', ['isTokenValid']);
    const tokenRefreshSpy = jasmine.createSpyObj<TokenRefreshService>('TokenRefreshService', ['performSilentRefresh']);
    const routerSpyObj = jasmine.createSpyObj<Router>('Router', ['navigate']);
    queryParamsSubject = new Subject<any>();

    TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        { provide: AuthService, useValue: authSpy },
        { provide: TokenService, useValue: tokenSpy },
        { provide: TokenRefreshService, useValue: tokenRefreshSpy },
        { provide: Router, useValue: routerSpyObj },
        {
          provide: ActivatedRoute,
          useValue: { queryParams: queryParamsSubject }
        }
      ]
    });

    const fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    authServiceSpy = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    tokenServiceSpy = TestBed.inject(TokenService) as jasmine.SpyObj<TokenService>;
    tokenRefreshServiceSpy = TestBed.inject(TokenRefreshService) as jasmine.SpyObj<TokenRefreshService>;
    routerSpy = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  describe('ngOnInit', () => {
    it('JWT有効時はダッシュボードへ遷移し、サイレント更新とqueryParams購読を行わない', () => {
      tokenServiceSpy.isTokenValid.and.returnValue(true);
      spyOn(queryParamsSubject, 'subscribe').and.callThrough();

      component.ngOnInit();

      expect(routerSpy.navigate).toHaveBeenCalledWith(['/dashboard']);
      expect(tokenRefreshServiceSpy.performSilentRefresh).not.toHaveBeenCalled();
      expect(queryParamsSubject.subscribe).not.toHaveBeenCalled();
    });

    it('JWT無効時はサイレント更新を開始し、完了までは遷移しない', () => {
      tokenServiceSpy.isTokenValid.and.returnValue(false);
      tokenRefreshServiceSpy.performSilentRefresh.and.returnValue(new Promise(() => {}));

      component.ngOnInit();

      expect(tokenRefreshServiceSpy.performSilentRefresh).toHaveBeenCalled();
      expect(component.isRefreshing).toBeTrue();
      expect(routerSpy.navigate).not.toHaveBeenCalled();
      expect(authServiceSpy.login).not.toHaveBeenCalled();
    });

    it('queryParamsからセッション期限切れメッセージを取得する', fakeAsync(() => {
      tokenServiceSpy.isTokenValid.and.returnValue(false);
      tokenRefreshServiceSpy.performSilentRefresh.and.returnValue(new Promise(() => {}));

      component.ngOnInit();
      queryParamsSubject.next({
        reason: 'session_expired',
        message: 'session expired'
      });
      tick();

      expect(component.sessionExpiredMessage).toBe('session expired');
    }));

    it('queryParamsのmessageがない場合はデフォルトの期限切れメッセージを設定する', fakeAsync(() => {
      tokenServiceSpy.isTokenValid.and.returnValue(false);
      tokenRefreshServiceSpy.performSilentRefresh.and.returnValue(new Promise(() => {}));

      component.ngOnInit();
      queryParamsSubject.next({ reason: 'session_expired' });
      tick();

      expect(component.sessionExpiredMessage).toBeTruthy();
    }));

    it('session_expired以外のreasonでは期限切れメッセージを設定しない', fakeAsync(() => {
      tokenServiceSpy.isTokenValid.and.returnValue(false);
      tokenRefreshServiceSpy.performSilentRefresh.and.returnValue(new Promise(() => {}));

      component.ngOnInit();
      queryParamsSubject.next({ reason: 'other', message: 'ignored' });
      tick();

      expect(component.sessionExpiredMessage).toBeNull();
    }));
  });

  describe('trySilentRefresh', () => {
    it('サイレント更新成功時はダッシュボードへ遷移する', fakeAsync(() => {
      tokenServiceSpy.isTokenValid.and.returnValue(false);
      tokenRefreshServiceSpy.performSilentRefresh.and.returnValue(Promise.resolve('new-token'));

      component.ngOnInit();
      tick();

      expect(routerSpy.navigate).toHaveBeenCalledWith(['/dashboard']);
      expect(authServiceSpy.login).not.toHaveBeenCalled();
      expect(component.isRefreshing).toBeFalse();
    }));

    it('サイレント更新がnullを返した場合は自動ログインする', fakeAsync(() => {
      tokenServiceSpy.isTokenValid.and.returnValue(false);
      tokenRefreshServiceSpy.performSilentRefresh.and.returnValue(Promise.resolve(null));

      component.ngOnInit();
      tick();

      expect(authServiceSpy.login).toHaveBeenCalled();
      expect(routerSpy.navigate).not.toHaveBeenCalled();
      expect(component.isRefreshing).toBeFalse();
    }));

    it('サイレント更新が例外を投げた場合は自動ログインする', fakeAsync(() => {
      tokenServiceSpy.isTokenValid.and.returnValue(false);
      tokenRefreshServiceSpy.performSilentRefresh.and.rejectWith(new Error('refresh failed'));

      component.ngOnInit();
      tick();

      expect(authServiceSpy.login).toHaveBeenCalled();
      expect(routerSpy.navigate).not.toHaveBeenCalled();
      expect(component.isRefreshing).toBeFalse();
    }));
  });

  describe('onLogin', () => {
    it('更新中でない場合はloginを呼び出す', () => {
      component.isRefreshing = false;

      component.onLogin();

      expect(authServiceSpy.login).toHaveBeenCalled();
    });

    it('更新中の場合はloginを呼び出さない', () => {
      component.isRefreshing = true;

      component.onLogin();

      expect(authServiceSpy.login).not.toHaveBeenCalled();
    });
  });
});
