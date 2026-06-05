import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { ProductsService } from '../../core/products.service';
import { ClientAuthService } from '../../core/client-auth.service';
import { CashbackService, ClienteData } from '../../core/cashback.service';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.css'
})
export class HomePageComponent implements OnInit {
  featuredProducts = signal<any[]>([]);
  isLoading = signal(true);
  clienteLogueado = signal<ClienteData | null>(null);
  isClienteLogueado = signal(false);
  usuarioAuth = signal<any>(null);

  constructor(
    private productsService: ProductsService,
    private clientAuthService: ClientAuthService,
    private cashbackService: CashbackService,
    private router: Router
  ) {}

  async ngOnInit() {
    await Promise.all([this.loadFeaturedProducts(), this.cargarCliente()]);
  }

  async cargarCliente() {
    try {
      const user = await this.clientAuthService.waitForAuthState();
      if (user) {
        this.usuarioAuth.set(user);
        this.isClienteLogueado.set(true);
        let cliente = await this.cashbackService.getCliente(user.uid);
        if (!cliente) {
          await this.cashbackService.crearCliente(user.uid, {
            nombre: user.displayName || user.email?.split('@')[0] || 'Cliente',
            email: user.email || ''
          });
          cliente = await this.cashbackService.getCliente(user.uid);
        }
        this.clienteLogueado.set(cliente);
      }
    } catch {
      this.isClienteLogueado.set(false);
    }
  }

  async cerrarSesion() {
    try {
      await this.clientAuthService.logout();
      this.isClienteLogueado.set(false);
      this.clienteLogueado.set(null);
      this.usuarioAuth.set(null);
    } catch (e) {
      console.error('Error al cerrar sesión', e);
    }
  }

  getNombreUsuario(): string {
    const cliente = this.clienteLogueado();
    if (cliente?.nombre) return cliente.nombre.split(' ')[0];
    const user = this.usuarioAuth();
    if (user?.displayName) return user.displayName.split(' ')[0];
    if (user?.email) return user.email.split('@')[0];
    return 'Cliente';
  }

  getSaldo(): string {
    return this.clienteLogueado()?.saldoCashback?.toFixed(2) || '0.00';
  }

  getTotalCompras(): string {
    return this.clienteLogueado()?.totalCompras?.toFixed(2) || '0.00';
  }

  async loadFeaturedProducts() {
    try {
      const products = await this.productsService.getFeaturedProducts();
      this.featuredProducts.set(products.map(p => ({
        id: p.id || '',
        name: p.name,
        description: p.description.length > 90 ? p.description.substring(0, 90) + '...' : p.description,
        price: `$${p.price}`,
        image: p.image
      })));
    } catch {
      this.featuredProducts.set([]);
    } finally {
      this.isLoading.set(false);
    }
  }

  orderOnWhatsApp() {
    const message = 'Hola, quiero información sobre sus gomitas';
    window.open(`https://wa.me/526181260061?text=${encodeURIComponent(message)}`, '_blank');
  }
}