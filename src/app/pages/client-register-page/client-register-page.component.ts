import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { ClientAuthService } from '../../core/client-auth.service';

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

  constructor(
    private clientAuthService: ClientAuthService,
    private router: Router,
    private route: ActivatedRoute
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
      await this.clientAuthService.registrar(
        this.form.nombre, this.form.email,
        this.form.password, this.form.telefono, this.desdeQR()
      );
      this.registroExitoso.set(true);
    } catch (error: any) {
      this.error.set(error.message);
    } finally {
      this.isLoading.set(false);
    }
  }

  validarFormulario(): boolean {
    if (!this.form.nombre.trim()) { this.error.set('El nombre es requerido'); return false; }
    if (!this.form.email.trim()) { this.error.set('El correo es requerido'); return false; }
    if (!this.form.telefono.trim()) { this.error.set('El teléfono es requerido'); return false; }
    if (this.form.password.length < 6) { this.error.set('La contraseña debe tener al menos 6 caracteres'); return false; }
    if (this.form.password !== this.form.confirmarPassword) { this.error.set('Las contraseñas no coinciden'); return false; }
    return true;
  }

  togglePassword() { this.mostrarPassword.set(!this.mostrarPassword()); }
}