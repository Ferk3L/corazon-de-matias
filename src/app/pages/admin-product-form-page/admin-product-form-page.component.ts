import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ProductsService, Product } from '../../core/products.service';

const CLOUDINARY_CLOUD = 'dzaf9yjgw';
const CLOUDINARY_PRESET = 'corazon_matias';

@Component({
  selector: 'app-admin-product-form-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './admin-product-form-page.component.html',
  styleUrl: './admin-product-form-page.component.css'
})
export class AdminProductFormPageComponent implements OnInit {
  productId: string | null = null;
  product: Partial<Product> = {
    name: '', description: '', price: 0,
    priceMayoreo: 0, priceMenudeo: 0,
    image: '', category: 'Gomitas',
    available: true, featured: false, kg: true
  };
  isLoading = signal(false);
  isUploadingImage = signal(false);
  uploadProgress = signal(0);
  error = signal('');
  imagePreview = signal('');

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productsService: ProductsService
  ) {}

  async ngOnInit() {
    this.productId = this.route.snapshot.paramMap.get('id');
    if (this.productId && this.productId !== 'new') {
      await this.loadProduct();
    }
  }

  async loadProduct() {
    if (!this.productId) return;
    this.isLoading.set(true);
    try {
      const loaded = await this.productsService.getProductById(this.productId);
      if (loaded) {
        this.product = { ...loaded };
        if (!this.product.priceMayoreo) this.product.priceMayoreo = loaded.price;
        if (!this.product.priceMenudeo) this.product.priceMenudeo = loaded.price;
        if (loaded.image) this.imagePreview.set(loaded.image);
      }
    } catch {
      this.error.set('Error al cargar producto');
    } finally {
      this.isLoading.set(false);
    }
  }

  // ── Subir imagen a Cloudinary ──
  async onImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    // Validar tipo y tamaño
    if (!file.type.startsWith('image/')) {
      this.error.set('Solo se permiten imágenes (JPG, PNG, WEBP)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.error.set('La imagen no puede pesar más de 5MB');
      return;
    }

    this.isUploadingImage.set(true);
    this.error.set('');
    this.uploadProgress.set(0);

    // Preview local mientras sube
    const reader = new FileReader();
    reader.onload = (e) => this.imagePreview.set(e.target?.result as string);
    reader.readAsDataURL(file);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', CLOUDINARY_PRESET);
      formData.append('folder', 'productos');

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`,
        { method: 'POST', body: formData }
      );

      if (!response.ok) throw new Error('Error al subir imagen');

      const data = await response.json();
      this.product.image = data.secure_url;
      this.imagePreview.set(data.secure_url);
      this.uploadProgress.set(100);
    } catch {
      this.error.set('Error al subir la imagen. Intenta de nuevo.');
      this.imagePreview.set(this.product.image || '');
    } finally {
      this.isUploadingImage.set(false);
    }
  }

  // ── Arrastrar y soltar imagen ──
  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
  }

  async onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    const file = event.dataTransfer?.files[0];
    if (!file) return;
    const fakeEvent = { target: { files: [file] } } as any;
    await this.onImageSelected(fakeEvent);
  }

  quitarImagen() {
    this.product.image = '';
    this.imagePreview.set('');
  }

  async onSubmit() {
    if (!this.product.name || !this.product.description) {
      this.error.set('Por favor completa nombre y descripción');
      return;
    }
    if (!this.product.image) {
      this.error.set('Por favor sube una imagen del producto');
      return;
    }
    if (!this.product.priceMayoreo && !this.product.price) {
      this.error.set('Por favor ingresa al menos el precio de mayoreo');
      return;
    }

    this.product.price = this.product.priceMayoreo || 0;
    this.isLoading.set(true);
    this.error.set('');
    try {
      if (this.productId && this.productId !== 'new') {
        await this.productsService.updateProduct(this.productId, this.product);
      } else {
        await this.productsService.createProduct(this.product as Omit<Product, 'id' | 'createdAt' | 'updatedAt'>);
      }
      this.router.navigate(['/admin'], { queryParams: { tab: 'products' } });
    } catch (error: any) {
      this.error.set(error.message || 'Error al guardar producto');
    } finally {
      this.isLoading.set(false);
    }
  }
}