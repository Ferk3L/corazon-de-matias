import { Routes } from '@angular/router';
import { HomePageComponent } from './pages/home-page/home-page.component';
import { AboutPageComponent } from './pages/about-page/about-page.component';
import { CatalogPageComponent } from './pages/catalog-page/catalog-page.component';
import { OrdersPageComponent } from './pages/orders-page/orders-page.component';
import { BlogPageComponent } from './pages/blog-page/blog-page.component';
import { ContactPageComponent } from './pages/contact-page/contact-page.component';
import { ProductDetailPageComponent } from './pages/product-detail-page/product-detail-page.component';
import { AdminLoginPageComponent } from './pages/admin-login-page/admin-login-page.component';
import { AdminDashboardPageComponent } from './pages/admin-dashboard-page/admin-dashboard-page.component';
import { AdminProductFormPageComponent } from './pages/admin-product-form-page/admin-product-form-page.component';
import { ClientRegisterPageComponent } from './pages/client-register-page/client-register-page.component';
import { ClientLoginPageComponent } from './pages/client-login-page/client-login-page.component';
import { ClientDashboardPageComponent } from './pages/client-dashboard-page/client-dashboard-page.component';
import { CashbackQrPageComponent } from './pages/cashback-qr-page/cashback-qr-page.component';
import { BuzonSugerenciasComponent } from './pages/buzon-sugerencias/buzon-sugerencias.component';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', component: HomePageComponent, title: 'Corazon De Matias - Inicio' },
  { path: 'sobre-nosotros', component: AboutPageComponent, title: 'Corazon De Matias - Sobre Nosotros' },
  { path: 'catalogo', component: CatalogPageComponent, title: 'Corazon De Matias - Catálogo' },
  { path: 'producto/:id', component: ProductDetailPageComponent, title: 'Corazon De Matias - Detalle del Producto' },
  { path: 'pedidos', component: OrdersPageComponent, title: 'Corazon De Matias - Pedidos' },
  { path: 'blog', component: BlogPageComponent, title: 'Corazon De Matias - Blog' },
  { path: 'contacto', component: ContactPageComponent, title: 'Corazon De Matias - Contacto' },

  // Clientes frecuentes
  { path: 'clientes/registro', component: ClientRegisterPageComponent, title: 'Corazon De Matias - Registro' },
  { path: 'clientes/login', component: ClientLoginPageComponent, title: 'Corazon De Matias - Iniciar Sesión' },
  { path: 'clientes/mi-cuenta', component: ClientDashboardPageComponent, title: 'Corazon De Matias - Mi Cuenta' },

  // QR Cashback
  { path: 'cashback', component: CashbackQrPageComponent, title: 'Corazon De Matias - Cashback' },

  // Admin
  { path: 'admin/login', component: AdminLoginPageComponent, title: 'Admin - Login' },
  { path: 'admin', component: AdminDashboardPageComponent, title: 'Admin - Dashboard', canActivate: [authGuard] },
  { path: 'admin/products/new', component: AdminProductFormPageComponent, title: 'Admin - Nuevo Producto', canActivate: [authGuard] },
  { path: 'admin/products/:id/edit', component: AdminProductFormPageComponent, title: 'Admin - Editar Producto', canActivate: [authGuard] },

  { path: 'buzon', component: BuzonSugerenciasComponent },
  { path: '**', redirectTo: '' }
];