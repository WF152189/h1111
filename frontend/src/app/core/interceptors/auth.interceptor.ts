import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { TokenService } from '../services/token.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenService = inject(TokenService);

  // 認証系・スタブ系APIにはBearerヘッダーを付与しない
  const skipUrls = ['/auth/', '/stub/'];
  const shouldSkip = skipUrls.some(url => req.url.includes(url));

  if (shouldSkip) {
    return next(req);
  }

  const token = tokenService.getToken();
  if (token) {
    const authReq = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
    return next(authReq);
  }

  return next(req);
};
