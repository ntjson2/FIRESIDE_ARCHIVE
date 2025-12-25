'use client';

import { useAuth } from '@/context/AuthContext';
import { authService } from '@/services/authService';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ProfilePage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  if (!user || !profile) {
    return null; // Will redirect
  }

  const handleLogout = async () => {
    try {
      await authService.logout();
      router.push('/login');
    } catch (error) {
      console.error('Failed to logout', error);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-8 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">My Profile</h1>
        <Button variant="outline" onClick={handleLogout}>
          Sign Out
        </Button>
      </div>

      <div className="bg-white p-6 rounded-lg shadow border border-slate-200 space-y-4">
        <div>
          <label className="text-sm font-medium text-slate-500">Display Name</label>
          <p className="text-lg font-medium">{profile.displayName}</p>
        </div>
        
        <div>
          <label className="text-sm font-medium text-slate-500">Email</label>
          <p className="text-lg font-medium">{profile.email}</p>
        </div>

        <div>
          <label className="text-sm font-medium text-slate-500">Role</label>
          <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mt-1">
            {profile.role}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-slate-500">User ID</label>
          <p className="text-sm font-mono text-slate-400">{profile.uid}</p>
        </div>
      </div>
    </div>
  );
}
