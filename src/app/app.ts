import { Component, OnInit, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';
import { ClientAuthService } from './core/client-auth.service';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { app } from './app.config';

const ADMIN_EMAIL = 'corazondematias@gmail.com';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  esAdmin = false;
  usuarioLogueado = signal(false);
  nombreUsuario = signal('');
  menuAbierto = signal(false);

  constructor(
    private router: Router,
    private clientAuthService: ClientAuthService
  ) {
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd)
    ).subscribe((e: any) => {
      this.esAdmin = e.url.startsWith('/admin');
      this.menuAbierto.set(false);
    });
  }

  ngOnInit() {
    const auth = getAuth(app);
    onAuthStateChanged(auth, (user) => {
      // No mostrar en navbar si es el admin
      if (user && user.email?.toLowerCase() !== ADMIN_EMAIL) {
        this.usuarioLogueado.set(true);
        this.nombreUsuario.set(
          user.displayName?.split(' ')[0] ||
          user.email?.split('@')[0] ||
          'Mi cuenta'
        );
      } else {
        this.usuarioLogueado.set(false);
        this.nombreUsuario.set('');
      }
    });
  }

  async cerrarSesion() {
    await this.clientAuthService.logout();
    this.router.navigate(['/']);
  }

  toggleMenu() {
    this.menuAbierto.set(!this.menuAbierto());
  }
}