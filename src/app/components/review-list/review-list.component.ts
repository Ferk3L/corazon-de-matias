import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReviewsService, Review } from '../../core/reviews.service';

@Component({
  selector: 'app-review-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './review-list.component.html',
  styleUrl: './review-list.component.css'
})
export class ReviewListComponent implements OnInit, OnChanges {
  @Input() productId: string = '';
  @Input() productName: string = '';
  @Input() refreshTrigger: number = 0; // Para forzar actualización

  reviews: Review[] = [];
  averageRating: number = 0;
  totalReviews: number = 0;
  isLoading = true;
  hasError = false;
  errorMessage = '';

  constructor(private reviewsService: ReviewsService) {}

  async ngOnInit() {
    await this.loadReviews();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['refreshTrigger'] && !changes['refreshTrigger'].firstChange) {
      this.loadReviews();
    }
  }

  async loadReviews() {
    try {
      this.isLoading = true;
      this.hasError = false;
      this.errorMessage = '';
      
      this.reviews = await this.reviewsService.getProductReviews(this.productId);
      this.totalReviews = this.reviews.length;
      this.averageRating = await this.reviewsService.getProductAverageRating(this.productId);
    } catch (error: any) {
      console.error('Error al cargar reseñas:', error);
      this.hasError = true;
      this.errorMessage = error.message || 'Error al conectar con Firestore. Verifica la consola del navegador para más detalles.';
      this.reviews = [];
      this.totalReviews = 0;
      this.averageRating = 0;
    } finally {
      this.isLoading = false;
    }
  }

  roundRating(): number {
    return Math.round(this.averageRating);
  }

  getStarsArray(rating: number): number[] {
    return Array(5).fill(0).map((_, i) => i < rating ? 1 : 0);
  }

  formatDate(date: Date): string {
    if (!date) return '';
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString('es-MX', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }
}

