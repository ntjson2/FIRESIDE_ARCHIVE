'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { firesideRepository, firesideFamilyRepository } from '@/repositories';
import { Fireside, FiresideFamily } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Plus, Search, Calendar, Edit3, Trash2 } from 'lucide-react';

export default function AdminFiresidesPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [firesides, setFiresides] = useState<Fireside[]>([]);
  const [families, setFamilies] = useState<FiresideFamily[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFamily, setSelectedFamily] = useState<string>('all');

  useEffect(() => {
    if (profile && profile.role !== 'Admin' && profile.role !== 'SuperAdmin') {
      router.push('/');
    }
  }, [profile, router]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [firesideData, familyData] = await Promise.all([
          firesideRepository.findAll(),
          firesideFamilyRepository.findAll()
        ]);
        setFiresides(firesideData);
        setFamilies(familyData);
      } catch (error) {
        console.error('Error fetching firesides:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredFiresides = useMemo(() => {
    let result = [...firesides];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(f => f.name.toLowerCase().includes(q) || f.description.toLowerCase().includes(q));
    }
    if (selectedFamily !== 'all') {
      result = result.filter(f => f.firesideFamilyId === selectedFamily);
    }
    result.sort((a, b) => (b.date?.seconds || 0) - (a.date?.seconds || 0));
    return result;
  }, [firesides, searchQuery, selectedFamily]);

  const handleDelete = async (fireside: Fireside) => {
    if (!confirm(`Delete "${fireside.name}"? Snippets and deepenings will be orphaned.`)) return;
    try {
      await firesideRepository.delete(fireside.id);
      setFiresides(prev => prev.filter(f => f.id !== fireside.id));
    } catch (error) {
      console.error('Error deleting fireside:', error);
      alert('Failed to delete fireside');
    }
  };

  const getFamilyName = (familyId: string) => families.find(f => f.id === familyId)?.name || 'Unknown';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading firesides...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Manage Firesides</h1>
          <p className="text-muted-foreground">Create, edit, and delete firesides.</p>
        </div>
        <Link href="/admin/firesides/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Fireside
          </Button>
        </Link>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search firesides..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={selectedFamily}
          onChange={(e) => setSelectedFamily(e.target.value)}
          className="px-4 py-2 rounded-md border border-input bg-background"
        >
          <option value="all">All Families</option>
          {families.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
      </div>

      <div className="text-sm text-muted-foreground">
        Showing {filteredFiresides.length} of {firesides.length} firesides
      </div>

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        {filteredFiresides.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No firesides found.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredFiresides.map(fireside => (
              <div key={fireside.id} className="flex items-center justify-between p-4 hover:bg-accent/50 transition-colors">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded">
                      {getFamilyName(fireside.firesideFamilyId)}
                    </span>
                    <h3 className="font-semibold">{fireside.name}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{fireside.description}</p>
                  <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {fireside.date?.seconds
                      ? new Date(fireside.date.seconds * 1000).toLocaleDateString()
                      : 'No date'}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link href={`/admin/firesides/${fireside.id}/edit`}>
                    <Button variant="ghost" size="sm">
                      <Edit3 className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(fireside)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}