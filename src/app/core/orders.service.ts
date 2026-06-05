import { Injectable } from '@angular/core';
import { FirestoreService } from './firestore.service';
import {
  getFirestore, collection, onSnapshot, query,
  orderBy, where, Timestamp, doc, getDoc
} from 'firebase/firestore';
import { app } from '../app.config';

export interface Order {
  id?: string;
  name: string;
  phone: string;
  email: string;
  product: string;
  quantity: number;
  address: string;
  notes?: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  total: number;
  clienteUid?: string;      // UID del cliente si estaba logueado
  clienteNombre?: string;   // Nombre del cliente registrado
  cashbackGenerado?: boolean; // Si ya se generó el QR de cashback
  cashbackTokenId?: string;   // ID del token generado
  createdAt: Date;
  updatedAt?: Date;
}

@Injectable({ providedIn: 'root' })
export class OrdersService {
  private db = getFirestore(app);

  constructor(private firestoreService: FirestoreService) {}

  private processOrders(orders: any[]): Order[] {
    return orders
      .map((order: any) => ({
        ...order,
        createdAt: order.createdAt?.toDate?.() || order.createdAt || new Date(),
        updatedAt: order.updatedAt?.toDate?.() || order.updatedAt || new Date()
      }))
      .sort((a, b) => {
        const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
        const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
        return dateB.getTime() - dateA.getTime();
      }) as Order[];
  }

  async createOrder(order: Omit<Order, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Promise<string> {
    const { Timestamp } = await import('firebase/firestore');
    const orderData = {
      ...order,
      status: 'pending' as const,
      cashbackGenerado: false,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };
    return await this.firestoreService.addDocument('orders', orderData);
  }

  async getAllOrders(): Promise<Order[]> {
    const orders = await this.firestoreService.getCollection('orders');
    return this.processOrders(orders);
  }

  async getOrderById(id: string): Promise<Order | null> {
    const order = await this.firestoreService.getDocument('orders', id);
    if (!order) return null;
    return {
      ...order,
      createdAt: (order as any).createdAt?.toDate?.() || (order as any).createdAt,
      updatedAt: (order as any).updatedAt?.toDate?.() || (order as any).updatedAt
    } as Order;
  }

  async updateOrderStatus(id: string, status: Order['status']): Promise<void> {
    const { Timestamp } = await import('firebase/firestore');
    await this.firestoreService.updateDocument('orders', id, {
      status,
      updatedAt: Timestamp.now()
    });
  }

  async marcarCashbackGenerado(orderId: string, tokenId: string): Promise<void> {
    const { Timestamp } = await import('firebase/firestore');
    await this.firestoreService.updateDocument('orders', orderId, {
      cashbackGenerado: true,
      cashbackTokenId: tokenId,
      updatedAt: Timestamp.now()
    });
  }

  // Escuchar pedidos en tiempo real (para notificaciones del admin)
  escucharPedidosNuevos(callback: (orders: Order[]) => void): () => void {
    const q = collection(this.db, 'orders');
    return onSnapshot(q, (snap) => {
      const orders = snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        createdAt: (d.data() as any).createdAt?.toDate?.() || new Date(),
        updatedAt: (d.data() as any).updatedAt?.toDate?.() || new Date()
      })) as Order[];
      orders.sort((a, b) => {
        const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
        const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
        return dateB.getTime() - dateA.getTime();
      });
      callback(orders);
    });
  }

  async getOrdersByStatus(status: Order['status']): Promise<Order[]> {
    const allOrders = await this.getAllOrders();
    return allOrders.filter(o => o.status === status);
  }

  async getOrdersStats() {
    const orders = await this.getAllOrders();
    return {
      total: orders.length,
      pending: orders.filter(o => o.status === 'pending').length,
      confirmed: orders.filter(o => o.status === 'confirmed').length,
      completed: orders.filter(o => o.status === 'completed').length,
      cancelled: orders.filter(o => o.status === 'cancelled').length,
      totalRevenue: orders.filter(o => o.status === 'completed').reduce((sum, o) => sum + o.total, 0)
    };
  }
}