import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  let authReq = req;

  // Attach token if request is destined for backend API and token is present
  if (token && req.url.startsWith(environment.apiBaseUrl)) {
    authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // 401 Unauthorized indicates invalid or expired session
      // Avoid redirecting if already on authentication endpoints
      if (error.status === 401 && !req.url.includes('/auth/')) {
        authService.handleUnauthorized();
      }
      return throwError(() => error);
    })
  );
};
