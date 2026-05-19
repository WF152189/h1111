import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError, from } from 'rxjs';
import { TokenService } from '../services/token.service';
import { RefreshService } from '../services/refresh.service';

let isRefreshing = false;

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const tokenService = inject(TokenService);
  const refreshService = inject(RefreshService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        // 認証系APIの401はそのままエラーとして返す
      } else if (error.status === 403) {
        router.navigate(['/error/forbidden']);
      }

      return throwError(() => error);
    })
  );
};
