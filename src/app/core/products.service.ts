import { Injectable } from '@angular/core';
import { FirestoreService } from './firestore.service';

export interface Product {
  id?: string;
  name: string;
  description: string;
  price: number;          // precio base (mayoreo)
  priceMayoreo?: number;  // precio por 5kg o más
  priceMenudeo?: number;  // precio por menos de 5kg
  image: string;
  category?: string;
  sabores?: string[];
  available: boolean;
  featured?: boolean;
  kg?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

@Injectable({ providedIn: 'root' })
export class ProductsService {
  constructor(private firestoreService: FirestoreService) {}

  private processProducts(products: any[]): Product[] {
    return products
      .map((p: any) => ({
        ...p,
        createdAt: p.createdAt?.toDate?.() || p.createdAt || new Date(),
        updatedAt: p.updatedAt?.toDate?.() || p.updatedAt || new Date()
      }))
      .sort((a, b) => {
        const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
        const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
        return dateB.getTime() - dateA.getTime();
      }) as Product[];
  }

  async getAllProducts(): Promise<Product[]> {
    const products = await this.firestoreService.getCollection('products');
    return this.processProducts(products);
  }

  async getProductById(id: string): Promise<Product | null> {
    const product = await this.firestoreService.getDocument('products', id);
    if (!product) return null;
    return {
      ...product,
      createdAt: (product as any).createdAt?.toDate?.() || (product as any).createdAt,
      updatedAt: (product as any).updatedAt?.toDate?.() || (product as any).updatedAt
    } as Product;
  }

  async createProduct(product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const { Timestamp } = await import('firebase/firestore');
    return await this.firestoreService.addDocument('products', {
      ...product,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
  }

  async updateProduct(id: string, product: Partial<Product>): Promise<void> {
    const { Timestamp } = await import('firebase/firestore');
    const updateData: any = { ...product };
    delete updateData.id;
    delete updateData.createdAt;
    updateData.updatedAt = Timestamp.now();
    await this.firestoreService.updateDocument('products', id, updateData);
  }

  async deleteProduct(id: string): Promise<void> {
    await this.firestoreService.deleteDocument('products', id);
  }

  async getAvailableProducts(): Promise<Product[]> {
    try {
      const all = await this.firestoreService.getCollection('products');
      const available = all.filter((p: any) => p.available !== false);
      return this.processProducts(available);
    } catch (error) {
      console.error('Error loading products:', error);
      throw error;
    }
  }

  async getFeaturedProducts(): Promise<Product[]> {
    try {
      const all = await this.firestoreService.getCollection('products');
      const featured = all.filter((p: any) => p.featured === true && p.available !== false);
      return this.processProducts(featured);
    } catch (error) {
      return [];
    }
  }
}