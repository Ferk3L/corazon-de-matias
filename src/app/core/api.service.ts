import { Injectable } from '@angular/core';
import { getAuth } from 'firebase/auth';

const BASE_URL = 'https://corazon-matias-api-production.up.railway.app/api/v1';

@Injectable({ providedIn: 'root' })
export class ApiService {

  // Obtener token de Firebase Auth para autenticar al backend
  private async getToken(): Promise<string> {
    const user = getAuth().currentUser;
    if (!user) return '';
    return await user.getIdToken();
  }

  private async headers() {
    return {
      'Content-Type': 'application/json',
    };
  }

  // ===== CLIENTES =====
  async getTodosLosClientes() {
    const res = await fetch(`${BASE_URL}/cashback/clientes`, {
      headers: await this.headers()
    });
    if (!res.ok) throw new Error('Error al cargar clientes');
    return res.json();
  }

  async getCliente(uid: string) {
    const res = await fetch(`${BASE_URL}/cashback/clientes/${uid}`, {
      headers: await this.headers()
    });
    if (!res.ok) throw new Error('Error al cargar cliente');
    return res.json();
  }

  async getHistorial(uid: string) {
    const res = await fetch(`${BASE_URL}/cashback/historial/${uid}`, {
      headers: await this.headers()
    });
    if (!res.ok) throw new Error('Error al cargar historial');
    return res.json();
  }

  async ajusteManual(clienteUid: string, monto: number, nota: string) {
    const res = await fetch(`${BASE_URL}/cashback/ajuste`, {
      method: 'POST',
      headers: await this.headers(),
      body: JSON.stringify({ clienteUid, monto, nota })
    });
    if (!res.ok) throw new Error('Error al aplicar ajuste');
    return res.json();
  }

  async toggleBloqueo(uid: string, bloquear: boolean, motivo: string = '') {
    const res = await fetch(`${BASE_URL}/cashback/clientes/${uid}/bloqueo`, {
      method: 'PATCH',
      headers: await this.headers(),
      body: JSON.stringify({ bloquear, motivo })
    });
    if (!res.ok) throw new Error('Error al cambiar estado del cliente');
    return res.json();
  }

  async eliminarCliente(uid: string) {
    const res = await fetch(`${BASE_URL}/cashback/clientes/${uid}`, {
      method: 'DELETE',
      headers: await this.headers()
    });
    if (!res.ok) throw new Error('Error al eliminar cliente');
    return res.json();
  }

  // ===== TOKENS QR CASHBACK =====
  async generarTokenCashback(
    orderId: string,
    clienteUid: string,
    clienteNombre: string,
    totalPedido: number
  ): Promise<{ tokenId: string; monto: number; qrUrl: string }> {
    const res = await fetch(`${BASE_URL}/cashback/generar-token`, {
      method: 'POST',
      headers: await this.headers(),
      body: JSON.stringify({ orderId, clienteUid, clienteNombre, totalPedido })
    });
    if (!res.ok) throw new Error('Error al generar token QR');
    return res.json();
  }

  async procesarQr(tokenId: string, clienteUid: string) {
    const res = await fetch(`${BASE_URL}/cashback/procesar-qr`, {
      method: 'POST',
      headers: await this.headers(),
      body: JSON.stringify({ tokenId, clienteUid })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Error al procesar QR');
    }
    return res.json();
  }
  // ===== VERIFICACIÓN DE CORREO =====
  async sendVerificationCode(uid: string, email: string, nombre: string): Promise<void> {
    const res = await fetch(`${BASE_URL}/auth/send-code`, {
      method: 'POST',
      headers: await this.headers(),
      body: JSON.stringify({ uid, email, nombre })
    });
    if (!res.ok) throw new Error('Error al enviar código');
  }

  async verifyCode(uid: string, codigo: string): Promise<{ success: boolean }> {
    const res = await fetch(`${BASE_URL}/auth/verify-code`, {
      method: 'POST',
      headers: await this.headers(),
      body: JSON.stringify({ uid, codigo })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Código incorrecto');
    }
    return res.json();
  }

  async verifyCodeByEmail(email: string, codigo: string): Promise<{ success: boolean }> {
    const res = await fetch(`${BASE_URL}/auth/verify-code-email`, {
      method: 'POST',
      headers: await this.headers(),
      body: JSON.stringify({ email, codigo })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Código incorrecto');
    }
    return res.json();
  }

  async resendVerificationCode(email: string): Promise<void> {
    const res = await fetch(`${BASE_URL}/auth/resend-code`, {
      method: 'POST',
      headers: await this.headers(),
      body: JSON.stringify({ email })
    });
    if (!res.ok) throw new Error('Error al reenviar código');
  }
}