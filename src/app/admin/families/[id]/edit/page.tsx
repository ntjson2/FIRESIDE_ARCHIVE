'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { firesideFamilyRepository } from '@/repositories';
import { FiresideFamily } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';
import Link from 'next/link';

export default function EditFamilyPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (profile && profile.role !== 'Admin' && profile.role !== 'SuperAdmin') { router.push('/'); }
  }, [profile, router]);

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await firesideFamilyRepository.findById(id);
        if (!data) { alert('Family not found'); router.push('/admin/families'); return; }
        setName(data.name);
        setDescription(data.description);
      } catch (e) { console.error(e); } finally { setLoading(false); }
    };
    fetch();
  }, [id, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { alert('Name required'); return; }
    setSaving(true);
    try {
      await firesideFamilyRepository.update(id, { name: name.trim(), description });
      router.push('/admin/families');
    } catch (e) { console.error(e); alert('Save failed'); setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete "${name}"?`)) return;
    setDeleting(true);
    try { await firesideFamilyRepository.delete(id); router.push('/admin/families'); }
    catch (e) { console.error(e); alert('Delete failed'); setDeleting(false); }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="text-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" /><p className="mt-4 text-muted-foreground">Loading...</p></div></div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/families"><Button variant="ghost" size="sm"><ArrowLeft className="mr-2 h-4 w-4" />Back</Button></Link>
          <div><h1 className="text-3xl font-bold">Edit Family</h1><p className="text-muted-foreground">Update family details.</p></div>
        </div>
        <Button variant="outline" onClick={handleDelete} disabled={deleting} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" />{deleting ? 'Deleting...' : 'Delete'}</Button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-card rounded-lg border border-border p-6 space-y-6">
          <div className="space-y-2"><Label htmlFor="name">Family Name *</Label><Input id="name" value={name} onChange={e => setName(e.target.value)} required /></div>
          <div className="space-y-2"><Label htmlFor="desc">Description</Label><Input id="desc" value={description} onChange={e => setDescription(e.target.value)} /></div>
        </div>
        <div className="flex justify-end gap-2">
          <Link href="/admin/families"><Button type="button" variant="outline">Cancel</Button></Link>
          <Button type="submit" disabled={saving}><Save className="mr-2 h-4 w-4" />{saving ? 'Saving...' : 'Save Changes'}</Button>
        </div>
      </form>
    </div>
  );
}