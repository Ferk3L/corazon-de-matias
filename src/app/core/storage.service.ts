import { Injectable } from '@angular/core';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { app } from '../app.config';

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private storage = getStorage(app);

  async uploadImage(file: File, path: string): Promise<string> {
    // Comprimir imagen antes de subir
    const compressed = await this.compressImage(file);
    const storageRef = ref(this.storage, `products/${path}`);
    const snapshot = await uploadBytes(storageRef, compressed);
    return await getDownloadURL(snapshot.ref);
  }

  async deleteImage(imagePath: string): Promise<void> {
    try {
      const imageRef = ref(this.storage, imagePath);
      await deleteObject(imageRef);
    } catch (error) {
      console.warn('Error al eliminar imagen:', error);
    }
  }

  // Comprime la imagen a máximo 800px y ~200KB antes de subir
  private compressImage(file: File): Promise<Blob> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const scale = Math.min(1, MAX_WIDTH / img.width);
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;

          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          canvas.toBlob((blob) => {
            resolve(blob || file);
          }, 'image/jpeg', 0.75);
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  }
}