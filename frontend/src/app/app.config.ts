import { ApplicationConfig, provideAppInitializer, inject } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { AuthGuardT } from './core/guards/auth.guard';
import { PermissionGuardT } from './core/guards/permission.guard';
import { MsalService, MSAL_INSTANCE_FACTORY, defaultMsalFactory } from './core/services/msal.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),
    // ガードクラスのDI登録
    AuthGuardT,
    PermissionGuardT,
    // MSALサービス
    {
      provide: MSAL_INSTANCE_FACTORY,
      useValue: defaultMsalFactory
    },
    MsalService,
    // MSAL初期化（アプリ起動時に実行）
    provideAppInitializer(() => {
      const msalService = inject(MsalService);
      return msalService.initialize();
    })
  ]
};
