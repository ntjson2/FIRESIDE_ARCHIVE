'use client';

import { TransitionEntry, SnippetStatus, AnnotationType } from '@/types';

// ─── Local integration types (IndexedDB scratch space) ───────────────────────

export type FiresideReviewStatus = 'pending' | 'processing' | 'preview' | 'approved' | 'skipped';

export interface LocalIntegrationJob {
  id: string;
  familyId: string;
  familyName: string;
  uploadedBy: string;
  guideInstructions: string;
  transitions: TransitionEntry[];
  pdfFiles: string[]; // ordered PDF filenames from guide.md
  currentFiresideIndex: number; // cursor into transitions
  firesideStatuses: Record<string, FiresideReviewStatus>; // keyed by category
  firesideIds: Record<string, string>; // category -> created Firestore fireside id
  status: 'PENDING' | 'IN-REVIEW' | 'COMPLETE';
  createdAt: number;
  logEntries: { timestamp: number; level: 'info' | 'warning' | 'error'; message: string }[];
}

export interface LocalIntegrationSnippet {
  localId: string;
  fireside: string; // category name (which fireside this belongs to)
  text: string;
  order: number;
  pageNumber: number;
  sourcePdf: string;
  status: SnippetStatus;
  annotation?: string;
  annotationType?: AnnotationType;
  action: 'keep' | 'delete' | 'deepening' | 'skip';
}

export interface LocalIntegrationImage {
  localId: string;
  fireside: string;
  dataUrl: string;
  pageNumber: number;
  sourcePdf: string;
  order: number;
}

export interface StoredIntegrationFile {
  name: string;
  blob: Blob;
  kind: 'pdf' | 'guide';
}

// ─── Database setup ──────────────────────────────────────────────────────────

const DB_NAME = 'fireside-integration';
const DB_VERSION = 1;

const STORES = {
  job: 'job',
  files: 'files',
  snippets: 'snippets',
  images: 'images',
} as const;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORES.job)) {
        db.createObjectStore(STORES.job, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.files)) {
        db.createObjectStore(STORES.files, { keyPath: 'name' });
      }
      if (!db.objectStoreNames.contains(STORES.snippets)) {
        db.createObjectStore(STORES.snippets, { keyPath: 'localId' });
      }
      if (!db.objectStoreNames.contains(STORES.images)) {
        db.createObjectStore(STORES.images, { keyPath: 'localId' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

// ─── Generic helpers ─────────────────────────────────────────────────────────

async function put(store: string, value: unknown): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).put(value);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function get<T>(store: string, key: string): Promise<T | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const request = tx.objectStore(store).get(key);
    request.onsuccess = () => resolve(request.result as T | undefined);
    request.onerror = () => reject(request.error);
  });
}

async function getAll<T>(store: string): Promise<T[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const request = tx.objectStore(store).getAll();
    request.onsuccess = () => resolve(request.result as T[]);
    request.onerror = () => reject(request.error);
  });
}

async function del(store: string, key: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function clear(store: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ─── Integration-specific repository ─────────────────────────────────────────

export const ACTIVE_JOB_ID = 'active-job';

export const integrationDb = {
  // Job
  saveJob(job: LocalIntegrationJob): Promise<void> {
    return put(STORES.job, job);
  },
  getJob(): Promise<LocalIntegrationJob | undefined> {
    return get<LocalIntegrationJob>(STORES.job, ACTIVE_JOB_ID);
  },
  deleteJob(): Promise<void> {
    return del(STORES.job, ACTIVE_JOB_ID);
  },

  // Files (PDFs + guide)
  saveFile(file: StoredIntegrationFile): Promise<void> {
    return put(STORES.files, file);
  },
  getFile(name: string): Promise<StoredIntegrationFile | undefined> {
    return get<StoredIntegrationFile>(STORES.files, name);
  },
  listFiles(): Promise<StoredIntegrationFile[]> {
    return getAll<StoredIntegrationFile>(STORES.files);
  },

  // Snippets
  saveSnippet(snippet: LocalIntegrationSnippet): Promise<void> {
    return put(STORES.snippets, snippet);
  },
  getSnippet(localId: string): Promise<LocalIntegrationSnippet | undefined> {
    return get<LocalIntegrationSnippet>(STORES.snippets, localId);
  },
  listSnippets(): Promise<LocalIntegrationSnippet[]> {
    return getAll<LocalIntegrationSnippet>(STORES.snippets);
  },
  deleteSnippet(localId: string): Promise<void> {
    return del(STORES.snippets, localId);
  },

  // Images
  saveImage(image: LocalIntegrationImage): Promise<void> {
    return put(STORES.images, image);
  },
  listImages(): Promise<LocalIntegrationImage[]> {
    return getAll<LocalIntegrationImage>(STORES.images);
  },
  deleteImage(localId: string): Promise<void> {
    return del(STORES.images, localId);
  },

  // Wipe everything
  async wipeAll(): Promise<void> {
    await clear(STORES.job);
    await clear(STORES.files);
    await clear(STORES.snippets);
    await clear(STORES.images);
  },
};