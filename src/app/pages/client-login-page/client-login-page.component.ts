import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { ClientAuthService } from '../../core/client-auth.service';

@Component({
  selector: 'app-client-login-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './client-login-page.component.html',
  styleUrl: './client-login-page.component.css'
})
export class ClientLoginPageComponent implements OnInit {
  form = { email: '', password: '' };

  // paso: 'email' → pide correo | 'password' → pide contraseña
  paso = signal<'email' | 'password'>('email');
  isLoading = signal(false);
  isCheckingEmail = signal(false);
  error = signal('');
  mostrarPassword = signal(false);
  redirectUrl = signal('');
  tokenPendiente = signal('');
  emailNoVerificado = signal(false);
  reenvioExitoso = signal(false);

  constructor(
    private clientAuthService: ClientAuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['redirect']) this.redirectUrl.set(params['redirect']);
      if (params['token']) this.tokenPendiente.set(params['token']);
      if (params['error'] === 'bloqueado') {
        this.error.set('🔒 Tu cuenta ha sido bloqueada. Contacta al administrador.');
      }
    });
    if (this.clientAuthService.isLoggedIn()) this.redirigir();
  }

  redirigir() {
    if (this.redirectUrl() && this.tokenPendiente()) {
      this.router.navigate([this.redirectUrl()], { queryParams: { token: this.tokenPendiente() } });
    } else {
      this.router.navigate(['/clientes/mi-cuenta']);
    }
  }

  async verificarCorreo() {
    if (!this.form.email.trim()) { this.error.set('Ingresa tu correo'); return; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.form.email)) {
      this.error.set('El correo no tiene un formato válido');
      return;
    }

    this.isCheckingEmail.set(true);
    this.error.set('');
    try {
      const tipo = await this.clientAuthService.verificarCorreo(this.form.email);
      if (tipo === 'existe') {
        // Tiene cuenta — pedir contraseña
        this.paso.set('password');
      } else {
        // Cuenta nueva — ir al registro
        this.router.navigate(['/clientes/registro'], {
          queryParams: { email: this.form.email }
        });
      }
    } catch {
      this.error.set('No se pudo verificar el correo. Intenta de nuevo.');
    } finally {
      this.isCheckingEmail.set(false);
    }
  }

  async login() {
    if (!this.form.password.trim()) { this.error.set('Ingresa tu contraseña'); return; }
    this.isLoading.set(true);
    this.error.set('');
    this.emailNoVerificado.set(false);
    try {
      await this.clientAuthService.login(this.form.email, this.form.password);
      this.redirigir();
    } catch (error: any) {
      if (error.message === 'EMAIL_NOT_VERIFIED') {
        this.emailNoVerificado.set(true);
      } else {
        this.error.set(error.message);
      }
    } finally {
      this.isLoading.set(false);
    }
  }

  async reenviarVerificacion() {
    try {
      await this.clientAuthService.loginSinVerificar(this.form.email, this.form.password);
      await this.clientAuthService.reenviarVerificacion();
      await this.clientAuthService.logout();
      this.reenvioExitoso.set(true);
    } catch {
      this.error.set('Error al reenviar. Intenta de nuevo.');
    }
  }

  async loginGoogle() {
    this.isLoading.set(true);
    this.error.set('');
    try {
      await this.clientAuthService.loginConGoogle();
      this.redirigir();
    } catch (error: any) {
      this.error.set(error.message);
    } finally {
      this.isLoading.set(false);
    }
  }

  resetPaso() {
    this.paso.set('email');
    this.form.password = '';
    this.error.set('');
    this.emailNoVerificado.set(false);
    this.reenvioExitoso.set(false);
  }

  togglePassword() { this.mostrarPassword.set(!this.mostrarPassword()); }
  onEmailKeydown(event: KeyboardEvent) { if (event.key === 'Enter') this.verificarCorreo(); }
}