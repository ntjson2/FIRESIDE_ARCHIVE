'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { firesideRepository, firesideFamilyRepository, snippetRepository, tagRepository } from '@/repositories';
import { Fireside, FiresideFamily, Snippet, TagEntity } from '@/types';
import { Button } from '@/components/ui/button';
import { Calendar, ArrowLeft, Tag, FileText } from 'lucide-react';

export default function FiresideDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [fireside, setFireside] = useState<Fireside | null>(null);
  const [family, setFamily] = useState<FiresideFamily | null>(null);
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [tags, setTags] = useState<Record<string, TagEntity>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const firesideData = await firesideRepository.findById(id);
        if (!firesideData) {
          router.push('/');
          return;
        }
        setFireside(firesideData);

        // Fetch family
        const familyData = await firesideFamilyRepository.findById(firesideData.firesideFamilyId);
        setFamily(familyData);

        // Fetch snippets
        const snippetData = await snippetRepository.findWhere('firesideId', '==', id);
        // Sort by natural order
        snippetData.sort((a, b) => a.naturalOrder - b.naturalOrder);
        setSnippets(snippetData);

        // Fetch tag details
        const tagIds = snippetData.flatMap(s => (s.tags || []).map(t => t.tagId));
        const uniqueTagIds = [...new Set(tagIds)];
        const tagMap: Record<string, TagEntity> = {};
        
        for (const tagId of uniqueTagIds) {
          const tagData = await tagRepository.findById(tagId);
          if (tagData) {
            tagMap[tagId] = tagData;
          }
        }
        setTags(tagMap);
      } catch (error) {
        console.error('Error fetching fireside:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading fireside...</p>
        </div>
      </div>
    );
  }

  if (!fireside) {
    return (
      <div className="text-center py-12">
        <p className="text-lg text-muted-foreground">Fireside not found</p>
        <Link href="/">
          <Button className="mt-4">Back to Firesides</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        {family && (
          <div className="text-sm font-medium text-primary mb-2">
            {family.name}
          </div>
        )}

        <h1 className="text-4xl font-bold tracking-tight text-foreground">
          {fireside.name}
        </h1>

        <div className="flex items-center gap-4 mt-4 text-muted-foreground">
          <div className="flex items-center">
            <Calendar className="mr-2 h-4 w-4" />
            {fireside.date?.seconds
              ? new Date(fireside.date.seconds * 1000).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })
              : 'No date'}
          </div>
          <div className="flex items-center">
            <FileText className="mr-2 h-4 w-4" />
            {snippets.length} snippet{snippets.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border p-6">
        <h2 className="text-lg font-semibold mb-2">Description</h2>
        <p className="text-muted-foreground">{fireside.description}</p>
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-4">Snippets</h2>

        {snippets.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-lg border border-dashed border-border">
            <div className="text-muted-foreground">
              <p className="text-lg font-medium">No snippets yet</p>
              <p className="text-sm mt-1">Snippets will appear here once added.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {snippets.map((snippet, index) => (
              <Link
                key={snippet.id}
                href={`/snippets/${snippet.id}`}
                className="block group"
              >
                <div className="bg-card rounded-lg border border-border p-6 hover:border-primary hover:shadow-lg transition-all duration-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-sm font-mono text-muted-foreground">
                          #{snippet.naturalOrder.toFixed(1)}
                        </span>
                        <h3 className="text-lg font-semibold text-card-foreground group-hover:text-primary transition-colors">
                          {snippet.name}
                        </h3>
                      </div>
                      <p className="text-muted-foreground text-sm line-clamp-2">
                        {snippet.text.substring(0, 200)}...
                      </p>
                      
                      {snippet.tags && snippet.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {snippet.tags.slice(0, 3).map((tag, idx) => {
                            const tagEntity = tags[tag.tagId];
                            return (
                              <span
                                key={idx}
                                className="inline-flex items-center text-xs px-2 py-1 rounded-full bg-secondary/20 text-secondary-foreground"
                              >
                                <Tag className="mr-1 h-3 w-3" />
                                {tagEntity?.name || 'Unknown'}
                              </span>
                            );
                          })}
                          {snippet.tags.length > 3 && (
                            <span className="text-xs text-muted-foreground py-1">
                              +{snippet.tags.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
