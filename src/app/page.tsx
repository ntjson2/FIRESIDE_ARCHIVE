'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { firesideRepository } from '@/repositories';
import { Fireside } from '@/types';
import { Button } from '@/components/ui/button';
import { Plus, Calendar } from 'lucide-react';

export default function Dashboard() {
  const [firesides, setFiresides] = useState<Fireside[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFiresides = async () => {
      try {
        const data = await firesideRepository.findAll();
        setFiresides(data);
      } catch (error) {
        console.error('Error fetching firesides:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFiresides();
  }, []);

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
          <p className="text-muted-foreground">Manage and view your fireside archive.</p>
        </div>
        <Link href="/firesides/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Fireside
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {firesides.map((fireside) => (
          <Link 
            key={fireside.id} 
            href={`/firesides/${fireside.id}`}
            className="block group"
          >
            <div className="bg-card rounded-lg border border-border p-6 hover:border-primary hover:shadow-lg transition-all duration-200">
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
        ))}

        {firesides.length === 0 && (
          <div className="col-span-full text-center py-12 bg-card rounded-lg border border-dashed border-border">
            <div className="text-muted-foreground">
              <p className="text-lg font-medium">No firesides found</p>
              <p className="text-sm mt-1">Create one to get started or run the seed script.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
