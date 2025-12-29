'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { snippetRepository, firesideRepository, tagRepository } from '@/repositories';
import { SnippetFactory } from '@/factories';
import { Snippet, Fireside, TagEntity, SnippetTag } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';
import { ArrowLeft, Save, Plus, X, Trash2 } from 'lucide-react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';

export default function EditSnippetPage({ params }: { params: Promise<{ id: string }> }) {
  const { profile } = useAuth();
  const router = useRouter();
  const { id } = use(params);
  const [snippet, setSnippet] = useState<Snippet | null>(null);
  const [firesides, setFiresides] = useState<Fireside[]>([]);
  const [allTags, setAllTags] = useState<TagEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Form state
  const [firesideId, setFiresideId] = useState('');
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [naturalOrder, setNaturalOrder] = useState('1.0');
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [tags, setTags] = useState<SnippetTag[]>([]);
  const [originalTags, setOriginalTags] = useState<SnippetTag[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [newTagWeight, setNewTagWeight] = useState('1');
  const [newTagDistance, setNewTagDistance] = useState('0');

  // Check admin access
  useEffect(() => {
    if (profile && profile.role !== 'Admin' && profile.role !== 'SuperAdmin') {
      router.push('/');
    }
  }, [profile, router]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [snippetData, firesideData, tagData] = await Promise.all([
          snippetRepository.findById(id),
          firesideRepository.findAll(),
          tagRepository.findAll()
        ]);

        if (!snippetData) {
          alert('Snippet not found');
          router.push('/admin/snippets');
          return;
        }

        setSnippet(snippetData);
        setFiresideId(snippetData.firesideId);
        setName(snippetData.name);
        setText(snippetData.text);
        setNaturalOrder(snippetData.naturalOrder.toString());
        setVisibility(snippetData.visibility);
        setTags([...(snippetData.tags || [])]);
        setOriginalTags([...(snippetData.tags || [])]);

        setFiresides(firesideData.sort((a: Fireside, b: Fireside) => (a.name || '').localeCompare(b.name || '')));
        setAllTags(tagData.sort((a: TagEntity, b: TagEntity) => (a.name || '').localeCompare(b.name || '')));
      } catch (error) {
        console.error('Error fetching data:', error);
        alert('Failed to load snippet');
        router.push('/admin/snippets');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, router]);

  const handleAddTag = () => {
    if (!newTagName.trim()) return;

    // Find or create tag
    let tag = allTags.find(t => t.name?.toLowerCase() === newTagName.toLowerCase());
    
    // Check if already added
    if (tags.some(t => t.tagId === tag?.id)) {
      alert('This tag is already added');
      return;
    }

    if (!tag) {
      // Will need to create this tag when saving
      const tempId = `temp_${Date.now()}_${newTagName}`;
      setTags([...tags, {
        tagId: tempId,
        weight: parseInt(newTagWeight),
        distance: parseInt(newTagDistance)
      }]);
    } else {
      setTags([...tags, {
        tagId: tag.id,
        weight: parseInt(newTagWeight),
        distance: parseInt(newTagDistance)
      }]);
    }

    setNewTagName('');
    setNewTagWeight('1');
    setNewTagDistance('0');
  };

  const handleRemoveTag = (tagId: string) => {
    setTags(tags.filter(t => t.tagId !== tagId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!firesideId || !name.trim() || !text.trim() || !snippet) {
      alert('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      // Process tags - create any new ones
      const processedTags: SnippetTag[] = [];
      for (const tag of tags) {
        if (tag.tagId.startsWith('temp_')) {
          // Extract tag name from temp ID
          const tagName = tag.tagId.split('_').slice(2).join('_');
          let existingTag = allTags.find(t => t.name === tagName);
          if (!existingTag) {
            const found = await tagRepository.findByName(tagName);
            if (found) {
              existingTag = found;
            } else {
              // Create tag
              const createdId = await tagRepository.save({
                name: tagName,
                count: 0,
                mediaIds: []
              });
              const createdTag = await tagRepository.findById(createdId);
              if (createdTag) {
                existingTag = createdTag;
              }
            }
          }
          if (existingTag) {
            processedTags.push({
              tagId: existingTag.id,
              weight: tag.weight,
              distance: tag.distance
            });
            await tagRepository.incrementCount(existingTag.id);
          }
        } else {
          processedTags.push(tag);
          // Check if this is a new tag reference
          if (!originalTags.some(t => t.tagId === tag.tagId)) {
            await tagRepository.incrementCount(tag.tagId);
          }
        }
      }

      // Decrement counts for removed tags
      for (const oldTag of originalTags) {
        if (!processedTags.some(t => t.tagId === oldTag.tagId)) {
          await tagRepository.decrementCount(oldTag.tagId);
        }
      }

      const snippetFactory = new SnippetFactory();
      const updated = snippetFactory.create({
        firesideId,
        name,
        text,
        naturalOrder: parseFloat(naturalOrder),
        visibility,
        tags: processedTags
      });

      await snippetRepository.update(snippet.id, updated);
      router.push('/admin/snippets');
    } catch (error) {
      console.error('Error updating snippet:', error);
      alert('Failed to update snippet');
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!snippet) return;
    
    const confirmed = confirm(`Are you sure you want to delete "${snippet.name}"? This action cannot be undone.`);
    if (!confirmed) return;

    setDeleting(true);
    try {
      // Decrement tag counts
      for (const tag of snippet.tags) {
        await tagRepository.decrementCount(tag.tagId);
      }
      
      await snippetRepository.delete(snippet.id);
      router.push('/admin/snippets');
    } catch (error) {
      console.error('Error deleting snippet:', error);
      alert('Failed to delete snippet');
      setDeleting(false);
    }
  };

  const getTagName = (tagId: string): string => {
    if (tagId.startsWith('temp_')) {
      return tagId.split('_').slice(2).join('_');
    }
    return allTags.find(t => t.id === tagId)?.name || 'Unknown';
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

  if (!snippet) return null;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/snippets">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Edit Snippet</h1>
            <p className="text-muted-foreground">Update snippet content and metadata.</p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={handleDelete}
          disabled={deleting}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          {deleting ? 'Deleting...' : 'Delete'}
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-card rounded-lg border border-border p-6 space-y-6">
          {/* Fireside Selection */}
          <div className="space-y-2">
            <Label htmlFor="fireside">Fireside *</Label>
            <select
              id="fireside"
              value={firesideId}
              onChange={(e) => setFiresideId(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md bg-background"
              required
            >
              <option value="">Select a fireside...</option>
              {firesides.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Snippet Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter snippet name"
              required
            />
          </div>

          {/* Natural Order */}
          <div className="space-y-2">
            <Label htmlFor="order">Natural Order *</Label>
            <Input
              id="order"
              type="number"
              step="0.1"
              value={naturalOrder}
              onChange={(e) => setNaturalOrder(e.target.value)}
              placeholder="1.0"
              required
            />
            <p className="text-xs text-muted-foreground">Order within the fireside (e.g., 1.0, 1.5, 2.0)</p>
          </div>

          {/* Visibility */}
          <div className="space-y-2">
            <Label>Visibility</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="public"
                  checked={visibility === 'public'}
                  onChange={(e) => setVisibility(e.target.value as 'public')}
                />
                <span>Public</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="private"
                  checked={visibility === 'private'}
                  onChange={(e) => setVisibility(e.target.value as 'private')}
                />
                <span>Private</span>
              </label>
            </div>
          </div>

          {/* Text Content */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="text">Content * (Markdown supported)</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
              >
                {showPreview ? 'Edit' : 'Preview'}
              </Button>
            </div>
            {showPreview ? (
              <div className="w-full min-h-[300px] p-4 border border-border rounded-md bg-background prose prose-sm max-w-none">
                <ReactMarkdown>{text}</ReactMarkdown>
              </div>
            ) : (
              <textarea
                id="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full min-h-[300px] px-3 py-2 border border-border rounded-md bg-background font-mono text-sm"
                placeholder="Enter snippet content (markdown supported)"
                required
              />
            )}
          </div>

          {/* Tags */}
          <div className="space-y-4">
            <Label>Tags</Label>
            
            {/* Current Tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag, idx) => (
                  <div key={idx} className="flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/20 text-sm">
                    <span>{getTagName(tag.tagId)}</span>
                    <span className="text-xs text-muted-foreground">W:{tag.weight} D:{tag.distance}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag.tagId)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add Tag Form */}
            <div className="grid grid-cols-12 gap-2">
              <div className="col-span-6">
                <Input
                  list="tag-suggestions"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="Tag name"
                />
                <datalist id="tag-suggestions">
                  {allTags.map(tag => (
                    <option key={tag.id} value={tag.name} />
                  ))}
                </datalist>
              </div>
              <div className="col-span-2">
                <Input
                  type="number"
                  value={newTagWeight}
                  onChange={(e) => setNewTagWeight(e.target.value)}
                  placeholder="Weight"
                  min="1"
                  max="10"
                />
              </div>
              <div className="col-span-2">
                <Input
                  type="number"
                  value={newTagDistance}
                  onChange={(e) => setNewTagDistance(e.target.value)}
                  placeholder="Distance"
                  min="0"
                />
              </div>
              <div className="col-span-2">
                <Button
                  type="button"
                  onClick={handleAddTag}
                  variant="outline"
                  className="w-full"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Weight: 1-10 (importance), Distance: 0+ (degrees of separation)
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Link href="/admin/snippets">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  );
}
