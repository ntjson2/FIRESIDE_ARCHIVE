---
skill: repository-factory-creator
description: Create new Repository and Factory classes following the project's data access patterns for Firestore collections.
applyTo: "src/repositories/**, src/factories/**"
---

# Repository & Factory Creator Skill

## Purpose
Generate properly structured Repository and Factory classes for new Firestore collections.

## Workflow

### Step 1: Define Type in `src/types/index.ts`

```typescript
export interface {EntityName} extends BaseEntity {
  // Required fields
  name: string;
  description: string;
  
  // Optional fields
  mediaIds?: string[];
  visibility?: 'public' | 'private';
}
```

### Step 2: Create Factory in `src/factories/{EntityName}Factory.ts`

```typescript
import { {EntityName} } from '@/types';
import { BaseFactory } from './BaseFactory';

export class {EntityName}Factory extends BaseFactory<{EntityName}> {
  create(data: Partial<{EntityName}>): Omit<{EntityName}, 'id' | 'createdAt' | 'updatedAt'> {
    // Validate required fields
    this.validateRequired(data, ['name', 'description']);
    
    return {
      name: data.name!,
      description: data.description!,
      mediaIds: data.mediaIds || [],
      visibility: data.visibility || 'public'
    };
  }
}
```

### Step 3: Create Repository in `src/repositories/{EntityName}Repository.ts`

**Basic Pattern:**
```typescript
import { {EntityName} } from '@/types';
import { BaseRepository } from './BaseRepository';
import { orderBy } from 'firebase/firestore';

export class {EntityName}Repository extends BaseRepository<{EntityName}> {
  protected collectionName = '{collectionName}'; // lowercase, singular

  // Add domain-specific query methods
  async findByName(name: string): Promise<{EntityName} | null> {
    const results = await this.findWhere('name', '==', name);
    return results.length > 0 ? results[0] : null;
  }

  async findPublic(): Promise<{EntityName}[]> {
    return this.findWhere('visibility', '==', 'public');
  }
}

// Export singleton instance
export const {entityName}Repository = new {EntityName}Repository();
```

### Step 4: Export in `src/repositories/index.ts`

```typescript
export { {EntityName}Repository, {entityName}Repository } from './{EntityName}Repository';
```

### Step 5: Export in `src/factories/index.ts`

```typescript
export { {EntityName}Factory } from './{EntityName}Factory';
```

## BaseRepository Methods Available

All repositories inherit these methods:

```typescript
// Read operations
async findAll(constraints?: QueryConstraint[]): Promise<T[]>
async findById(id: string): Promise<T | null>
async findWhere(field: string, operator: any, value: any): Promise<T[]>

// Write operations  
async save(data: Omit<T, 'id'>): Promise<string> // Returns document ID
async update(id: string, data: Partial<T>): Promise<void>
async delete(id: string): Promise<void>
```

## BaseFactory Methods Available

```typescript
protected validateRequired(data: Partial<T>, fields: string[]): void
abstract create(data: Partial<T>): Omit<T, 'id' | 'createdAt' | 'updatedAt'>
```

## Common Custom Repository Methods

### Find by Parent ID
```typescript
async findByParentId(parentId: string): Promise<{EntityName}[]> {
  return this.findWhere('parentId', '==', parentId);
}
```

### Find with Sorting
```typescript
async findAllSorted(): Promise<{EntityName}[]> {
  return this.findAll([orderBy('name', 'asc')]);
}
```

### Find Public by Parent
```typescript
async findPublicByParentId(parentId: string): Promise<{EntityName}[]> {
  const items = await this.findByParentId(parentId);
  return items.filter(i => i.visibility === 'public');
}
```

### Increment/Decrement Counters
```typescript
async incrementCount(id: string): Promise<void> {
  const item = await this.findById(id);
  if (item) {
    await this.update(id, { count: item.count + 1 });
  }
}
```

## Usage Example

```typescript
import { {entityName}Repository } from '@/repositories';
import { {EntityName}Factory } from '@/factories';

// Create
const factory = new {EntityName}Factory();
const entity = factory.create({
  name: 'Example',
  description: 'Test entity'
});
const id = await {entityName}Repository.save(entity);

// Read
const item = await {entityName}Repository.findById(id);
const all = await {entityName}Repository.findAll();
const byName = await {entityName}Repository.findByName('Example');

// Update
await {entityName}Repository.update(id, { description: 'Updated' });

// Delete
await {entityName}Repository.delete(id);
```

## Security Rules Pattern

Add to `firestore.rules`:

```
match /{collectionName}/{docId} {
  allow read: if true; // Public read
  // OR
  allow read: if resource.data.visibility == 'public' || isAuthenticated();
  
  allow write: if isAdmin();
}
```

## Checklist
- [ ] Type defined with `extends BaseEntity`
- [ ] Factory validates required fields
- [ ] Repository sets `protected collectionName`
- [ ] Singleton exported from repositories/index.ts
- [ ] Factory exported from factories/index.ts
- [ ] Security rules added and deployed
- [ ] Custom query methods added as needed
