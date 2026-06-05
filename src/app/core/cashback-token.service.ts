import { Injectable } from '@angular/core';
import {
  getFirestore, collection, doc, setDoc, getDoc,
  updateDoc, Timestamp, query, where, getDocs
} from 'firebase/firestore';
import { app } from '../app.config';

export interface CashbackToken {
  id: string;
  orderId: string;
  clienteUid: string;
  clienteNombre: string;
  monto: number;           // monto del cashback (5% del total)
  totalPedido: number;
  usado: boolean;
  expiresAt: Timestamp;
  createdAt: Timestamp;
  usadoAt?: Timestamp;
}

@Injectable({ providedIn: 'root' })
export class CashbackTokenService {
  private db = getFirestore(app);

  // Generar token único para un pedido
  async generarToken(
    orderId: string,
    clienteUid: string,
    clienteNombre: string,
    totalPedido: number
  ): Promise<string> {
    // Verificar si ya existe un token para este pedido
    const existing = await this.getTokenByOrder(orderId);
    if (existing) return existing.id;

    const monto = Math.round(totalPedido * 0.05 * 100) / 100;
    const tokenId = `tok_${orderId}_${Date.now()}`;
    const expiresAt = Timestamp.fromDate(new Date(Date.now() + 24 * 60 * 60 * 1000)); // 24hrs

    const token: CashbackToken = {
      id: tokenId,
      orderId,
      clienteUid,
      clienteNombre,
      monto,
      totalPedido,
      usado: false,
      expiresAt,
      createdAt: Timestamp.now()
    };

    await setDoc(doc(this.db, 'cashback_tokens', tokenId), token);
    return tokenId;
  }

  // Obtener token por ID
  async getToken(tokenId: string): Promise<CashbackToken | null> {
    const snap = await getDoc(doc(this.db, 'cashback_tokens', tokenId));
    return snap.exists() ? snap.data() as CashbackToken : null;
  }

  // Obtener token por pedido
  async getTokenByOrder(orderId: string): Promise<CashbackToken | null> {
    const q = query(collection(this.db, 'cashback_tokens'), where('orderId', '==', orderId));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return snap.docs[0].data() as CashbackToken;
  }

  // Marcar token como usado
  async usarToken(tokenId: string): Promise<{ success: boolean; error?: string; monto?: number }> {
    const token = await this.getToken(tokenId);

    if (!token) return { success: false, error: 'QR no válido' };
    if (token.usado) return { success: false, error: 'Este QR ya fue usado' };
    if (token.expiresAt.toDate() < new Date()) return { success: false, error: 'Este QR ha expirado (24hrs)' };

    await updateDoc(doc(this.db, 'cashback_tokens', tokenId), {
      usado: true,
      usadoAt: Timestamp.now()
    });

    return { success: true, monto: token.monto };
  }
}