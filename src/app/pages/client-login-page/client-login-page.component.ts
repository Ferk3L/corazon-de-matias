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

  // Estado del flujo
  paso = signal<'email' | 'password' | 'google'>('email');
  tipoAcceso = signal<'google' | 'password' | 'nuevo' | ''>('');

  isLoading = signal(false);
  isCheckingEmail = signal(false);
  error = signal('');
  mostrarPassword = signal(false);
  redirectUrl = signal('');
  tokenPendiente = signal('');

  constructor(
    private clientAuthService: ClientAuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['redirect']) this.redirectUrl.set(params['redirect']);
      if (params['token']) this.tokenPendiente.set(params['token']);
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

  // Paso 1: verificar el correo
  async verificarCorreo() {
    if (!this.form.email.trim()) { this.error.set('Ingresa tu correo'); return; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.form.email)) { this.error.set('El correo no tiene un formato válido'); return; }

    this.isCheckingEmail.set(true);
    this.error.set('');
    try {
      const tipo = await this.clientAuthService.verificarCorreo(this.form.email);
      this.tipoAcceso.set(tipo);

      if (tipo === 'google') {
        this.paso.set('google');
      } else if (tipo === 'password') {
        this.paso.set('password');
      } else {
        // Correo nuevo - redirigir a registro
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

  // Login con contraseña
  async login() {
    if (!this.form.password.trim()) { this.error.set('Ingresa tu contraseña'); return; }
    this.isLoading.set(true);
    this.error.set('');
    try {
      await this.clientAuthService.login(this.form.email, this.form.password);
      this.redirigir();
    } catch (error: any) {
      this.error.set(error.message);
    } finally {
      this.isLoading.set(false);
    }
  }

  // Login con Google
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
    this.tipoAcceso.set('');
    this.form.password = '';
    this.error.set('');
  }

  togglePassword() { this.mostrarPassword.set(!this.mostrarPassword()); }

  onEmailKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') this.verificarCorreo();
  }
}