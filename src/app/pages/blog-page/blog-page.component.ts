import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BlogService, BlogPost } from '../../core/blog.service';

@Component({
  selector: 'app-blog-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './blog-page.component.html',
  styleUrl: './blog-page.component.css'
})
export class BlogPageComponent implements OnInit {
  articles: BlogPost[] = [];
  isLoading = true;
  error: string | null = null;
  selectedArticle: BlogPost | null = null;

  constructor(
    private blogService: BlogService,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    await this.loadArticles();
  }

  async loadArticles() {
    this.isLoading = true;
    this.error = null;

    try {
      // Primero intentar migrar posts por defecto si no existen
      const migrationResult = await this.blogService.migrateDefaultPosts();
      if (migrationResult.success > 0) {
        console.log('Posts migrados:', migrationResult.details);
      }

      // Cargar posts publicados
      this.articles = await this.blogService.getPublishedPosts();
      
      if (this.articles.length === 0) {
        this.error = 'No hay artículos disponibles en este momento.';
      }
    } catch (error: any) {
      console.error('Error al cargar artículos:', error);
      this.error = 'Error al cargar artículos. Por favor recarga la página.';
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  openArticle(article: BlogPost) {
    this.selectedArticle = article;
  }

  closeArticle() {
    this.selectedArticle = null;
  }
}
