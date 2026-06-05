# Corazon de Matias - E-commerce Web Application

A modern e-commerce platform built with Angular 20 and Firebase for a candy/gummy business.

## Table of Contents

1. [Overview](#overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Firebase Configuration](#firebase-configuration)
5. [Firestore Collections](#firestore-collections)
6. [Security Rules](#security-rules)
7. [Admin Panel](#admin-panel)
8. [Deployment](#deployment)
9. [Contact Configuration](#contact-configuration)

---

## Overview

This application provides:
- Public storefront for browsing products
- Shopping cart and WhatsApp-based ordering
- Product reviews and ratings
- Blog section with articles
- Full admin panel for managing products, orders, and blog posts
- Real-time statistics dashboard

## Technology Stack

- **Frontend**: Angular 20.0.0
- **Backend**: Firebase (Firestore, Authentication, Storage, Hosting)
- **Styling**: Custom CSS with responsive design
- **State Management**: Angular Services with RxJS

## Project Structure

```
src/
├── app/
│   ├── core/                    # Core services
│   │   ├── auth.service.ts      # Authentication management
│   │   ├── blog.service.ts      # Blog CRUD operations
│   │   ├── config.service.ts    # Application configuration
│   │   ├── firestore.service.ts # Generic Firestore operations
│   │   ├── migration.service.ts # Data migration utilities
│   │   ├── orders.service.ts    # Order management
│   │   ├── products.service.ts  # Product management
│   │   ├── reviews.service.ts   # Review management
│   │   └── storage.service.ts   # File storage operations
│   ├── guards/
│   │   └── auth.guard.ts        # Route protection
│   ├── pages/
│   │   ├── admin-dashboard-page/
│   │   ├── admin-login-page/
│   │   ├── admin-product-form-page/
│   │   ├── blog-page/
│   │   ├── catalog-page/
│   │   ├── contact-page/
│   │   ├── home-page/
│   │   ├── orders-page/
│   │   └── product-detail-page/
│   └── components/
│       ├── review-form/
│       └── review-list/
├── styles.css                   # Global styles
└── index.html
```

## Firebase Configuration

### Required Firebase Services

1. **Authentication**: Enable Email/Password authentication
2. **Firestore Database**: Create database in production mode
3. **Storage**: Enable for image uploads (optional)
4. **Hosting**: For deployment

### Environment Configuration

Update `src/app/core/firebase.config.ts` with your Firebase project credentials:

```typescript
export const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};
```

## Firestore Collections

### Products Collection
```
Collection: products
Fields:
  - name: string
  - description: string
  - price: number
  - image: string (URL)
  - category: string
  - available: boolean
  - createdAt: timestamp
  - updatedAt: timestamp
```

### Orders Collection
```
Collection: orders
Fields:
  - name: string (customer name)
  - phone: string
  - email: string
  - product: string
  - quantity: number
  - address: string
  - notes: string (optional)
  - status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  - total: number
  - createdAt: timestamp
  - updatedAt: timestamp
```

### Blog Collection
```
Collection: blog
Fields:
  - title: string
  - excerpt: string
  - content: string
  - date: string
  - category: string
  - image: string (URL)
  - published: boolean
  - createdAt: timestamp
  - updatedAt: timestamp
```

### Reviews Collection
```
Collection: reviews
Fields:
  - productId: string
  - userName: string
  - rating: number (1-5)
  - comment: string
  - createdAt: timestamp
```

## Security Rules

Configure the following rules in Firebase Console > Firestore > Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Products: public read, authenticated write
    match /products/{productId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Orders: authenticated access, public create
    match /orders/{orderId} {
      allow read, write: if request.auth != null;
      allow create: if true;
    }
    
    // Reviews: public read and create, authenticated modify
    match /reviews/{reviewId} {
      allow read: if true;
      allow create: if true;
      allow update, delete: if request.auth != null;
    }
    
    // Blog: public read, authenticated write
    match /blog/{postId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

## Admin Panel

### Access
Navigate to `/admin` to access the admin panel.

### Features

**Statistics Dashboard**
- Total orders count
- Orders by status (pending, confirmed, completed, cancelled)
- Total revenue calculation

**Product Management**
- Create, edit, and delete products
- Toggle product availability
- Image URL configuration

**Order Management**
- View all customer orders
- Update order status
- Customer contact information

**Blog Management**
- Create, edit, and delete articles
- Categories: Salud, Recetas, Historia, Tips, Educacion, Eventos, Noticias
- Publish/unpublish articles

### Creating Admin User

1. Go to Firebase Console > Authentication
2. Add a new user with email and password
3. Use these credentials to log in at `/admin/login`

## Deployment

### Build for Production

```bash
npm run build
```

### Deploy to Firebase Hosting

```bash
firebase deploy --only hosting
```

### Full Deployment (including rules)

```bash
firebase deploy
```

## Contact Configuration

### WhatsApp Integration

The application sends orders and inquiries to WhatsApp. The phone number is configured in:

- `src/app/core/config.service.ts`
- Individual page components that use WhatsApp

Current configuration:
- Phone: 526181260061 (Mexico format)

### Social Media Links

Configured in `src/app/app.html` footer and `src/app/pages/contact-page/`:

- Facebook: https://www.facebook.com/people/Fabrica-de-Dulces-Corazon-de-Matias/100080374882949/
- Instagram: https://www.instagram.com/corazon_de_matias/
- TikTok: https://tiktok.com/@corazondematias

---

## Development

### Install Dependencies

```bash
npm install
```

### Run Development Server

```bash
ng serve
```

Navigate to `http://localhost:4200/`

### Build

```bash
ng build
```

Build artifacts are stored in `dist/gomitas-web/browser/`.

---

## License

All rights reserved - Fabrica de Dulces Corazon de Matias 2025
