# Fireside Archive Project - AI Coding Agent Instructions

## Project Overview
Next.js 15 (App Router) + Firebase application for archiving Bahá'í fireside talks with hierarchical content structure. Authentication-gated content with role-based access (Guest, Participant, Admin, SuperAdmin).

## Quick Reference
- **Specialized Agents**: See [AGENTS.md](.github/AGENTS.md) for task-specific experts (firebase-expert, crud-builder, tag-specialist, etc.)
- **Common Skills**: See [.github/skills/](.github/skills/) for step-by-step guides:
  - `crud-page-builder.md` - Create admin CRUD pages
  - `repository-factory-creator.md` - New data access layers
  - `tag-management.md` - Work with normalized tags
  - `firebase-operations.md` - Firestore queries and troubleshooting

## Architecture & Data Flow

### Repository & Factory Pattern
- **Repositories**: Domain-specific data access in [src/repositories/](src/repositories/) - all Firestore operations go through these
- **Factories**: Entity creation logic in [src/factories/](src/factories/) - validates and constructs entities before persistence
- **Pattern**: `Factory.create()` → `Repository.save()` → Firestore
- **Example**: `new FiresideFactory().create(data)` then `firesideRepository.save(entity)`

### Firebase Integration
- **Auth**: Firebase Auth with context provider at [src/context/AuthContext.tsx](src/context/AuthContext.tsx) - wraps entire app
- **Collections**: `firesideFamily`, `fireside`, `snippet`, `deepening`, `outline`, `media`
- **Environment**: Firebase config must be in `.env.local` (see template in repo root)

### State Management
- **Auth State**: React Context via `AuthProvider` - use `useAuth()` hook
- **Outline State**: Zustand store at [src/store/useOutlineStore.ts](src/store/useOutlineStore.ts) - manages hierarchical outline structure
- **No Redux** - Context + Zustand only

### Routing Patterns
- **Auth Routes**: Grouped under `(auth)` route group with custom layout
- **Protected Routes**: Check `user` from `useAuth()` - redirect to `/login` if null
- **Admin Routes**: Check `user.role === 'Admin'` before rendering admin features
- **Client Components**: Use `'use client'` for any Firebase/Auth/Context hooks

## Key Conventions

### Repository Usage
Always import and use repositories for data access:
```typescript
import { firesideRepository, snippetRepository } from '@/repositories';

// Fetch data
const firesides = await firesideRepository.findAll();
const byFamily = await firesideRepository.findByFamilyId(familyId);

// Save with factory
import { FiresideFactory } from '@/factories';
const factory = new FiresideFactory();
const entity = factory.create({ name, description, ... });
const id = await firesideRepository.save(entity);
```

### TypeScript Types
- Core types defined in [src/types/index.ts](src/types/index.ts)
- All entities extend `BaseEntity` (id, createdAt, updatedAt)
- `Fireside` → `Snippet` → `Deepening` (hierarchical content structure)
- `Outline` manages user-created collections of snippets/deepenings
- All Firebase timestamps are `Timestamp` type, not `Date`

### Component Organization
- UI primitives in [src/components/ui/](src/components/ui/) (shadcn/ui style)
- Feature components directly in [src/components/](src/components/)
- Page components in [src/app/](src/app/) following Next.js 15 App Router structure

### Data Layer Pattern
Repositories extend [BaseRepository](src/repositories/BaseRepository.ts) with common CRUD:
- `findAll()`, `findById()`, `findWhere()` for queries
- `save()`, `update()`, `delete()` for mutations
- Domain-specific methods (e.g., `findByFamilyId()` in FiresideRepository)

### Authentication Flow
1. User signs up/logs in via [authService.ts](src/services/authService.ts)
2. User document created in Firestore with default `role: 'Participant'`
3. AuthContext listens to Firebase auth state and fetches user doc
4. Components access via `const { user, loading } = useAuth()`

## Development Workflow

### Running Locally
```bash
npm run dev          # Start development server
npm run build        # Production build (checks types)
npm run lint         # ESLint check
```

### Database Seeding
- Admin-only seed page at [/admin/seed](src/app/admin/seed/page.tsx)
- Seeds sample fireside data when run
- Seeds from [src/lib/seed.ts](src/lib/seed.ts)

### Environment Setup
Required in `.env.local`:
```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

## Critical Patterns

### Creating New Entities
```typescript
import { FiresideFactory } from '@/factories';
import { firesideRepository } from '@/repositories';

const factory = new FiresideFactory();
const fireside = factory.create({
  firesideFamilyId: 'family-123',
  name: 'Talk Title',
  description: 'Description',
  date: Timestamp.now()
});
const id = await firesideRepository.save(fireside);
```

### Client Components with Firebase
Always mark as client component when using Firebase hooks:
```typescript
'use client';
import { useAuth } from '@/context/AuthContext';
```

### Role-Based Access
```typescript
const { user } = useAuth();
if (user?.role !== 'Admin') return <Unauthorized />;
```

### Hierarchical Content Structure
- **FiresideFamily** (top level) → contains multiple **Firesides**
- **Fireside** → contains multiple **Snippets** (ordered by naturalOrder)
- **Snippet** → can have multiple **Deepenings** (commentary/analysis)
- **Outline** → user-created collections referencing snippets/deepenings

### Error Handling
- Repositories wrap Firebase errors in try/catch
- Return `null` or empty arrays on error, don't throw
- Log errors with `console.error` for debugging

## File References
- **Spec**: [DOCS/SPEC.md](DOCS/SPEC.md) - complete technical specification
- **Roadmap**: [DOCS/ROADMAP.md](DOCS/ROADMAP.md) - project phases, progress, and detailed tasks
- **Types**: [src/types/index.ts](src/types/index.ts) - TypeScript definitions
- **Firebase Init**: [src/lib/firebase.ts](src/lib/firebase.ts)
- **Repositories**: [src/repositories/](src/repositories/) - data access layer
- **Factories**: [src/factories/](src/factories/) - entity creation logic

## Common Issues & Quick Fixes

### "Missing or insufficient permissions"
**Cause**: Firestore security rules blocking query
**Fix**: Use permission-aware queries (see [firebase-operations.md](.github/skills/firebase-operations.md))
```typescript
// BAD: Blocked by rules
const all = await repository.findAll();

// GOOD: Respects security
const public = await repository.findWhere('isPublic', '==', true);
const owned = await repository.findWhere('userId', '==', userId);
```

### "Cannot read properties of undefined"
**Cause**: Old data missing new fields (tags, mediaIds, etc.)
**Fix**: Use optional chaining and defaults
```typescript
const tags = (snippet.tags || []).map(t => t.tagId);
sortedItems.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
```

### "collection() cannot be called with an empty path"
**Cause**: Repository missing `collectionName` property
**Fix**: Use property syntax, not constructor (see [repository-factory-creator.md](.github/skills/repository-factory-creator.md))
```typescript
export class MyRepository extends BaseRepository<MyType> {
  protected collectionName = 'myCollection'; // Not in constructor!
}
```

### Async Params Error (Next.js 15+)
**Cause**: `params` is now a Promise
**Fix**: Unwrap with `React.use()`
```typescript
import { use } from 'react';

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
}
```

### Tag System Issues
**See**: [tag-management.md](.github/skills/tag-management.md) for complete tag patterns
- Always increment/decrement counts when adding/removing tags
- Use `findByName()` before creating to avoid duplicates
- Handle undefined tags gracefully (old data compatibility)

## Styling Guidelines

### Theme System
- **Light Mode**: Primary #2D6F52 (green), Background #FAFDFB (white)
- **Dark Mode**: Primary #4A9070 (forest), Background #0A1510 (charcoal)
- **Fonts**: IBM Plex Sans (300-700), IBM Plex Mono (400-600)

### Tailwind Patterns
```typescript
// Cards
<div className="bg-card border border-border rounded-lg p-6">

// Hover states
<div className="hover:bg-muted/30 transition-colors">

// Buttons (use Button component)
<Button variant="outline">Cancel</Button>
<Button>Save</Button>

// Loading spinner
<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
```

## Development Commands

```bash
# Development
npm run dev                    # Start dev server (Turbopack)
npm run build                  # Production build
npm run lint                   # ESLint check

# Firebase
firebase deploy --only firestore:rules --project PROJECT_ID
firebase deploy --only hosting --project PROJECT_ID

# Database
# Run seed via /admin/seed page (admin-only UI)
```

## When to Use Specialized Agents

Ask to invoke specific agents from [AGENTS.md](.github/AGENTS.md) for:
- **firebase-expert**: Security rules, complex queries, auth flows
- **crud-builder**: Admin CRUD interfaces
- **tag-specialist**: Tag features, autocomplete, usage tracking
- **outline-architect**: Outline editor, hierarchical data
- **theme-designer**: Styling, dark mode, components
- **ai-integrator**: Local LLM, RAG, semantic search
- **deployment-manager**: Production deploys, optimization
