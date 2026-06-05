import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CashbackTokenService } from '../../core/cashback-token.service';
import { CashbackService } from '../../core/cashback.service';
import { ClientAuthService } from '../../core/client-auth.service';

@Component({
  selector: 'app-cashback-qr-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './cashback-qr-page.component.html',
  styleUrl: './cashback-qr-page.component.css'
})
export class CashbackQrPageComponent implements OnInit {
  estado = signal<'cargando' | 'exito' | 'error' | 'no-logueado'>('cargando');
  mensaje = signal('');
  monto = signal(0);
  tokenId = signal('');

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private tokenService: CashbackTokenService,
    private cashbackService: CashbackService,
    private clientAuthService: ClientAuthService
  ) {}

  async ngOnInit() {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.estado.set('error');
      this.mensaje.set('QR no válido');
      return;
    }
    this.tokenId.set(token);

    const user = await this.clientAuthService.waitForAuthState();
    if (!user) {
      this.estado.set('no-logueado');
      return;
    }

    await this.procesarToken(token, user.uid);
  }

  async procesarToken(tokenId: string, clienteUid: string) {
    try {
      const token = await this.tokenService.getToken(tokenId);

      if (!token) {
        this.estado.set('error');
        this.mensaje.set('Este QR no existe o no es válido');
        return;
      }

      if (token.usado) {
        this.estado.set('error');
        this.mensaje.set('Este QR ya fue usado anteriormente');
        return;
      }

      if (token.expiresAt.toDate() < new Date()) {
        this.estado.set('error');
        this.mensaje.set('Este QR ha expirado (válido por 24 horas)');
        return;
      }

      // El QR no verifica clienteUid para flexibilidad — el admin puede
      // mostrarle el QR a cualquier cliente registrado
      // Si quieres verificar que sea el mismo cliente descomenta esto:
      // if (token.clienteUid !== clienteUid) {
      //   this.estado.set('error');
      //   this.mensaje.set('Este QR no corresponde a tu cuenta');
      //   return;
      // }

      // Marcar token como usado
      const resultado = await this.tokenService.usarToken(tokenId);
      if (!resultado.success) {
        this.estado.set('error');
        this.mensaje.set(resultado.error || 'Error al procesar el QR');
        return;
      }

      // Aplicar cashback al cliente que escaneó
      await this.cashbackService.aplicarCashbackPorQR(clienteUid, token.monto, token.orderId);

      this.monto.set(token.monto);
      this.estado.set('exito');
    } catch (error: any) {
      console.error('Error procesando QR:', error);
      this.estado.set('error');
      this.mensaje.set('Error al procesar el QR. Verifica tu conexión e intenta de nuevo.');
    }
  }

  async reintentarConLogin() {
    sessionStorage.setItem('cashback_token_pendiente', this.tokenId());
    this.router.navigate(['/clientes/login'], {
      queryParams: { redirect: '/cashback', token: this.tokenId() }
    });
  }
}