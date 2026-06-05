import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ReviewsService } from '../../core/reviews.service';
import { ProductsService } from '../../core/products.service';

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
  imports: [CommonModule, RouterLink],
  templateUrl: './catalog-page.component.html',
  styleUrl: './catalog-page.component.css'
})
export class CatalogPageComponent implements OnInit {
  products = signal<Product[]>([]);
  isLoading = signal(true);
  error = signal<string | null>(null);

  constructor(
    private reviewsService: ReviewsService,
    private productsService: ProductsService
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

  formatPrice(price: number): string { return `$${price}`; }
  roundRating(rating: number): number { return Math.round(rating); }

  orderOnWhatsApp(productName: string) {
    const message = `Hola, me interesa el producto: ${productName}`;
    window.open(`https://wa.me/526181260061?text=${encodeURIComponent(message)}`, '_blank');
  }
}