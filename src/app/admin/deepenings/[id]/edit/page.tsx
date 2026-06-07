'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { deepeningRepository, snippetRepository, tagRepository, referenceRepository } from '@/repositories';
import { DeepeningFactory } from '@/factories';
import { Deepening, Snippet, TagEntity, SnippetTag, ReferenceEntity } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';
import { ArrowLeft, Save, Plus, X, Trash2, BookOpen, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';

export default function EditDeepeningPage({ params }: { params: Promise<{ id: string }> }) {
  const { profile } = useAuth();
  const router = useRouter();
  const { id } = use(params);

  const [deepening, setDeepening] = useState<Deepening | null>(null);
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [allTags, setAllTags] = useState<TagEntity[]>([]);
  const [references, setReferences] = useState<ReferenceEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Form state
  const [snippetId, setSnippetId] = useState('');
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [tags, setTags] = useState<SnippetTag[]>([]);
  const [originalTags, setOriginalTags] = useState<SnippetTag[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [newTagWeight, setNewTagWeight] = useState('1');
  const [newTagDistance, setNewTagDistance] = useState('0');
  const [tempTagNames, setTempTagNames] = useState<Record<string, string>>({});

  useEffect(() => {
    if (profile && profile.role !== 'Admin' && profile.role !== 'SuperAdmin') {
      router.push('/');
    }
  }, [profile, router]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [deepeningData, snippetData, tagData, referenceData] = await Promise.all([
          deepeningRepository.findById(id),
          snippetRepository.findAll(),
          tagRepository.findAll(),
          referenceRepository.findAll()
        ]);

        if (!deepeningData) {
          alert('Deepening not found');
          router.push('/admin/deepenings');
          return;
        }

        setDeepening(deepeningData);
        setSnippetId(deepeningData.snippetId);
        setName(deepeningData.name);
        setText(deepeningData.text);
        setTags([...(deepeningData.tags || [])]);
        setOriginalTags([...(deepeningData.tags || [])]);

        setSnippets(snippetData.sort((a: Snippet, b: Snippet) => (a.name || '').localeCompare(b.name || '')));
        setAllTags(tagData.sort((a: TagEntity, b: TagEntity) => (a.name || '').localeCompare(b.name || '')));
        
        // Load references linked to this deepening
        const linkedRefs = referenceData.filter((ref: ReferenceEntity) =>
          ref.linkedItems?.some(item => item.itemId === id && item.itemType === 'deepening')
        );
        setReferences(linkedRefs);
      } catch (error) {
        console.error('Error fetching data:', error);
        alert('Failed to load deepening');
        router.push('/admin/deepenings');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, router]);

  const handleAddTag = () => {
    if (!newTagName.trim()) return;

    const existingTag = allTags.find(t => t.name?.toLowerCase() === newTagName.toLowerCase());

    if (existingTag) {
      if (tags.some(t => t.tagId === existingTag.id)) {
        alert('This tag is already added');
        return;
      }
      setTags([...tags, { tagId: existingTag.id, weight: parseInt(newTagWeight), distance: parseInt(newTagDistance) }]);
    } else {
      const tempId = `temp_${Date.now()}_${newTagName}`;
      setTags([...tags, { tagId: tempId, weight: parseInt(newTagWeight), distance: parseInt(newTagDistance) }]);
      setTempTagNames(prev => ({ ...prev, [tempId]: newTagName.trim() }));
    }

    setNewTagName('');
    setNewTagWeight('1');
    setNewTagDistance('0');
  };

  const handleRemoveTag = (tagId: string) => {
    setTags(tags.filter(t => t.tagId !== tagId));
    if (tagId.startsWith('temp_')) {
      setTempTagNames(prev => { const n = { ...prev }; delete n[tagId]; return n; });
    }
  };

  const getTagName = (tagId: string): string => {
    if (tagId.startsWith('temp_')) return tempTagNames[tagId] || 'New tag';
    return allTags.find(t => t.id === tagId)?.name || 'Unknown';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!snippetId || !name.trim() || !text.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      // Decrement counts for removed tags
      const removedTags = originalTags.filter(ot => !tags.some(t => t.tagId === ot.tagId));
      for (const tag of removedTags) {
        await tagRepository.decrementCount(tag.tagId);
      }

      // Resolve temp tags and increment counts for new tags
      const processedTags: SnippetTag[] = [];
      for (const tag of tags) {
        const wasOriginal = originalTags.some(ot => ot.tagId === tag.tagId);
        if (tag.tagId.startsWith('temp_')) {
          const tagName = tempTagNames[tag.tagId];
          let resolved = await tagRepository.findByName(tagName);
          if (!resolved) {
            const createdId = await tagRepository.save({ name: tagName, count: 0, mediaIds: [] });
            resolved = await tagRepository.findById(createdId);
          }
          if (resolved) {
            processedTags.push({ tagId: resolved.id, weight: tag.weight, distance: tag.distance });
            await tagRepository.incrementCount(resolved.id);
          }
        } else {
          processedTags.push(tag);
          if (!wasOriginal) {
            await tagRepository.incrementCount(tag.tagId);
          }
        }
      }

      const factory = new DeepeningFactory();
      const updated = factory.create({ snippetId, name, text, tags: processedTags });
      await deepeningRepository.update(id, updated);
      router.push('/admin/deepenings');
    } catch (error) {
      console.error('Error saving deepening:', error);
      alert('Failed to save deepening');
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deepening) return;
    if (!confirm(`Permanently delete "${deepening.name}"? This cannot be undone.`)) return;

    setDeleting(true);
    try {
      for (const tag of deepening.tags || []) {
        await tagRepository.decrementCount(tag.tagId);
      }
      await deepeningRepository.delete(id);
      router.push('/admin/deepenings');
    } catch (error) {
      console.error('Error deleting deepening:', error);
      alert('Failed to delete deepening');
      setDeleting(false);
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
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/deepenings">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Edit Deepening</h1>
          <p className="text-muted-foreground">Update deepening content and tags.</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={handleDelete}
          disabled={deleting}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          {deleting ? 'Deleting...' : 'Delete'}
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-card rounded-lg border border-border p-6 space-y-6">

          {/* Snippet Selection */}
          <div className="space-y-2">
            <Label htmlFor="snippet">Parent Snippet *</Label>
            <select
              id="snippet"
              value={snippetId}
              onChange={(e) => setSnippetId(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md bg-background"
              required
            >
              <option value="">Select a snippet...</option>
              {snippets.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Deepening Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter deepening name"
              required
            />
          </div>

          {/* Text Content */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="text">Content * (Markdown supported)</Label>
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowPreview(!showPreview)}>
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
                placeholder="Enter deepening content (markdown supported)"
                required
              />
            )}
          </div>

          {/* References */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                References
              </Label>
              <Link href={`/admin/references/new?linkedTo=${id}&type=deepening`}>
                <Button type="button" variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Reference
                </Button>
              </Link>
            </div>

            {references.length > 0 ? (
              <div className="space-y-2">
                {references.map((ref) => (
                  <div key={ref.id} className="flex items-center justify-between p-3 rounded-md bg-secondary/10 border border-secondary/20">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{ref.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {ref.sourceType} • {ref.citationFormat}
                      </div>
                      {ref.formattedAPA && (
                        <div className="text-xs text-muted-foreground mt-1 line-clamp-1">
                          {ref.formattedAPA}
                        </div>
                      )}
                    </div>
                    <Link href={`/admin/references/${ref.id}`}>
                      <Button type="button" variant="ghost" size="sm">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">No references linked yet. Click "Add Reference" to get started.</p>
            )}
          </div>

          {/* Tags */}
          <div className="space-y-4">
            <Label>Tags</Label>

            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <div
                    key={tag.tagId}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20"
                  >
                    <span className="text-sm font-medium">{getTagName(tag.tagId)}</span>
                    <span className="text-xs text-muted-foreground ml-1">
                      w:{tag.weight} d:{tag.distance}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag.tagId)}
                      className="ml-1 text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add Tag Row */}
            <div className="flex gap-2 items-end">
              <div className="flex-1 space-y-1">
                <Label className="text-xs text-muted-foreground">Tag name</Label>
                <Input
                  list="tag-suggestions"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); } }}
                  placeholder="Type or select tag"
                />
                <datalist id="tag-suggestions">
                  {allTags.map(t => <option key={t.id} value={t.name} />)}
                </datalist>
              </div>
              <div className="w-20 space-y-1">
                <Label className="text-xs text-muted-foreground">Weight (1-100)</Label>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={newTagWeight}
                  onChange={(e) => setNewTagWeight(e.target.value)}
                />
              </div>
              <div className="w-20 space-y-1">
                <Label className="text-xs text-muted-foreground">Distance (0-10)</Label>
                <Input
                  type="number"
                  min="0"
                  max="10"
                  value={newTagDistance}
                  onChange={(e) => setNewTagDistance(e.target.value)}
                />
              </div>
              <Button type="button" variant="outline" onClick={handleAddTag}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Link href="/admin/deepenings">
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
