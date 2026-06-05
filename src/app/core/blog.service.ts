import { Injectable } from '@angular/core';
import { FirestoreService } from './firestore.service';

/**
 * Interface defining the structure of a Blog Post entity
 */
export interface BlogPost {
  id?: string;
  title: string;
  excerpt: string;
  content?: string;
  date: string;
  category: string;
  image: string;
  published: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Service responsible for managing blog post operations with Firestore
 */
@Injectable({
  providedIn: 'root'
})
export class BlogService {
  constructor(private firestoreService: FirestoreService) {}

  /**
   * Converts Firestore timestamps to Date objects and sorts posts by creation date
   */
  private processPosts(posts: any[]): BlogPost[] {
    return posts
      .map((post: any) => ({
        ...post,
        createdAt: post.createdAt?.toDate?.() || post.createdAt || new Date(),
        updatedAt: post.updatedAt?.toDate?.() || post.updatedAt || new Date()
      }))
      .sort((a, b) => {
        const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
        const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
        return dateB.getTime() - dateA.getTime();
      }) as BlogPost[];
  }

  /**
   * Retrieves all blog posts from Firestore
   */
  async getAllPosts(): Promise<BlogPost[]> {
    const posts = await this.firestoreService.getCollection('blog');
    return this.processPosts(posts);
  }

  /**
   * Retrieves only published blog posts for public display
   */
  async getPublishedPosts(): Promise<BlogPost[]> {
    const allPosts = await this.firestoreService.getCollection('blog');
    const publishedPosts = allPosts.filter((p: any) => p.published === true || p.published === undefined);
    return this.processPosts(publishedPosts);
  }

  /**
   * Retrieves a single blog post by its ID
   */
  async getPostById(id: string): Promise<BlogPost | null> {
    const post = await this.firestoreService.getDocument('blog', id);
    if (!post) return null;
    
    return {
      ...post,
      createdAt: (post as any).createdAt?.toDate?.() || (post as any).createdAt,
      updatedAt: (post as any).updatedAt?.toDate?.() || (post as any).updatedAt
    } as BlogPost;
  }

  /**
   * Creates a new blog post in Firestore
   */
  async createPost(post: Omit<BlogPost, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const { Timestamp } = await import('firebase/firestore');
    const postData = {
      ...post,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };
    
    return await this.firestoreService.addDocument('blog', postData);
  }

  /**
   * Updates an existing blog post in Firestore
   */
  async updatePost(id: string, post: Partial<BlogPost>): Promise<void> {
    const { Timestamp } = await import('firebase/firestore');
    const updateData: any = { ...post };
    delete updateData.id;
    delete updateData.createdAt;
    updateData.updatedAt = Timestamp.now();
    
    await this.firestoreService.updateDocument('blog', id, updateData);
  }

  /**
   * Deletes a blog post from Firestore
   */
  async deletePost(id: string): Promise<void> {
    await this.firestoreService.deleteDocument('blog', id);
  }

  /**
   * Retrieves published posts filtered by category
   */
  async getPostsByCategory(category: string): Promise<BlogPost[]> {
    const allPosts = await this.getPublishedPosts();
    return allPosts.filter(p => p.category === category);
  }

  /**
   * Migrates default blog posts to Firestore if collection is empty
   * Used for initial setup of the blog section
   */
  async migrateDefaultPosts(): Promise<{ success: number; errors: number; details: string[] }> {
    const defaultPosts: Omit<BlogPost, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        title: 'Beneficios de las Gomitas Naturales',
        excerpt: 'Descubre por qué nuestras gomitas hechas con ingredientes naturales son una mejor opción para ti y tu familia.',
        content: 'Las gomitas naturales ofrecen múltiples beneficios para la salud. A diferencia de las gomitas industriales, las nuestras están hechas con ingredientes de origen natural, sin colorantes artificiales ni conservadores dañinos.\n\nEntre los principales beneficios encontramos:\n\n1. Mejor digestión\n2. Menos azúcares procesados\n3. Sabores más auténticos\n4. Sin aditivos químicos\n\nEn Corazón de Matías, nos comprometemos a ofrecer productos que no solo sean deliciosos, sino también más saludables para toda la familia.',
        date: '15 Nov 2025',
        category: 'Salud',
        image: 'https://images.unsplash.com/photo-1514517521153-1be72277b32f?w=400&h=250&fit=crop',
        published: true
      },
      {
        title: '5 Recetas Creativas con Gomitas',
        excerpt: 'Ideas innovadoras para usar gomitas en postres, decoraciones y más.',
        content: '¿Sabías que las gomitas pueden ser el ingrediente estrella de muchos postres? Aquí te compartimos 5 recetas creativas:\n\n1. **Gelatina arcoíris con gomitas**: Coloca gomitas en el fondo del molde antes de verter la gelatina.\n\n2. **Paletas heladas de gomitas**: Agrega gomitas a tus paletas de hielo favoritas.\n\n3. **Cupcakes decorados**: Usa gomitas como decoración en tus cupcakes.\n\n4. **Brochetas de frutas y gomitas**: Combina frutas frescas con gomitas en brochetas coloridas.\n\n5. **Malteada de gomitas**: Licúa gomitas con helado de vainilla para una malteada única.',
        date: '10 Nov 2025',
        category: 'Recetas',
        image: 'https://images.unsplash.com/photo-1587241321921-91a834d82ffc?w=400&h=250&fit=crop',
        published: true
      },
      {
        title: 'Historia de las Gomitas: Un Dulce Viaje',
        excerpt: 'Conoce la fascinante historia detrás de uno de los dulces más populares del mundo.',
        content: 'La historia de las gomitas se remonta a principios del siglo XX en Alemania. Hans Riegel, fundador de Haribo, creó los primeros ositos de goma en 1922.\n\nDesde entonces, las gomitas han evolucionado enormemente:\n\n- **1920s**: Nacen los primeros ositos de goma\n- **1960s**: Se popularizan en América\n- **1980s**: Surgen nuevas formas y sabores\n- **2000s**: Tendencia hacia ingredientes naturales\n- **Actualidad**: Gomitas artesanales como las nuestras',
        date: '5 Nov 2025',
        category: 'Historia',
        image: 'https://images.unsplash.com/photo-1548848979-47519fe73dca?w=400&h=250&fit=crop',
        published: true
      },
      {
        title: 'Cómo Conservar tus Gomitas Frescas',
        excerpt: 'Tips y consejos para mantener tus gomitas en perfecto estado por más tiempo.',
        content: 'Para disfrutar de tus gomitas en su mejor momento, sigue estos consejos de conservación:\n\n**Almacenamiento:**\n- Guárdalas en un lugar fresco y seco\n- Evita la luz directa del sol\n- Temperatura ideal: 18-22°C\n\n**Recipientes:**\n- Usa contenedores herméticos\n- Evita bolsas abiertas\n- Separa sabores fuertes\n\n**Duración:**\n- En condiciones óptimas: 6-12 meses\n- Una vez abierto: consumir en 2-3 semanas',
        date: '1 Nov 2025',
        category: 'Tips',
        image: 'https://images.unsplash.com/photo-1575224300306-1b8da36134ec?w=400&h=250&fit=crop',
        published: true
      },
      {
        title: 'Gomitas Artesanales vs Industriales',
        excerpt: 'Conoce las diferencias entre las gomitas artesanales y las producidas industrialmente.',
        content: 'Las gomitas artesanales y las industriales tienen diferencias significativas:\n\n**Gomitas Artesanales (como las nuestras):**\n- Ingredientes naturales seleccionados\n- Producción en lotes pequeños\n- Sabores más intensos y auténticos\n- Sin conservadores artificiales\n- Mayor cuidado en cada pieza\n\n**Gomitas Industriales:**\n- Producción masiva\n- Colorantes y saborizantes artificiales\n- Conservadores para mayor duración\n- Textura uniforme pero menos natural',
        date: '28 Oct 2025',
        category: 'Educación',
        image: 'https://images.unsplash.com/photo-1582058091505-f87a2e55a40f?w=400&h=250&fit=crop',
        published: true
      },
      {
        title: 'Ideas para Fiestas con Gomitas',
        excerpt: 'Decora y endulza tus celebraciones con estas increíbles ideas usando gomitas.',
        content: 'Las gomitas son perfectas para hacer tus fiestas más dulces y coloridas:\n\n**Decoración:**\n- Centros de mesa con jarrones llenos de gomitas\n- Guirnaldas de gomitas ensartadas\n- Números o letras formados con gomitas\n\n**Mesa de dulces:**\n- Estaciones de "arma tu bolsita"\n- Torres de gomitas por colores\n- Brochetas temáticas\n\n**Recuerdos:**\n- Bolsitas personalizadas\n- Frascos mini con mezcla de gomitas\n- Cajas decoradas',
        date: '20 Oct 2025',
        category: 'Eventos',
        image: 'https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=400&h=250&fit=crop',
        published: true
      }
    ];

    let success = 0;
    let errors = 0;
    const details: string[] = [];

    const existingPosts = await this.getAllPosts();
    if (existingPosts.length > 0) {
      return {
        success: 0,
        errors: 0,
        details: ['Blog posts already exist. Migration skipped.']
      };
    }

    for (const post of defaultPosts) {
      try {
        await this.createPost(post);
        success++;
        details.push(`Migrated: ${post.title}`);
      } catch (error: any) {
        console.error(`Migration error for ${post.title}:`, error);
        errors++;
        details.push(`Error: ${post.title} - ${error.message || 'Unknown error'}`);
      }
    }

    return { success, errors, details };
  }
}
