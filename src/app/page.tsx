'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { outlineRepository, snippetRepository, firesideRepository } from '@/repositories';
import { Outline, Snippet, Fireside } from '@/types';
import { Button } from '@/components/ui/button';
import { BookOpen, FileText, Sparkles, ArrowRight, Calendar, Users } from 'lucide-react';

export default function Dashboard() {
  const { user, profile } = useAuth();
  const [recentOutlines, setRecentOutlines] = useState<Outline[]>([]);
  const [stats, setStats] = useState({
    totalSnippets: 0,
    totalFiresides: 0,
    totalOutlines: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch stats (public content)
        const [snippets, firesides] = await Promise.all([
          snippetRepository.findAll(),
          firesideRepository.findAll()
        ]);

        // Fetch outlines based on user auth state
        let outlinesData: Outline[] = [];
        if (user) {
          // Fetch public outlines and user's own outlines
          const [publicOutlines, userOutlines] = await Promise.all([
            outlineRepository.findWhere('isPublic', '==', true),
            outlineRepository.findWhere('userId', '==', user.uid)
          ]);
          
          // Merge and deduplicate
          const outlineMap = new Map<string, Outline>();
          [...publicOutlines, ...userOutlines].forEach(outline => {
            outlineMap.set(outline.id, outline);
          });
          outlinesData = Array.from(outlineMap.values());
        } else {
          // Only fetch public outlines for guests
          outlinesData = await outlineRepository.findWhere('isPublic', '==', true);
        }

        const sortedOutlines = outlinesData
          .sort((a, b) => {
            const aTime = a.updatedAt?.seconds || a.createdAt?.seconds || 0;
            const bTime = b.updatedAt?.seconds || b.createdAt?.seconds || 0;
            return bTime - aTime;
          })
          .slice(0, 5);
        setRecentOutlines(sortedOutlines);

        setStats({
          totalSnippets: snippets.length,
          totalFiresides: firesides.length,
          totalOutlines: outlinesData.length
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-br from-primary/10 to-secondary/10 rounded-lg p-8 border border-primary/20">
        <h1 className="text-4xl font-bold tracking-tight text-foreground mb-2">
          Welcome to Fireside Archive
        </h1>
        <p className="text-lg text-muted-foreground max-w-3xl">
          A markdown-first system for collecting, searching, and composing BUPC fireside deepenings. 
          Build teaching outlines with atomic snippets and AI-augmented discovery.
        </p>
        {user && profile && (
          <div className="mt-4 flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">
              Signed in as <span className="font-medium text-foreground">{profile.displayName || user.email}</span>
              {profile.role && <span className="ml-2 px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs font-medium">{profile.role}</span>}
            </span>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Link href="/firesides" className="block group">
          <div className="bg-card rounded-lg border border-border p-6 hover:border-primary hover:shadow-lg transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Firesides</p>
                <p className="text-3xl font-bold text-foreground mt-1">{stats.totalFiresides}</p>
              </div>
              <div className="bg-primary/10 p-3 rounded-full">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-primary group-hover:underline">
              Browse all <ArrowRight className="ml-1 h-4 w-4" />
            </div>
          </div>
        </Link>

        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Snippets</p>
              <p className="text-3xl font-bold text-foreground mt-1">{stats.totalSnippets}</p>
            </div>
            <div className="bg-secondary/20 p-3 rounded-full">
              <FileText className="h-6 w-6 text-secondary-foreground" />
            </div>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">Atomic content units</p>
        </div>

        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Outlines</p>
              <p className="text-3xl font-bold text-foreground mt-1">{stats.totalOutlines}</p>
            </div>
            <div className="bg-accent/20 p-3 rounded-full">
              <Sparkles className="h-6 w-6 text-accent-foreground" />
            </div>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">Teaching compositions</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <Link href="/firesides">
            <Button variant="outline" className="w-full justify-start">
              <BookOpen className="mr-2 h-4 w-4" />
              Browse Firesides
            </Button>
          </Link>
          <Link href="/admin/firesides/new">
            <Button variant="outline" className="w-full justify-start">
              <FileText className="mr-2 h-4 w-4" />
              New Fireside
            </Button>
          </Link>
          <Link href="/profile">
            <Button variant="outline" className="w-full justify-start">
              <Users className="mr-2 h-4 w-4" />
              My Profile
            </Button>
          </Link>
        </div>
      </div>

      {/* Recent Outlines */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Recent Outlines</h2>
          {recentOutlines.length > 0 && (
            <Link href="/outlines" className="text-sm text-primary hover:underline">
              View all
            </Link>
          )}
        </div>

        {recentOutlines.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-lg border border-dashed border-border">
            <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium text-muted-foreground">No outlines yet</p>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Create your first teaching outline to get started.
            </p>
            <Button>
              <Sparkles className="mr-2 h-4 w-4" />
              Create Outline
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {recentOutlines.map((outline) => {
              const updatedDate = outline.updatedAt?.seconds 
                ? new Date(outline.updatedAt.seconds * 1000)
                : outline.createdAt?.seconds 
                  ? new Date(outline.createdAt.seconds * 1000)
                  : null;

              return (
                <Link
                  key={outline.id}
                  href={`/outlines/${outline.id}`}
                  className="block group"
                >
                  <div className="bg-card rounded-lg border border-border p-4 hover:border-primary hover:shadow-md transition-all duration-200">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-card-foreground group-hover:text-primary transition-colors">
                          {outline.title}
                        </h3>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <div className="flex items-center">
                            <FileText className="mr-1 h-3 w-3" />
                            {outline.items?.length || 0} items
                          </div>
                          {updatedDate && (
                            <div className="flex items-center">
                              <Calendar className="mr-1 h-3 w-3" />
                              {updatedDate.toLocaleDateString()}
                            </div>
                          )}
                          <span className={`px-2 py-0.5 rounded-full text-xs ${
                            outline.isPublic 
                              ? 'bg-primary/20 text-primary' 
                              : 'bg-muted text-muted-foreground'
                          }`}>
                            {outline.isPublic ? 'Public' : 'Private'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
