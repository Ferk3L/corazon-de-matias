import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ReviewsService } from '../../core/reviews.service';
import { ProductsService } from '../../core/products.service';
import { CartService } from '../../core/cart.service';
import { ReviewFormComponent } from '../../components/review-form/review-form.component';
import { ReviewListComponent } from '../../components/review-list/review-list.component';
import { Product } from '../catalog-page/catalog-page.component';

@Component({
  selector: 'app-product-detail-page',
  standalone: true,
  imports: [CommonModule, RouterLink, ReviewFormComponent, ReviewListComponent],
  templateUrl: './product-detail-page.component.html',
  styleUrl: './product-detail-page.component.css'
})
export class ProductDetailPageComponent implements OnInit {
  product: Product | null = null;
  isLoading = true;
  error: string | null = null;
  productId: string = '';
  kgSeleccionado = 1;
  agregado = false;
  refreshCounter = 0;

  constructor(
    private route: ActivatedRoute,
    private reviewsService: ReviewsService,
    private productsService: ProductsService,
    private cdr: ChangeDetectorRef,
    public cartService: CartService
  ) {}

  async ngOnInit() {
    this.route.params.subscribe(async params => {
      this.productId = params['id'];
      await this.loadProduct();
    });
  }

  async loadProduct() {
    this.isLoading = true;
    this.error = null;
    try {
      const firestoreProduct = await this.productsService.getProductById(this.productId);
      if (firestoreProduct && firestoreProduct.id) {
        this.product = {
          id: firestoreProduct.id,
          name: firestoreProduct.name,
          description: firestoreProduct.description,
          price: firestoreProduct.price,
          priceMayoreo: firestoreProduct.priceMayoreo,
          priceMenudeo: firestoreProduct.priceMenudeo,
          image: firestoreProduct.image,
          category: firestoreProduct.category,
          available: firestoreProduct.available ?? true
        };
        this.isLoading = false;
        this.cdr.detectChanges();

        try {
          const averageRating = await this.reviewsService.getProductAverageRating(this.productId);
          const reviewCount = await this.reviewsService.getReviewCount(this.productId);
          this.product = { ...this.product, averageRating, reviewCount };
          this.cdr.detectChanges();
        } catch {}
      } else {
        this.error = 'Producto no encontrado';
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    } catch (error: any) {
      this.error = 'Error al cargar el producto.';
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  setKg(value: number) {
    this.kgSeleccionado = Math.max(1, value);
  }

  agregarAlCarrito() {
    if (!this.product) return;
    this.cartService.agregar(
      { id: this.product.id, name: this.product.name, image: this.product.image },
      this.kgSeleccionado
    );
    this.agregado = true;
    setTimeout(() => this.agregado = false, 2500);
  }

  formatPrice(price: number): string { return `$${price}`; }
  roundRating(rating: number): number { return Math.round(rating); }

  onReviewSubmitted() {
    this.refreshCounter++;
    this.loadProduct();
  }
}