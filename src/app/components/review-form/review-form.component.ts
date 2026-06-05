import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReviewsService, Review } from '../../core/reviews.service';

@Component({
  selector: 'app-review-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './review-form.component.html',
  styleUrl: './review-form.component.css'
})
export class ReviewFormComponent {
  @Input() productId: string = '';
  @Input() productName: string = '';
  @Output() reviewSubmitted = new EventEmitter<void>();

  review = {
    rating: 0,
    comment: '',
    authorName: '',
    isAnonymous: false
  };

  hoveredStar: number = 0;
  isSubmitting = false;
  showSuccess = false;

  constructor(private reviewsService: ReviewsService) {}

  setRating(rating: number) {
    this.review.rating = rating;
  }

  toggleAnonymous() {
    this.review.isAnonymous = !this.review.isAnonymous;
    if (this.review.isAnonymous) {
      this.review.authorName = '';
    }
  }

  async submitReview() {
    if (this.review.rating === 0) {
      alert('Por favor, selecciona una calificación con estrellas');
      return;
    }

    if (!this.review.comment.trim()) {
      alert('Por favor, escribe un comentario');
      return;
    }

    if (!this.review.isAnonymous && !this.review.authorName.trim()) {
      alert('Por favor, ingresa tu nombre o marca como anónimo');
      return;
    }

    if (this.isSubmitting) return;

    this.isSubmitting = true;

    try {
      const reviewData: Omit<Review, 'id' | 'createdAt' | 'approved'> = {
        productId: this.productId,
        productName: this.productName,
        rating: this.review.rating,
        comment: this.review.comment.trim(),
        authorName: this.review.isAnonymous ? null : this.review.authorName.trim(),
        isAnonymous: this.review.isAnonymous
      };

      await this.reviewsService.createReview(reviewData);
      
      this.showSuccess = true;
      
      // Resetear formulario
      this.review = {
        rating: 0,
        comment: '',
        authorName: '',
        isAnonymous: false
      };
      this.hoveredStar = 0;

      // Emitir evento
      this.reviewSubmitted.emit();

      // Ocultar mensaje de éxito después de 3 segundos
      setTimeout(() => {
        this.showSuccess = false;
      }, 3000);

    } catch (error) {
      console.error('Error al enviar la reseña:', error);
      alert('Hubo un error al enviar tu reseña. Por favor, intenta nuevamente.');
    } finally {
      this.isSubmitting = false;
    }
  }
}

