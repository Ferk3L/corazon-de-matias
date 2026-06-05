import { Injectable } from '@angular/core';
import {
  getAuth,
  Auth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  User
} from 'firebase/auth';
import { app } from '../app.config';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private auth: Auth;
  private currentUser: User | null = null;

  constructor() {
    this.auth = getAuth(app);

    if (typeof window !== 'undefined') {
      setPersistence(this.auth, browserLocalPersistence).catch((error) => {
        console.error('Error al configurar persistencia:', error);
      });
    }

    onAuthStateChanged(this.auth, (user) => {
      this.currentUser = user;
    });
  }

  async login(email: string, password: string): Promise<void> {
    try {
      await signInWithEmailAndPassword(this.auth, email, password);
    } catch (error: any) {
      throw new Error(this.getErrorMessage(error.code));
    }
  }

  async logout(): Promise<void> {
    try {
      await signOut(this.auth);
    } catch {
      throw new Error('Error al cerrar sesión');
    }
  }

  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  getAuth(): Auth {
    return this.auth;
  }

  private getErrorMessage(errorCode: string): string {
    switch (errorCode) {
      case 'auth/user-not-found': return 'Usuario no encontrado';
      case 'auth/wrong-password': return 'Contraseña incorrecta';
      case 'auth/invalid-email': return 'Email inválido';
      case 'auth/user-disabled': return 'Usuario deshabilitado';
      case 'auth/too-many-requests': return 'Demasiados intentos. Intenta más tarde';
      case 'auth/invalid-credential': return 'Correo o contraseña incorrectos';
      default: return 'Error al iniciar sesión. Verifica tus credenciales';
    }
  }
}