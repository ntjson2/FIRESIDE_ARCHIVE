'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { deepeningRepository, snippetRepository, tagRepository } from '@/repositories';
import { Deepening, Snippet, TagEntity } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Edit, Trash2, BookOpen } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function AdminDeepeningsPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [deepenings, setDeepenings] = useState<Deepening[]>([]);
  const [snippets, setSnippets] = useState<Record<string, Snippet>>({});
  const [tags, setTags] = useState<Record<string, TagEntity>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (profile && profile.role !== 'Admin' && profile.role !== 'SuperAdmin') {
      router.push('/');
    }
  }, [profile, router]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [deepeningData, snippetData, tagData] = await Promise.all([
          deepeningRepository.findAll(),
          snippetRepository.findAll(),
          tagRepository.findAll()
        ]);

        setDeepenings(deepeningData.sort((a: Deepening, b: Deepening) => {
          const aTime = a.createdAt?.seconds || 0;
          const bTime = b.createdAt?.seconds || 0;
          return bTime - aTime;
        }));

        const snippetMap: Record<string, Snippet> = {};
        snippetData.forEach((s: Snippet) => (snippetMap[s.id] = s));
        setSnippets(snippetMap);

        const tagMap: Record<string, TagEntity> = {};
        tagData.forEach((t: TagEntity) => (tagMap[t.id] = t));
        setTags(tagMap);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleDelete = async (deepening: Deepening) => {
    if (!confirm(`Delete "${deepening.name}"?`)) return;
    try {
      // Decrement tag counts
      for (const tag of deepening.tags || []) {
        await tagRepository.decrementCount(tag.tagId);
      }
      await deepeningRepository.delete(deepening.id);
      setDeepenings(prev => prev.filter(d => d.id !== deepening.id));
    } catch (error) {
      console.error('Error deleting deepening:', error);
      alert('Failed to delete deepening');
    }
  };

  const filtered = deepenings.filter(d => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      d.name.toLowerCase().includes(q) ||
      d.text.toLowerCase().includes(q) ||
      (snippets[d.snippetId]?.name || '').toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading deepenings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Manage Deepenings</h1>
          <p className="text-muted-foreground">Create, edit, and organize deepening content.</p>
        </div>
        <Link href="/admin/deepenings/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Deepening
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search deepenings..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="text-sm text-muted-foreground">
        Showing {filtered.length} of {deepenings.length} deepenings
      </div>

      {/* Table */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-4 font-semibold text-sm">Name</th>
                <th className="text-left p-4 font-semibold text-sm">Parent Snippet</th>
                <th className="text-left p-4 font-semibold text-sm">Tags</th>
                <th className="text-right p-4 font-semibold text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-12 text-muted-foreground">
                    {searchQuery
                      ? 'No deepenings match your search'
                      : 'No deepenings found. Create one to get started.'}
                  </td>
                </tr>
              ) : (
                filtered.map((deepening) => {
                  const snippet = snippets[deepening.snippetId];
                  return (
                    <tr
                      key={deepening.id}
                      className="border-t border-border hover:bg-muted/30 transition-colors"
                    >
                      <td className="p-4">
                        <Link href={`/admin/deepenings/${deepening.id}/edit`} className="font-medium hover:text-primary hover:underline">
                          {deepening.name}
                        </Link>
                        <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                          {deepening.text?.substring(0, 100) || ''}
                          {(deepening.text?.length ?? 0) > 100 ? '...' : ''}
                        </p>
                      </td>
                      <td className="p-4">
                        {snippet ? (
                          <Link
                            href={`/snippets/${snippet.id}`}
                            className="text-sm text-primary hover:underline"
                          >
                            {snippet.name}
                          </Link>
                        ) : (
                          <span className="text-sm text-muted-foreground">Unknown</span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1">
                          {(deepening.tags || []).slice(0, 2).map((tag, idx) => {
                            const tagEntity = tags[tag.tagId];
                            return (
                              <span
                                key={idx}
                                className="text-xs px-2 py-1 rounded-full bg-secondary/20 text-secondary-foreground"
                              >
                                {tagEntity?.name || 'Unknown'}
                              </span>
                            );
                          })}
                          {(deepening.tags || []).length > 2 && (
                            <span className="text-xs text-muted-foreground py-1">
                              +{(deepening.tags || []).length - 2}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/admin/references/new?linkedTo=${deepening.id}&type=deepening`}>
                            <Button variant="ghost" size="sm" title="Add reference">
                              <BookOpen className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Link href={`/admin/deepenings/${deepening.id}/edit`}>
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDelete(deepening)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
