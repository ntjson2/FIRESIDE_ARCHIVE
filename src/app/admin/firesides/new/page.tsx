'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { firesideRepository, firesideFamilyRepository } from '@/repositories';
import { FiresideFactory } from '@/factories';
import { FiresideFamily } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';
import { Timestamp } from 'firebase/firestore';

export default function NewFiresidePage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [families, setFamilies] = useState<FiresideFamily[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [familyId, setFamilyId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (profile && profile.role !== 'Admin' && profile.role !== 'SuperAdmin') {
      router.push('/');
    }
  }, [profile, router]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const familyData = await firesideFamilyRepository.findAll();
        setFamilies(familyData.sort((a, b) => a.name.localeCompare(b.name)));
      } catch (error) {
        console.error('Error fetching families:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!familyId || !name.trim() || !description.trim()) {
      alert('Please fill in all required fields');
      return;
    }
    setSaving(true);
    try {
      const factory = new FiresideFactory();
      const fireside = factory.create({
        firesideFamilyId: familyId,
        name: name.trim(),
        description: description.trim(),
        date: Timestamp.fromDate(new Date(date))
      });
      await firesideRepository.save(fireside);
      router.push('/admin/firesides');
    } catch (error) {
      console.error('Error saving fireside:', error);
      alert('Failed to save fireside');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/firesides">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">New Fireside</h1>
          <p className="text-muted-foreground">Add a new fireside to the archive.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-card rounded-lg border border-border p-6 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="family">Fireside Family *</Label>
            <select
              id="family"
              value={familyId}
              onChange={(e) => setFamilyId(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md bg-background"
              required
            >
              <option value="">Select a family...</option>
              {families.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Fireside Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Why Life"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., The purpose of life..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Date *</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Link href="/admin/firesides">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Saving...' : 'Create Fireside'}
          </Button>
        </div>
      </form>
    </div>
  );
}