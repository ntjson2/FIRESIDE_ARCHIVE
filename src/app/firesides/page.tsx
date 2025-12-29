'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { firesideRepository, firesideFamilyRepository } from '@/repositories';
import { Fireside, FiresideFamily } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Calendar, Search } from 'lucide-react';

export default function FiresidesPage() {
  const [firesides, setFiresides] = useState<Fireside[]>([]);
  const [families, setFamilies] = useState<FiresideFamily[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFamily, setSelectedFamily] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'name'>('date');

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
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredAndSortedFiresides = useMemo(() => {
    let result = [...firesides];

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (f) =>
          f.name.toLowerCase().includes(query) ||
          f.description.toLowerCase().includes(query)
      );
    }

    // Filter by family
    if (selectedFamily !== 'all') {
      result = result.filter((f) => f.firesideFamilyId === selectedFamily);
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      } else {
        const aDate = a.date?.seconds || 0;
        const bDate = b.date?.seconds || 0;
        return bDate - aDate; // Most recent first
      }
    });

    return result;
  }, [firesides, searchQuery, selectedFamily, sortBy]);

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
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Firesides</h1>
          <p className="text-muted-foreground">Browse and search your fireside archive.</p>
        </div>
        <Link href="/admin/firesides/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Fireside
          </Button>
        </Link>
      </div>

      {/* Filters and Search */}
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

        <div className="flex gap-2">
          <select
            value={selectedFamily}
            onChange={(e) => setSelectedFamily(e.target.value)}
            className="px-4 py-2 rounded-md border border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">All Families</option>
            {families.map((family) => (
              <option key={family.id} value={family.id}>
                {family.name}
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'date' | 'name')}
            className="px-4 py-2 rounded-md border border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="date">Sort by Date</option>
            <option value="name">Sort by Name</option>
          </select>
        </div>
      </div>

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredAndSortedFiresides.length} of {firesides.length} firesides
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredAndSortedFiresides.map((fireside) => {
          const family = families.find((f) => f.id === fireside.firesideFamilyId);
          return (
            <Link
              key={fireside.id}
              href={`/firesides/${fireside.id}`}
              className="block group"
            >
              <div className="bg-card rounded-lg border border-border p-6 hover:border-primary hover:shadow-lg transition-all duration-200">
                {family && (
                  <div className="text-xs font-medium text-primary mb-2">
                    {family.name}
                  </div>
                )}
                <h3 className="text-xl font-semibold text-card-foreground group-hover:text-primary transition-colors">
                  {fireside.name}
                </h3>
                <p className="text-muted-foreground mt-2 line-clamp-2">
                  {fireside.description}
                </p>
                <div className="mt-4 flex items-center text-sm text-muted-foreground">
                  <Calendar className="mr-2 h-4 w-4" />
                  {fireside.date?.seconds
                    ? new Date(fireside.date.seconds * 1000).toLocaleDateString()
                    : 'No date'}
                </div>
              </div>
            </Link>
          );
        })}

        {filteredAndSortedFiresides.length === 0 && (
          <div className="col-span-full text-center py-12 bg-card rounded-lg border border-dashed border-border">
            <div className="text-muted-foreground">
              <p className="text-lg font-medium">
                {searchQuery || selectedFamily !== 'all'
                  ? 'No firesides match your filters'
                  : 'No firesides found'}
              </p>
              <p className="text-sm mt-1">
                {searchQuery || selectedFamily !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Create one to get started or run the seed script.'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
