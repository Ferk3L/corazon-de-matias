import { Injectable } from '@angular/core';
import { FirebaseApp } from 'firebase/app';
import { Analytics } from 'firebase/analytics';
import { Firestore } from 'firebase/firestore';
import { Auth } from 'firebase/auth';
import { FirebaseStorage } from 'firebase/storage';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { app, analytics, firestore } from '../app.config';

// Usa la instancia ya inicializada en app.config.ts
// para evitar el error "Firebase App named '[DEFAULT]' already exists"
@Injectable({
  providedIn: 'root'
})
export class FirebaseService {
  private app: FirebaseApp = app;
  private firestore: Firestore = firestore;
  private auth: Auth = getAuth(app);
  private storage: FirebaseStorage = getStorage(app);

  getApp(): FirebaseApp { return this.app; }
  getAnalytics(): Analytics | null { return analytics; }
  getFirestore(): Firestore { return this.firestore; }
  getAuth(): Auth { return this.auth; }
  getStorage(): FirebaseStorage { return this.storage; }
}