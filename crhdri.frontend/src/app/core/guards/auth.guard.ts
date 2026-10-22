import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * General authentication guard (checks if user is signed in)
 */
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/login'], {
    queryParams: { returnUrl: state.url }
  });
};

/**
 * Student-only route guard
 * Redirects unauthenticated users to /login
 * Redirects faculty users to /faculty/dashboard
 */
export const studentGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return router.createUrlTree(['/login'], {
      queryParams: { returnUrl: state.url }
    });
  }

  if (authService.isFaculty()) {
    return router.createUrlTree(['/faculty/dashboard']);
  }

  return true;
};

/**
 * Faculty-only route guard
 * Redirects unauthenticated users to /login
 * Redirects student users to /dashboard
 */
export const facultyGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return router.createUrlTree(['/login'], {
      queryParams: { returnUrl: state.url }
    });
  }

  if (authService.isStudent()) {
    return router.createUrlTree(['/dashboard']);
  }

  if (authService.isFaculty()) {
    return true;
  }

  return router.createUrlTree(['/login']);
};

/**
 * Login page guard
 * Redirects authenticated users to their corresponding dashboard
 */
export const loginGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    if (authService.isFaculty()) {
      return router.createUrlTree(['/faculty/dashboard']);
    }
    return router.createUrlTree(['/dashboard']);
  }

  return true;
};
