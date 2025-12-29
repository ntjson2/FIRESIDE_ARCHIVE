'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { snippetRepository, firesideRepository, deepeningRepository, tagRepository } from '@/repositories';
import { Snippet, Fireside, Deepening, TagEntity } from '@/types';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Tag, FileText, Hash, Eye } from 'lucide-react';

export default function SnippetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [snippet, setSnippet] = useState<Snippet | null>(null);
  const [fireside, setFireside] = useState<Fireside | null>(null);
  const [deepenings, setDeepenings] = useState<Deepening[]>([]);
  const [tags, setTags] = useState<Record<string, TagEntity>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const snippetData = await snippetRepository.findById(id);
        if (!snippetData) {
          router.push('/');
          return;
        }
        setSnippet(snippetData);

        // Fetch parent fireside
        const firesideData = await firesideRepository.findById(snippetData.firesideId);
        setFireside(firesideData);

        // Fetch associated deepenings
        const deepeningData = await deepeningRepository.findWhere('snippetId', '==', id);
        setDeepenings(deepeningData);

        // Fetch all tag details
        const tagIds = [
          ...(snippetData.tags || []).map(t => t.tagId),
          ...deepeningData.flatMap(d => (d.tags || []).map(t => t.tagId))
        ];
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
        console.error('Error fetching snippet:', error);
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
          <p className="mt-4 text-muted-foreground">Loading snippet...</p>
        </div>
      </div>
    );
  }

  if (!snippet) {
    return (
      <div className="text-center py-12">
        <p className="text-lg text-muted-foreground">Snippet not found</p>
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

        {fireside && (
          <Link href={`/firesides/${fireside.id}`} className="text-sm font-medium text-primary hover:underline">
            {fireside.name}
          </Link>
        )}

        <div className="flex items-center gap-3 mt-2">
          <span className="text-lg font-mono text-muted-foreground">
            #{snippet.naturalOrder.toFixed(1)}
          </span>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            {snippet.name}
          </h1>
        </div>

        <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
          <div className="flex items-center">
            <Eye className="mr-2 h-4 w-4" />
            {snippet.visibility === 'public' ? 'Public' : 'Private'}
          </div>
          {deepenings.length > 0 && (
            <div className="flex items-center">
              <FileText className="mr-2 h-4 w-4" />
              {deepenings.length} deepening{deepenings.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>

      {/* Tags */}
      {snippet.tags && snippet.tags.length > 0 && (
        <div className="bg-card rounded-lg border border-border p-4">
          <h2 className="text-sm font-semibold mb-3 flex items-center">
            <Tag className="mr-2 h-4 w-4" />
            Tags
          </h2>
          <div className="flex flex-wrap gap-2">
            {snippet.tags.map((tag, idx) => {
              const tagEntity = tags[tag.tagId];
              return (
                <div
                  key={idx}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-secondary/20 text-secondary-foreground border border-secondary/30"
                >
                  <span className="font-medium">{tagEntity?.name || 'Unknown'}</span>
                  <span className="text-xs opacity-70">
                    Weight: {tag.weight} | Distance: {tag.distance}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h2 className="text-lg font-semibold mb-4">Content</h2>
        <div className="prose prose-slate dark:prose-invert max-w-none">
          <ReactMarkdown>{snippet.text}</ReactMarkdown>
        </div>
      </div>

      {/* Deepenings */}
      {deepenings.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold mb-4">Deepenings</h2>
          <div className="space-y-4">
            {deepenings.map((deepening) => (
              <div
                key={deepening.id}
                className="bg-card rounded-lg border border-border p-6"
              >
                <h3 className="text-xl font-semibold mb-3">{deepening.name}</h3>
                
                {deepening.tags && deepening.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {deepening.tags.map((tag, idx) => {
                      const tagEntity = tags[tag.tagId];
                      return (
                        <span
                          key={idx}
                          className="inline-flex items-center text-xs px-2 py-1 rounded-full bg-accent/20 text-accent-foreground"
                        >
                          <Tag className="mr-1 h-3 w-3" />
                          {tagEntity?.name || 'Unknown'}
                        </span>
                      );
                    })}
                  </div>
                )}

                <div className="prose prose-slate dark:prose-invert max-w-none">
                  <ReactMarkdown>{deepening.text}</ReactMarkdown>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
