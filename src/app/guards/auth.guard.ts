import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { getAuth } from 'firebase/auth';

export const authGuard: CanActivateFn = async (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const auth = authService.getAuth();

  // Esperar a que la autenticación se resuelva
  return new Promise((resolve) => {
    auth.onAuthStateChanged((user) => {
      if (user) {
        resolve(true);
      } else {
        router.navigate(['/admin/login']);
        resolve(false);
      }
    });
  });
};

