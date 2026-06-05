import { Injectable } from '@angular/core';
import { FirestoreService } from './firestore.service';
import {
  getFirestore, collection, doc, getDoc, setDoc,
  updateDoc, addDoc, getDocs, query, where, Timestamp
} from 'firebase/firestore';
import { app } from '../app.config';

export interface ClienteData {
  uid: string;
  nombre: string;
  email: string;
  telefono?: string;
  saldoCashback: number;
  totalCompras: number;
  fechaRegistro: Timestamp;
  deviceId?: string;
  bonoBienvenidaUsado: boolean;
  bloqueado?: boolean;
  motivoBloqueo?: string;
  fechaBloqueo?: Timestamp | null;
}

export interface MovimientoCashback {
  id?: string;
  clienteUid: string;
  tipo: 'ganado' | 'usado' | 'bono_bienvenida' | 'ajuste_manual' | 'cashback_qr';
  monto: number;
  descripcion: string;
  pedidoId?: string;
  fecha: Timestamp;
  adminNota?: string;
}

@Injectable({ providedIn: 'root' })
export class CashbackService {
  private db = getFirestore(app);
  private readonly CASHBACK_PORCENTAJE = 0.05;
  private readonly BONO_BIENVENIDA = 20;

  constructor(private firestoreService: FirestoreService) {}

  async getCliente(uid: string): Promise<ClienteData | null> {
    const snap = await getDoc(doc(this.db, 'clientes', uid));
    return snap.exists() ? snap.data() as ClienteData : null;
  }

  async crearCliente(uid: string, data: Partial<ClienteData>): Promise<void> {
    await setDoc(doc(this.db, 'clientes', uid), {
      uid,
      nombre: data.nombre || '',
      email: data.email || '',
      telefono: data.telefono || '',
      saldoCashback: 0,
      totalCompras: 0,
      fechaRegistro: Timestamp.now(),
      deviceId: data.deviceId || '',
      bonoBienvenidaUsado: false,
      bloqueado: false
    });
  }

  async dispositivoYaUsoBono(deviceId: string): Promise<boolean> {
    const q = query(
      collection(this.db, 'clientes'),
      where('deviceId', '==', deviceId),
      where('bonoBienvenidaUsado', '==', true)
    );
    const snap = await getDocs(q);
    return !snap.empty;
  }

  async aplicarBonoBienvenida(clienteUid: string): Promise<void> {
    const ref = doc(this.db, 'clientes', clienteUid);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const cliente = snap.data() as ClienteData;
    if (cliente.bonoBienvenidaUsado) return;

    await updateDoc(ref, {
      saldoCashback: cliente.saldoCashback + this.BONO_BIENVENIDA,
      bonoBienvenidaUsado: true
    });
    await this.registrarMovimiento({
      clienteUid, tipo: 'bono_bienvenida',
      monto: this.BONO_BIENVENIDA,
      descripcion: 'Bono de bienvenida por escanear QR',
      fecha: Timestamp.now()
    });
  }

  async aplicarCashbackPorQR(clienteUid: string, monto: number, pedidoId: string): Promise<void> {
    const ref = doc(this.db, 'clientes', clienteUid);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const cliente = snap.data() as ClienteData;

    await updateDoc(ref, {
      saldoCashback: cliente.saldoCashback + monto,
      totalCompras: cliente.totalCompras + (monto / this.CASHBACK_PORCENTAJE)
    });
    await this.registrarMovimiento({
      clienteUid, tipo: 'cashback_qr', monto,
      descripcion: 'Cashback 5% por compra confirmada',
      pedidoId, fecha: Timestamp.now()
    });
  }

  async aplicarCashbackPorPedido(clienteUid: string, totalPedido: number, kilos: number, pedidoId: string): Promise<number> {
    if (kilos < 5) return 0;
    const cashback = Math.round(totalPedido * this.CASHBACK_PORCENTAJE * 100) / 100;
    const ref = doc(this.db, 'clientes', clienteUid);
    const snap = await getDoc(ref);
    if (!snap.exists()) return 0;
    const cliente = snap.data() as ClienteData;

    await updateDoc(ref, {
      saldoCashback: cliente.saldoCashback + cashback,
      totalCompras: cliente.totalCompras + totalPedido
    });
    await this.registrarMovimiento({
      clienteUid, tipo: 'ganado', monto: cashback,
      descripcion: `Cashback 5% por pedido de ${kilos}kg`,
      pedidoId, fecha: Timestamp.now()
    });
    return cashback;
  }

  async usarCashback(clienteUid: string, montoAUsar: number, pedidoId: string): Promise<boolean> {
    const ref = doc(this.db, 'clientes', clienteUid);
    const snap = await getDoc(ref);
    if (!snap.exists()) return false;
    const cliente = snap.data() as ClienteData;
    if (cliente.saldoCashback < montoAUsar) return false;

    await updateDoc(ref, { saldoCashback: cliente.saldoCashback - montoAUsar });
    await this.registrarMovimiento({
      clienteUid, tipo: 'usado', monto: -montoAUsar,
      descripcion: 'Cashback usado en pedido',
      pedidoId, fecha: Timestamp.now()
    });
    return true;
  }

  async ajusteManual(clienteUid: string, monto: number, nota: string): Promise<void> {
    const ref = doc(this.db, 'clientes', clienteUid);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const cliente = snap.data() as ClienteData;

    await updateDoc(ref, { saldoCashback: Math.max(0, cliente.saldoCashback + monto) });
    await this.registrarMovimiento({
      clienteUid, tipo: 'ajuste_manual', monto,
      descripcion: `Ajuste manual: ${nota}`,
      adminNota: nota, fecha: Timestamp.now()
    });
  }

  async toggleBloqueoCliente(uid: string, bloquear: boolean, motivo: string = ''): Promise<void> {
    const ref = doc(this.db, 'clientes', uid);
    await updateDoc(ref, {
      bloqueado: bloquear,
      motivoBloqueo: motivo,
      fechaBloqueo: bloquear ? Timestamp.now() : null
    });
  }

  async getHistorial(clienteUid: string): Promise<MovimientoCashback[]> {
    const q = query(collection(this.db, 'movimientos_cashback'), where('clienteUid', '==', clienteUid));
    const snap = await getDocs(q);
    return snap.docs
      .map(d => ({ id: d.id, ...d.data() } as MovimientoCashback))
      .sort((a, b) => b.fecha.seconds - a.fecha.seconds);
  }

  async getTodosLosClientes(): Promise<ClienteData[]> {
    const snap = await getDocs(collection(this.db, 'clientes'));
    return snap.docs.map(d => d.data() as ClienteData);
  }

  private async registrarMovimiento(movimiento: Omit<MovimientoCashback, 'id'>): Promise<void> {
    await addDoc(collection(this.db, 'movimientos_cashback'), movimiento);
  }

  async eliminarCliente(uid: string): Promise<void> {
    const { deleteDoc, doc: firestoreDoc } = await import('firebase/firestore');
    // Eliminar el documento del cliente
    await deleteDoc(firestoreDoc(this.db, 'clientes', uid));
    // Eliminar sus movimientos de cashback
    const q = query(collection(this.db, 'movimientos_cashback'), where('clienteUid', '==', uid));
    const snap = await getDocs(q);
    const deletes = snap.docs.map(d => deleteDoc(firestoreDoc(this.db, 'movimientos_cashback', d.id)));
    await Promise.all(deletes);
  }

}