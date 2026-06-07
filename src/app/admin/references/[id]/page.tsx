'use client';

import { useEffect, useState } from 'react';
import { ReferenceEntity } from '@/types';
import { referenceRepository } from '@/repositories';
import { referenceService, ValidationResult } from '@/services/referenceService';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Edit2, Trash2, RefreshCw, Loader, CheckCircle, XCircle, Clock } from 'lucide-react';

interface PageProps {
  params: {
    id: string;
  };
}

export default function ReferenceDetailPage({ params }: PageProps) {
  const router = useRouter();
  const [reference, setReference] = useState<ReferenceEntity | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedRef, setEditedRef] = useState<Partial<ReferenceEntity> | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadReference();
  }, [params.id]);

  const loadReference = async () => {
    setLoading(true);
    try {
      const ref = await referenceRepository.findById(params.id);
      setReference(ref);
      setEditedRef(ref);
    } catch (error) {
      console.error('Error loading reference:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!reference) return;

    setVerifying(true);
    try {
      const result = await referenceService.validateWithSourceType(
        reference.formattedAPA,
        reference.sourceType
      );

      if (result.isValid) {
        await referenceRepository.updateValidationStatus(reference.id, 'valid');
      } else {
        await referenceRepository.updateValidationStatus(reference.id, 'invalid', result.errors);
      }

      // Reload reference
      await loadReference();
    } catch (error) {
      console.error('Error verifying reference:', error);
      alert('Verification failed: ' + String(error));
    } finally {
      setVerifying(false);
    }
  };

  const handleDelete = async () => {
    if (!reference) return;
    if (!confirm('Delete this reference?')) return;

    try {
      await referenceRepository.delete(reference.id);
      router.push('/admin/references');
    } catch (error) {
      console.error('Error deleting reference:', error);
      alert('Failed to delete reference');
    }
  };

  const handleSaveEdit = async () => {
    if (!reference || !editedRef) return;

    setSaving(true);
    try {
      await referenceRepository.update(reference.id, editedRef);
      setIsEditing(false);
      await loadReference();
    } catch (error) {
      console.error('Error saving reference:', error);
      alert('Failed to save reference');
    } finally {
      setSaving(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'valid':
        return <CheckCircle className="w-6 h-6 text-green-600" />;
      case 'invalid':
        return <XCircle className="w-6 h-6 text-red-600" />;
      case 'pending':
        return <Clock className="w-6 h-6 text-yellow-600" />;
      default:
        return null;
    }
  };

  if (loading) {
    return <div className="p-6 text-center">Loading...</div>;
  }

  if (!reference) {
    return <div className="p-6 text-center">Reference not found</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-3xl font-bold">{reference.title}</h1>
      </div>

      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        {/* Status Section */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3">
            {getStatusIcon(reference.validationStatus)}
            <div>
              <p className="text-sm text-gray-600">Validation Status</p>
              <p className="font-semibold">
                {reference.validationStatus.charAt(0).toUpperCase() + reference.validationStatus.slice(1)}
              </p>
            </div>
          </div>
          <button
            onClick={handleVerify}
            disabled={verifying}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
          >
            {verifying && <Loader className="w-4 h-4 animate-spin" />}
            {verifying ? 'Verifying...' : 'Verify Reference'}
          </button>
        </div>

        {/* Formatted Citation */}
        <div>
          <label className="block text-sm font-semibold mb-2">Formatted Citation</label>
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 italic text-gray-700">
            {reference.formattedAPA}
          </div>
        </div>

        {/* Validation Errors */}
        {reference.validationErrors && reference.validationErrors.length > 0 && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="font-semibold text-red-800 mb-2">Validation Errors:</p>
            <ul className="space-y-1 text-sm text-red-700">
              {reference.validationErrors.map((error, idx) => (
                <li key={idx}>• {error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Last Validated */}
        {reference.validatedAt && (
          <div className="text-sm text-gray-600">
            Last verified: {new Date(reference.validatedAt as any).toLocaleString()}
          </div>
        )}

        {/* Source Information */}
        <div className="border-t pt-6">
          <h2 className="font-semibold mb-4">Source Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Source Type</p>
              <p className="font-medium">{reference.sourceType}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Citation Format</p>
              <p className="font-medium">{reference.citationFormat}</p>
            </div>
          </div>
        </div>

        {/* Academic Fields */}
        {(reference.authors || reference.year || reference.publisher) && (
          <div className="border-t pt-6">
            <h2 className="font-semibold mb-4">Academic Details</h2>
            <div className="space-y-2 text-sm">
              {reference.authors && (
                <div>
                  <p className="text-gray-600">Authors</p>
                  <p className="font-medium">
                    {reference.authors.map(a => `${a.lastName}, ${a.initials}`).join('; ')}
                  </p>
                </div>
              )}
              {reference.year && (
                <div>
                  <p className="text-gray-600">Year</p>
                  <p className="font-medium">{reference.year}</p>
                </div>
              )}
              {reference.publisher && (
                <div>
                  <p className="text-gray-600">Publisher</p>
                  <p className="font-medium">{reference.publisher}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bahai/Spiritual Fields */}
        {(reference.speaker || reference.conceptualMeta) && (
          <div className="border-t pt-6">
            <h2 className="font-semibold mb-4">Spiritual Details</h2>
            <div className="space-y-2 text-sm">
              {reference.speaker && (
                <div>
                  <p className="text-gray-600">Speaker</p>
                  <p className="font-medium">{reference.speaker}</p>
                </div>
              )}
              {reference.conceptualMeta && (
                <div>
                  <p className="text-gray-600">Related Concepts</p>
                  <p className="font-medium">{reference.conceptualMeta.relatedConcepts?.join(', ')}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="border-t pt-6 flex gap-3">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
          >
            <Edit2 className="w-4 h-4" />
            {isEditing ? 'Cancel Edit' : 'Edit'}
          </button>
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
