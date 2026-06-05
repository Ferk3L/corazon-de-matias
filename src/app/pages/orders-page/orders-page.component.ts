import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { OrdersService } from '../../core/orders.service';
import { ProductsService, Product } from '../../core/products.service';
import { ClientAuthService } from '../../core/client-auth.service';
import { CashbackService } from '../../core/cashback.service';

@Component({
  selector: 'app-orders-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './orders-page.component.html',
  styleUrl: './orders-page.component.css'
})
export class OrdersPageComponent implements OnInit {
  // Campos del formulario
  phone = '';
  nombre = '';
  email = '';
  productId = '';
  productName = '';
  quantity = 1;
  esADomicilio = false;
  address = '';
  notes = '';

  products = signal<Product[]>([]);
  isLoading = signal(false);
  success = signal(false);
  error = signal('');

  // Estado del cliente
  clienteLogueado = signal(false);
  clienteUid = signal('');
  clienteSaldo = signal(0);
  usarCashback = signal(false);

  constructor(
    private ordersService: OrdersService,
    private productsService: ProductsService,
    private clientAuthService: ClientAuthService,
    private cashbackService: CashbackService
  ) {}

  async ngOnInit() {
    await Promise.all([this.loadProducts(), this.cargarCliente()]);
  }

  async cargarCliente() {
    const user = await this.clientAuthService.waitForAuthState();
    if (user) {
      this.clienteLogueado.set(true);
      this.clienteUid.set(user.uid);
      // Pre-llenar nombre y email desde Firebase Auth
      this.nombre = user.displayName || '';
      this.email = user.email || '';

      const cliente = await this.cashbackService.getCliente(user.uid);
      if (cliente) {
        this.clienteSaldo.set(cliente.saldoCashback);
        // Si el nombre de Firebase Auth está vacío, usar el de Firestore
        if (!this.nombre && cliente.nombre) this.nombre = cliente.nombre;
      }
    }
  }

  async loadProducts() {
    try {
      this.products.set(await this.productsService.getAvailableProducts());
    } catch (e) {
      console.error('Error al cargar productos:', e);
    }
  }

  onProductChange() {
    const selected = this.products().find(p => p.id === this.productId);
    if (selected) this.productName = selected.name;
  }

  getTotal(): number {
    const selected = this.products().find(p => p.id === this.productId);
    return selected ? selected.price * this.quantity : 0;
  }

  getTotalFinal(): number {
    const total = this.getTotal();
    if (this.usarCashback() && this.clienteSaldo() > 0) {
      return Math.max(0, total - this.clienteSaldo());
    }
    return total;
  }

  async enviarPedido() {
    this.error.set('');
    if (!this.phone.trim()) { this.error.set('Por favor ingresa tu teléfono'); return; }
    if (!this.productId) { this.error.set('Por favor selecciona un producto'); return; }
    if (!this.nombre.trim()) { this.error.set('Por favor ingresa tu nombre'); return; }
    if (this.esADomicilio && !this.address.trim()) { this.error.set('Por favor ingresa la dirección de entrega'); return; }

    this.isLoading.set(true);
    this.success.set(false);

    try {
      const total = this.getTotal();
      const totalFinal = this.getTotalFinal();
      const descuento = total - totalFinal;

      await this.ordersService.createOrder({
        name: this.nombre,
        phone: this.phone,
        email: this.email,
        product: this.productName,
        quantity: this.quantity,
        address: this.esADomicilio ? this.address : 'Recoger en fábrica',
        notes: this.notes || '',
        total: totalFinal,
        clienteUid: this.clienteUid() || '',
        clienteNombre: this.nombre
      });

      const descuentoTexto = descuento > 0
        ? `\n💰 *Cashback aplicado:* -$${descuento.toFixed(2)}\n*Total final:* $${totalFinal.toFixed(2)}`
        : '';

      const message = `
*🍬 Nuevo Pedido — Corazón de Matías*

👤 *Cliente:* ${this.nombre}
📞 *Teléfono:* ${this.phone}
📧 *Email:* ${this.email}
${this.clienteLogueado() ? '✅ *Cliente registrado*' : ''}

🛍️ *Producto:* ${this.productName}
⚖️ *Cantidad:* ${this.quantity} kg
💵 *Subtotal:* $${total.toFixed(2)}${descuentoTexto}

${this.esADomicilio ? `🏠 *Entrega a domicilio:*\n${this.address}` : '🏪 *Recoger en fábrica*'}

📝 *Notas:* ${this.notes || 'Ninguna'}
      `.trim();

      window.open(`https://wa.me/526181260061?text=${encodeURIComponent(message)}`, '_blank');
      this.success.set(true);
      this.resetForm();
    } catch {
      this.error.set('Error al procesar el pedido. Intenta nuevamente.');
    } finally {
      this.isLoading.set(false);
    }
  }

  resetForm() {
    this.phone = '';
    this.productId = '';
    this.productName = '';
    this.quantity = 1;
    this.esADomicilio = false;
    this.address = '';
    this.notes = '';
    this.usarCashback.set(false);
    // No limpiar nombre y email si está logueado
    if (!this.clienteLogueado()) {
      this.nombre = '';
      this.email = '';
    }
  }

  quickOrder() {
    window.open(`https://wa.me/526181260061?text=${encodeURIComponent('Hola, quiero hacer un pedido de gomitas 🍬')}`, '_blank');
  }
}