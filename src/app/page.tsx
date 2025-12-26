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
    return <div>Loading firesides...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Firesides</h1>
          <p className="text-slate-500">Manage and view your fireside archive.</p>
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
            <div className="bg-white rounded-lg border border-slate-200 p-6 hover:border-slate-300 hover:shadow-md transition-all">
              <h3 className="text-xl font-semibold group-hover:text-blue-600 transition-colors">
                {fireside.name}
              </h3>
              <p className="text-slate-500 mt-2 line-clamp-2">
                {fireside.description}
              </p>
              <div className="mt-4 flex items-center text-sm text-slate-400">
                <Calendar className="mr-2 h-4 w-4" />
                {fireside.date?.seconds 
                  ? new Date(fireside.date.seconds * 1000).toLocaleDateString() 
                  : 'No date'}
              </div>
            </div>
          </Link>
        ))}

        {firesides.length === 0 && (
          <div className="col-span-full text-center py-12 bg-white rounded-lg border border-dashed border-slate-300">
            <p className="text-slate-500">No firesides found. Create one to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
}
