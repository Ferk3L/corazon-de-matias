import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-contact-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './contact-page.component.html',
  styleUrl: './contact-page.component.css'
})
export class ContactPageComponent {
  contactForm = {
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  };

  sendMessage() {
    const message = `
*Mensaje de Contacto - Fábrica de Dulces Corazón de Matías*

*Nombre:* ${this.contactForm.name}
*Email:* ${this.contactForm.email}
*Teléfono:* ${this.contactForm.phone}

*Asunto:* ${this.contactForm.subject}

*Mensaje:*
${this.contactForm.message}
    `.trim();

    const phoneNumber = '526181260061';
    const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  }

  openWhatsApp() {
    const message = 'Hola, quiero información sobre sus gomitas';
    const phoneNumber = '526181260061';
    const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  }

  openFacebook() {
    window.open('https://www.facebook.com/people/F%C3%A1brica-de-Dulces-Coraz%C3%B3n-de-Mat%C3%ADas/100080374882949/', '_blank');
  }

  openInstagram() {
    window.open('https://www.instagram.com/corazon_de_matias/', '_blank');
  }

  openTikTok() {
    window.open('https://tiktok.com/@corazondematias', '_blank');
  }

  sendEmail() {
    window.location.href = 'mailto:contacto@corazondematias.com';
  }
}
