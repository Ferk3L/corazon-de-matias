import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { getFirestore } from 'firebase/firestore';
import { firebaseConfig } from './core/firebase.config';

import { routes } from './app.routes';

const app = initializeApp(firebaseConfig);

let analytics: any = null;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}

const firestore = getFirestore(app);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes)
  ]
};

export { app, analytics, firestore };
