import { Injectable } from '@angular/core';
import { ProductsService, Product } from './products.service';

/**
 * Service responsible for migrating default product data to Firestore
 * Used for initial setup when the products collection is empty
 */
@Injectable({
  providedIn: 'root'
})
export class MigrationService {
  private defaultProducts: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>[] = [
    {
      name: 'Gomitas Frutales',
      description: 'Deliciosas gomitas con sabores naturales de frutas: fresa, naranja, limón, uva y más.',
      price: 150,
      image: '/images/gomitas-frutales.jpg',
      category: 'Gomitas',
      available: true
    },
    {
      name: 'Gomitas Arcoíris',
      description: 'Coloridas gomitas con una mezcla de sabores tropicales que alegrarán tu día.',
      price: 180,
      image: 'https://images.unsplash.com/photo-1499195333224-3ce974eecb47?w=400&h=300&fit=crop',
      category: 'Gomitas',
      available: true
    },
    {
      name: 'Gomitas Ácidas',
      description: 'Para los amantes de lo ácido, gomitas con un toque picante y refrescante.',
      price: 160,
      image: '/images/gomitas-acidas.jpg',
      category: 'Gomitas',
      available: true
    },
    {
      name: 'Pack Especial',
      description: 'Combinación perfecta de nuestras mejores gomitas en un solo paquete.',
      price: 350,
      image: 'https://images.unsplash.com/photo-1514517521153-1be72277b32f?w=400&h=300&fit=crop',
      category: 'Packs',
      available: true
    },
    {
      name: 'Gomitas de Corazón',
      description: 'Gomitas en forma de corazón, perfectas para regalar o disfrutar.',
      price: 200,
      image: '/images/gomitas-de-corazon.jpg',
      category: 'Gomitas',
      available: true
    },
    {
      name: 'Gomitas Ositos',
      description: 'Los clásicos ositos de gomita con sabores variados y textura suave.',
      price: 140,
      image: '/images/gomitas-ositos.jpg',
      category: 'Gomitas',
      available: true
    },
    {
      name: 'Bombón de coco y fresa',
      description: 'Deliciosos bombones con sabor a coco y fresa, una combinación perfecta de sabores tropicales.',
      price: 220,
      image: '/images/bombon-coco-fresa.jpg',
      category: 'Bombones',
      available: true
    }
  ];

  constructor(private productsService: ProductsService) {}

  /**
   * Migrates all default products to Firestore
   */
  async migrateDefaultProducts(): Promise<{ success: number; errors: number }> {
    let success = 0;
    let errors = 0;

    for (const product of this.defaultProducts) {
      try {
        await this.productsService.createProduct(product);
        success++;
      } catch (error) {
        console.error(`Migration error for ${product.name}:`, error);
        errors++;
      }
    }

    return { success, errors };
  }

  /**
   * Checks if products collection is empty and migrates default products if needed
   */
  async checkAndMigrate(): Promise<void> {
    try {
      const products = await this.productsService.getAllProducts();
      if (products.length === 0) {
        console.log('No products found. Starting migration...');
        const result = await this.migrateDefaultProducts();
        console.log(`Migration completed: ${result.success} successful, ${result.errors} errors`);
      }
    } catch (error: any) {
      console.error('Error checking products:', error);
      if (error instanceof Error && (error.message.includes('permission') || error.message.includes('not found'))) {
        try {
          await this.migrateDefaultProducts();
        } catch (migrateError) {
          console.error('Migration error:', migrateError);
        }
      }
    }
  }

  /**
   * Forces migration of products that don't already exist
   */
  async forceMigrateAllProducts(): Promise<{ success: number; errors: number; details: string[] }> {
    const details: string[] = [];
    let success = 0;
    let errors = 0;

    let existingProducts: Product[] = [];
    try {
      existingProducts = await this.productsService.getAllProducts();
    } catch (error) {
      console.warn('Could not load existing products, continuing with migration...');
    }

    const existingNames = existingProducts.map(p => p.name.toLowerCase());

    for (const product of this.defaultProducts) {
      if (existingNames.includes(product.name.toLowerCase())) {
        details.push(`Skipped: "${product.name}" already exists`);
        continue;
      }

      try {
        await this.productsService.createProduct(product);
        success++;
        details.push(`Migrated: "${product.name}"`);
      } catch (error: any) {
        errors++;
        details.push(`Error: "${product.name}" - ${error.message || 'Unknown error'}`);
        console.error(`Migration error for ${product.name}:`, error);
      }
    }

    return { success, errors, details };
  }
}
