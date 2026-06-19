'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ReferenceEntity } from '@/types';
import { referenceService, ValidationResult, CitationAdvisory, CitationCandidate } from '@/services/referenceService';
import { referenceRepository } from '@/repositories';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader, BookOpen, Search, RefreshCw, Check, X, AlertTriangle, Sparkles, Globe } from 'lucide-react';

type CitationFormat = ReferenceEntity['citationFormat'];

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

const FORMAT_OPTIONS: { value: CitationFormat; label: string }[] = [
  { value: 'apa-7', label: 'APA 7th Edition' },
  { value: 'chicago', label: 'Chicago Style' },
  { value: 'bahai', label: 'Bahai Convention' },
  { value: 'religious', label: 'Religious Format' },
  { value: 'descriptive', label: 'Descriptive' },
  { value: 'custom', label: 'Custom' },
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

  // ─── Core State ──────────────────────────────────────────────────────────

  const [rawCitation, setRawCitation] = useState('');
  const [sourceType, setSourceType] = useState<string>('');

  // Advisory pipeline
  const [advisory, setAdvisory] = useState<CitationAdvisory | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<CitationFormat>('apa-7');
  const [activeCitation, setActiveCitation] = useState('');

  // Validation (legacy)
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

  // Locate Ref Online
  const [searchResults, setSearchResults] = useState<CitationCandidate[]>([]);
  const [searchSource, setSearchSource] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Loading / saving
  const [analyzing, setAnalyzing] = useState(false);
  const [rewriting, setRewriting] = useState(false);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);

  // Approval state
  const [approved, setApproved] = useState(false);

  // ─── Handlers ────────────────────────────────────────────────────────────

  /** Step 1: Analyze the reference (detect type → recommend format → rewrite) */
  const handleAnalyze = async () => {
    if (!rawCitation.trim()) {
      alert('Please enter a citation');
      return;
    }

    setAnalyzing(true);
    setAdvisory(null);
    setApproved(false);
    setShowSearchResults(false);

    try {
      const result = await referenceService.analyzeReference(rawCitation);
      setAdvisory(result);

      const format = result.recommendedFormat || 'apa-7';
      setSelectedFormat(format);
      setActiveCitation(result.formattedCitation || rawCitation);

      // Also set legacy validation result for backward compatibility
      setValidationResult({
        isValid: (result.formattedCitation?.length ?? 0) > 0 && (result.confidence ?? 0) >= 0.3,
        formattedAPA: result.formattedCitation || '',
        structured: result.structured,
        errors: !result.formattedCitation ? ['No citation could be generated'] : [],
        warnings: result.warnings,
      });
    } catch (error) {
      console.error('Analysis error:', error);
      setValidationResult({
        isValid: false,
        formattedAPA: '',
        structured: {},
        errors: ['Analysis failed: ' + String(error)],
      });
    } finally {
      setAnalyzing(false);
    }
  };

  /** Step 2: Switch to a different format and re-rewrite */
  const handleFormatChange = async (newFormat: CitationFormat) => {
    setSelectedFormat(newFormat);
    setRewriting(true);

    try {
      const result = await referenceService.rewriteToFormat(rawCitation, newFormat);
      setActiveCitation(result.formattedCitation || rawCitation);
      setAdvisory(prev => prev ? {
        ...prev,
        recommendedFormat: newFormat,
        formattedCitation: result.formattedCitation || prev.formattedCitation,
        alternativeFormats: prev.alternativeFormats,
      } : null);
    } catch (error) {
      console.error('Rewrite error:', error);
      // Keep current citation but warn
    } finally {
      setRewriting(false);
    }
  };

  /** Step 3: Locate Ref Online */
  const handleLocateOnline = async () => {
    if (!rawCitation.trim()) {
      alert('Enter a partial reference to search for');
      return;
    }

    setSearching(true);
    setShowSearchResults(true);
    setSearchResults([]);

    try {
      const { candidates, bestMatch, searchSource } = await referenceService.locateReferenceOnline(
        rawCitation,
        sourceType || undefined
      );
      setSearchResults(candidates);
      setSearchSource(searchSource);

      if (bestMatch) {
        setRawCitation(bestMatch.formattedCitation || `${bestMatch.authors.map(a => `${a.lastName}, ${a.initials}`).join(', ')} (${bestMatch.year}). ${bestMatch.title}. ${bestMatch.publisher}`.trim());
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setSearching(false);
    }
  };

  /** Accept the formatted citation */
  const handleAccept = () => {
    setApproved(true);
  };

  /** Save to Firestore */
  const handleSave = async () => {
    const result = validationResult;
    if (!result || !result.isValid) {
      alert('Reference must be valid before saving');
      return;
    }

    setSaving(true);
    try {
      const newRef: Omit<ReferenceEntity, 'id'> = {
        ...result.structured,
        formattedAPA: activeCitation,
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

  // ─── Render ──────────────────────────────────────────────────────────────

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
        {/* ─── Raw Citation Input ──────────────────────────────────────────── */}
        <div>
          <label className="block text-sm font-semibold mb-2">Citation Text</label>
          <textarea
            value={rawCitation}
            onChange={(e) => {
              setRawCitation(e.target.value);
              setAdvisory(null);
              setApproved(false);
            }}
            placeholder="Paste your citation here. Examples:
Smith, J.M. (2020). Community and Justice. Oxford University Press.
Kitab-i-Aqdas, paragraphs 30-45
Consultation - collective decision-making principle
Teaching on unity from Ridvan gathering 2024, documented by Archive team"
            className="w-full h-32 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
          />
        </div>

        {/* ─── Source Type Selection ───────────────────────────────────────── */}
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

        {/* ─── Action Buttons Row ───────────────────────────────────────────── */}
        <div className="flex gap-3">
          <button
            onClick={handleAnalyze}
            disabled={analyzing || !rawCitation.trim()}
            className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 flex items-center justify-center gap-2 transition-colors"
          >
            {analyzing ? <Loader className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {analyzing ? 'Analyzing...' : '🔍 Analyze & Format'}
          </button>

          <button
            onClick={handleLocateOnline}
            disabled={searching || !rawCitation.trim()}
            className="flex-1 bg-emerald-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-emerald-700 disabled:bg-gray-400 flex items-center justify-center gap-2 transition-colors"
          >
            {searching ? <Loader className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
            {searching ? 'Searching...' : '🌐 Locate Ref Online'}
          </button>
        </div>

        {/* ─── Search Results (Locate Ref Online) ───────────────────────────── */}
        {showSearchResults && (
          <div className="border-t-2 pt-4">
            <h3 className="font-semibold flex items-center gap-2 mb-3">
              <Search className="w-4 h-4" />
              Search Results
              {searchSource && (
                <span className="text-xs font-normal text-gray-500 ml-2">
                  (via {searchSource})
                </span>
              )}
            </h3>

            {searching && (
              <div className="p-4 bg-gray-50 rounded-lg text-center text-sm text-gray-500">
                <Loader className="w-5 h-5 animate-spin mx-auto mb-2" />
                Searching Crossref, Google Books, and AI knowledge base...
              </div>
            )}

            {!searching && searchResults.length === 0 && (
              <div className="p-4 bg-yellow-50 rounded-lg text-sm text-yellow-800">
                No references found online. Try adjusting your search terms or use Analyze & Format instead.
              </div>
            )}

            {!searching && searchResults.length > 0 && (
              <div className="space-y-3">
                {searchResults.map((candidate, idx) => (
                  <div
                    key={idx}
                    className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors cursor-pointer"
                    onClick={() => {
                      const citationText = `${candidate.authors.map(a => `${a.lastName}, ${a.initials}`).join(', ')} (${candidate.year}). ${candidate.title}. ${candidate.publisher}`.trim();
                      setRawCitation(citationText);
                      setShowSearchResults(false);
                      // Auto-trigger analysis
                      setTimeout(() => handleAnalyze(), 100);
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="font-semibold text-sm">{candidate.title}</p>
                        <p className="text-sm text-gray-600">
                          {candidate.authors.map(a => `${a.lastName}, ${a.initials}`).join('; ')}
                          {candidate.year ? ` (${candidate.year})` : ''}
                        </p>
                        {candidate.publisher && (
                          <p className="text-xs text-gray-500">{candidate.publisher}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          {candidate.doi && (
                            <span className="text-xs text-blue-600">DOI: {candidate.doi}</span>
                          )}
                          <span className="text-xs text-gray-400">|</span>
                          <span className="text-xs text-gray-500">
                            Confidence: {Math.round(candidate.confidence * 100)}%
                          </span>
                          <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                            {candidate.source}
                          </span>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center">
                          <Check className="w-4 h-4 text-blue-600" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── Advisory Panel (After Analyze) ───────────────────────────────── */}
        {advisory && (
          <div className="border-t-2 pt-6 space-y-4">
            {/* Analysis Banner */}
            <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-indigo-900">AI Analysis</h3>
                  <p className="text-sm text-indigo-700 mt-1">{advisory.rawAnalysis || 'Citation analyzed and formatted.'}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-100 text-indigo-800 text-xs rounded-full">
                      Detected: {advisory.detectedType}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-100 text-indigo-800 text-xs rounded-full">
                      Confidence: {Math.round((advisory.confidence ?? 0) * 100)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Format Selector */}
            <div>
              <label className="block text-sm font-semibold mb-2">Citation Format</label>
              <div className="flex gap-2 flex-wrap">
                {FORMAT_OPTIONS.map(fmt => {
                  const isActive = selectedFormat === fmt.value;
                  const isRecommended = advisory.recommendedFormat === fmt.value;
                  return (
                    <button
                      key={fmt.value}
                      onClick={() => handleFormatChange(fmt.value)}
                      disabled={rewriting}
                      className={`px-3 py-1.5 text-sm rounded-lg border transition-colors flex items-center gap-1.5 ${
                        isActive
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                      } ${isRecommended && !isActive ? 'ring-2 ring-yellow-400' : ''}`}
                    >
                      {rewriting && isActive && <Loader className="w-3 h-3 animate-spin" />}
                      {fmt.label}
                      {isRecommended && <span className="text-[10px] opacity-75">(recommended)</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Formatted Citation Preview */}
            <div className={`p-4 rounded-lg border-2 transition-colors ${
              approved
                ? 'bg-green-50 border-green-400'
                : 'bg-gray-50 border-gray-200'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  {approved ? (
                    <><Check className="w-4 h-4 text-green-600" /> Approved Citation</>
                  ) : (
                    <>Formatted Citation</>
                  )}
                </h3>
                {!approved && (
                  <button
                    onClick={handleAccept}
                    className="px-3 py-1 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 flex items-center gap-1"
                  >
                    <Check className="w-3 h-3" /> Accept
                  </button>
                )}
                {approved && (
                  <span className="px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded-full">
                    ✓ Accepted
                  </span>
                )}
              </div>

              {rewriting ? (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Reformatting...
                </div>
              ) : (
                <p className="text-sm font-mono bg-white p-3 rounded border border-gray-200 italic">
                  {activeCitation || '(no citation generated)'}
                </p>
              )}

              {/* Warnings */}
              {advisory.warnings && advisory.warnings.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-semibold text-yellow-800 mb-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Warnings:
                  </p>
                  <ul className="text-xs text-yellow-700 space-y-0.5">
                    {advisory.warnings.map((w, idx) => (
                      <li key={idx}>• {w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Alternative Formats */}
              {advisory.alternativeFormats && advisory.alternativeFormats.length > 0 && selectedFormat !== advisory.recommendedFormat && (
                <div className="mt-3 p-2 bg-white rounded border border-gray-200">
                  <p className="text-xs font-semibold text-gray-600 mb-1">Available in other formats:</p>
                  {advisory.alternativeFormats.map((alt, idx) => (
                    <p key={idx} className="text-xs text-gray-500 mt-1">
                      <span className="font-medium">{alt.label}:</span> {alt.citation}
                    </p>
                  ))}
                </div>
              )}
            </div>

            {/* Parsed Data (Collapsible) */}
            {advisory.structured && (
              <details className="group">
                <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700 select-none">
                  Parsed Data (click to expand)
                </summary>
                <div className="mt-2 p-3 bg-white rounded border border-gray-200">
                  <pre className="text-xs overflow-auto max-h-40">
                    {JSON.stringify(advisory.structured, null, 2)}
                  </pre>
                </div>
              </details>
            )}
          </div>
        )}

        {/* ─── Legacy Validation Error (fallback if analyze fails) ──────────── */}
        {!advisory && validationResult && !validationResult.isValid && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <h3 className="font-semibold text-red-800 mb-2 flex items-center gap-2">
              <X className="w-4 h-4" /> Validation Failed
            </h3>
            <ul className="text-sm text-red-700 space-y-1">
              {validationResult.errors.map((error, idx) => (
                <li key={idx}>• {error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* ─── Save Button ──────────────────────────────────────────────────── */}
        {approved && (
          <div className="border-t-2 pt-6">
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 flex items-center justify-center gap-2 transition-colors"
            >
              {saving && <Loader className="w-4 h-4 animate-spin" />}
              {saving ? 'Saving...' : 'Save Reference'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}