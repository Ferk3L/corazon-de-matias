import { Injectable } from '@angular/core';
import { FirestoreService } from './firestore.service';
import {
  getFirestore, doc, updateDoc, arrayUnion, arrayRemove,
  getDoc, collection, query, where, orderBy, getDocs, addDoc, Timestamp
} from 'firebase/firestore';
import { app } from '../app.config';

export interface Review {
  id?: string;
  productId: string;
  productName: string;
  rating: number;
  comment: string;
  authorName: string | null;
  authorUid?: string;
  isAnonymous: boolean;
  createdAt: Date;
  approved?: boolean;
  likes?: string[];       // UIDs de clientes que dieron ❤️
  adminLike?: boolean;    // Si el admin dio ❤️
}

@Injectable({ providedIn: 'root' })
export class ReviewsService {
  private db = getFirestore(app);

  constructor(private firestoreService: FirestoreService) {}

  async getProductReviews(productId: string): Promise<Review[]> {
    const reviews = await this.firestoreService.getCollectionWithQuery(
      'reviews',
      [
        { field: 'productId', operator: '==', value: productId },
        { field: 'approved', operator: '==', value: true }
      ],
      'createdAt', 'desc'
    );
    return reviews.map((r: any) => this.mapReview(r));
  }

  async getAllReviews(): Promise<Review[]> {
    const reviews = await this.firestoreService.getCollectionWithQuery(
      'reviews', [], 'createdAt', 'desc', 100
    );
    return reviews.map((r: any) => this.mapReview(r));
  }

  async getAllApprovedReviews(): Promise<Review[]> {
    const reviews = await this.firestoreService.getCollectionWithQuery(
      'reviews',
      [{ field: 'approved', operator: '==', value: true }],
      'createdAt', 'desc', 50
    );
    return reviews.map((r: any) => this.mapReview(r));
  }

  async getProductAverageRating(productId: string): Promise<number> {
    const reviews = await this.getProductReviews(productId);
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    return Math.round((sum / reviews.length) * 10) / 10;
  }

  async getReviewCount(productId: string): Promise<number> {
    const reviews = await this.getProductReviews(productId);
    return reviews.length;
  }

  async createReview(review: Omit<Review, 'id' | 'createdAt' | 'approved'>): Promise<string> {
    const reviewData = {
      ...review,
      createdAt: new Date(),
      approved: true,
      likes: [],
      adminLike: false
    };
    return await this.firestoreService.addDocument('reviews', reviewData);
  }

  // ── Like de cliente ──
  async toggleLike(reviewId: string, uid: string): Promise<void> {
    const ref = doc(this.db, 'reviews', reviewId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const data = snap.data();
    const likes: string[] = data['likes'] || [];
    if (likes.includes(uid)) {
      await updateDoc(ref, { likes: arrayRemove(uid) });
    } else {
      await updateDoc(ref, { likes: arrayUnion(uid) });
    }
  }

  // ── Like del admin ──
  async toggleAdminLike(reviewId: string): Promise<void> {
    const ref = doc(this.db, 'reviews', reviewId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const adminLike = snap.data()['adminLike'] || false;
    await updateDoc(ref, { adminLike: !adminLike });
  }

  // ── Aprobar/rechazar reseña ──
  async aprobarReview(reviewId: string, aprobada: boolean): Promise<void> {
    const ref = doc(this.db, 'reviews', reviewId);
    await updateDoc(ref, { approved: aprobada });
  }

  // ── Eliminar reseña ──
  async eliminarReview(reviewId: string): Promise<void> {
    await this.firestoreService.deleteDocument('reviews', reviewId);
  }

  private mapReview(r: any): Review {
    let createdAt = new Date();
    if (r.createdAt?.toDate) createdAt = r.createdAt.toDate();
    else if (r.createdAt instanceof Date) createdAt = r.createdAt;
    else if (r.createdAt) createdAt = new Date(r.createdAt);
    return { ...r, createdAt, likes: r.likes || [], adminLike: r.adminLike || false };
  }
}