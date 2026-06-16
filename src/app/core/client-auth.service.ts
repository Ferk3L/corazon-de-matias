import { Injectable } from '@angular/core';
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, onAuthStateChanged, updateProfile, sendEmailVerification,
  GoogleAuthProvider, signInWithPopup, User, Auth
} from 'firebase/auth';
import { app } from '../app.config';
import { CashbackService } from './cashback.service';

@Injectable({ providedIn: 'root' })
export class ClientAuthService {
  private auth: Auth;
  private currentClient: User | null = null;

  constructor(private cashbackService: CashbackService) {
    this.auth = getAuth(app);
    onAuthStateChanged(this.auth, (user) => {
      this.currentClient = user;
    });
  }

  async getDeviceId(): Promise<string> {
    const key = 'device_id_gomitas';
    let id = localStorage.getItem(key);
    if (!id) {
      id = 'device_' + Math.random().toString(36).substring(2) + Date.now();
      localStorage.setItem(key, id);
    }
    return id;
  }

  // ── Login con Google ──
  async loginConGoogle(desdeQR: boolean = false): Promise<void> {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(this.auth, provider);
      const user = result.user;

      const clienteExistente = await this.cashbackService.getCliente(user.uid);
      if (!clienteExistente) {
        const deviceId = await this.getDeviceId();
        await this.cashbackService.crearCliente(user.uid, {
          nombre: user.displayName || user.email?.split('@')[0] || 'Cliente',
          email: user.email || '',
          deviceId
        });
        const yaUsoBono = await this.cashbackService.dispositivoYaUsoBono(deviceId);
        if (!yaUsoBono) await this.cashbackService.aplicarBonoBienvenida(user.uid);
      }
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') return;
      throw new Error(this.traducirError(error.code));
    }
  }

  // ── Verificar correo — sin fetchSignInMethodsForEmail (deprecado) ──
  // Simplemente intenta login con password vacío para detectar si existe la cuenta
  async verificarCorreo(email: string): Promise<'existe' | 'nuevo'> {
    try {
      // Intentamos un login con contraseña vacía — siempre fallará
      // pero el código de error nos dice si la cuenta existe
      await signInWithEmailAndPassword(this.auth, email, '___DUMMY___');
      return 'existe'; // nunca llega aquí
    } catch (error: any) {
      const code = error.code;
      // Estos errores significan que la cuenta SÍ existe
      if (
        code === 'auth/wrong-password' ||
        code === 'auth/invalid-credential' ||
        code === 'auth/too-many-requests'
      ) {
        return 'existe';
      }
      // auth/user-not-found o auth/invalid-email = cuenta nueva
      return 'nuevo';
    }
  }

  // ── Registrar con email/password ──
  async registrar(
    nombre: string, email: string, password: string,
    telefono: string, desdeQR: boolean = false
  ): Promise<void> {
    try {
      const credential = await createUserWithEmailAndPassword(this.auth, email, password);
      const user = credential.user;
      await updateProfile(user, { displayName: nombre });
      await sendEmailVerification(user);

      const deviceId = await this.getDeviceId();
      await this.cashbackService.crearCliente(user.uid, { nombre, email, telefono, deviceId });

      const yaUsoBono = await this.cashbackService.dispositivoYaUsoBono(deviceId);
      if (!yaUsoBono) await this.cashbackService.aplicarBonoBienvenida(user.uid);

    } catch (error: any) {
      throw new Error(this.traducirError(error.code));
    }
  }

  // ── Login con email/password ──
  async login(email: string, password: string): Promise<void> {
    try {
      await signInWithEmailAndPassword(this.auth, email, password);
    } catch (error: any) {
      if (error.message === 'EMAIL_NOT_VERIFIED') throw error;
      throw new Error(this.traducirError(error.code));
    }
  }

  // ── Login sin verificar email (para reenviar código) ──
  async loginSinVerificar(email: string, password: string): Promise<void> {
    await signInWithEmailAndPassword(this.auth, email, password);
  }

  // ── Reenviar email de verificación ──
  async reenviarVerificacion(): Promise<void> {
    const user = this.auth.currentUser;
    if (user && !user.emailVerified) await sendEmailVerification(user);
  }

  async logout(): Promise<void> {
    try { await signOut(this.auth); }
    catch { throw new Error('Error al cerrar sesión'); }
  }

  getCurrentClient(): User | null { return this.currentClient; }
  isLoggedIn(): boolean { return this.currentClient !== null; }

  waitForAuthState(): Promise<User | null> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(null), 5000);
      const unsub = onAuthStateChanged(this.auth, (user) => {
        clearTimeout(timeout); unsub(); resolve(user);
      });
    });
  }

  private traducirError(code: string): string {
    switch (code) {
      case 'auth/email-already-in-use': return 'Este correo ya está registrado';
      case 'auth/invalid-email': return 'El correo no es válido';
      case 'auth/weak-password': return 'La contraseña debe tener al menos 6 caracteres';
      case 'auth/user-not-found': return 'No existe una cuenta con ese correo';
      case 'auth/wrong-password': return 'Contraseña incorrecta';
      case 'auth/invalid-credential': return 'Correo o contraseña incorrectos';
      case 'auth/too-many-requests': return 'Demasiados intentos. Espera unos minutos';
      case 'auth/network-request-failed': return 'Error de conexión. Verifica tu internet';
      case 'auth/popup-blocked': return 'El navegador bloqueó la ventana. Permite popups e intenta de nuevo';
      case 'auth/account-exists-with-different-credential': return 'Este correo ya está registrado con otro método';
      default: return 'Ocurrió un error. Intenta de nuevo';
    }
  }
}