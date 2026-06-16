import { Injectable, signal, computed } from '@angular/core';

export interface CartItem {
  productId: string;
  name: string;
  image: string;
  kg: number;
  precioMenudeo: number;  // precio por kg cuando es menos de 10kg
  precioMayoreo: number;  // precio por kg cuando es 10kg o más
}

const KG_MAYOREO = 10;
const STORAGE_KEY = 'carrito_corazon_matias';

// Precios por defecto si el producto no trae precios
const PRECIO_MENUDEO_DEFAULT = 100;
const PRECIO_MAYOREO_DEFAULT = 85;

@Injectable({ providedIn: 'root' })
export class CartService {
  items = signal<CartItem[]>(this.cargarDelStorage());

  // Total de kg
  totalKg = computed(() =>
    this.items().reduce((sum, i) => sum + i.kg, 0)
  );

  // Si aplica mayoreo
  esMayoreo = computed(() => this.totalKg() >= KG_MAYOREO);

  // Cuántos kg faltan para mayoreo
  kgParaMayoreo = computed(() =>
    Math.max(0, KG_MAYOREO - this.totalKg())
  );

  // Precio promedio ponderado por kg (cada producto con su propio precio)
  precioKg = computed(() => {
    const items = this.items();
    if (items.length === 0) return this.esMayoreo() ? PRECIO_MAYOREO_DEFAULT : PRECIO_MENUDEO_DEFAULT;
    const mayoreo = this.esMayoreo();
    const totalPesos = items.reduce((sum, item) => {
      const precio = mayoreo ? item.precioMayoreo : item.precioMenudeo;
      return sum + (item.kg * precio);
    }, 0);
    const totalKg = items.reduce((sum, item) => sum + item.kg, 0);
    return totalKg > 0 ? Math.round(totalPesos / totalKg) : (mayoreo ? PRECIO_MAYOREO_DEFAULT : PRECIO_MENUDEO_DEFAULT);
  });

  // Total a pagar (cada item con su precio correspondiente)
  total = computed(() => {
    const mayoreo = this.esMayoreo();
    return this.items().reduce((sum, item) => {
      const precio = mayoreo ? item.precioMayoreo : item.precioMenudeo;
      return sum + (item.kg * precio);
    }, 0);
  });

  // Ahorro vs menudeo cuando aplica mayoreo
  ahorro = computed(() => {
    if (!this.esMayoreo()) return 0;
    return this.items().reduce((sum, item) => {
      return sum + (item.kg * (item.precioMenudeo - item.precioMayoreo));
    }, 0);
  });

  // Cantidad de items
  count = computed(() => this.items().length);

  agregar(
    producto: {
      id: string;
      name: string;
      image: string;
      precioMenudeo?: number;
      precioMayoreo?: number;
      price?: number;
    },
    kg: number
  ) {
    const precioMenudeo = producto.precioMenudeo ?? producto.price ?? PRECIO_MENUDEO_DEFAULT;
    const precioMayoreo = producto.precioMayoreo ?? Math.round(precioMenudeo * 0.85) ?? PRECIO_MAYOREO_DEFAULT;

    const actual = this.items();
    const idx = actual.findIndex(i => i.productId === producto.id);
    let nuevo: CartItem[];

    if (idx >= 0) {
      nuevo = actual.map((item, i) =>
        i === idx ? { ...item, kg: item.kg + kg, precioMenudeo, precioMayoreo } : item
      );
    } else {
      nuevo = [...actual, {
        productId: producto.id,
        name: producto.name,
        image: producto.image,
        kg,
        precioMenudeo,
        precioMayoreo
      }];
    }
    this.items.set(nuevo);
    this.guardarStorage(nuevo);
  }

  actualizar(productId: string, kg: number) {
    if (kg <= 0) { this.eliminar(productId); return; }
    const nuevo = this.items().map(i =>
      i.productId === productId ? { ...i, kg } : i
    );
    this.items.set(nuevo);
    this.guardarStorage(nuevo);
  }

  eliminar(productId: string) {
    const nuevo = this.items().filter(i => i.productId !== productId);
    this.items.set(nuevo);
    this.guardarStorage(nuevo);
  }

  limpiar() {
    this.items.set([]);
    localStorage.removeItem(STORAGE_KEY);
  }

  private guardarStorage(items: CartItem[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }

  private cargarDelStorage(): CartItem[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      const items = data ? JSON.parse(data) : [];
      // Compatibilidad con items viejos que no tienen precios
      return items.map((item: any) => ({
        ...item,
        precioMenudeo: item.precioMenudeo ?? PRECIO_MENUDEO_DEFAULT,
        precioMayoreo: item.precioMayoreo ?? PRECIO_MAYOREO_DEFAULT,
      }));
    } catch { return []; }
  }
}