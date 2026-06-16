import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { ProductsService } from '../../core/products.service';
import { OrdersService } from '../../core/orders.service';
import { BlogService, BlogPost } from '../../core/blog.service';
import { Product } from '../../core/products.service';
import { Order } from '../../core/orders.service';
import { AdminClientsPageComponent } from '../admin-clients-page/admin-clients-page.component';
import { ReviewsService, Review } from '../../core/reviews.service';
import { SugerenciasService, Sugerencia } from '../../core/sugerencias.service';
import { CashbackTokenService } from '../../core/cashback-token.service';
import { ApiService } from '../../core/api.service';
import { CashbackService, ClienteData } from '../../core/cashback.service';
import { getFirestore } from 'firebase/firestore';
import { app } from '../../app.config';

type AdminTab = 'products' | 'orders' | 'stats' | 'blog' | 'clients' | 'reviews' | 'buzon';

@Component({
  selector: 'app-admin-dashboard-page',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, AdminClientsPageComponent],
  templateUrl: './admin-dashboard-page.component.html',
  styleUrl: './admin-dashboard-page.component.css'
})
export class AdminDashboardPageComponent implements OnInit {
  activeTab: AdminTab = 'stats';
  products: Product[] = [];
  orders: Order[] = [];
  filteredOrders: Order[] = [];
  blogPosts: BlogPost[] = [];
  stats: any = null;
  isLoading = false;
  today = new Date();
  error = '';

  // Blog
  showBlogForm = false;
  editingPost: BlogPost | null = null;
  blogForm: Partial<BlogPost> = { title: '', excerpt: '', content: '', date: '', category: '', image: '', published: true };
  blogCategories = ['Salud', 'Recetas', 'Historia', 'Tips', 'Educación', 'Eventos', 'Noticias'];

  // Pedidos
  ordenPedidos: 'desc' | 'asc' = 'desc';
  filtroPedidos: string = 'all';
  filtroFechaInicio: string = '';
  filtroFechaFin: string = '';
  mostrarConfirmEliminar: string | null = null;

  // Corte
  tipoCorte: 'semanal' | 'mensual' = 'mensual';
  corteFechaInicio: string = '';
  corteFechaFin: string = '';
  corteResultado: any = null;
  mostrarCorte = false;

  // QR Cashback
  qrModalData: { url: string; clienteNombre: string; monto: number } | null = null;
  generandoQR: string | null = null;
  qrsGenerados: Set<string> = new Set();

  // Reseñas
  reviews: Review[] = [];
  reviewsFiltro: 'todas' | 'con-admin-like' = 'todas';

  // Buzón
  sugerencias: Sugerencia[] = [];
  sugerenciasFiltro: string = 'todas';

  // Cache de clientes por email para el QR
  private clientesCache: Map<string, ClienteData> = new Map();
  private db = getFirestore(app);

  constructor(
    private authService: AuthService,
    private productsService: ProductsService,
    private ordersService: OrdersService,
    private blogService: BlogService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    private cashbackTokenService: CashbackTokenService,
    private cashbackService: CashbackService,
    private reviewsService: ReviewsService,
    private sugerenciasService: SugerenciasService,
    private apiService: ApiService
  ) {}

  async ngOnInit() {
    this.route.queryParams.subscribe(async (params) => {
      const tabs: AdminTab[] = ['products', 'orders', 'stats', 'blog', 'clients', 'reviews', 'buzon'];
      if (params['tab'] && tabs.includes(params['tab'])) {
        this.activeTab = params['tab'] as AdminTab;
        await this.loadDataForTab(this.activeTab);
      }
    });
    await this.loadDataForTab(this.activeTab);
    this.initCorte();
  }

  private async loadDataForTab(tab: string) {
    if (tab === 'products') await this.loadProducts();
    else if (tab === 'orders') await this.loadOrders();
    else if (tab === 'blog') await this.loadBlogPosts();
    else if (tab === 'reviews') await this.loadReviews();
    else if (tab === 'buzon') await this.loadBuzon();
    else await this.loadStats();
  }

  async onTabChange(tab: AdminTab) {
    this.activeTab = tab;
    this.error = '';
    this.showBlogForm = false;
    this.router.navigate(['/admin'], { queryParams: { tab } });
    await this.loadDataForTab(tab);
    this.cdr.detectChanges();
  }

  async loadStats() {
    this.isLoading = true;
    this.error = '';
    try {
      this.stats = await this.ordersService.getOrdersStats();
      if (!this.stats) this.stats = { total: 0, pending: 0, confirmed: 0, completed: 0, cancelled: 0, totalRevenue: 0 };
    } catch {
      this.stats = { total: 0, pending: 0, confirmed: 0, completed: 0, cancelled: 0, totalRevenue: 0 };
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  async loadProducts() {
    this.isLoading = true;
    this.error = '';
    this.products = [];
    try {
      const loaded = await this.productsService.getAllProducts();
      this.products = loaded.map((p, i) => ({
        id: p.id || `temp-${i}`,
        name: p.name || 'Sin nombre',
        description: p.description || '',
        price: p.price || 0,
        image: p.image || '/images/placeholder.jpg',
        category: p.category || '',
        available: p.available !== undefined ? p.available : true
      }));
    } catch (error: any) {
      this.error = `Error al cargar productos: ${error.message}`;
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  async loadOrders() {
    this.isLoading = true;
    this.error = '';
    this.orders = [];
    try {
      const loaded = await this.ordersService.getAllOrders();
      this.orders = loaded.map(o => ({ ...o, id: o.id || '' }));
      await this.cargarClientesCache();
      this.aplicarFiltros();
    } catch (error: any) {
      this.error = `Error al cargar pedidos: ${error.message}`;
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  async cargarClientesCache() {
    try {
      const clientes = await this.cashbackService.getTodosLosClientes();
      this.clientesCache.clear();
      clientes.forEach(c => {
        if (c.email) this.clientesCache.set(c.email.toLowerCase(), c);
        if (c.uid) this.clientesCache.set(c.uid, c);
      });
    } catch { }
  }

  getClienteRegistrado(order: Order): ClienteData | null {
    if (order.clienteUid && this.clientesCache.has(order.clienteUid)) {
      return this.clientesCache.get(order.clienteUid)!;
    }
    if (order.email && this.clientesCache.has(order.email.toLowerCase())) {
      return this.clientesCache.get(order.email.toLowerCase())!;
    }
    return null;
  }

  aplicarFiltros() {
    let resultado = [...this.orders];
    if (this.filtroPedidos !== 'all') {
      resultado = resultado.filter(o => o.status === this.filtroPedidos);
    }
    if (this.filtroFechaInicio) {
      const inicio = new Date(this.filtroFechaInicio);
      resultado = resultado.filter(o => new Date(o.createdAt) >= inicio);
    }
    if (this.filtroFechaFin) {
      const fin = new Date(this.filtroFechaFin);
      fin.setHours(23, 59, 59);
      resultado = resultado.filter(o => new Date(o.createdAt) <= fin);
    }
    resultado.sort((a, b) => {
      const da = new Date(a.createdAt).getTime();
      const db = new Date(b.createdAt).getTime();
      return this.ordenPedidos === 'desc' ? db - da : da - db;
    });
    this.filteredOrders = resultado;
    this.cdr.detectChanges();
  }

  async eliminarPedido(orderId: string) {
    try {
      await this.ordersService.deleteOrder(orderId);
      this.mostrarConfirmEliminar = null;
      await this.loadOrders();
    } catch {
      this.error = 'Error al eliminar pedido';
    }
  }

  // ===== QR CASHBACK =====
  async generarQRCashback(order: Order) {
    const cliente = this.getClienteRegistrado(order);
    if (!cliente) return;
    this.generandoQR = order.id!;
    this.error = '';
    try {
      const result = await this.apiService.generarTokenCashback(
        order.id!, cliente.uid, cliente.nombre, order.total
      );
      this.qrModalData = { url: result.qrUrl, clienteNombre: cliente.nombre, monto: result.monto };
      this.qrsGenerados.add(order.id!);
    } catch {
      this.error = 'Error al generar QR de cashback';
    } finally {
      this.generandoQR = null;
      this.cdr.detectChanges();
    }
  }

  qrYaGenerado(order: Order): boolean {
    return !!(order.cashbackGenerado || this.qrsGenerados.has(order.id!));
  }

  cerrarQRModal() { this.qrModalData = null; }

  // ===== RESEÑAS =====
  async loadReviews() {
    this.isLoading = true;
    this.cdr.detectChanges();
    try {
      this.reviews = await this.reviewsService.getAllReviews();
    } catch { this.error = 'Error al cargar reseñas'; }
    finally { this.isLoading = false; this.cdr.detectChanges(); }
  }

  async toggleAdminLike(review: Review) {
    if (!review.id) return;
    await this.reviewsService.toggleAdminLike(review.id);
    review.adminLike = !review.adminLike;
    this.cdr.detectChanges();
  }

  async eliminarReview(reviewId: string) {
    if (!confirm('¿Eliminar esta reseña?')) return;
    await this.reviewsService.eliminarReview(reviewId);
    this.reviews = this.reviews.filter(r => r.id !== reviewId);
    this.cdr.detectChanges();
  }

  getReviewsFiltradas(): Review[] {
    if (this.reviewsFiltro === 'con-admin-like') return this.reviews.filter(r => r.adminLike);
    return this.reviews;
  }

  // ===== BUZÓN =====
  async loadBuzon() {
    this.isLoading = true;
    this.cdr.detectChanges();
    try {
      this.sugerencias = await this.sugerenciasService.getTodas();
    } catch { this.error = 'Error al cargar sugerencias'; }
    finally { this.isLoading = false; this.cdr.detectChanges(); }
  }

  async marcarSugerenciaLeida(s: Sugerencia) {
    if (!s.id) return;
    await this.sugerenciasService.marcarLeida(s.id, !s.leida);
    s.leida = !s.leida;
    this.cdr.detectChanges();
  }

  async eliminarSugerencia(id: string) {
    if (!confirm('¿Eliminar esta sugerencia?')) return;
    await this.sugerenciasService.eliminar(id);
    this.sugerencias = this.sugerencias.filter(s => s.id !== id);
    this.cdr.detectChanges();
  }

  getSugerenciasFiltradas(): Sugerencia[] {
    if (this.sugerenciasFiltro === 'no-leidas') return this.sugerencias.filter(s => !s.leida);
    if (this.sugerenciasFiltro !== 'todas') return this.sugerencias.filter(s => s.tipo === this.sugerenciasFiltro);
    return this.sugerencias;
  }

  getTipoSugerenciaLabel(tipo: string): string {
    switch(tipo) {
      case 'queja': return '😤 Queja';
      case 'sugerencia': return '💡 Sugerencia';
      case 'felicitacion': return '🎉 Felicitación';
      default: return '💬 Otro';
    }
  }

  // ===== CORTE =====
  initCorte() {
    const hoy = new Date();
    if (this.tipoCorte === 'mensual') {
      this.corteFechaInicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0];
      this.corteFechaFin = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).toISOString().split('T')[0];
    } else {
      const dia = hoy.getDay();
      const lunes = new Date(hoy);
      lunes.setDate(hoy.getDate() - (dia === 0 ? 6 : dia - 1));
      const domingo = new Date(lunes);
      domingo.setDate(lunes.getDate() + 6);
      this.corteFechaInicio = lunes.toISOString().split('T')[0];
      this.corteFechaFin = domingo.toISOString().split('T')[0];
    }
  }

  cambiarTipoCorte() { this.initCorte(); this.corteResultado = null; }

  generarCorte() {
    const inicio = new Date(this.corteFechaInicio);
    const fin = new Date(this.corteFechaFin);
    fin.setHours(23, 59, 59);
    const pedidosCorte = this.orders.filter(o => {
      const fecha = new Date(o.createdAt);
      return fecha >= inicio && fecha <= fin;
    });
    const completados = pedidosCorte.filter(o => o.status === 'completed');
    const ingresos = completados.reduce((sum, o) => sum + (o.total || 0), 0);
    this.corteResultado = {
      periodo: `${this.formatDateShort(inicio)} — ${this.formatDateShort(fin)}`,
      total: pedidosCorte.length,
      completados: completados.length,
      pendientes: pedidosCorte.filter(o => o.status === 'pending').length,
      cancelados: pedidosCorte.filter(o => o.status === 'cancelled').length,
      confirmados: pedidosCorte.filter(o => o.status === 'confirmed').length,
      ingresos,
      pedidos: pedidosCorte
    };
    this.mostrarCorte = true;
    this.cdr.detectChanges();
  }

  exportarExcel() {
    const datos = this.filteredOrders.length > 0 ? this.filteredOrders : this.orders;
    const encabezados = ['ID', 'Cliente', 'Email', 'Teléfono', 'Producto', 'Cantidad', 'Total', 'Estado', 'Fecha'];
    const filas = datos.map(o => [o.id, o.name, o.email, o.phone, o.product, o.quantity, o.total, this.getStatusText(o.status), this.formatDate(o.createdAt)]);
    let csv = encabezados.join(',') + '\n';
    filas.forEach(fila => { csv += fila.map(v => `"${v || ''}"`).join(',') + '\n'; });
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pedidos-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  exportarCorteExcel() {
    if (!this.corteResultado) return;
    const encabezados = ['Cliente', 'Email', 'Producto', 'Cantidad', 'Total', 'Estado', 'Fecha'];
    const filas = this.corteResultado.pedidos.map((o: Order) => [o.name, o.email, o.product, o.quantity, o.total, this.getStatusText(o.status), this.formatDate(o.createdAt)]);
    let csv = `CORTE DE CAJA — ${this.corteResultado.periodo}\nTotal pedidos:,${this.corteResultado.total}\nIngresos:,$${this.corteResultado.ingresos}\n\n`;
    csv += encabezados.join(',') + '\n';
    filas.forEach((fila: any[]) => { csv += fila.map((v: any) => `"${v || ''}"`).join(',') + '\n'; });
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `corte-${this.corteFechaInicio}-${this.corteFechaFin}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async loadBlogPosts() {
    this.isLoading = true;
    this.error = '';
    this.blogPosts = [];
    try {
      await this.blogService.migrateDefaultPosts();
      const loaded = await this.blogService.getAllPosts();
      this.blogPosts = loaded.map((p, i) => ({
        id: p.id || `temp-${i}`,
        title: p.title || 'Sin título',
        excerpt: p.excerpt || '',
        content: p.content || '',
        date: p.date || '',
        category: p.category || '',
        image: p.image || '',
        published: p.published !== undefined ? p.published : true
      }));
    } catch (error: any) {
      this.error = `Error al cargar posts: ${error.message}`;
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  openBlogForm(post?: BlogPost) {
    if (post) { this.editingPost = post; this.blogForm = { ...post }; }
    else {
      this.editingPost = null;
      this.blogForm = { title: '', excerpt: '', content: '', date: new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }), category: 'Noticias', image: '', published: true };
    }
    this.showBlogForm = true;
  }

  closeBlogForm() {
    this.showBlogForm = false;
    this.editingPost = null;
    this.blogForm = { title: '', excerpt: '', content: '', date: '', category: '', image: '', published: true };
  }

  async saveBlogPost() {
    if (!this.blogForm.title || !this.blogForm.excerpt || !this.blogForm.category) { this.error = 'Completa todos los campos requeridos'; return; }
    this.isLoading = true;
    try {
      if (this.editingPost?.id) await this.blogService.updatePost(this.editingPost.id, this.blogForm);
      else await this.blogService.createPost(this.blogForm as Omit<BlogPost, 'id' | 'createdAt' | 'updatedAt'>);
      this.closeBlogForm();
      await this.loadBlogPosts();
    } catch (error: any) {
      this.error = `Error al guardar: ${error.message}`;
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  async deleteBlogPost(postId: string) {
    if (!confirm('¿Eliminar este artículo?')) return;
    try { await this.blogService.deletePost(postId); await this.loadBlogPosts(); }
    catch { this.error = 'Error al eliminar artículo'; }
  }

  async togglePostPublished(post: BlogPost) {
    try { await this.blogService.updatePost(post.id!, { published: !post.published }); await this.loadBlogPosts(); }
    catch { this.error = 'Error al cambiar estado'; }
  }

  async logout() {
    try { await this.authService.logout(); this.router.navigate(['/admin/login']); }
    catch {}
  }

  async deleteProduct(productId: string) {
    if (!confirm('¿Eliminar este producto?')) return;
    try { await this.productsService.deleteProduct(productId); await this.loadProducts(); }
    catch { this.error = 'Error al eliminar producto'; }
  }

  async updateOrderStatus(orderId: string, event: Event) {
    const select = event.target as HTMLSelectElement;
    const newStatus = select.value as Order['status'];
    try { await this.ordersService.updateOrderStatus(orderId, newStatus); await this.loadOrders(); await this.loadStats(); }
    catch { this.error = 'Error al actualizar estado'; }
  }

  formatPrice(price: number): string { return `$${price.toLocaleString('es-MX')}`; }
  formatDate(date: any): string { return new Date(date).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  formatDateShort(date: Date): string { return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }); }

  getStatusText(status: string): string {
    switch (status) {
      case 'pending': return 'Pendiente';
      case 'confirmed': return 'Confirmado';
      case 'completed': return 'Completado';
      case 'cancelled': return 'Cancelado';
      default: return status;
    }
  }

  trackByProductId(index: number, product: Product): string { return product.id || `product-${index}`; }
  trackByPostId(index: number, post: BlogPost): string { return post.id || `post-${index}`; }
  trackByOrderId(index: number, order: Order): string { return order.id || `order-${index}`; }
  getStatusBadgeClass(status: string): string { return status; }
}