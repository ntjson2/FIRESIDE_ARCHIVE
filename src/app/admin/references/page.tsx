'use client';

import { useEffect, useState } from 'react';
import { ReferenceEntity } from '@/types';
import { referenceRepository } from '@/repositories';
import Link from 'next/link';
import { Plus, Edit2, Trash2, CheckCircle, XCircle, Clock, Wifi } from 'lucide-react';

export default function ReferencesPage() {
  const [references, setReferences] = useState<ReferenceEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'valid' | 'invalid' | 'pending' | 'offline-check'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadReferences();
  }, []);

  const loadReferences = async () => {
    setLoading(true);
    try {
      const refs = await referenceRepository.findAll();
      setReferences(refs);
    } catch (error) {
      console.error('Error loading references:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteReference = async (id: string) => {
    if (confirm('Are you sure you want to delete this reference?')) {
      try {
        await referenceRepository.delete(id);
        setReferences(refs => refs.filter(r => r.id !== id));
      } catch (error) {
        console.error('Error deleting reference:', error);
        alert('Failed to delete reference');
      }
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'valid':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'invalid':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'offline-check':
        return <Wifi className="w-5 h-5 text-orange-600" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClass = 'px-3 py-1 rounded text-sm font-medium';
    switch (status) {
      case 'valid':
        return <span className={`${baseClass} bg-green-100 text-green-800`}>Valid</span>;
      case 'invalid':
        return <span className={`${baseClass} bg-red-100 text-red-800`}>Invalid</span>;
      case 'pending':
        return <span className={`${baseClass} bg-yellow-100 text-yellow-800`}>Pending</span>;
      case 'offline-check':
        return <span className={`${baseClass} bg-orange-100 text-orange-800`}>Offline Check</span>;
      default:
        return null;
    }
  };

  let filteredRefs = references;
  if (filter !== 'all') {
    filteredRefs = references.filter(r => r.validationStatus === filter);
  }
  if (searchTerm) {
    filteredRefs = filteredRefs.filter(r =>
      r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.authors?.some(a => a.lastName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      r.speaker?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">References</h1>
          <Link href="/admin/references/new">
            <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
              <Plus className="w-5 h-5" />
              Add Reference
            </button>
          </Link>
        </div>

        <div className="flex gap-4 mb-6 flex-wrap">
          <input
            type="text"
            placeholder="Search by title, author, or speaker..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="valid">Valid</option>
            <option value="invalid">Invalid</option>
            <option value="pending">Pending</option>
            <option value="offline-check">Offline Check</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading references...</p>
        </div>
      ) : filteredRefs.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No references found</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100 border-b-2 border-gray-300">
                <th className="text-left px-4 py-3 font-semibold">Title</th>
                <th className="text-left px-4 py-3 font-semibold">Source Type</th>
                <th className="text-left px-4 py-3 font-semibold">Author/Speaker</th>
                <th className="text-center px-4 py-3 font-semibold">Status</th>
                <th className="text-right px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRefs.map((ref) => (
                <tr key={ref.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link href={`/admin/references/${ref.id}`}>
                      <span className="text-blue-600 hover:underline cursor-pointer">{ref.title}</span>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">
                      {ref.sourceType}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {ref.authors ? ref.authors.map(a => a.lastName).join(', ') : ref.speaker || '-'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {getStatusIcon(ref.validationStatus)}
                      {getStatusBadge(ref.validationStatus)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Link href={`/admin/references/${ref.id}`}>
                        <button className="p-2 text-gray-600 hover:bg-blue-100 rounded-lg">
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </Link>
                      <button
                        onClick={() => deleteReference(ref.id)}
                        className="p-2 text-gray-600 hover:bg-red-100 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
