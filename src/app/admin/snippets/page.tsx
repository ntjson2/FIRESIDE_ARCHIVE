'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { snippetRepository, firesideRepository, tagRepository } from '@/repositories';
import { Snippet, Fireside, TagEntity } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Edit, Eye, Trash2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function AdminSnippetsPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [firesides, setFiresides] = useState<Record<string, Fireside>>({});
  const [tags, setTags] = useState<Record<string, TagEntity>>({});
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
        const [snippetData, firesideData, tagData] = await Promise.all([
          snippetRepository.findAll(),
          firesideRepository.findAll(),
          tagRepository.findAll()
        ]);

        setSnippets(snippetData.sort((a: Snippet, b: Snippet) => {
          const aTime = a.createdAt?.seconds || 0;
          const bTime = b.createdAt?.seconds || 0;
          return bTime - aTime;
        }));

        // Create lookup maps
        const firesideMap: Record<string, Fireside> = {};
        firesideData.forEach((f: Fireside) => firesideMap[f.id] = f);
        setFiresides(firesideMap);

        const tagMap: Record<string, TagEntity> = {};
        tagData.forEach((t: TagEntity) => tagMap[t.id] = t);
        setTags(tagMap);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredSnippets = snippets.filter(snippet => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      snippet.name.toLowerCase().includes(query) ||
      snippet.text.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading snippets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Manage Snippets</h1>
          <p className="text-muted-foreground">Create, edit, and organize snippet content.</p>
        </div>
        <Link href="/admin/snippets/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Snippet
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search snippets..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="text-sm text-muted-foreground">
        Showing {filteredSnippets.length} of {snippets.length} snippets
      </div>

      {/* Snippets Table */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-4 font-semibold text-sm">Order</th>
                <th className="text-left p-4 font-semibold text-sm">Name</th>
                <th className="text-left p-4 font-semibold text-sm">Fireside</th>
                <th className="text-left p-4 font-semibold text-sm">Tags</th>
                <th className="text-left p-4 font-semibold text-sm">Visibility</th>
                <th className="text-right p-4 font-semibold text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSnippets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-muted-foreground">
                    {searchQuery ? 'No snippets match your search' : 'No snippets found. Create one to get started.'}
                  </td>
                </tr>
              ) : (
                filteredSnippets.map((snippet) => {
                  const fireside = firesides[snippet.firesideId];
                  return (
                    <tr key={snippet.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                      <td className="p-4">
                        <span className="font-mono text-sm">{snippet.naturalOrder.toFixed(1)}</span>
                      </td>
                      <td className="p-4">
                        <Link href={`/snippets/${snippet.id}`} className="font-medium hover:text-primary">
                          {snippet.name}
                        </Link>
                        <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                          {snippet.text.substring(0, 100)}...
                        </p>
                      </td>
                      <td className="p-4">
                        <Link href={`/firesides/${fireside?.id}`} className="text-sm text-primary hover:underline">
                          {fireside?.name || 'Unknown'}
                        </Link>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1">
                          {(snippet.tags || []).slice(0, 2).map((tag, idx) => {
                            const tagEntity = tags[tag.tagId];
                            return (
                              <span key={idx} className="text-xs px-2 py-1 rounded-full bg-secondary/20 text-secondary-foreground">
                                {tagEntity?.name || 'Unknown'}
                              </span>
                            );
                          })}
                          {(snippet.tags || []).length > 2 && (
                            <span className="text-xs text-muted-foreground py-1">
                              +{(snippet.tags || []).length - 2}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center text-xs px-2 py-1 rounded-full ${
                          snippet.visibility === 'public' 
                            ? 'bg-primary/20 text-primary' 
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {snippet.visibility === 'public' ? <Eye className="mr-1 h-3 w-3" /> : null}
                          {snippet.visibility}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/admin/snippets/${snippet.id}/edit`}>
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => {
                              if (confirm(`Delete "${snippet.name}"?`)) {
                                snippetRepository.delete(snippet.id).then(() => {
                                  setSnippets(prev => prev.filter(s => s.id !== snippet.id));
                                });
                              }
                            }}
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
