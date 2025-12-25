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
  DocumentData,
  QueryConstraint
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { BaseEntity } from "@/types";

export class FirestoreService<T extends BaseEntity> {
  private collectionName: string;

  constructor(collectionName: string) {
    this.collectionName = collectionName;
  }

  // Get all documents
  async getAll(constraints: QueryConstraint[] = []): Promise<T[]> {
    const q = query(collection(db, this.collectionName), ...constraints);
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as T));
  }

  // Get a single document by ID
  async getById(id: string): Promise<T | null> {
    const docRef = doc(db, this.collectionName, id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as T;
    } else {
      return null;
    }
  }

  // Create a new document
  async create(data: Omit<T, 'id'>): Promise<T> {
    const docRef = await addDoc(collection(db, this.collectionName), {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    return { id: docRef.id, ...data } as T;
  }

  // Update a document
  async update(id: string, data: Partial<T>): Promise<void> {
    const docRef = doc(db, this.collectionName, id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
  }

  // Delete a document
  async delete(id: string): Promise<void> {
    const docRef = doc(db, this.collectionName, id);
    await deleteDoc(docRef);
  }
}

// Export instances for specific collections
export const firesideService = new FirestoreService<any>('firesides');
export const snippetService = new FirestoreService<any>('snippets');
export const deepeningService = new FirestoreService<any>('deepenings');
export const outlineService = new FirestoreService<any>('outlines');
