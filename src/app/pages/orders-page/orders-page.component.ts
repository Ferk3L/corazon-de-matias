import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { OrdersService } from '../../core/orders.service';
import { ClientAuthService } from '../../core/client-auth.service';
import { CashbackService } from '../../core/cashback.service';
import { CartService } from '../../core/cart.service';

@Component({
  selector: 'app-orders-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './orders-page.component.html',
  styleUrl: './orders-page.component.css'
})
export class OrdersPageComponent implements OnInit {
  // Datos del formulario — solo para no logueados
  nombre = '';
  telefono = '';
  email = '';
  esADomicilio = false;
  address = '';
  notes = '';
  usarCashback = signal(false);

  // Estado del cliente
  clienteLogueado = signal(false);
  clienteUid = signal('');
  clienteSaldo = signal(0);
  correoVerificado = signal(false);

  isLoading = signal(false);
  success = signal(false);
  error = signal('');

  constructor(
    private ordersService: OrdersService,
    private clientAuthService: ClientAuthService,
    private cashbackService: CashbackService,
    public cartService: CartService,
    private router: Router
  ) {}

  async ngOnInit() {
    // Si el carrito está vacío, redirigir al catálogo
    if (this.cartService.count() === 0) {
      this.router.navigate(['/catalogo']);
      return;
    }
    await this.cargarCliente();
  }

  async cargarCliente() {
    const user = await this.clientAuthService.waitForAuthState();
    if (user) {
      // Verificar que no sea el admin
      if (user.email === 'corazondematias@gmail.com') return;

      this.clienteLogueado.set(true);
      this.clienteUid.set(user.uid);
      this.nombre = user.displayName || '';
      this.email = user.email || '';
      this.correoVerificado.set(user.emailVerified);

      const cliente = await this.cashbackService.getCliente(user.uid);
      if (cliente) {
        this.clienteSaldo.set(cliente.saldoCashback);
        if (!this.nombre && cliente.nombre) this.nombre = cliente.nombre;
        if (cliente.telefono) this.telefono = cliente.telefono;
      }
    }
  }

  getTotalSinDescuento(): number {
    return this.cartService.total();
  }

  getTotalConCashback(): number {
    if (this.usarCashback() && this.clienteSaldo() > 0) {
      return Math.max(0, this.cartService.total() - this.clienteSaldo());
    }
    return this.cartService.total();
  }

  async enviarPedido() {
    this.error.set('');

    // Validar carrito
    if (this.cartService.count() === 0) {
      this.error.set('Tu carrito está vacío'); return;
    }

    // Validar datos del no logueado
    if (!this.clienteLogueado()) {
      if (!this.nombre.trim()) { this.error.set('Por favor ingresa tu nombre'); return; }
      if (!this.telefono.trim()) { this.error.set('Por favor ingresa tu teléfono'); return; }
    } else {
      // Si está logueado, verificar que tenga teléfono
      if (!this.telefono.trim()) { this.error.set('Por favor ingresa tu teléfono'); return; }
    }

    if (this.esADomicilio && !this.address.trim()) {
      this.error.set('Por favor ingresa la dirección de entrega'); return;
    }

    this.isLoading.set(true);
    try {
      const items = this.cartService.items();
      const totalKg = this.cartService.totalKg();
      const precioKg = this.cartService.precioKg();
      const esMayoreo = this.cartService.esMayoreo();
      const totalFinal = this.getTotalConCashback();
      const descuento = this.cartService.total() - totalFinal;

      // Crear resumen de productos para el pedido
      const productosTexto = items.map(i => `${i.name} (${i.kg}kg)`).join(', ');
      const productosWA = items.map(i => `  • ${i.name}: ${i.kg}kg × $${precioKg} = $${i.kg * precioKg}`).join('\n');

      // Guardar en Firebase
      await this.ordersService.createOrder({
        name: this.nombre,
        phone: this.telefono,
        email: this.email,
        product: productosTexto,
        quantity: totalKg,
        address: this.esADomicilio ? this.address : 'Recoger en fábrica',
        notes: this.notes || '',
        total: totalFinal,
        clienteUid: this.clienteUid() || '',
        clienteNombre: this.nombre,
      });

      // Armar mensaje de WhatsApp
      const descuentoTexto = descuento > 0
        ? `\n💰 *Cashback aplicado:* -$${descuento.toFixed(0)}\n*Total final:* $${totalFinal}`
        : '';

      const mayoreoTexto = esMayoreo
        ? `\n🎉 *Precio mayoreo aplicado*`
        : '';

      const message = `
*🍬 Nuevo Pedido — Corazón de Matías*

👤 *Cliente:* ${this.nombre}
📞 *Teléfono:* ${this.telefono}
${this.email ? `📧 *Email:* ${this.email}` : ''}
${this.clienteLogueado() ? '✅ *Cliente registrado*' : ''}

🛍️ *Productos:*
${productosWA}

⚖️ *Total:* ${totalKg}kg${mayoreoTexto}
💵 *Precio por kg:* $${precioKg}
💵 *Subtotal:* $${this.cartService.total()}${descuentoTexto}

${this.esADomicilio ? `🏠 *Entrega a domicilio:*\n${this.address}` : '🏪 *Recoger en fábrica*'}
${this.notes ? `\n📝 *Notas:* ${this.notes}` : ''}
      `.trim();

      // En móvil window.open es bloqueado después de await
      // Usar location.href garantiza que WhatsApp abra siempre
      const waUrl = `https://wa.me/526181260061?text=${encodeURIComponent(message)}`;
      this.success.set(true);
      this.cartService.limpiar();

      // Pequeño delay para que el usuario vea el mensaje de éxito antes de redirigir
      setTimeout(() => {
        window.location.href = waUrl;
      }, 800);
    } catch {
      this.error.set('Error al procesar el pedido. Intenta nuevamente.');
    } finally {
      this.isLoading.set(false);
    }
  }

  volverAlCatalogo() {
    this.router.navigate(['/catalogo']);
  }
}