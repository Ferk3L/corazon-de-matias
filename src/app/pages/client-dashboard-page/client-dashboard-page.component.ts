import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ClientAuthService } from '../../core/client-auth.service';
import { CashbackService, ClienteData, MovimientoCashback } from '../../core/cashback.service';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { app } from '../../app.config';

@Component({
  selector: 'app-client-dashboard-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './client-dashboard-page.component.html',
  styleUrl: './client-dashboard-page.component.css'
})
export class ClientDashboardPageComponent implements OnInit {
  // Usamos signals para que Angular zoneless detecte los cambios
  isLoading = signal(true);
  isLoggingOut = signal(false);
  cliente = signal<ClienteData | null>(null);
  historial = signal<MovimientoCashback[]>([]);

  constructor(
    private clientAuthService: ClientAuthService,
    private cashbackService: CashbackService,
    private router: Router
  ) {}

  ngOnInit() {
    const auth = getAuth(app);

    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        this.router.navigate(['/clientes/login']);
        this.isLoading.set(false);
        return;
      }

      try {
        let clienteData = await this.cashbackService.getCliente(user.uid);

        // Si no existe en Firestore, lo crea (usuarios registrados antes del sistema)
        if (!clienteData) {
          await this.cashbackService.crearCliente(user.uid, {
            nombre: user.displayName || user.email?.split('@')[0] || 'Cliente',
            email: user.email || '',
          });
          clienteData = await this.cashbackService.getCliente(user.uid);
        }

        this.cliente.set(clienteData);
        const mov = await this.cashbackService.getHistorial(user.uid);
        this.historial.set(mov);
      } catch (error) {
        console.error('Error cargando datos del cliente:', error);
      } finally {
        this.isLoading.set(false);
      }
    });
  }

  async cerrarSesion() {
    this.isLoggingOut.set(true);
    try {
      await this.clientAuthService.logout();
      this.router.navigate(['/clientes/login']);
    } catch {
      this.isLoggingOut.set(false);
    }
  }

  getTipoLabel(tipo: string): string {
    switch (tipo) {
      case 'ganado': return '💰 Cashback ganado';
      case 'usado': return '🛍️ Cashback usado';
      case 'bono_bienvenida': return '🎉 Bono de bienvenida';
      case 'ajuste_manual': return '🔧 Ajuste del admin';
      default: return tipo;
    }
  }

  getTipoClass(tipo: string): string {
    switch (tipo) {
      case 'ganado': return 'ganado';
      case 'bono_bienvenida': return 'ganado';
      case 'usado': return 'usado';
      case 'ajuste_manual': return 'ajuste';
      default: return '';
    }
  }

  formatFecha(timestamp: any): string {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
    return date.toLocaleDateString('es-MX', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  }
}