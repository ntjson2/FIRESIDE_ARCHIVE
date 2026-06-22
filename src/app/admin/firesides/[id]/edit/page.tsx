'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { firesideRepository, firesideFamilyRepository, snippetRepository } from '@/repositories';
import { FiresideFactory } from '@/factories';
import { Fireside, FiresideFamily, Snippet } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { Timestamp } from 'firebase/firestore';

export default function EditFiresidePage() {
  const { profile } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [fireside, setFireside] = useState<Fireside | null>(null);
  const [families, setFamilies] = useState<FiresideFamily[]>([]);
  const [snippetCount, setSnippetCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [familyId, setFamilyId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');

  useEffect(() => {
    if (profile && profile.role !== 'Admin' && profile.role !== 'SuperAdmin') {
      router.push('/');
    }
  }, [profile, router]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [firesideData, familyData, snippetData] = await Promise.all([
          firesideRepository.findById(id),
          firesideFamilyRepository.findAll(),
          snippetRepository.findWhere('firesideId', '==', id)
        ]);

        if (!firesideData) {
          alert('Fireside not found');
          router.push('/admin/firesides');
          return;
        }

        setFireside(firesideData);
        setFamilyId(firesideData.firesideFamilyId);
        setName(firesideData.name);
        setDescription(firesideData.description);
        setDate(firesideData.date?.seconds
          ? new Date(firesideData.date.seconds * 1000).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0]);
        setFamilies(familyData.sort((a, b) => a.name.localeCompare(b.name)));
        setSnippetCount(snippetData.length);
      } catch (error) {
        console.error('Error fetching fireside:', error);
        alert('Failed to load fireside');
        router.push('/admin/firesides');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!familyId || !name.trim() || !description.trim()) {
      alert('Please fill in all required fields');
      return;
    }
    setSaving(true);
    try {
      const factory = new FiresideFactory();
      const updated = factory.create({
        firesideFamilyId: familyId,
        name: name.trim(),
        description: description.trim(),
        date: Timestamp.fromDate(new Date(date))
      });
      await firesideRepository.update(id, updated);
      router.push('/admin/firesides');
    } catch (error) {
      console.error('Error updating fireside:', error);
      alert('Failed to save fireside');
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!fireside) return;
    const msg = snippetCount > 0
      ? `Delete "${fireside.name}"? This fireside has ${snippetCount} snippet(s) that will be orphaned.`
      : `Delete "${fireside.name}"? This cannot be undone.`;
    if (!confirm(msg)) return;

    setDeleting(true);
    try {
      await firesideRepository.delete(id);
      router.push('/admin/firesides');
    } catch (error) {
      console.error('Error deleting fireside:', error);
      alert('Failed to delete fireside');
      setDeleting(false);
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/firesides">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Edit Fireside</h1>
            <p className="text-muted-foreground">Update fireside metadata.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {snippetCount > 0 && (
            <span className="text-sm text-muted-foreground">{snippetCount} snippet(s)</span>
          )}
          <Button variant="outline" onClick={handleDelete} disabled={deleting} className="text-destructive hover:text-destructive">
            <Trash2 className="mr-2 h-4 w-4" />
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
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
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Date *</Label>
            <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Link href="/admin/firesides">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  );
}