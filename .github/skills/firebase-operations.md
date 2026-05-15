---
skill: firebase-operations
description: Handle Firebase Firestore operations, security rules, authentication, and common troubleshooting patterns.
applyTo: "**"
---

# Firebase Operations Skill

## Firestore Configuration

### Environment Setup
`.env.local`:
```
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456
NEXT_PUBLIC_FIREBASE_APP_ID=1:123:web:abc
```

### Firebase Client (`src/lib/firebase.ts`)
```typescript
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getFirestore(app);
export const auth = getAuth(app);
```

## Security Rules Patterns

### Basic Rule Structure (`firestore.rules`)
```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isAdmin() {
      return isAuthenticated() && 
             get(/databases/$(database)/documents/user/$(request.auth.uid)).data.role in ['Admin', 'SuperAdmin'];
    }
    
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    // Public read, admin write
    match /collection/{docId} {
      allow read: if true;
      allow write: if isAdmin();
    }
    
    // Public + user-owned
    match /outline/{docId} {
      allow read: if resource.data.isPublic == true || isOwner(resource.data.userId);
      allow create: if isAuthenticated();
      allow update, delete: if isOwner(resource.data.userId);
    }
  }
}
```

### Deploy Rules
```bash
firebase deploy --only firestore:rules --project PROJECT_ID
```

## Common Firestore Operations

### Query with Constraints
```typescript
import { collection, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';

async findWhere(field: string, operator: any, value: any): Promise<T[]> {
  const q = query(
    collection(db, this.collectionName),
    where(field, operator, value),
    orderBy('createdAt', 'desc'),
    limit(100)
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as T));
}
```

### Batch Operations
```typescript
import { writeBatch, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

async batchUpdate(updates: Array<{ id: string; data: Partial<T> }>): Promise<void> {
  const batch = writeBatch(db);
  
  for (const update of updates) {
    const docRef = doc(db, this.collectionName, update.id);
    batch.update(docRef, update.data);
  }
  
  await batch.commit();
}
```

### Transactions
```typescript
import { runTransaction, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

async transferCount(fromId: string, toId: string, amount: number): Promise<void> {
  const fromRef = doc(db, this.collectionName, fromId);
  const toRef = doc(db, this.collectionName, toId);
  
  await runTransaction(db, async (transaction) => {
    const fromDoc = await transaction.get(fromRef);
    const toDoc = await transaction.get(toRef);
    
    if (!fromDoc.exists() || !toDoc.exists()) {
      throw new Error('Document does not exist!');
    }
    
    const newFromCount = fromDoc.data().count - amount;
    const newToCount = toDoc.data().count + amount;
    
    transaction.update(fromRef, { count: newFromCount });
    transaction.update(toRef, { count: newToCount });
  });
}
```

## Authentication Patterns

### Auth Context (`src/context/AuthContext.tsx`)
```typescript
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { 
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { userRepository } from '@/repositories';
import { UserProfile } from '@/types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  logOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
      if (user) {
        const userProfile = await userRepository.findById(user.uid);
        setProfile(userProfile);
      } else {
        setProfile(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await userRepository.save({
      uid: userCredential.user.uid,
      email,
      displayName,
      role: 'Participant',
      createdAt: new Date(),
      lastLogin: new Date()
    });
  };

  const logOut = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signUp, logOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
```

### Protected Route Pattern
```typescript
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function ProtectedPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (profile && profile.role !== 'Admin' && profile.role !== 'SuperAdmin') {
      router.push('/');
    }
  }, [profile, router]);

  if (loading) return <div>Loading...</div>;
  if (!user) return null;

  return <div>Protected Content</div>;
}
```

## Common Issues & Solutions

### 1. "Missing or insufficient permissions"
**Cause**: Security rules blocking query
**Solution**: 
- Check if query respects security rules
- Use permission-aware queries:
```typescript
// BAD: Tries to fetch all (blocked by rules)
const outlines = await outlineRepository.findAll();

// GOOD: Fetch only accessible
const publicOutlines = await outlineRepository.findWhere('isPublic', '==', true);
const userOutlines = await outlineRepository.findWhere('userId', '==', currentUserId);
const allAccessible = [...publicOutlines, ...userOutlines];
```

### 2. "Function collection() cannot be called with an empty path"
**Cause**: Repository's `collectionName` is undefined
**Solution**: Use property, not constructor parameter:
```typescript
// BAD
export class TagRepository extends BaseRepository<TagEntity> {
  constructor() {
    super('tag'); // BaseRepository doesn't accept parameters
  }
}

// GOOD
export class TagRepository extends BaseRepository<TagEntity> {
  protected collectionName = 'tag';
}
```

### 3. "Cannot read properties of undefined"
**Cause**: Old data missing new fields
**Solution**: Use optional chaining and fallbacks:
```typescript
const tags = snippetData.flatMap(s => (s.tags || []).map(t => t.tagId));
const sortedTags = allTags.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
```

### 4. Async Params Error (Next.js 15+)
**Cause**: Params is now a Promise
**Solution**: Use `React.use()`:
```typescript
import { use } from 'react';

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  // Use id normally
}
```

### 5. "addDoc() called with invalid data: undefined"
**Cause**: Trying to save undefined fields
**Solution**: Use default values in Factory:
```typescript
create(data: Partial<Entity>): Omit<Entity, 'id'> {
  return {
    name: data.name!,
    tags: data.tags || [],  // Default to empty array
    mediaIds: data.mediaIds || []
  };
}
```

## Seeding Data

### Seed Script (`src/lib/seed.ts`)
```typescript
import { tagRepository, snippetRepository } from '@/repositories';
import { TagFactory, SnippetFactory } from '@/factories';

async function seed() {
  console.log('Starting seed...');
  
  // Create tags first
  const tagFactory = new TagFactory();
  const tagIds: string[] = [];
  
  for (const name of ['Unity', 'Service', 'Justice']) {
    const id = await tagRepository.save(tagFactory.create({ name, count: 0 }));
    tagIds.push(id);
    console.log(`Created tag: ${name}`);
  }
  
  // Create snippets
  const snippetFactory = new SnippetFactory();
  const snippet = snippetFactory.create({
    firesideId: 'existing-fireside-id',
    name: 'Example Snippet',
    text: 'Content here...',
    naturalOrder: 1.0,
    tags: [{ tagId: tagIds[0], weight: 5, distance: 0 }]
  });
  
  await snippetRepository.save(snippet);
  await tagRepository.incrementCount(tagIds[0]);
  
  console.log('Seed complete!');
}

seed().catch(console.error);
```

## Performance Tips
1. Use `findWhere()` instead of filtering `findAll()` results
2. Limit queries with constraints
3. Cache frequently accessed data (tags, families)
4. Use batch operations for multiple writes
5. Index fields used in queries (firestore.indexes.json)

## Testing Security Rules
```bash
firebase emulators:start --only firestore
npm run test:rules
```
