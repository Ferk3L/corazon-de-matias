import { Injectable } from '@angular/core';
import { FirestoreService } from './firestore.service';

export interface Sugerencia {
  id?: string;
  tipo: 'queja' | 'sugerencia' | 'felicitacion' | 'otro';
  mensaje: string;
  nombre?: string;
  email?: string;
  leida: boolean;
  createdAt: Date;
}

@Injectable({ providedIn: 'root' })
export class SugerenciasService {
  constructor(private firestoreService: FirestoreService) {}

  async crearSugerencia(data: Omit<Sugerencia, 'id' | 'createdAt' | 'leida'>): Promise<void> {
    await this.firestoreService.addDocument('sugerencias', {
      ...data,
      leida: false,
      createdAt: new Date()
    });
  }

  async getTodas(): Promise<Sugerencia[]> {
    const docs = await this.firestoreService.getCollectionWithQuery(
      'sugerencias', [], 'createdAt', 'desc', 100
    );
    return docs.map((d: any) => ({
      ...d,
      createdAt: d.createdAt?.toDate ? d.createdAt.toDate() : new Date(d.createdAt)
    }));
  }

  async marcarLeida(id: string, leida: boolean): Promise<void> {
    await this.firestoreService.updateDocument('sugerencias', id, { leida });
  }

  async eliminar(id: string): Promise<void> {
    await this.firestoreService.deleteDocument('sugerencias', id);
  }
}