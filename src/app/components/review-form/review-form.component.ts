import { Component, EventEmitter, Input, Output, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ReviewsService, Review } from '../../core/reviews.service';
import { ClientAuthService } from '../../core/client-auth.service';

@Component({
  selector: 'app-review-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './review-form.component.html',
  styleUrl: './review-form.component.css'
})
export class ReviewFormComponent implements OnInit {
  @Input() productId: string = '';
  @Input() productName: string = '';
  @Output() reviewSubmitted = new EventEmitter<void>();

  review = { rating: 0, comment: '', authorName: '' };
  hoveredStar = 0;
  isSubmitting = false;
  showSuccess = false;

  // Estado del usuario
  logueado = signal(false);
  verificado = signal(false);
  nombreUsuario = signal('');

  constructor(
    private reviewsService: ReviewsService,
    private clientAuthService: ClientAuthService
  ) {}

  async ngOnInit() {
    const user = await this.clientAuthService.waitForAuthState();
    if (user && user.email !== 'corazondematias@gmail.com') {
      this.logueado.set(true);
      this.verificado.set(user.emailVerified);
      this.nombreUsuario.set(user.displayName || user.email?.split('@')[0] || 'Cliente');
      this.review.authorName = this.nombreUsuario();
    }
  }

  setRating(rating: number) { this.review.rating = rating; }

  async submitReview() {
    if (!this.logueado()) return;
    if (!this.verificado()) return;
    if (this.review.rating === 0) { alert('Por favor selecciona una calificación'); return; }
    if (!this.review.comment.trim()) { alert('Por favor escribe un comentario'); return; }
    if (this.isSubmitting) return;

    this.isSubmitting = true;
    try {
      const reviewData: Omit<Review, 'id' | 'createdAt' | 'approved'> = {
        productId: this.productId,
        productName: this.productName,
        rating: this.review.rating,
        comment: this.review.comment.trim(),
        authorName: this.nombreUsuario(),
        isAnonymous: false
      };
      await this.reviewsService.createReview(reviewData);
      this.showSuccess = true;
      this.review = { rating: 0, comment: '', authorName: this.nombreUsuario() };
      this.hoveredStar = 0;
      this.reviewSubmitted.emit();
      setTimeout(() => this.showSuccess = false, 3000);
    } catch (error) {
      alert('Error al enviar la reseña. Intenta nuevamente.');
    } finally {
      this.isSubmitting = false;
    }
  }
}