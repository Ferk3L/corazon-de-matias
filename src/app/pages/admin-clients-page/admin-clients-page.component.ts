import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CashbackService, ClienteData, MovimientoCashback } from '../../core/cashback.service';
import { ApiService } from '../../core/api.service';

@Component({
  selector: 'app-admin-clients-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-clients-page.component.html',
  styleUrl: './admin-clients-page.component.css'
})
export class AdminClientsPageComponent implements OnInit {
  clientes: ClienteData[] = [];
  clientesFiltrados: ClienteData[] = [];
  clienteSeleccionado: ClienteData | null = null;
  historialCliente: MovimientoCashback[] = [];

  isLoading = false;
  isLoadingHistorial = false;
  isSaving = false;

  busqueda = '';
  vistaActual: 'lista' | 'detalle' | 'registro-manual' = 'lista';

  // Ajuste manual
  ajuste = { monto: 0, nota: '', tipo: 'sumar' as 'sumar' | 'restar' };

  // Registro manual
  nuevoCliente = { nombre: '', email: '', telefono: '', saldoInicial: 0 };

  // Confirmaciones
  confirmEliminar: string | null = null;
  confirmBloquear: string | null = null;

  mensajeExito = '';
  mensajeError = '';

  constructor(
    private cashbackService: CashbackService,
    private apiService: ApiService,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    await this.cargarClientes();
  }

  async cargarClientes() {
    this.isLoading = true;
    this.cdr.detectChanges();
    try {
      this.clientes = await this.cashbackService.getTodosLosClientes();
      this.clientesFiltrados = [...this.clientes];
    } catch (error) {
      console.error('Error cargando clientes:', error);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  filtrarClientes() {
    const texto = this.busqueda.toLowerCase().trim();
    if (!texto) {
      this.clientesFiltrados = [...this.clientes];
    } else {
      this.clientesFiltrados = this.clientes.filter(c =>
        c.nombre.toLowerCase().includes(texto) ||
        c.email.toLowerCase().includes(texto) ||
        (c.telefono || '').includes(texto)
      );
    }
    this.cdr.detectChanges();
  }

  async verDetalle(cliente: ClienteData) {
    this.clienteSeleccionado = cliente;
    this.vistaActual = 'detalle';
    this.limpiarMensajes();
    this.confirmEliminar = null;
    this.confirmBloquear = null;
    this.isLoadingHistorial = true;
    this.cdr.detectChanges();
    try {
      this.historialCliente = await this.apiService.getHistorial(cliente.uid);
    } catch {
      this.mensajeError = 'Error cargando historial';
    } finally {
      this.isLoadingHistorial = false;
      this.cdr.detectChanges();
    }
  }

  async aplicarAjuste() {
    if (!this.clienteSeleccionado) return;
    if (!this.ajuste.nota.trim()) { this.mensajeError = 'Escribe una nota para el ajuste'; return; }
    if (this.ajuste.monto <= 0) { this.mensajeError = 'El monto debe ser mayor a 0'; return; }

    this.isSaving = true;
    this.limpiarMensajes();
    this.cdr.detectChanges();
    try {
      const montoFinal = this.ajuste.tipo === 'restar'
        ? -Math.abs(this.ajuste.monto)
        : Math.abs(this.ajuste.monto);

      await this.apiService.ajusteManual(this.clienteSeleccionado.uid, montoFinal, this.ajuste.nota);

      const actualizado = await this.cashbackService.getCliente(this.clienteSeleccionado.uid);
      if (actualizado) this.clienteSeleccionado = actualizado;
      this.historialCliente = await this.cashbackService.getHistorial(this.clienteSeleccionado.uid);
      await this.cargarClientes();

      this.mensajeExito = `Ajuste de $${this.ajuste.monto} aplicado correctamente`;
      this.ajuste = { monto: 0, nota: '', tipo: 'sumar' };
    } catch {
      this.mensajeError = 'Error al aplicar el ajuste';
    } finally {
      this.isSaving = false;
      this.cdr.detectChanges();
    }
  }

  // ===== BLOQUEAR / DESBLOQUEAR =====
  async toggleBloqueo(cliente: ClienteData) {
    this.isSaving = true;
    this.limpiarMensajes();
    this.cdr.detectChanges();
    try {
      const bloquear = !cliente.bloqueado;
      const motivo = bloquear ? 'Bloqueado por administrador' : '';
      await this.apiService.toggleBloqueo(cliente.uid, bloquear, motivo);

      // Actualizar en memoria
      const actualizado = await this.cashbackService.getCliente(cliente.uid);
      if (actualizado) {
        this.clienteSeleccionado = actualizado;
        // Actualizar en la lista
        const idx = this.clientes.findIndex(c => c.uid === cliente.uid);
        if (idx >= 0) this.clientes[idx] = actualizado;
        this.filtrarClientes();
      }
      this.mensajeExito = bloquear ? '🔒 Cliente bloqueado' : '🔓 Cliente desbloqueado';
      this.confirmBloquear = null;
    } catch {
      this.mensajeError = 'Error al cambiar estado del cliente';
    } finally {
      this.isSaving = false;
      this.cdr.detectChanges();
    }
  }

  // ===== ELIMINAR CLIENTE =====
  async eliminarCliente(uid: string) {
    this.isSaving = true;
    this.limpiarMensajes();
    this.cdr.detectChanges();
    try {
      await this.apiService.eliminarCliente(uid);
      this.confirmEliminar = null;
      this.mensajeExito = 'Cliente eliminado. Puede volver a registrarse.';
      await this.cargarClientes();
      // Regresar a lista después de 1.5s
      setTimeout(() => { this.volverALista(); }, 1500);
    } catch {
      this.mensajeError = 'Error al eliminar el cliente';
    } finally {
      this.isSaving = false;
      this.cdr.detectChanges();
    }
  }

  async registrarClienteManual() {
    if (!this.nuevoCliente.nombre.trim() || !this.nuevoCliente.email.trim()) {
      this.mensajeError = 'Nombre y correo son requeridos';
      return;
    }
    this.isSaving = true;
    this.limpiarMensajes();
    this.cdr.detectChanges();
    try {
      const uid = 'manual_' + Date.now();
      await this.cashbackService.crearCliente(uid, {
        nombre: this.nuevoCliente.nombre,
        email: this.nuevoCliente.email,
        telefono: this.nuevoCliente.telefono,
      });
      if (this.nuevoCliente.saldoInicial > 0) {
        await this.cashbackService.ajusteManual(uid, this.nuevoCliente.saldoInicial, 'Saldo inicial por admin');
      }
      await this.cargarClientes();
      this.mensajeExito = `Cliente ${this.nuevoCliente.nombre} registrado correctamente`;
      this.nuevoCliente = { nombre: '', email: '', telefono: '', saldoInicial: 0 };
      this.vistaActual = 'lista';
    } catch {
      this.mensajeError = 'Error al registrar el cliente';
    } finally {
      this.isSaving = false;
      this.cdr.detectChanges();
    }
  }

  volverALista() {
    this.vistaActual = 'lista';
    this.clienteSeleccionado = null;
    this.historialCliente = [];
    this.confirmEliminar = null;
    this.confirmBloquear = null;
    this.limpiarMensajes();
    this.ajuste = { monto: 0, nota: '', tipo: 'sumar' };
    this.cdr.detectChanges();
  }

  getTipoLabel(tipo: string): string {
    switch (tipo) {
      case 'ganado': return '💰 Cashback ganado';
      case 'usado': return '🛍️ Cashback usado';
      case 'bono_bienvenida': return '🎉 Bono bienvenida';
      case 'ajuste_manual': return '🔧 Ajuste manual';
      case 'cashback_qr': return '📱 Cashback QR';
      default: return tipo;
    }
  }

  getTipoClass(tipo: string): string {
    switch (tipo) {
      case 'ganado': return 'ganado';
      case 'bono_bienvenida': return 'ganado';
      case 'cashback_qr': return 'ganado';
      case 'usado': return 'usado';
      case 'ajuste_manual': return 'ajuste';
      default: return '';
    }
  }

  formatFecha(timestamp: any): string {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
    return date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  limpiarMensajes() {
    this.mensajeExito = '';
    this.mensajeError = '';
  }
}