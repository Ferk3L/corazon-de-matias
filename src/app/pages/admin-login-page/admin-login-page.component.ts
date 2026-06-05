import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';

const ADMIN_EMAIL = 'corazondematias@gmail.com';

@Component({
  selector: 'app-admin-login-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './admin-login-page.component.html',
  styleUrl: './admin-login-page.component.css'
})
export class AdminLoginPageComponent {
  email = '';
  password = '';
  error = '';
  isLoading = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  async onSubmit() {
    if (!this.email || !this.password) {
      this.error = 'Por favor completa todos los campos';
      return;
    }

    if (this.email.toLowerCase().trim() !== ADMIN_EMAIL) {
      this.error = 'Acceso no autorizado';
      return;
    }

    this.isLoading = true;
    this.error = '';

    try {
      await this.authService.login(this.email, this.password);
      this.router.navigate(['/admin']);
    } catch (error: any) {
      this.error = error.message || 'Error al iniciar sesión';
    } finally {
      this.isLoading = false;
    }
  }
}