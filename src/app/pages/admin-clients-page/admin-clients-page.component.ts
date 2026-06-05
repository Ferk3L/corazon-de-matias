import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CashbackService, ClienteData, MovimientoCashback } from '../../core/cashback.service';

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

  isLoading: boolean = true;
  isLoadingHistorial: boolean = false;
  isSaving: boolean = false;

  busqueda: string = '';
  vistaActual: 'lista' | 'detalle' | 'registro-manual' = 'lista';

  // Ajuste manual
  ajuste = {
    monto: 0,
    nota: '',
    tipo: 'sumar' as 'sumar' | 'restar'
  };

  // Registro manual de cliente
  nuevoCliente = {
    nombre: '',
    email: '',
    telefono: '',
    saldoInicial: 0
  };

  mensajeExito: string = '';
  mensajeError: string = '';

  constructor(private cashbackService: CashbackService) {}

  async ngOnInit() {
    await this.cargarClientes();
  }

  async cargarClientes() {
    this.isLoading = true;
    try {
      this.clientes = await this.cashbackService.getTodosLosClientes();
      this.clientesFiltrados = [...this.clientes];
    } catch (error) {
      console.error('Error cargando clientes:', error);
    } finally {
      this.isLoading = false;
    }
  }

  filtrarClientes() {
    const texto = this.busqueda.toLowerCase().trim();
    if (!texto) {
      this.clientesFiltrados = [...this.clientes];
      return;
    }
    this.clientesFiltrados = this.clientes.filter(c =>
      c.nombre.toLowerCase().includes(texto) ||
      c.email.toLowerCase().includes(texto) ||
      (c.telefono || '').includes(texto)
    );
  }

  async verDetalle(cliente: ClienteData) {
    this.clienteSeleccionado = cliente;
    this.vistaActual = 'detalle';
    this.limpiarMensajes();
    this.isLoadingHistorial = true;
    try {
      this.historialCliente = await this.cashbackService.getHistorial(cliente.uid);
    } catch {
      this.mensajeError = 'Error cargando historial';
    } finally {
      this.isLoadingHistorial = false;
    }
  }

  async aplicarAjuste() {
    if (!this.clienteSeleccionado) return;
    if (!this.ajuste.nota.trim()) {
      this.mensajeError = 'Escribe una nota para el ajuste';
      return;
    }
    if (this.ajuste.monto <= 0) {
      this.mensajeError = 'El monto debe ser mayor a 0';
      return;
    }

    this.isSaving = true;
    this.limpiarMensajes();
    try {
      const montoFinal = this.ajuste.tipo === 'restar'
        ? -Math.abs(this.ajuste.monto)
        : Math.abs(this.ajuste.monto);

      await this.cashbackService.ajusteManual(
        this.clienteSeleccionado.uid,
        montoFinal,
        this.ajuste.nota
      );

      // Recargar datos del cliente
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
    }
  }

  async registrarClienteManual() {
    if (!this.nuevoCliente.nombre.trim() || !this.nuevoCliente.email.trim()) {
      this.mensajeError = 'Nombre y correo son requeridos';
      return;
    }

    this.isSaving = true;
    this.limpiarMensajes();
    try {
      // Generar UID manual para clientes sin cuenta Firebase
      const uid = 'manual_' + Date.now();
      await this.cashbackService.crearCliente(uid, {
        nombre: this.nuevoCliente.nombre,
        email: this.nuevoCliente.email,
        telefono: this.nuevoCliente.telefono,
      });

      // Si tiene saldo inicial, aplicarlo
      if (this.nuevoCliente.saldoInicial > 0) {
        await this.cashbackService.ajusteManual(
          uid,
          this.nuevoCliente.saldoInicial,
          'Saldo inicial registrado por admin'
        );
      }

      await this.cargarClientes();
      this.mensajeExito = `Cliente ${this.nuevoCliente.nombre} registrado correctamente`;
      this.nuevoCliente = { nombre: '', email: '', telefono: '', saldoInicial: 0 };
      this.vistaActual = 'lista';
    } catch {
      this.mensajeError = 'Error al registrar el cliente';
    } finally {
      this.isSaving = false;
    }
  }

  volverALista() {
    this.vistaActual = 'lista';
    this.clienteSeleccionado = null;
    this.historialCliente = [];
    this.limpiarMensajes();
    this.ajuste = { monto: 0, nota: '', tipo: 'sumar' };
  }

  getTipoLabel(tipo: string): string {
    switch (tipo) {
      case 'ganado': return '💰 Cashback ganado';
      case 'usado': return '🛍️ Cashback usado';
      case 'bono_bienvenida': return '🎉 Bono bienvenida';
      case 'ajuste_manual': return '🔧 Ajuste manual';
      default: return tipo;
    }
  }

  getTipoClass(tipo: string): string {
    switch (tipo) {
      case 'ganado': return 'ganado';
      case 'bono_bienvenida': return 'ganado';
      case 'usado': return 'usado';
      case 'ajuste_manual': return 'ajuste';
      default: return '';
    }
  }

  formatFecha(timestamp: any): string {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
    return date.toLocaleDateString('es-MX', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  }

  limpiarMensajes() {
    this.mensajeExito = '';
    this.mensajeError = '';
  }
}