import { Component, Input, OnInit, OnChanges, SimpleChanges, ChangeDetectorRef, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReviewsService, Review } from '../../core/reviews.service';
import { ClientAuthService } from '../../core/client-auth.service';

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
  @Input() refreshTrigger: number = 0;

  reviews: Review[] = [];
  averageRating: number = 0;
  totalReviews: number = 0;
  isLoading = true;
  hasError = false;
  errorMessage = '';
  currentUserUid = signal<string | null>(null);

  constructor(
    private reviewsService: ReviewsService,
    private clientAuthService: ClientAuthService,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    const user = await this.clientAuthService.waitForAuthState();
    if (user) this.currentUserUid.set(user.uid);
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
      this.cdr.detectChanges();

      this.reviews = await this.reviewsService.getProductReviews(this.productId);
      this.totalReviews = this.reviews.length;
      this.averageRating = await this.reviewsService.getProductAverageRating(this.productId);
    } catch (error: any) {
      this.hasError = true;
      this.errorMessage = error.message || 'Error al cargar reseñas';
      this.reviews = [];
      this.totalReviews = 0;
      this.averageRating = 0;
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  async toggleLike(review: Review) {
    const uid = this.currentUserUid();
    if (!uid || !review.id) return;
    await this.reviewsService.toggleLike(review.id, uid);
    const likes = review.likes || [];
    if (likes.includes(uid)) {
      review.likes = likes.filter(id => id !== uid);
    } else {
      review.likes = [...likes, uid];
    }
    this.cdr.detectChanges();
  }

  userLiked(review: Review): boolean {
    const uid = this.currentUserUid();
    if (!uid) return false;
    return (review.likes || []).includes(uid);
  }

  likesCount(review: Review): number {
    return (review.likes || []).length + (review.adminLike ? 1 : 0);
  }

  roundRating(): number { return Math.round(this.averageRating); }
  getStarsArray(rating: number): number[] { return Array(5).fill(0).map((_, i) => i < rating ? 1 : 0); }

  formatDate(date: Date): string {
    if (!date) return '';
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
  }
}