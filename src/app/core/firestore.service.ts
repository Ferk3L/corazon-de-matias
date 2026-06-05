import { Injectable } from '@angular/core';
import { 
  Firestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  orderBy,
  limit
} from 'firebase/firestore';
import { firestore } from '../app.config';

@Injectable({
  providedIn: 'root'
})
export class FirestoreService {
  private db: Firestore;

  constructor() {
    this.db = firestore;
  }

  async getDocument(collectionName: string, docId: string) {
    const docRef = doc(this.db, collectionName, docId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    } else {
      return null;
    }
  }

  async getCollection(collectionName: string) {
    const collectionRef = collection(this.db, collectionName);
    const querySnapshot = await getDocs(collectionRef);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }

  async getCollectionWithQuery(
    collectionName: string, 
    filters?: { field: string; operator: any; value: any }[],
    orderByField?: string,
    orderDirection: 'asc' | 'desc' = 'asc',
    limitCount?: number
  ) {
    try {
      const collectionRef = collection(this.db, collectionName);
      let q = query(collectionRef);

      if (filters) {
        filters.forEach(filter => {
          q = query(q, where(filter.field, filter.operator, filter.value));
        });
      }

      if (orderByField) {
        try {
          q = query(q, orderBy(orderByField, orderDirection));
        } catch (orderError: any) {
          // Si falla el orderBy, continuar sin él
          console.warn(`No se pudo ordenar por ${orderByField}, continuando sin ordenamiento:`, orderError);
        }
      }

      if (limitCount) {
        q = query(q, limit(limitCount));
      }

      const querySnapshot = await getDocs(q);
      const results = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Si hay orderByField pero no se aplicó, ordenar manualmente
      if (orderByField && results.length > 0) {
        const firstResult = results[0] as any;
        if (firstResult[orderByField]) {
          results.sort((a: any, b: any) => {
            const aVal = a[orderByField]?.toDate?.() || a[orderByField] || 0;
            const bVal = b[orderByField]?.toDate?.() || b[orderByField] || 0;
            if (orderDirection === 'desc') {
              return bVal > aVal ? 1 : bVal < aVal ? -1 : 0;
            }
            return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
          });
        }
      }
      
      return results;
    } catch (error: any) {
      console.error(`Error en getCollectionWithQuery para ${collectionName}:`, error);
      if (error.code === 'permission-denied') {
        throw new Error('Permisos denegados. Verifica las reglas de seguridad de Firestore.');
      }
      if (error.code === 'failed-precondition') {
        throw new Error(`Índice requerido. Ve a Firebase Console y crea el índice para ${collectionName}.${orderByField || 'campo'}`);
      }
      throw error;
    }
  }

  async addDocument(collectionName: string, data: any) {
    const collectionRef = collection(this.db, collectionName);
    const docRef = await addDoc(collectionRef, data);
    return docRef.id;
  }

  async updateDocument(collectionName: string, docId: string, data: any) {
    const docRef = doc(this.db, collectionName, docId);
    await updateDoc(docRef, data);
  }

  async deleteDocument(collectionName: string, docId: string) {
    const docRef = doc(this.db, collectionName, docId);
    await deleteDoc(docRef);
  }
}

