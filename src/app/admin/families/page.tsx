'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { firesideFamilyRepository } from '@/repositories';
import { FiresideFamily } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Plus, Search, Edit3, Trash2 } from 'lucide-react';

export default function AdminFamiliesPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [families, setFamilies] = useState<FiresideFamily[]>([]);
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
        const data = await firesideFamilyRepository.findAll();
        setFamilies(data);
      } catch (error) {
        console.error('Error fetching families:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filtered = useMemo(() => {
    if (!searchQuery) return families;
    const q = searchQuery.toLowerCase();
    return families.filter(f => f.name.toLowerCase().includes(q) || f.description.toLowerCase().includes(q));
  }, [families, searchQuery]);

  const handleDelete = async (family: FiresideFamily) => {
    if (!confirm(`Delete "${family.name}"? This may orphan firesides in this family.`)) return;
    try {
      await firesideFamilyRepository.delete(family.id);
      setFamilies(prev => prev.filter(f => f.id !== family.id));
    } catch (error) {
      console.error('Error deleting family:', error);
      alert('Failed to delete family');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading families...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Manage Families</h1>
          <p className="text-muted-foreground">Create, edit, and delete fireside families.</p>
        </div>
        <Link href="/admin/families/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Family
          </Button>
        </Link>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search families..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">No families found.</div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map(family => (
              <div key={family.id} className="flex items-center justify-between p-4 hover:bg-accent/50 transition-colors">
                <div className="flex-1">
                  <h3 className="font-semibold">{family.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{family.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Link href={`/admin/families/${family.id}/edit`}>
                    <Button variant="ghost" size="sm">
                      <Edit3 className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(family)}>
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