---
skill: tag-management
description: Work with the normalized tag system - global tags, snippet associations, usage tracking, and tag-based features.
applyTo: "**"
---

# Tag Management Skill

## Tag Architecture

### Global Tag Collection
```typescript
interface TagEntity extends BaseEntity {
  name: string;           // Unique tag name
  count: number;          // Usage frequency
  mediaIds: string[];     // Optional media references
}
```

### Snippet Tag Association
```typescript
interface SnippetTag {
  tagId: string;          // Reference to global tag
  weight: number;         // Importance (1-10)
  distance: number;       // Degrees of separation (0+)
}

interface Snippet extends BaseEntity {
  // ... other fields
  tags: SnippetTag[];     // Array of tag associations
}
```

## TagRepository Methods

```typescript
import { tagRepository } from '@/repositories';

// Find by exact name
const tag = await tagRepository.findByName('Shiloh');

// Increment usage count (when adding to snippet)
await tagRepository.incrementCount(tagId);

// Decrement usage count (when removing from snippet)
await tagRepository.decrementCount(tagId);

// Get all tags
const allTags = await tagRepository.findAll();
```

## Common Tag Operations

### 1. Tag Autocomplete Component
```typescript
'use client';

import { useState, useEffect } from 'react';
import { tagRepository } from '@/repositories';
import { TagEntity } from '@/types';
import { Input } from '@/components/ui/input';

export function TagAutocomplete({ 
  onSelect 
}: { 
  onSelect: (tag: TagEntity) => void 
}) {
  const [tags, setTags] = useState<TagEntity[]>([]);
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState<TagEntity[]>([]);

  useEffect(() => {
    tagRepository.findAll().then(setTags);
  }, []);

  useEffect(() => {
    if (!input.trim()) {
      setSuggestions([]);
      return;
    }
    const filtered = tags.filter(t => 
      t.name?.toLowerCase().includes(input.toLowerCase())
    );
    setSuggestions(filtered.slice(0, 5));
  }, [input, tags]);

  return (
    <div className="relative">
      <Input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Search tags..."
        list="tag-suggestions"
      />
      <datalist id="tag-suggestions">
        {tags.map(tag => (
          <option key={tag.id} value={tag.name} />
        ))}
      </datalist>
      {suggestions.length > 0 && (
        <div className="absolute z-10 w-full bg-card border border-border rounded-md mt-1 shadow-lg">
          {suggestions.map(tag => (
            <button
              key={tag.id}
              onClick={() => {
                onSelect(tag);
                setInput('');
                setSuggestions([]);
              }}
              className="w-full text-left px-3 py-2 hover:bg-muted"
            >
              {tag.name}
              <span className="text-xs text-muted-foreground ml-2">
                ({tag.count} uses)
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

### 2. Add Tag to Snippet (with Create-if-Not-Exists)
```typescript
async function addTagToSnippet(
  snippetTags: SnippetTag[],
  tagName: string,
  weight: number,
  distance: number
): Promise<SnippetTag[]> {
  // Find existing tag
  let tag = await tagRepository.findByName(tagName);
  
  // Create if doesn't exist
  if (!tag) {
    const id = await tagRepository.save({
      name: tagName,
      count: 0,
      mediaIds: []
    });
    tag = await tagRepository.findById(id);
  }
  
  if (!tag) throw new Error('Failed to create tag');
  
  // Check if already associated
  if (snippetTags.some(t => t.tagId === tag.id)) {
    throw new Error('Tag already added');
  }
  
  // Increment usage count
  await tagRepository.incrementCount(tag.id);
  
  // Add to snippet
  return [...snippetTags, {
    tagId: tag.id,
    weight,
    distance
  }];
}
```

### 3. Remove Tag from Snippet
```typescript
async function removeTagFromSnippet(
  snippetTags: SnippetTag[],
  tagId: string
): Promise<SnippetTag[]> {
  // Decrement usage count
  await tagRepository.decrementCount(tagId);
  
  // Remove from snippet
  return snippetTags.filter(t => t.tagId !== tagId);
}
```

### 4. Update Snippet Tags (Handle Adds/Removes)
```typescript
async function updateSnippetTags(
  snippetId: string,
  oldTags: SnippetTag[],
  newTags: SnippetTag[]
): Promise<void> {
  // Find added tags
  for (const tag of newTags) {
    if (!oldTags.some(t => t.tagId === tag.tagId)) {
      await tagRepository.incrementCount(tag.tagId);
    }
  }
  
  // Find removed tags
  for (const tag of oldTags) {
    if (!newTags.some(t => t.tagId === tag.tagId)) {
      await tagRepository.decrementCount(tag.tagId);
    }
  }
  
  // Update snippet
  await snippetRepository.update(snippetId, { tags: newTags });
}
```

### 5. Display Tags with Names
```typescript
async function getTagsWithNames(
  snippetTags: SnippetTag[]
): Promise<Array<SnippetTag & { name: string }>> {
  const tagIds = snippetTags.map(t => t.tagId);
  const uniqueIds = [...new Set(tagIds)];
  
  // Fetch all tag entities
  const tagMap: Record<string, TagEntity> = {};
  for (const id of uniqueIds) {
    const tag = await tagRepository.findById(id);
    if (tag) tagMap[id] = tag;
  }
  
  // Merge with snippet tags
  return snippetTags.map(st => ({
    ...st,
    name: tagMap[st.tagId]?.name || 'Unknown'
  }));
}
```

### 6. Tag Input Component (Full Featured)
```typescript
export function TagInput({
  tags,
  onChange
}: {
  tags: SnippetTag[];
  onChange: (tags: SnippetTag[]) => void;
}) {
  const [allTags, setAllTags] = useState<TagEntity[]>([]);
  const [tagName, setTagName] = useState('');
  const [weight, setWeight] = useState('5');
  const [distance, setDistance] = useState('0');

  useEffect(() => {
    tagRepository.findAll().then(setAllTags);
  }, []);

  const handleAdd = async () => {
    if (!tagName.trim()) return;
    
    try {
      const newTags = await addTagToSnippet(
        tags,
        tagName.trim(),
        parseInt(weight),
        parseInt(distance)
      );
      onChange(newTags);
      setTagName('');
      setWeight('5');
      setDistance('0');
      
      // Refresh tag list
      const updated = await tagRepository.findAll();
      setAllTags(updated);
    } catch (error) {
      alert(error.message);
    }
  };

  const handleRemove = async (tagId: string) => {
    const newTags = await removeTagFromSnippet(tags, tagId);
    onChange(newTags);
  };

  const getTagName = (tagId: string) => {
    return allTags.find(t => t.id === tagId)?.name || 'Unknown';
  };

  return (
    <div className="space-y-4">
      {/* Current Tags */}
      <div className="flex flex-wrap gap-2">
        {tags.map((tag, idx) => (
          <div key={idx} className="flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/20 text-sm">
            <span>{getTagName(tag.tagId)}</span>
            <span className="text-xs text-muted-foreground">
              W:{tag.weight} D:{tag.distance}
            </span>
            <button
              onClick={() => handleRemove(tag.tagId)}
              className="text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* Add Tag Form */}
      <div className="grid grid-cols-12 gap-2">
        <div className="col-span-6">
          <Input
            list="tag-list"
            value={tagName}
            onChange={(e) => setTagName(e.target.value)}
            placeholder="Tag name"
          />
          <datalist id="tag-list">
            {allTags.map(t => (
              <option key={t.id} value={t.name} />
            ))}
          </datalist>
        </div>
        <div className="col-span-2">
          <Input
            type="number"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            min="1"
            max="10"
            placeholder="Weight"
          />
        </div>
        <div className="col-span-2">
          <Input
            type="number"
            value={distance}
            onChange={(e) => setDistance(e.target.value)}
            min="0"
            placeholder="Distance"
          />
        </div>
        <div className="col-span-2">
          <Button onClick={handleAdd} className="w-full">
            Add
          </Button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Weight: 1-10 (importance), Distance: 0+ (degrees of separation)
      </p>
    </div>
  );
}
```

## Tag Cleanup Operations

### Remove Orphaned Tags (Zero Usage)
```typescript
async function cleanupOrphanedTags(): Promise<number> {
  const tags = await tagRepository.findAll();
  let removed = 0;
  
  for (const tag of tags) {
    if (tag.count === 0) {
      await tagRepository.delete(tag.id);
      removed++;
    }
  }
  
  return removed;
}
```

### Recalculate Tag Counts
```typescript
async function recalculateTagCounts(): Promise<void> {
  const snippets = await snippetRepository.findAll();
  const tagCounts: Record<string, number> = {};
  
  // Count all tag usages
  for (const snippet of snippets) {
    for (const tag of snippet.tags || []) {
      tagCounts[tag.tagId] = (tagCounts[tag.tagId] || 0) + 1;
    }
  }
  
  // Update all tags
  const tags = await tagRepository.findAll();
  for (const tag of tags) {
    const count = tagCounts[tag.id] || 0;
    if (tag.count !== count) {
      await tagRepository.update(tag.id, { count });
    }
  }
}
```

## Best Practices
1. Always increment/decrement counts when adding/removing tags
2. Use findByName() before creating to avoid duplicates
3. Handle undefined tags gracefully (old data may not have tags)
4. Provide autocomplete for user-friendly tag selection
5. Display usage counts to show popular tags
6. Implement cleanup utilities for orphaned tags
