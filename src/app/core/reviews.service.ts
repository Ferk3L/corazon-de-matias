import { Injectable } from '@angular/core';
import { FirestoreService } from './firestore.service';

export interface Review {
  id?: string;
  productId: string;
  productName: string;
  rating: number; // 1-5 estrellas
  comment: string;
  authorName: string | null; // null si es anónimo
  isAnonymous: boolean;
  createdAt: Date;
  approved?: boolean; // Para moderación
}

@Injectable({
  providedIn: 'root'
})
export class ReviewsService {
  constructor(private firestoreService: FirestoreService) {}

  async getProductReviews(productId: string): Promise<Review[]> {
    const reviews = await this.firestoreService.getCollectionWithQuery(
      'reviews',
      [
        { field: 'productId', operator: '==', value: productId },
        { field: 'approved', operator: '==', value: true }
      ],
      'createdAt',
      'desc'
    );
    
    return reviews.map((review: any) => {
      let createdAt = new Date();
      if (review.createdAt) {
        if (review.createdAt.toDate && typeof review.createdAt.toDate === 'function') {
          createdAt = review.createdAt.toDate();
        } else if (review.createdAt instanceof Date) {
          createdAt = review.createdAt;
        } else if (typeof review.createdAt === 'string' || typeof review.createdAt === 'number') {
          createdAt = new Date(review.createdAt);
        }
      }
      
      return {
        ...review,
        createdAt
      } as Review;
    });
  }

  async getAllApprovedReviews(): Promise<Review[]> {
    const reviews = await this.firestoreService.getCollectionWithQuery(
      'reviews',
      [{ field: 'approved', operator: '==', value: true }],
      'createdAt',
      'desc',
      50
    );
    
    return reviews.map((review: any) => {
      let createdAt = new Date();
      if (review.createdAt) {
        if (review.createdAt.toDate && typeof review.createdAt.toDate === 'function') {
          createdAt = review.createdAt.toDate();
        } else if (review.createdAt instanceof Date) {
          createdAt = review.createdAt;
        } else if (typeof review.createdAt === 'string' || typeof review.createdAt === 'number') {
          createdAt = new Date(review.createdAt);
        }
      }
      
      return {
        ...review,
        createdAt
      } as Review;
    });
  }

  async getProductAverageRating(productId: string): Promise<number> {
    const reviews = await this.getProductReviews(productId);
    
    if (reviews.length === 0) return 0;
    
    const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
    return Math.round((sum / reviews.length) * 10) / 10;
  }

  async createReview(review: Omit<Review, 'id' | 'createdAt' | 'approved'>): Promise<string> {
    const reviewData = {
      ...review,
      createdAt: new Date(),
      approved: true
    };
    
    return await this.firestoreService.addDocument('reviews', reviewData);
  }

  async getReviewCount(productId: string): Promise<number> {
    const reviews = await this.getProductReviews(productId);
    return reviews.length;
  }
}

