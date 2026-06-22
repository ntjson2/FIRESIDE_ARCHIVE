'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { tagRepository } from '@/repositories';
import { TagFactory } from '@/factories';
import { TagEntity } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';
import { Plus, Search, Edit3, Trash2, Save, X, Tag } from 'lucide-react';

export default function AdminTagsPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [tags, setTags] = useState<TagEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile && profile.role !== 'Admin' && profile.role !== 'SuperAdmin') {
      router.push('/');
    }
  }, [profile, router]);

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await tagRepository.findAll();
        setTags(data.sort((a, b) => (b.count || 0) - (a.count || 0)));
      } catch (e) { console.error(e); } finally { setLoading(false); }
    };
    fetch();
  }, []);

  const filtered = useMemo(() => {
    if (!searchQuery) return tags;
    const q = searchQuery.toLowerCase();
    return tags.filter(t => t.name.toLowerCase().includes(q));
  }, [tags, searchQuery]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const exists = tags.find(t => t.name.toLowerCase() === newName.trim().toLowerCase());
    if (exists) { alert('Tag already exists'); return; }
    setSaving(true);
    try {
      const factory = new TagFactory();
      const tag = factory.create({ name: newName.trim(), count: 0 });
      await tagRepository.save(tag);
      const updated = await tagRepository.findAll();
      setTags(updated.sort((a, b) => (b.count || 0) - (a.count || 0)));
      setNewName('');
      setShowCreate(false);
    } catch (e) { console.error(e); alert('Failed to create tag'); } finally { setSaving(false); }
  };

  const handleDelete = async (tag: TagEntity) => {
    if (!confirm(`Delete tag "${tag.name}"? (Used ${tag.count} times)`)) return;
    try {
      await tagRepository.delete(tag.id);
      setTags(prev => prev.filter(t => t.id !== tag.id));
    } catch (e) { console.error(e); alert('Failed to delete tag'); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading tags...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Manage Tags</h1>
          <p className="text-muted-foreground">Global tag registry. Tags are linked from snippets and deepenings.</p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)}>
          <Plus className="mr-2 h-4 w-4" />
          New Tag
        </Button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="bg-card rounded-lg border border-border p-4 flex gap-3 items-end">
          <div className="flex-1 space-y-1">
            <Label htmlFor="newTag">Tag Name</Label>
            <Input id="newTag" value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g., Shilo" autoFocus />
          </div>
          <Button type="submit" disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Saving...' : 'Create'}
          </Button>
          <Button type="button" variant="ghost" onClick={() => { setShowCreate(false); setNewName(''); }}>
            <X className="h-4 w-4" />
          </Button>
        </form>
      )}

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input type="text" placeholder="Search tags..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
      </div>

      <div className="text-sm text-muted-foreground">{filtered.length} tag(s)</div>

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">No tags found.</div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map(tag => (
              <div key={tag.id} className="flex items-center justify-between p-4 hover:bg-accent/50 transition-colors">
                <div className="flex items-center gap-3">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold">{tag.name}</span>
                  <span className="text-sm text-muted-foreground bg-secondary/20 px-2 py-0.5 rounded">
                    {tag.count || 0} usage(s)
                  </span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(tag)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}