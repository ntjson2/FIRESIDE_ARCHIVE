# Quick Reference Card

## Common Operations

### Creating a New CRUD Collection

1. **Define Type** (`src/types/index.ts`):
   ```typescript
   export interface MyEntity extends BaseEntity {
     name: string;
     description: string;
   }
   ```

2. **Create Factory** (`src/factories/MyEntityFactory.ts`):
   ```typescript
   export class MyEntityFactory extends BaseFactory<MyEntity> {
     create(data: Partial<MyEntity>) {
       this.validateRequired(data, ['name']);
       return { name: data.name!, description: data.description || '' };
     }
   }
   ```

3. **Create Repository** (`src/repositories/MyEntityRepository.ts`):
   ```typescript
   export class MyEntityRepository extends BaseRepository<MyEntity> {
     protected collectionName = 'myEntity';
   }
   export const myEntityRepository = new MyEntityRepository();
   ```

4. **Export** in `index.ts` files

5. **Add Security Rules** to `firestore.rules`

6. **Create Admin Pages**:
   - `/admin/myEntity/page.tsx` (listing)
   - `/admin/myEntity/new/page.tsx` (create)
   - `/admin/myEntity/[id]/edit/page.tsx` (edit)

### Repository Operations

```typescript
import { myEntityRepository } from '@/repositories';

// Read
const all = await myEntityRepository.findAll();
const one = await myEntityRepository.findById(id);
const filtered = await myEntityRepository.findWhere('field', '==', value);

// Write
const id = await myEntityRepository.save(entity);
await myEntityRepository.update(id, { field: newValue });
await myEntityRepository.delete(id);
```

### Tag Operations

```typescript
import { tagRepository } from '@/repositories';

// Find/create tag
let tag = await tagRepository.findByName('MyTag');
if (!tag) {
  const id = await tagRepository.save({ name: 'MyTag', count: 0, mediaIds: [] });
  tag = await tagRepository.findById(id);
}

// Add to snippet
snippet.tags.push({ tagId: tag.id, weight: 5, distance: 0 });
await tagRepository.incrementCount(tag.id);

// Remove from snippet
snippet.tags = snippet.tags.filter(t => t.tagId !== tag.id);
await tagRepository.decrementCount(tag.id);
```

### Authentication

```typescript
'use client';
import { useAuth } from '@/context/AuthContext';

export default function MyComponent() {
  const { user, profile, loading } = useAuth();
  
  if (loading) return <div>Loading...</div>;
  if (!user) return <div>Please log in</div>;
  if (profile?.role !== 'Admin') return <div>Admin only</div>;
  
  return <div>Protected content</div>;
}
```

### Next.js 15+ Params

```typescript
import { use } from 'react';

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  // Use id normally
}
```

### Null Safety

```typescript
// Arrays
const tags = (snippet.tags || []).map(t => t.tagId);

// Strings
const sorted = items.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

// Objects
const tagName = allTags.find(t => t.id === tagId)?.name || 'Unknown';
```

### Security Rules

```javascript
// Public read, admin write
match /collection/{docId} {
  allow read: if true;
  allow write: if isAdmin();
}

// Owner + public read
match /outline/{docId} {
  allow read: if resource.data.isPublic == true || 
                 request.auth.uid == resource.data.userId;
  allow write: if request.auth.uid == resource.data.userId;
}
```

### Common Components

```typescript
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Edit, Trash2, Search } from 'lucide-react';

// Button variants
<Button>Default</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="secondary">Secondary</Button>
<Button size="sm">Small</Button>

// Loading spinner
<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
```

### Styling Classes

```typescript
// Cards
"bg-card border border-border rounded-lg p-6"

// Hover effects
"hover:bg-muted/30 transition-colors"

// Tables
"bg-muted/50"  // Header
"border-t border-border"  // Row separator

// Text colors
"text-foreground"  // Primary text
"text-muted-foreground"  // Secondary text
"text-primary"  // Links/accents
"text-destructive"  // Errors/delete
```

### Firebase Deployment

```bash
# Deploy rules
firebase deploy --only firestore:rules --project fireside-archive

# Deploy indexes
firebase deploy --only firestore:indexes --project fireside-archive

# Deploy hosting
firebase deploy --only hosting --project fireside-archive

# Full deploy
firebase deploy --project fireside-archive
```

## Troubleshooting Checklist

- [ ] Using `'use client'` for Firebase hooks?
- [ ] Repository has `protected collectionName = '...'`?
- [ ] Handling undefined with `||` or `?.`?
- [ ] Using `React.use()` for params in Next.js 15+?
- [ ] Admin check in both component AND security rules?
- [ ] Incrementing/decrementing tag counts?
- [ ] Security rules deployed after changes?
- [ ] Default values in Factory for optional fields?

## Quick Agent Invocations

```
"Use firebase-expert to debug permission error"
"Use crud-builder to create admin page for X"
"Use tag-specialist to add tag autocomplete"
"Use theme-designer to style this component"
"Use deployment-manager to deploy to production"
```

## Key File Locations

```
DOCS/SPEC.md                    # Project specification
DOCS/ROADMAP.md                 # Development roadmap
src/types/index.ts              # Type definitions
src/repositories/               # Data access layer
src/factories/                  # Entity creation
src/context/AuthContext.tsx     # Authentication state
src/lib/firebase.ts             # Firebase initialization
firestore.rules                 # Security rules
.env.local                      # Environment config
```
