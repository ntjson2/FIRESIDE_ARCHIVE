'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ReferenceEntity } from '@/types';
import { referenceService, ValidationResult } from '@/services/referenceService';
import { referenceRepository } from '@/repositories';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader, BookOpen } from 'lucide-react';

const SOURCE_TYPES = [
  { value: 'book', label: 'Book' },
  { value: 'journal', label: 'Journal Article' },
  { value: 'website', label: 'Website' },
  { value: 'other', label: 'Other (Academic)' },
  { value: 'bahai-text', label: 'Bahai Text' },
  { value: 'religious-scripture', label: 'Religious Scripture' },
  { value: 'spiritual-concept', label: 'Spiritual Concept' },
  { value: 'oral-tradition', label: 'Oral Tradition' },
];

export default function NewReferencePage() {
  return (
    <Suspense fallback={<div className="p-6 text-center"><Loader className="w-6 h-6 animate-spin mx-auto" /></div>}>
      <NewReferenceForm />
    </Suspense>
  );
}

function NewReferenceForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const linkedTo = searchParams.get('linkedTo');
  const linkedType = searchParams.get('type') as 'snippet' | 'deepening' | null;
  
  const [rawCitation, setRawCitation] = useState('');
  const [sourceType, setSourceType] = useState<string>('');
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleValidate = async () => {
    if (!rawCitation.trim()) {
      alert('Please enter a citation');
      return;
    }

    setLoading(true);
    try {
      let result: ValidationResult;
      if (sourceType) {
        result = await referenceService.validateWithSourceType(rawCitation, sourceType as ReferenceEntity['sourceType']);
      } else {
        result = await referenceService.validateAndFormatReference(rawCitation);
      }
      setValidationResult(result);
    } catch (error) {
      console.error('Validation error:', error);
      setValidationResult({
        isValid: false,
        formattedAPA: '',
        structured: {},
        errors: ['Validation failed: ' + String(error)],
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!validationResult || !validationResult.isValid) {
      alert('Reference must be valid before saving');
      return;
    }

    setSaving(true);
    try {
      const newRef: Omit<ReferenceEntity, 'id'> = {
        ...validationResult.structured,
        formattedAPA: validationResult.formattedAPA,
        validationStatus: 'valid',
        createdBy: 'admin', // TODO: Get from auth context
      } as Omit<ReferenceEntity, 'id'>;

      // Add linked items if provided
      if (linkedTo && linkedType) {
        newRef.linkedItems = [{
          itemId: linkedTo,
          itemType: linkedType,
        }];
      }

      const id = await referenceRepository.save(newRef);
      
      // If linking to an item, navigate back to that item's edit page
      if (linkedTo && linkedType) {
        router.push(`/admin/${linkedType}s/${linkedTo}/edit`);
      } else {
        router.push(`/admin/references/${id}`);
      }
    } catch (error) {
      console.error('Error saving reference:', error);
      alert('Failed to save reference');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-3xl font-bold">Add New Reference</h1>
      </div>

      {/* Linked Item Info Banner */}
      {linkedTo && linkedType && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-3">
          <BookOpen className="w-5 h-5 text-blue-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-blue-900">This reference will be linked to a {linkedType}</p>
            <p className="text-sm text-blue-700">After saving, you'll be returned to the {linkedType} edit page</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        {/* Raw Citation Input */}
        <div>
          <label className="block text-sm font-semibold mb-2">Citation Text</label>
          <textarea
            value={rawCitation}
            onChange={(e) => setRawCitation(e.target.value)}
            placeholder="Paste your citation here. Examples:
Smith, J.M. (2020). Community and Justice. Oxford University Press.
Kitab-i-Aqdas, paragraphs 30-45
Consultation - collective decision-making principle
Teaching on unity from Ridvan gathering 2024, documented by Archive team"
            className="w-full h-32 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
          />
        </div>

        {/* Source Type Selection */}
        <div>
          <label className="block text-sm font-semibold mb-2">Source Type (Optional)</label>
          <select
            value={sourceType}
            onChange={(e) => setSourceType(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Auto-detect</option>
            {SOURCE_TYPES.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Leave blank to auto-detect source type based on citation format
          </p>
        </div>

        {/* Validate Button */}
        <button
          onClick={handleValidate}
          disabled={loading || !rawCitation.trim()}
          className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
        >
          {loading && <Loader className="w-4 h-4 animate-spin" />}
          {loading ? 'Validating...' : 'Validate Reference'}
        </button>

        {/* Validation Results */}
        {validationResult && (
          <div className="border-t-2 pt-6 space-y-4">
            <div className={`p-4 rounded-lg ${validationResult.isValid ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <h3 className="font-semibold mb-2">
                {validationResult.isValid ? '✓ Valid Citation' : '✗ Invalid Citation'}
              </h3>

              {validationResult.formattedAPA && (
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-1">Formatted Citation:</p>
                  <p className="text-sm font-mono bg-white p-3 rounded border border-gray-200 italic">
                    {validationResult.formattedAPA}
                  </p>
                </div>
              )}

              {validationResult.errors && validationResult.errors.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-semibold text-red-800 mb-2">Errors:</p>
                  <ul className="text-sm text-red-700 space-y-1">
                    {validationResult.errors.map((error, idx) => (
                      <li key={idx}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {validationResult.warnings && validationResult.warnings.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-yellow-800 mb-2">Warnings:</p>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    {validationResult.warnings.map((warning, idx) => (
                      <li key={idx}>• {warning}</li>
                    ))}
                  </ul>
                </div>
              )}

              {validationResult.structured && (
                <div className="mt-4 p-3 bg-white rounded border border-gray-200">
                  <p className="text-xs font-semibold text-gray-600 mb-2">Parsed Data:</p>
                  <pre className="text-xs overflow-auto max-h-40">
                    {JSON.stringify(validationResult.structured, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {validationResult.isValid && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
              >
                {saving && <Loader className="w-4 h-4 animate-spin" />}
                {saving ? 'Saving...' : 'Save Reference'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
