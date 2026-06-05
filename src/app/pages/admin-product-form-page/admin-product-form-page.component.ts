import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ProductsService, Product } from '../../core/products.service';

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
  error = signal('');

  imagenesDisponibles = [
    { label: 'Corazón Frutal', value: 'images/corazon-frutal.jpg' },
    { label: 'Corazón Enchilado', value: 'images/corazon-enchilado.jpg' },
    { label: 'Tiburones', value: 'images/tiburones.jpg' },
    { label: 'Corazón Bicolor', value: 'images/corazon-bicolor.jpg' },
    { label: 'Corazón Malteadas', value: 'images/corazon-malteadas.jpg' },
    { label: 'Huevos Estrellados', value: 'images/huevos-estrellados.jpg' },
  ];

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
        // Si no tiene precios de mayoreo/menudeo, usar el price base
        if (!this.product.priceMayoreo) this.product.priceMayoreo = loaded.price;
        if (!this.product.priceMenudeo) this.product.priceMenudeo = loaded.price;
      }
    } catch {
      this.error.set('Error al cargar producto');
    } finally {
      this.isLoading.set(false);
    }
  }

  async onSubmit() {
    if (!this.product.name || !this.product.description) {
      this.error.set('Por favor completa nombre y descripción');
      return;
    }
    if (!this.product.image) {
      this.error.set('Por favor selecciona una imagen');
      return;
    }
    if (!this.product.priceMayoreo && !this.product.price) {
      this.error.set('Por favor ingresa al menos el precio de mayoreo');
      return;
    }

    // El price base es el de mayoreo
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