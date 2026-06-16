import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SugerenciasService } from '../../core/sugerencias.service';

@Component({
  selector: 'app-buzon-sugerencias',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './buzon-sugerencias.component.html',
  styleUrl: './buzon-sugerencias.component.css'
})
export class BuzonSugerenciasComponent {
  form = { tipo: 'sugerencia' as any, mensaje: '', nombre: '', email: '' };
  isLoading = signal(false);
  enviado = signal(false);
  error = signal('');

  tiposDisponibles = [
    { value: 'sugerencia', label: '💡 Sugerencia', desc: 'Tengo una idea para mejorar' },
    { value: 'queja', label: '😤 Queja', desc: 'Algo no me gustó' },
    { value: 'felicitacion', label: '🎉 Felicitación', desc: 'Quiero dar un reconocimiento' },
    { value: 'otro', label: '💬 Otro', desc: 'Otro tipo de comentario' },
  ];

  constructor(private sugerenciasService: SugerenciasService) {}

  async enviar() {
    if (!this.form.mensaje.trim()) { this.error.set('Por favor escribe tu mensaje'); return; }
    if (this.form.mensaje.length < 10) { this.error.set('El mensaje es muy corto'); return; }

    this.isLoading.set(true);
    this.error.set('');
    try {
      await this.sugerenciasService.crearSugerencia({
        tipo: this.form.tipo,
        mensaje: this.form.mensaje.trim(),
        nombre: this.form.nombre.trim() || undefined,
        email: this.form.email.trim() || undefined,
      });
      this.enviado.set(true);
      this.form = { tipo: 'sugerencia', mensaje: '', nombre: '', email: '' };
    } catch {
      this.error.set('Error al enviar. Intenta de nuevo.');
    } finally {
      this.isLoading.set(false);
    }
  }

  reiniciar() { this.enviado.set(false); }
}