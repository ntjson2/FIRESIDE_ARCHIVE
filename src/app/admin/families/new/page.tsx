'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { firesideFamilyRepository } from '@/repositories';
import { FiresideFamilyFactory } from '@/factories';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';

export default function NewFamilyPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (profile && profile.role !== 'Admin' && profile.role !== 'SuperAdmin') {
      router.push('/');
    }
  }, [profile, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Please enter a family name');
      return;
    }
    setSaving(true);
    try {
      const factory = new FiresideFamilyFactory();
      const family = factory.create({ uid: name.trim().toLowerCase().replace(/\s+/g, '-'), name: name.trim(), description: description || 'No description' });
      await firesideFamilyRepository.save(family);
      router.push('/admin/families');
    } catch (error) {
      console.error('Error saving family:', error);
      alert('Failed to save family');
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/families">
          <Button variant="ghost" size="sm"><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">New Family</h1>
          <p className="text-muted-foreground">Create a new fireside family grouping.</p>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-card rounded-lg border border-border p-6 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Family Name *</Label>
            <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g., General Firesides" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="desc">Description</Label>
            <Input id="desc" value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g., General purpose firesides..." />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Link href="/admin/families"><Button type="button" variant="outline">Cancel</Button></Link>
          <Button type="submit" disabled={saving}><Save className="mr-2 h-4 w-4" />{saving ? 'Saving...' : 'Create Family'}</Button>
        </div>
      </form>
    </div>
  );
}