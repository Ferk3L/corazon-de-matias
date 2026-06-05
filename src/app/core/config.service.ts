import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  // Número de WhatsApp (formato internacional sin el +)
  readonly whatsappNumber = '526181260061';
  
  // Teléfono para mostrar
  readonly phoneDisplay = '618 126 0061';
  
  // Redes sociales
  readonly socialLinks = {
    facebook: 'https://www.facebook.com/people/F%C3%A1brica-de-Dulces-Coraz%C3%B3n-de-Mat%C3%ADas/100080374882949/',
    instagram: 'https://www.instagram.com/corazon_de_matias/',
    tiktok: 'https://tiktok.com/@corazondematias'
  };
  
  // Email de contacto
  readonly email = 'contacto@corazondematias.com';

  constructor() {}

  /**
   * Abre WhatsApp con un mensaje predefinido
   */
  openWhatsApp(message: string = 'Hola, quiero información sobre sus gomitas'): void {
    const url = `https://wa.me/${this.whatsappNumber}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  }

  /**
   * Genera la URL de WhatsApp con un mensaje
   */
  getWhatsAppUrl(message: string = 'Hola, quiero información sobre sus gomitas'): string {
    return `https://wa.me/${this.whatsappNumber}?text=${encodeURIComponent(message)}`;
  }

  /**
   * Abre Facebook
   */
  openFacebook(): void {
    window.open(this.socialLinks.facebook, '_blank');
  }

  /**
   * Abre Instagram
   */
  openInstagram(): void {
    window.open(this.socialLinks.instagram, '_blank');
  }

  /**
   * Abre TikTok
   */
  openTikTok(): void {
    window.open(this.socialLinks.tiktok, '_blank');
  }
}



