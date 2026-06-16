import { Component, OnInit, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { ClientAuthService } from '../../core/client-auth.service';
import { ApiService } from '../../core/api.service';

@Component({
  selector: 'app-client-register-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './client-register-page.component.html',
  styleUrl: './client-register-page.component.css'
})
export class ClientRegisterPageComponent implements OnInit {
  form = { nombre: '', email: '', telefono: '', password: '', confirmarPassword: '' };
  desdeQR = signal(false);
  isLoading = signal(false);
  isLoadingGoogle = signal(false);
  error = signal('');
  mostrarPassword = signal(false);
  registroExitoso = signal(false);
  mostrandoCodigo = signal(false);
  codigoInput = signal('');
  uidRegistrado = signal('');
  verificandoCodigo = signal(false);
  errorCodigo = signal('');
  codigoVerificado = signal(false);
  reenvioExitoso = signal(false);

  constructor(
    private clientAuthService: ClientAuthService,
    private apiService: ApiService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.desdeQR.set(params['qr'] === 'true');
      if (params['email']) this.form.email = params['email'];
    });
    if (this.clientAuthService.isLoggedIn()) this.router.navigate(['/clientes/mi-cuenta']);
  }

  async registrarConGoogle() {
    this.isLoadingGoogle.set(true);
    this.error.set('');
    try {
      await this.clientAuthService.loginConGoogle(this.desdeQR());
      this.router.navigate(['/clientes/mi-cuenta']);
    } catch (error: any) {
      this.error.set(error.message);
    } finally {
      this.isLoadingGoogle.set(false);
    }
  }

  async registrar() {
    this.error.set('');
    if (!this.validarFormulario()) return;
    this.isLoading.set(true);
    try {
      // 1. Primero mandar el código de verificación
      await this.apiService.sendVerificationCode('', this.form.email, this.form.nombre);
      // 2. Mostrar pantalla del código (cuenta aún NO creada)
      this.mostrandoCodigo.set(true);
      this.cdr.detectChanges();
    } catch (error: any) {
      this.error.set(error.message || 'Error al enviar el código. Intenta de nuevo.');
    } finally {
      this.isLoading.set(false);
      this.cdr.detectChanges();
    }
  }

  validarFormulario(): boolean {
    if (!this.form.nombre.trim()) { this.error.set('El nombre es requerido'); return false; }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!this.form.email.trim()) { this.error.set('El correo es requerido'); return false; }
    if (!emailRegex.test(this.form.email.trim())) {
      this.error.set('El correo no tiene un formato válido (ej: nombre@correo.com)');
      return false;
    }

    const telefonoLimpio = this.form.telefono.replace(/\s/g, '');
    if (!telefonoLimpio) { this.error.set('El teléfono es requerido'); return false; }
    if (!/^[0-9]{10}$/.test(telefonoLimpio)) {
      this.error.set('El teléfono debe tener exactamente 10 dígitos numéricos');
      return false;
    }

    if (this.form.password.length < 6) { this.error.set('La contraseña debe tener al menos 6 caracteres'); return false; }
    if (this.form.password !== this.form.confirmarPassword) { this.error.set('Las contraseñas no coinciden'); return false; }
    return true;
  }

  soloNumeros(event: KeyboardEvent): boolean {
    const charCode = event.which || event.keyCode;
    if (charCode < 48 || charCode > 57) { event.preventDefault(); return false; }
    return true;
  }

  async verificarCodigo() {
    if (this.codigoInput().length !== 6) { this.errorCodigo.set('El código debe tener 6 dígitos'); return; }
    this.verificandoCodigo.set(true);
    this.errorCodigo.set('');
    try {
      // 1. Verificar código por email
      await this.apiService.verifyCodeByEmail(this.form.email, this.codigoInput());
      // 2. Código correcto — ahora sí crear la cuenta
      await this.clientAuthService.registrar(
        this.form.nombre, this.form.email,
        this.form.password, this.form.telefono, this.desdeQR()
      );
      await this.clientAuthService.logout();
      this.codigoVerificado.set(true);
      this.cdr.detectChanges();
    } catch (error: any) {
      this.errorCodigo.set(error.message || 'Código incorrecto');
    } finally {
      this.verificandoCodigo.set(false);
      this.cdr.detectChanges();
    }
  }

  async reenviarCodigo() {
    try {
      await this.apiService.resendVerificationCode(this.form.email);
      this.reenvioExitoso.set(true);
      setTimeout(() => this.reenvioExitoso.set(false), 3000);
    } catch {
      this.errorCodigo.set('Error al reenviar. Intenta de nuevo.');
    }
  }

  soloNumerosInput(event: Event) {
    const input = event.target as HTMLInputElement;
    input.value = input.value.replace(/\D/g, '').slice(0, 6);
    this.codigoInput.set(input.value);
  }

  togglePassword() { this.mostrarPassword.set(!this.mostrarPassword()); }
}