import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { ProductsService, Product } from '../../core/products.service';
import { OrdersService, Order } from '../../core/orders.service';
import { BlogService, BlogPost } from '../../core/blog.service';
import { CashbackService } from '../../core/cashback.service';
import { CashbackTokenService } from '../../core/cashback-token.service';

@Component({
  selector: 'app-admin-dashboard-page',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './admin-dashboard-page.component.html',
  styleUrl: './admin-dashboard-page.component.css'
})
export class AdminDashboardPageComponent implements OnInit, OnDestroy {
  activeTab = signal<'products' | 'orders' | 'stats' | 'blog' | 'clientes' | 'usuarios'>('stats');
  products = signal<Product[]>([]);
  orders = signal<Order[]>([]);
  blogPosts = signal<BlogPost[]>([]);
  clientes = signal<any[]>([]);
  stats = signal<any>(null);
  isLoading = signal(false);
  error = signal('');
  showBlogForm = signal(false);

  // Notificaciones
  notificaciones = signal<Order[]>([]);
  totalNuevos = signal(0);
  private unsubOrders: (() => void) | null = null;
  private ordenesConocidas = new Set<string>();

  // Bloqueo
  showBloqueo = signal(false);
  bloqueoUid = signal('');
  bloqueoNombre = signal('');
  bloqueoMotivo = signal('');
  bloqueoAccion = signal(false); // true=bloquear, false=desbloquear

  // QR
  qrGenerado = signal('');
  qrOrderId = signal('');
  showQR = signal(false);

  // Ajuste manual cashback
  ajusteClienteUid = signal('');
  ajusteMonto = signal(0);
  ajusteNota = signal('');
  showAjuste = signal(false);

  editingPost: BlogPost | null = null;
  blogForm: Partial<BlogPost> = {
    title: '', excerpt: '', content: '', date: '',
    category: '', image: '', published: true
  };
  blogCategories = ['Salud', 'Recetas', 'Historia', 'Tips', 'Educación', 'Eventos', 'Noticias'];

  constructor(
    private authService: AuthService,
    private productsService: ProductsService,
    private ordersService: OrdersService,
    private blogService: BlogService,
    private cashbackService: CashbackService,
    private tokenService: CashbackTokenService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  async ngOnInit() {
    this.route.queryParams.subscribe(async (params) => {
      const tab = params['tab'];
      if (tab && ['products', 'orders', 'stats', 'blog', 'clientes'].includes(tab)) {
        this.activeTab.set(tab);
      }
    });
    await this.loadDataForTab(this.activeTab());
    this.iniciarNotificaciones();
  }

  ngOnDestroy() {
    if (this.unsubOrders) this.unsubOrders();
  }

  // Escuchar pedidos en tiempo real
  iniciarNotificaciones() {
    this.unsubOrders = this.ordersService.escucharPedidosNuevos((orders) => {
      const nuevos = orders.filter(o =>
        o.status === 'pending' &&
        o.id &&
        !this.ordenesConocidas.has(o.id)
      );
      if (nuevos.length > 0 && this.ordenesConocidas.size > 0) {
        // Solo notificar después de la carga inicial
        this.notificaciones.set([...nuevos, ...this.notificaciones()].slice(0, 10));
        this.totalNuevos.set(this.totalNuevos() + nuevos.length);
        // Sonido de notificación
        this.reproducirSonido();
      }
      orders.forEach(o => { if (o.id) this.ordenesConocidas.add(o.id); });
      if (this.activeTab() === 'orders') this.orders.set(orders);
    });
  }

  reproducirSonido() {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    } catch {}
  }

  limpiarNotificaciones() {
    this.notificaciones.set([]);
    this.totalNuevos.set(0);
  }

  private async loadDataForTab(tab: string) {
    if (tab === 'products') await this.loadProducts();
    else if (tab === 'orders') await this.loadOrders();
    else if (tab === 'blog') await this.loadBlogPosts();
    else if (tab === 'clientes') await this.loadClientes();
    else if (tab === 'usuarios') await this.loadClientes();
    else await this.loadStats();
  }

  async loadStats() {
    this.isLoading.set(true);
    this.error.set('');
    try {
      const s = await this.ordersService.getOrdersStats();
      this.stats.set(s || { total: 0, pending: 0, confirmed: 0, completed: 0, cancelled: 0, totalRevenue: 0 });
    } catch { this.stats.set({ total: 0, pending: 0, confirmed: 0, completed: 0, cancelled: 0, totalRevenue: 0 }); }
    finally { this.isLoading.set(false); }
  }

  async loadProducts() {
    this.isLoading.set(true);
    this.error.set('');
    try {
      const loaded = await this.productsService.getAllProducts();
      this.products.set(loaded);
      if (loaded.length === 0) this.error.set('No hay productos. Crea el primero.');
    } catch (e: any) {
      this.error.set(`Error: ${e.message}`);
      this.products.set([]);
    } finally { this.isLoading.set(false); }
  }

  async loadOrders() {
    this.isLoading.set(true);
    this.error.set('');
    try {
      const loaded = await this.ordersService.getAllOrders();
      this.orders.set(loaded);
      if (loaded.length === 0) this.error.set('No hay pedidos todavía.');
    } catch (e: any) {
      this.error.set(`Error: ${e.message}`);
      this.orders.set([]);
    } finally { this.isLoading.set(false); }
  }

  async loadClientes() {
    this.isLoading.set(true);
    this.error.set('');
    try {
      const loaded = await this.cashbackService.getTodosLosClientes();
      this.clientes.set(loaded);
      if (loaded.length === 0) this.error.set('No hay clientes registrados todavía.');
    } catch (e: any) {
      this.error.set(`Error: ${e.message}`);
      this.clientes.set([]);
    } finally { this.isLoading.set(false); }
  }

  // Generar QR de cashback para un pedido
  async generarQRCashback(order: Order) {
    if (!order.id || !order.clienteUid) return;
    try {
      const tokenId = await this.tokenService.generarToken(
        order.id,
        order.clienteUid,
        order.clienteNombre || order.name,
        order.total
      );
      await this.ordersService.marcarCashbackGenerado(order.id, tokenId);

      const url = `https://elcorazondematias.web.app/cashback?token=${tokenId}`;
      this.qrGenerado.set(url);
      this.qrOrderId.set(order.id);
      this.showQR.set(true);
      await this.loadOrders();
    } catch (e: any) {
      this.error.set('Error al generar QR: ' + e.message);
    }
  }

  cerrarQR() {
    this.showQR.set(false);
    this.qrGenerado.set('');
  }

  // Ajuste manual de cashback
  abrirAjuste(clienteUid: string) {
    this.ajusteClienteUid.set(clienteUid);
    this.ajusteMonto.set(0);
    this.ajusteNota.set('');
    this.showAjuste.set(true);
  }

  async guardarAjuste() {
    if (!this.ajusteClienteUid() || !this.ajusteMonto() || !this.ajusteNota()) return;
    try {
      await this.cashbackService.ajusteManual(
        this.ajusteClienteUid(), this.ajusteMonto(), this.ajusteNota()
      );
      this.showAjuste.set(false);
      await this.loadClientes();
    } catch (e: any) {
      this.error.set('Error al ajustar cashback: ' + e.message);
    }
  }

  async onTabChange(tab: 'products' | 'orders' | 'stats' | 'blog' | 'clientes' | 'usuarios') {
    this.activeTab.set(tab);
    this.error.set('');
    this.showBlogForm.set(false);
    this.router.navigate(['/admin'], { queryParams: { tab } });
    await this.loadDataForTab(tab);
  }

  async loadBlogPosts() {
    this.isLoading.set(true);
    this.error.set('');
    try {
      await this.blogService.migrateDefaultPosts();
      const loaded = await this.blogService.getAllPosts();
      this.blogPosts.set(loaded);
      if (loaded.length === 0) this.error.set('No hay posts.');
    } catch (e: any) {
      this.error.set(`Error: ${e.message}`);
      this.blogPosts.set([]);
    } finally { this.isLoading.set(false); }
  }

  openBlogForm(post?: BlogPost) {
    if (post) { this.editingPost = post; this.blogForm = { ...post }; }
    else {
      this.editingPost = null;
      this.blogForm = {
        title: '', excerpt: '', content: '',
        date: new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }),
        category: 'Noticias', image: '', published: true
      };
    }
    this.showBlogForm.set(true);
  }

  closeBlogForm() {
    this.showBlogForm.set(false);
    this.editingPost = null;
    this.blogForm = { title: '', excerpt: '', content: '', date: '', category: '', image: '', published: true };
  }

  async saveBlogPost() {
    if (!this.blogForm.title || !this.blogForm.excerpt || !this.blogForm.category) {
      this.error.set('Completa título, extracto y categoría'); return;
    }
    this.isLoading.set(true);
    try {
      if (this.editingPost?.id) await this.blogService.updatePost(this.editingPost.id, this.blogForm);
      else await this.blogService.createPost(this.blogForm as Omit<BlogPost, 'id' | 'createdAt' | 'updatedAt'>);
      this.closeBlogForm();
      await this.loadBlogPosts();
    } catch (e: any) { this.error.set(`Error: ${e.message}`); }
    finally { this.isLoading.set(false); }
  }

  async deleteBlogPost(postId: string) {
    if (!confirm('¿Eliminar este artículo?')) return;
    try { await this.blogService.deletePost(postId); await this.loadBlogPosts(); }
    catch { this.error.set('Error al eliminar'); }
  }

  async togglePostPublished(post: BlogPost) {
    try { await this.blogService.updatePost(post.id!, { published: !post.published }); await this.loadBlogPosts(); }
    catch { this.error.set('Error al cambiar estado'); }
  }

  async deleteProduct(productId: string) {
    if (!confirm('¿Eliminar este producto?')) return;
    try { await this.productsService.deleteProduct(productId); await this.loadProducts(); }
    catch { this.error.set('Error al eliminar'); }
  }

  async updateOrderStatus(orderId: string, event: Event) {
    const select = event.target as HTMLSelectElement;
    try {
      await this.ordersService.updateOrderStatus(orderId, select.value as Order['status']);
      await this.loadOrders();
      await this.loadStats();
    } catch { this.error.set('Error al actualizar pedido'); }
  }

  abrirBloqueo(cliente: any, bloquear: boolean) {
    this.bloqueoUid.set(cliente.uid);
    this.bloqueoNombre.set(cliente.nombre);
    this.bloqueoAccion.set(bloquear);
    this.bloqueoMotivo.set('');
    this.showBloqueo.set(true);
  }

  async confirmarBloqueo() {
    try {
      await this.cashbackService.toggleBloqueoCliente(
        this.bloqueoUid(), this.bloqueoAccion(), this.bloqueoMotivo()
      );
      this.showBloqueo.set(false);
      await this.loadClientes();
    } catch (e: any) {
      this.error.set('Error al cambiar estado del cliente');
    }
  }


  async eliminarCliente(uid: string, nombre: string) {
    if (!confirm(`¿Eliminar permanentemente al cliente "${nombre}"? Se borrará su saldo y historial.`)) return;
    try {
      await this.cashbackService.eliminarCliente(uid);
      await this.loadClientes();
    } catch (e: any) {
      this.error.set('Error al eliminar cliente: ' + e.message);
    }
  }
  async logout() {
    await this.authService.logout();
    this.router.navigate(['/admin/login']);
  }

  formatPrice(price: number): string { return `$${price.toLocaleString('es-MX')}`; }
  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
  getStatusText(status: string): string {
    return { pending: 'Pendiente', confirmed: 'Confirmado', completed: 'Completado', cancelled: 'Cancelado' }[status] || status;
  }
  getStatusBadgeClass(status: string): string {
    return { pending: 'from-yellow-400 to-yellow-500', confirmed: 'from-blue-400 to-blue-500', completed: 'from-green-400 to-green-500', cancelled: 'from-red-400 to-red-500' }[status] || '';
  }
  trackByProductId(index: number, product: Product): string { return product.id || `p-${index}`; }
  trackByPostId(index: number, post: BlogPost): string { return post.id || `b-${index}`; }
}