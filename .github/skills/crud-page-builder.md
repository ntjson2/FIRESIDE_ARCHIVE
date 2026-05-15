---
skill: crud-page-builder
description: Generate complete admin CRUD pages following the project's established patterns with repositories, factories, role-based access, and consistent styling.
applyTo: "**"
---

# CRUD Page Builder Skill

## Purpose
Create standardized admin CRUD interfaces for managing Firestore collections, following the project's Repository/Factory pattern.

## When to Use
- Creating new admin pages for content management
- Adding CRUD operations for new collections
- Standardizing existing admin interfaces

## Prerequisites
1. Repository exists in `src/repositories/` extending `BaseRepository`
2. Factory exists in `src/factories/` extending `BaseFactory`
3. Type defined in `src/types/index.ts`
4. Collection in Firestore with security rules

## Workflow

### 1. Listing Page Pattern
Location: `src/app/admin/{collection}/page.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { {collection}Repository } from '@/repositories';
import { {Type} } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function Admin{Collection}Page() {
  const { profile } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<{Type}[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Check admin access
  useEffect(() => {
    if (profile && profile.role !== 'Admin' && profile.role !== 'SuperAdmin') {
      router.push('/');
    }
  }, [profile, router]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await {collection}Repository.findAll();
        setItems(data.sort((a, b) => {
          const aTime = a.createdAt?.seconds || 0;
          const bTime = b.createdAt?.seconds || 0;
          return bTime - aTime;
        }));
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredItems = items.filter(item => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return item.name?.toLowerCase().includes(query);
  });

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    try {
      await {collection}Repository.delete(id);
      setItems(prev => prev.filter(i => i.id !== id));
    } catch (error) {
      console.error('Error deleting:', error);
      alert('Failed to delete');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manage {Collection}</h1>
          <p className="text-muted-foreground">Create, edit, and organize content.</p>
        </div>
        <Link href="/admin/{collection}/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Table */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-4 font-semibold text-sm">Name</th>
              <th className="text-right p-4 font-semibold text-sm">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((item) => (
              <tr key={item.id} className="border-t border-border hover:bg-muted/30">
                <td className="p-4">
                  <Link href={`/{collection}/${item.id}`} className="font-medium hover:text-primary">
                    {item.name}
                  </Link>
                </td>
                <td className="p-4">
                  <div className="flex items-center justify-end gap-2">
                    <Link href={`/admin/{collection}/${item.id}/edit`}>
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(item.id, item.name)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

### 2. Create/Edit Form Pattern
Location: `src/app/admin/{collection}/[id]/edit/page.tsx` or `new/page.tsx`

Key elements:
- Use `React.use()` to unwrap params in Next.js 15+
- Role-based access check with redirect
- Factory for validation before save
- Handle undefined/null values defensively
- Loading and saving states
- Form validation

### 3. Security Checklist
- ✅ Admin role check in component
- ✅ Security rules deployed in `firestore.rules`
- ✅ Repository uses proper collection name
- ✅ Factory validates required fields

### 4. Styling Guidelines
- Use IBM Plex Sans font
- Card backgrounds: `bg-card border border-border`
- Hover states: `hover:bg-muted/30`
- Primary actions: `<Button>` default variant
- Destructive actions: `text-destructive` with ghost variant
- Loading states: Spinning border animation

## Common Patterns

### Null Safety
Always use optional chaining and fallbacks:
```typescript
const tagIds = snippetData.flatMap(s => (s.tags || []).map(t => t.tagId));
item.name?.toLowerCase() || ''
```

### Sorting
```typescript
items.sort((a: Type, b: Type) => (a.name || '').localeCompare(b.name || ''))
```

### Async Params (Next.js 15+)
```typescript
import { use } from 'react';

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  // ...
}
```

## Testing Checklist
- [ ] Admin access redirects non-admins
- [ ] Search filters correctly
- [ ] Create form validates required fields
- [ ] Edit form loads existing data
- [ ] Delete shows confirmation
- [ ] Loading states display properly
- [ ] No console errors
- [ ] Responsive on mobile
