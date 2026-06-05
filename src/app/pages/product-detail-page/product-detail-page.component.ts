import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ReviewsService } from '../../core/reviews.service';
import { ProductsService } from '../../core/products.service';
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

  constructor(
    private route: ActivatedRoute,
    private reviewsService: ReviewsService,
    private productsService: ProductsService,
    private cdr: ChangeDetectorRef
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
      console.log('Cargando producto:', this.productId);
      const firestoreProduct = await this.productsService.getProductById(this.productId);
      console.log('Producto cargado:', firestoreProduct);
      
      if (firestoreProduct && firestoreProduct.id) {
        this.product = {
          id: firestoreProduct.id,
          name: firestoreProduct.name,
          description: firestoreProduct.description,
          price: firestoreProduct.price,
          image: firestoreProduct.image,
          category: firestoreProduct.category,
          available: firestoreProduct.available ?? true
        };
        this.isLoading = false;
        this.cdr.detectChanges();
        
        // Cargar ratings de forma asíncrona (sin bloquear)
        try {
          const averageRating = await this.reviewsService.getProductAverageRating(this.productId);
          const reviewCount = await this.reviewsService.getReviewCount(this.productId);
          
          this.product = {
            ...this.product,
            averageRating,
            reviewCount
          };
          this.cdr.detectChanges();
        } catch (error) {
          console.error('Error al cargar ratings:', error);
        }
      } else {
        this.error = 'Producto no encontrado';
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    } catch (error: any) {
      console.error('Error al cargar producto de Firestore:', error);
      this.error = 'Error al cargar el producto. Por favor intenta de nuevo.';
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  formatPrice(price: number): string {
    return `$${price}`;
  }

  roundRating(rating: number): number {
    return Math.round(rating);
  }

  orderOnWhatsApp(productName: string) {
    const message = `Hola, me interesa ${productName}`;
    const phoneNumber = '526181260061';
    const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  }

  refreshCounter = 0;

  onReviewSubmitted() {
    // Incrementar contador para forzar actualización de reviews
    this.refreshCounter++;
    // Recargar el producto para actualizar ratings
    this.loadProduct();
  }
}

