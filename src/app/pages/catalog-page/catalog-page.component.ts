import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { ReviewsService } from '../../core/reviews.service';
import { ProductsService } from '../../core/products.service';
import { CartService } from '../../core/cart.service';

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  priceMayoreo?: number;
  priceMenudeo?: number;
  image: string;
  category?: string;
  available?: boolean;
  averageRating?: number;
  reviewCount?: number;
}

@Component({
  selector: 'app-catalog-page',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './catalog-page.component.html',
  styleUrl: './catalog-page.component.css'
})
export class CatalogPageComponent implements OnInit {
  products = signal<Product[]>([]);
  isLoading = signal(true);
  error = signal<string | null>(null);
  kgSeleccionado: Record<string, number> = {};
  notifVisible = signal(false);
  notifProducto = signal('');

  constructor(
    private reviewsService: ReviewsService,
    private productsService: ProductsService,
    public cartService: CartService,
    private router: Router
  ) {}

  async ngOnInit() {
    await this.loadProducts();
  }

  async loadProducts() {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      const firestoreProducts = await this.productsService.getAvailableProducts();
      const mapped = firestoreProducts.map(p => ({
        id: p.id || '',
        name: p.name,
        description: p.description,
        price: p.price,
        priceMayoreo: p.priceMayoreo,
        priceMenudeo: p.priceMenudeo,
        image: p.image,
        category: p.category,
        available: p.available ?? true
      }));
      this.products.set(mapped);
      mapped.forEach(p => { this.kgSeleccionado[p.id] = 1; });
      if (mapped.length === 0) this.error.set('No hay productos disponibles.');
      this.loadRatings();
    } catch {
      this.error.set('Error al cargar productos. Intenta de nuevo.');
    } finally {
      this.isLoading.set(false);
    }
  }

  async loadRatings() {
    try {
      const updated = await Promise.all(
        this.products().map(async (product) => {
          try {
            const averageRating = await this.reviewsService.getProductAverageRating(product.id);
            const reviewCount = await this.reviewsService.getReviewCount(product.id);
            return { ...product, averageRating, reviewCount };
          } catch { return product; }
        })
      );
      this.products.set(updated);
    } catch {}
  }

  estaEnCarrito(productId: string): boolean {
    return this.cartService.items().some(i => i.productId === productId);
  }

  kgEnCarrito(productId: string): number {
    return this.cartService.items().find(i => i.productId === productId)?.kg || 0;
  }

  agregarAlCarrito(product: Product) {
    const kg = this.kgSeleccionado[product.id] || 1;
    this.cartService.agregar(
      {
        id: product.id,
        name: product.name,
        image: product.image,
        precioMenudeo: product.priceMenudeo ?? product.price,
        precioMayoreo: product.priceMayoreo ?? product.price
      },
      kg
    );
    this.notifProducto.set(product.name);
    this.notifVisible.set(true);
    setTimeout(() => this.notifVisible.set(false), 3000);
  }

  irAPedidos() {
    this.router.navigate(['/pedidos']);
  }

  getKg(productId: string): number {
    return this.kgSeleccionado[productId] || 1;
  }

  setKg(productId: string, value: number) {
    this.kgSeleccionado[productId] = Math.max(1, value);
  }

  formatPrice(price: number): string { return `$${price}`; }
  roundRating(rating: number): number { return Math.round(rating); }
}