# 💖 Corazón de Matías — E-commerce Web Application

Plataforma e-commerce completa para la Fábrica de Dulces Corazón de Matías, construida con Angular 17+ y Firebase.

🌐 **URL en producción:** https://elcorazondematias.web.app

---

## 📋 Tabla de Contenidos

1. [Descripción](#descripción)
2. [Stack Tecnológico](#stack-tecnológico)
3. [Estructura del Proyecto](#estructura-del-proyecto)
4. [Servicios Externos](#servicios-externos)
5. [Colecciones Firestore](#colecciones-firestore)
6. [Reglas de Seguridad](#reglas-de-seguridad)
7. [Panel de Administración](#panel-de-administración)
8. [Sistema de Cashback](#sistema-de-cashback)
9. [Backend API](#backend-api)
10. [Despliegue](#despliegue)

---

## 📝 Descripción

Aplicación web completa con:
- Catálogo de productos con precios dinámicos (mayoreo/menudeo por producto)
- Carrito de compras con cálculo automático de precio mayoreo
- Sistema de pedidos vía WhatsApp
- Sistema de cashback con QR codes
- Registro/Login de clientes (Email + Google OAuth)
- Dashboard del cliente con saldo de cashback e historial
- Reseñas de productos con ❤️ likes
- Blog de artículos
- Buzón de sugerencias y quejas
- Panel de administración completo
- Backend NestJS para operaciones seguras

---

## 🛠️ Stack Tecnológico

| Capa | Tecnología |
|---|---|
| **Frontend** | Angular 17+ Zoneless/Standalone |
| **Hosting** | Firebase Hosting |
| **Base de datos** | Firebase Firestore |
| **Autenticación** | Firebase Authentication |
| **Backend** | NestJS en Railway |
| **Imágenes** | Cloudinary |
| **Emails** | Brevo (API HTTP) |
| **Estilos** | CSS personalizado con diseño responsive |

> ⚠️ **Nota Angular Zoneless:** Este proyecto usa Angular sin Zone.js. Siempre usar `ChangeDetectorRef.detectChanges()` después de operaciones asíncronas.

---

## 📁 Estructura del Proyecto

```
src/
├── app/
│   ├── core/                          # Servicios globales
│   │   ├── api.service.ts             # Conexión con backend Railway
│   │   ├── auth.service.ts            # Auth del ADMIN
│   │   ├── client-auth.service.ts     # Auth de CLIENTES
│   │   ├── cashback.service.ts        # Lógica cashback (Firestore)
│   │   ├── cashback-token.service.ts  # Tokens QR cashback
│   │   ├── cart.service.ts            # Carrito (precios dinámicos)
│   │   ├── products.service.ts        # Productos
│   │   ├── orders.service.ts          # Pedidos
│   │   ├── reviews.service.ts         # Reseñas y likes
│   │   ├── sugerencias.service.ts     # Buzón de sugerencias
│   │   ├── blog.service.ts            # Blog
│   │   ├── firestore.service.ts       # Wrapper genérico Firestore
│   │   └── firebase.config.ts         # Credenciales Firebase
│   │
│   ├── guards/
│   │   └── auth.guard.ts              # Protección de rutas admin
│   │
│   ├── pages/
│   │   ├── home-page/                 # Página principal
│   │   ├── catalog-page/              # Catálogo de productos
│   │   ├── product-detail-page/       # Detalle + reseñas
│   │   ├── orders-page/               # Carrito y confirmación
│   │   ├── about-page/                # Sobre nosotros
│   │   ├── blog-page/                 # Blog
│   │   ├── contact-page/              # Contacto
│   │   ├── buzon-sugerencias/         # Buzón para clientes
│   │   ├── cashback-qr-page/          # Procesa QR cashback
│   │   ├── client-login-page/         # Login clientes (2 pasos)
│   │   ├── client-register-page/      # Registro clientes
│   │   ├── client-dashboard-page/     # Mi cuenta / cashback
│   │   ├── admin-dashboard-page/      # Panel admin completo
│   │   ├── admin-clients-page/        # Gestión de clientes
│   │   ├── admin-login-page/          # Login del admin
│   │   └── admin-product-form-page/   # Form crear/editar producto
│   │
│   └── components/
│       ├── review-form/               # Formulario de reseña
│       └── review-list/               # Lista de reseñas con likes
│
├── styles.css                         # Estilos globales + fondo corazones
└── index.html
```

---

## 🔗 Servicios Externos

### Firebase (elcorazondematias)
- **Authentication:** Email/Password + Google OAuth
- **Firestore:** Base de datos principal
- **Hosting:** Despliegue del frontend

### Backend NestJS — Railway
- **URL:** https://corazon-matias-api-production.up.railway.app/api/v1
- **Repo:** https://github.com/Ferk3L/corazon-matias-api
- **Uso:** Operaciones que requieren Firebase Admin SDK

### Cloudinary
- **Cloud Name:** dzaf9yjgw
- **Upload Preset:** corazon_matias (Unsigned)
- **Uso:** Subida de imágenes de productos desde el admin

### Brevo
- **Uso:** Envío de emails (códigos de verificación)
- **Método:** API HTTP (no SMTP — Railway bloquea puertos SMTP)

---

## 🗄️ Colecciones Firestore

### `products/`
```typescript
{
  name: string,
  description: string,
  price: number,           // precio base (mayoreo)
  priceMayoreo: number,    // precio 10kg o más
  priceMenudeo: number,    // precio menos de 10kg
  image: string,           // URL de Cloudinary
  category: string,
  available: boolean,
  featured: boolean,
  createdAt: timestamp
}
```

### `orders/`
```typescript
{
  name: string,
  email: string,
  phone: string,
  product: string,
  quantity: number,
  total: number,
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled',
  tipoEntrega: 'fabrica' | 'domicilio',
  direccion: string,
  notas: string,
  clienteUid?: string,
  cashbackGenerado?: boolean,
  cashbackTokenId?: string,
  createdAt: timestamp
}
```

### `clientes/`
```typescript
{
  uid: string,
  nombre: string,
  email: string,
  telefono: string,
  saldoCashback: number,
  totalCompras: number,
  fechaRegistro: timestamp,
  deviceId: string,
  bonoBienvenidaUsado: boolean,
  bloqueado?: boolean,
  motivoBloqueo?: string
}
```

### `movimientos_cashback/`
```typescript
{
  clienteUid: string,
  tipo: 'ganado' | 'usado' | 'bono_bienvenida' | 'ajuste_manual' | 'cashback_qr',
  monto: number,
  descripcion: string,
  pedidoId?: string,
  fecha: timestamp,
  adminNota?: string
}
```

### `cashback_tokens/`
```typescript
{
  orderId: string,
  clienteUid: string,
  clienteNombre: string,
  monto: number,
  totalPedido: number,
  usado: boolean,
  expiresAt: timestamp,   // 24 horas
  createdAt: timestamp
}
```

### `reviews/`
```typescript
{
  productId: string,
  productName: string,
  rating: number,          // 1-5
  comment: string,
  authorName: string,
  authorUid: string,
  isAnonymous: boolean,
  approved: boolean,
  likes: string[],         // UIDs de clientes que dieron ❤️
  adminLike: boolean,      // 👑 like del admin
  createdAt: timestamp
}
```

### `sugerencias/`
```typescript
{
  tipo: 'queja' | 'sugerencia' | 'felicitacion' | 'otro',
  mensaje: string,
  nombre?: string,
  email?: string,
  leida: boolean,
  createdAt: timestamp
}
```

### `verification_codes/`
```typescript
{
  uid: string,
  email: string,
  nombre: string,
  codigo: string,          // 6 dígitos
  expiresAt: timestamp,    // 10 minutos
  usado: boolean,
  createdAt: timestamp
}
```

---

## 🔒 Reglas de Seguridad

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    match /products/{productId} {
      allow read: if true;
      allow write: if request.auth != null;
    }

    match /clientes/{clienteId} {
      allow read, write: if request.auth != null
                         && request.auth.token.email == 'corazondematias@gmail.com';
      allow read, write: if request.auth != null
                         && request.auth.uid == clienteId;
      allow create: if request.auth != null;
      allow read: if request.auth != null;
    }

    match /movimientos_cashback/{movId} {
      allow read: if request.auth != null && (
        request.auth.uid == resource.data.clienteUid ||
        request.auth.token.email == 'corazondematias@gmail.com'
      );
      allow create: if request.auth != null;
      allow write: if request.auth != null;
    }

    match /blog/{blogId} {
      allow read: if true;
      allow write: if request.auth != null;
    }

    match /orders/{orderId} {
      allow read, write: if request.auth != null;
    }

    match /cashback_tokens/{tokenId} {
      allow read, write: if request.auth != null;
    }

    match /verification_codes/{codeId} {
      allow read, write: if request.auth != null;
    }

    match /reviews/{reviewId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null
                            && request.auth.token.email == 'corazondematias@gmail.com';
    }

    match /sugerencias/{sugerenciaId} {
      allow create: if true;
      allow read, update, delete: if request.auth != null
                                  && request.auth.token.email == 'corazondematias@gmail.com';
    }
  }
}
```

---

## 👨‍💼 Panel de Administración

**Acceso:** `/admin` — correo: `corazondematias@gmail.com`

### Tabs disponibles:
| Tab | Función |
|---|---|
| 📊 Dashboard | Estadísticas globales (pedidos, ingresos, estados) |
| 📦 Productos | Crear/editar/eliminar con subida de imagen a Cloudinary |
| 🧾 Pedidos | Ver pedidos, cambiar estado, generar QR cashback, exportar Excel, corte de caja |
| 📝 Blog | Crear y gestionar artículos |
| 👥 Clientes | Ver clientes, ajuste manual cashback, bloquear, eliminar |
| ⭐ Reseñas | Ver reseñas, dar 👑 me encanta del admin, eliminar |
| 📬 Buzón | Ver sugerencias/quejas, marcar leídas, eliminar |

---

## 💰 Sistema de Cashback

### Bono de Bienvenida ($20)
- Se aplica automáticamente a todos los nuevos registros
- 1 bono por dispositivo (controlado por `deviceId` en localStorage)
- Funciona con registro por email y por Google

### Cashback por Pedido (5%)
1. Admin genera QR desde la tabla de pedidos
2. Backend crea token con expiración de 24 horas
3. Admin muestra QR al cliente
4. Cliente escanea → va a `/cashback?token=xxx`
5. Backend valida y acredita el 5% del total del pedido

---

## 🔌 Backend API

**URL Base:** `https://corazon-matias-api-production.up.railway.app/api/v1`

| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/health` | Estado del servidor |
| GET | `/cashback/clientes` | Lista clientes |
| GET | `/cashback/historial/:uid` | Historial de movimientos |
| POST | `/cashback/ajuste` | Ajuste manual cashback |
| POST | `/cashback/generar-token` | Genera QR cashback |
| POST | `/cashback/procesar-qr` | Procesa QR y acredita |
| PATCH | `/cashback/clientes/:uid/bloqueo` | Bloquear/desbloquear |
| DELETE | `/cashback/clientes/:uid` | Eliminar cliente |
| POST | `/auth/send-code` | Enviar código 6 dígitos |
| POST | `/auth/verify-code-email` | Verificar código |
| POST | `/auth/resend-code` | Reenviar código |

---

## 🚀 Despliegue

### Frontend

```bash
# Instalar dependencias
npm install

# Servidor de desarrollo
ng serve

# Build de producción
ng build

# Desplegar a Firebase
firebase deploy
```

### Variables de entorno Railway (Backend)
```
FIREBASE_PROJECT_ID=elcorazondematias
FIREBASE_CLIENT_EMAIL=(service account)
FIREBASE_PRIVATE_KEY=(clave privada)
PORT=3000
BREVO_USER=(login SMTP Brevo)
BREVO_PASS=(API Key Brevo xkeysib-...)
```

---

## 📞 Configuración de Contacto

- **WhatsApp:** 526181260061
- **Facebook:** https://www.facebook.com/people/Fabrica-de-Dulces-Corazon-de-Matias/100080374882949/
- **Instagram:** https://www.instagram.com/corazon_de_matias/

---

## 📄 Licencia

Todos los derechos reservados — Fábrica de Dulces Corazón de Matías 2025