import { BaseEntity } from '@/types';
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  serverTimestamp,
  QueryConstraint,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export abstract class BaseRepository<T extends BaseEntity> {
  protected abstract collectionName: string;

  async findAll(constraints: QueryConstraint[] = []): Promise<T[]> {
    try {
      const q = query(collection(db, this.collectionName), ...constraints);
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as T));
    } catch (error) {
      console.error(`Error fetching all from ${this.collectionName}:`, error);
      return [];
    }
  }

  async findById(id: string): Promise<T | null> {
    try {
      const docRef = doc(db, this.collectionName, id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as T;
      }
      return null;
    } catch (error) {
      console.error(`Error fetching document ${id} from ${this.collectionName}:`, error);
      return null;
    }
  }

  async findWhere(field: string, operator: any, value: any): Promise<T[]> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where(field, operator, value)
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as T));
    } catch (error) {
      console.error(`Error querying ${this.collectionName}:`, error);
      return [];
    }
  }

  async save(data: Omit<T, 'id'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, this.collectionName), {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error(`Error saving to ${this.collectionName}:`, error);
      throw error;
    }
  }

  async update(id: string, data: Partial<Omit<T, 'id'>>): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, id);
      await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp()
      } as any);
    } catch (error) {
      console.error(`Error updating ${id} in ${this.collectionName}:`, error);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error(`Error deleting ${id} from ${this.collectionName}:`, error);
      throw error;
    }
  }
}
