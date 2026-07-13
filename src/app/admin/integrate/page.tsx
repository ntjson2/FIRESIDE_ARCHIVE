'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { pdfParserService } from '@/services/pdfParserService';
import { referenceService } from '@/services/referenceService';
import { firesideFamilyRepository, firesideRepository, snippetRepository, deepeningRepository } from '@/repositories';
import { FiresideFamilyFactory, FiresideFactory, SnippetFactory, DeepeningFactory } from '@/factories';
import { ParsedChunk, FiresideBatch, FiresideFamily } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';
import {
  Upload, FileText, ArrowLeft, ArrowRight, CheckCircle, Trash2, AlertTriangle,
  Edit3, MessageSquare, RefreshCw, BookOpen, Eye, SkipForward, Settings, Loader
} from 'lucide-react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { Timestamp } from 'firebase/firestore';

type UploadStatus = 'idle' | 'parsing' | 'reviewing' | 'done';

export default function IntegratePage() {
  const { profile } = useAuth();
  const router = useRouter();
  const isAdmin = profile?.role === 'Admin' || profile?.role === 'SuperAdmin';

  useEffect(() => { if (!isAdmin) router.push('/'); }, [isAdmin, router]);

  // ─── State ──────────────────────────────────────────────────────────────────
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
  const [batches, setBatches] = useState<FiresideBatch[]>([]);
  const [currentBatchIndex, setCurrentBatchIndex] = useState(0);
  const [families, setFamilies] = useState<FiresideFamily[]>([]);
  const [targetFamilyId, setTargetFamilyId] = useState('');
  const [selectedChunks, setSelectedChunks] = useState<Set<string>>(new Set());
  const [editingChunkId, setEditingChunkId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [noteChunkId, setNoteChunkId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [showDeleteAllWarning, setShowDeleteAllWarning] = useState(false);
  const [approving, setApproving] = useState(false);
  const [rescanning, setRescanning] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [processingCount, setProcessingCount] = useState(0);

  const currentBatch = batches[currentBatchIndex] || null;
  const allSelected = currentBatch ? selectedChunks.size === currentBatch.chunks.length && currentBatch.chunks.length > 0 : false;
  const selectedCount = selectedChunks.size;

  // ─── Load families ──────────────────────────────────────────────────────────
  useEffect(() => {
    firesideFamilyRepository.findAll().then(setFamilies);
  }, []);

  // ─── PDF Upload ─────────────────────────────────────────────────────────────
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setParsing(true);
    setUploadStatus('parsing');
    try {
      const { textItems, images } = await pdfParserService.parsePdf(file);
      const chunks = pdfParserService.createChunks(textItems, images);
      const detectedBatches = pdfParserService.createBatches(chunks);
      setBatches(detectedBatches);
      setCurrentBatchIndex(0);
      setSelectedChunks(new Set());
      setUploadStatus('reviewing');
    } catch (err) {
      console.error('PDF parsing failed:', err);
      alert('Failed to parse PDF. Ensure it is a valid text-based PDF.');
      setUploadStatus('idle');
    } finally { setParsing(false); }
  };

  // ─── Chunk Actions ──────────────────────────────────────────────────────────
  const updateChunk = (localId: string, updates: Partial<ParsedChunk>) => {
    setBatches(prev => prev.map(b => ({
      ...b,
      chunks: b.chunks.map(c => c.localId === localId ? { ...c, ...updates } : c)
    })));
  };

  const toggleSelectChunk = (localId: string) => {
    setSelectedChunks(prev => {
      const next = new Set(prev);
      next.has(localId) ? next.delete(localId) : next.add(localId);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (!currentBatch) return;
    if (allSelected) {
      setSelectedChunks(new Set());
    } else {
      setSelectedChunks(new Set(currentBatch.chunks.map(c => c.localId)));
    }
  };

  const handleDeleteSelected = () => {
    setShowDeleteAllWarning(false);
    const ids = selectedChunks.size > 0 ? selectedChunks : new Set(currentBatch?.chunks.map(c => c.localId));
    setBatches(prev => prev.map(b => ({
      ...b,
      chunks: b.chunks.filter(c => !ids.has(c.localId))
    })));
    setSelectedChunks(new Set());
  };

  const handleReScan = async (chunk: ParsedChunk) => {
    setRescanning(chunk.localId);
    const bat = currentBatch;
    const idx = bat?.chunks.indexOf(chunk) ?? -1;
    const prevContent = idx > 0 ? bat!.chunks[idx - 1].content : '';
    const nextContent = idx < (bat?.chunks.length ?? 0) - 1 ? bat!.chunks[idx + 1].content : '';
    const pageText = bat?.chunks.filter(c => c.pageNumber === chunk.pageNumber).map(c => c.content).join(' ') || '';

    try {
      const result = await pdfParserService.rescanChunk(chunk, pageText, bat?.firesideName || '', prevContent, nextContent);
      updateChunk(chunk.localId, {
        content: result.improvedContent,
        type: result.changedType,
        editedContent: result.improvedContent,
        originalContent: chunk.originalContent || chunk.content,
        scanVersion: (chunk.scanVersion || 1) + 1,
        scanHistory: [...(chunk.scanHistory || []), { content: chunk.content, type: chunk.type, timestamp: Date.now() }],
        marks: [...chunk.marks, { type: 're-scan', note: result.explanation }],
      });
    } catch (err) {
      alert('Re-scan failed: ' + String(err));
    } finally { setRescanning(null); }
  };

  const handleSaveEdit = () => {
    if (!editingChunkId) return;
    updateChunk(editingChunkId, { editedContent: editText, content: editText });
    setEditingChunkId(null);
    setEditText('');
  };

  const handleSaveNote = () => {
    if (!noteChunkId || !noteText.trim()) return;
    const chunk = currentBatch?.chunks.find(c => c.localId === noteChunkId);
    if (chunk) {
      updateChunk(noteChunkId, { notes: chunk.notes + (chunk.notes ? '\n' : '') + noteText.trim() });
    }
    setNoteChunkId(null);
    setNoteText('');
  };

  const handleToggleDeepening = (chunk: ParsedChunk) => {
    updateChunk(chunk.localId, {
      action: chunk.action === 'deepening' ? 'keep' : 'deepening',
      marks: [...chunk.marks, { type: chunk.action === 'deepening' ? 'un-deepen' : 'deepen', note: 'Manually toggled' }],
    });
  };

  // ─── Approve & Integrate ────────────────────────────────────────────────────
  const handleApproveFireside = async () => {
    if (!currentBatch || !targetFamilyId) {
      alert('Please select a Fireside Family before approving.');
      return;
    }
    setApproving(true);
    try {
      const factory = new FiresideFactory();
      const firesideData = factory.create({
        firesideFamilyId: targetFamilyId,
        name: currentBatch.firesideName,
        description: `Imported from PDF on ${new Date().toLocaleDateString()}`,
        date: Timestamp.now(),
      });
      const firesideId = await firesideRepository.save(firesideData);

      const chunks = currentBatch.chunks.filter(c => c.action !== 'delete' && c.action !== 'skip');
      for (const chunk of chunks) {
        const finalContent = chunk.editedContent || chunk.content;
        if (chunk.action === 'deepening') {
          const snippetId = await snippetRepository.save(
            new SnippetFactory().create({
              firesideId, name: finalContent.substring(0, 72),
              text: finalContent, naturalOrder: chunk.order, visibility: 'public', tags: [],
            })
          );
          await deepeningRepository.save(
            new DeepeningFactory().create({
              snippetId, name: `${chunk.content.substring(0, 30)} (deepening)`,
              text: finalContent, tags: [], references: chunk.references || [],
            })
          );
        } else {
          await snippetRepository.save(
            new SnippetFactory().create({
              firesideId, name: finalContent.substring(0, 72),
              text: finalContent, naturalOrder: chunk.order, visibility: 'public', tags: [],
              references: chunk.references || [],
            })
          );
        }
      }

      // Mark batch as approved
      setBatches(prev => prev.map((b, i) => i === currentBatchIndex ? { ...b, status: 'approved' } : b));
      // Advance to next
      if (currentBatchIndex < batches.length - 1) {
        setCurrentBatchIndex(prev => prev + 1);
        setSelectedChunks(new Set());
      } else {
        setUploadStatus('done');
      }
    } catch (err) {
      console.error('Approval failed:', err);
      alert('Failed to integrate fireside: ' + String(err));
    } finally { setApproving(false); }
  };

  const handleSkipFireside = () => {
    setBatches(prev => prev.map((b, i) => i === currentBatchIndex ? { ...b, status: 'skipped' } : b));
    if (currentBatchIndex < batches.length - 1) {
      setCurrentBatchIndex(prev => prev + 1);
      setSelectedChunks(new Set());
    } else {
      setUploadStatus('done');
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────────
  if (!isAdmin) return null;

  const remainingCount = batches.filter(b => b.status === 'pending').length;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Integrate Fireside Collection</h1>
          <p className="text-muted-foreground">Import a PDF, review chunks per fireside, approve into the archive.</p>
        </div>
        <Link href="/admin/firesides">
          <Button variant="ghost" size="sm"><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>
        </Link>
      </div>

      {/* Upload Section */}
      {uploadStatus === 'idle' && (
        <div className="bg-card rounded-lg border border-border p-12 text-center">
          <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Upload Fireside Collection PDF</h2>
          <p className="text-muted-foreground mb-6">Select a PDF containing one or more firesides with text and images.</p>
          <label className="cursor-pointer inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 shadow h-10 px-4 py-2">
            <Upload className="mr-2 h-4 w-4" />Choose PDF File
            <input type="file" accept=".pdf" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>
      )}

      {/* Parsing */}
      {uploadStatus === 'parsing' && (
        <div className="bg-card rounded-lg border border-border p-12 text-center">
          <Loader className="h-12 w-12 mx-auto text-primary animate-spin mb-4" />
          <h2 className="text-xl font-semibold">Parsing PDF...</h2>
          <p className="text-muted-foreground mt-2">Extracting text and images. Page {processingCount} processed...</p>
        </div>
      )}

      {/* Reviewing */}
      {uploadStatus === 'reviewing' && currentBatch && (
        <>
          {/* Progress Bar */}
          <div className="bg-card rounded-lg border border-border p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">
                Fireside {currentBatchIndex + 1} of {batches.length}
                {remainingCount > 0 && <span className="text-muted-foreground ml-2">({remainingCount} remaining)</span>}
              </span>
              {/* Family selector */}
              <div className="flex items-center gap-2">
                <Label className="text-sm">Target Family:</Label>
                <select
                  value={targetFamilyId}
                  onChange={(e) => {
                    setTargetFamilyId(e.target.value);
                    setBatches(prev => prev.map((b, i) => i === currentBatchIndex ? { ...b, targetFamilyId: e.target.value } : b));
                  }}
                  className="px-3 py-1.5 rounded-md border border-input bg-background text-sm"
                >
                  <option value="">Select family...</option>
                  {families.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${((currentBatchIndex) / batches.length) * 100}%` }} />
            </div>
          </div>

          {/* Fireside Name */}
          <div className="flex items-center gap-2">
            <Input
              value={currentBatch.firesideName}
              onChange={(e) => setBatches(prev => prev.map((b, i) => i === currentBatchIndex ? { ...b, firesideName: e.target.value } : b))}
              className="text-2xl font-bold max-w-md"
              placeholder="Fireside name..."
            />
            <span className="text-sm text-muted-foreground">
              {currentBatch.chunks.length} chunk{currentBatch.chunks.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Bulk Actions Bar */}
          <div className="bg-card rounded-lg border border-border p-3 flex items-center gap-3 flex-wrap">
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input type="checkbox" checked={allSelected} onChange={handleSelectAll} className="rounded" />
              Select All ({currentBatch.chunks.length})
            </label>
            <div className="flex-1" />
            <Button variant="outline" size="sm" onClick={handleApproveFireside} disabled={!targetFamilyId || approving || currentBatch.chunks.length === 0}>
              <CheckCircle className="mr-1 h-4 w-4" />
              {approving ? 'Approving...' : selectedCount > 0 ? `Approve Selected (${selectedCount})` : 'Approve All'}
            </Button>
            <button
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-destructive text-destructive-foreground hover:bg-destructive/90 h-9 px-3"
              onClick={() => setShowDeleteAllWarning(true)}>
              <Trash2 className="mr-1 h-4 w-4" />
              Delete {selectedCount > 0 ? `Selected (${selectedCount})` : 'All'}
            </button>
            <Button variant="ghost" size="sm" onClick={handleSkipFireside}>
              <SkipForward className="mr-1 h-4 w-4" />Skip Fireside
            </Button>

            {/* Delete All Warning Modal */}
            {showDeleteAllWarning && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-card p-6 rounded-lg border border-destructive/50 max-w-md shadow-xl">
                  <AlertTriangle className="h-8 w-8 text-destructive mb-4" />
                  <h3 className="text-lg font-bold">Delete Chunks?</h3>
                  <p className="text-muted-foreground mt-2">
                    This will permanently remove <strong>{selectedCount > 0 ? selectedCount : currentBatch.chunks.length} chunks</strong> from
                    "{currentBatch.firesideName}". This cannot be undone.
                  </p>
                  <div className="flex gap-2 mt-4 justify-end">
                    <Button variant="outline" onClick={() => setShowDeleteAllWarning(false)}>Cancel</Button>
                    <button
                      className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-destructive text-destructive-foreground hover:bg-destructive/90 h-9 px-3"
                      onClick={handleDeleteSelected}>Delete Permanently</button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Chunk List */}
          <div className="space-y-3">
            {currentBatch.chunks.length === 0 ? (
              <div className="text-center py-12 bg-card rounded-lg border border-dashed border-border">
                <p className="text-muted-foreground">All chunks have been processed. Approve or skip to continue.</p>
              </div>
            ) : (
              currentBatch.chunks.map((chunk, idx) => (
                <div key={chunk.localId}
                  className={`bg-card rounded-lg border p-4 transition-colors ${selectedChunks.has(chunk.localId) ? 'border-primary bg-primary/5' : 'border-border'}`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedChunks.has(chunk.localId)}
                      onChange={() => toggleSelectChunk(chunk.localId)}
                      className="mt-1.5 rounded"
                    />
                    <div className="flex-1 min-w-0">
                      {/* Chunk header */}
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          chunk.type === 'heading' ? 'bg-purple-500/20 text-purple-400' :
                          chunk.type === 'image' ? 'bg-cyan-500/20 text-cyan-400' :
                          'bg-primary/20 text-primary'
                        }`}>
                          {chunk.type.toUpperCase()}
                        </span>
                        <span className="text-xs text-muted-foreground">#{chunk.order} · p.{chunk.pageNumber}</span>
                        {chunk.action === 'deepening' && (
                          <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">Deepening</span>
                        )}
                        {chunk.scanVersion > 1 && (
                          <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">Re-scanned v{chunk.scanVersion}</span>
                        )}
                      </div>

                      {/* Content preview */}
                      {editingChunkId === chunk.localId ? (
                        <div className="space-y-2">
                          <textarea
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            className="w-full min-h-[120px] p-3 border border-border rounded-md bg-background font-mono text-sm"
                          />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={handleSaveEdit}><CheckCircle className="mr-1 h-3 w-3" />Save</Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingChunkId(null)}>Cancel</Button>
                          </div>
                        </div>
                      ) : chunk.type === 'image' && chunk.imageUrl ? (
                        <img src={chunk.imageUrl} alt={chunk.content} className="max-h-48 rounded border border-border" />
                      ) : (
                        <div className="text-sm text-muted-foreground line-clamp-3 mt-1">
                          {chunk.editedContent || chunk.content}
                        </div>
                      )}

                      {/* Notes */}
                      {noteChunkId === chunk.localId && (
                        <div className="mt-2 flex gap-2">
                          <Input value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Add a note..." className="flex-1" />
                          <Button size="sm" onClick={handleSaveNote}>Save</Button>
                        </div>
                      )}
                      {chunk.notes && (
                        <div className="mt-2 text-xs text-muted-foreground bg-secondary/10 p-2 rounded">
                          💬 {chunk.notes}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-1 mt-3 ml-7 flex-wrap">
                    <Button variant="ghost" size="sm" onClick={() => { setEditingChunkId(chunk.localId); setEditText(chunk.editedContent || chunk.content); }}>
                      <Edit3 className="mr-1 h-3 w-3" />Edit
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleReScan(chunk)} disabled={rescanning === chunk.localId}>
                      {rescanning === chunk.localId ? <Loader className="mr-1 h-3 w-3 animate-spin" /> : <RefreshCw className="mr-1 h-3 w-3" />}
                      Re-Scan
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleToggleDeepening(chunk)}>
                      <BookOpen className="mr-1 h-3 w-3" />
                      {chunk.action === 'deepening' ? 'Un-Deepen' : 'Deepen'}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => { setNoteChunkId(chunk.localId); setNoteText(''); }}>
                      <MessageSquare className="mr-1 h-3 w-3" />Note
                    </Button>
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive"
                      onClick={() => updateChunk(chunk.localId, { action: 'delete' })}>
                      <Trash2 className="mr-1 h-3 w-3" />Skip
                    </Button>
                    {chunk.marks.length > 0 && (
                      <span className="text-xs text-muted-foreground self-center ml-2">
                        {chunk.marks.map((m, i) => (
                          <span key={i} className="mr-2" title={m.note}>{m.type === 're-scan' ? '🔄' : m.type === 'deepen' ? '📚' : '📝'}</span>
                        ))}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Navigation */}
          <div className="flex justify-between">
            <Button variant="outline" disabled={currentBatchIndex === 0}
              onClick={() => { setCurrentBatchIndex(prev => prev - 1); setSelectedChunks(new Set()); }}>
              <ArrowLeft className="mr-2 h-4 w-4" />Previous
            </Button>
            <Button variant="outline" disabled={currentBatchIndex >= batches.length - 1}
              onClick={() => { setCurrentBatchIndex(prev => prev + 1); setSelectedChunks(new Set()); }}>
              Next <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </>
      )}

      {/* Done */}
      {uploadStatus === 'done' && (
        <div className="bg-card rounded-lg border border-border p-12 text-center">
          <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
          <h2 className="text-xl font-semibold">Integration Complete</h2>
          <p className="text-muted-foreground mt-2 mb-6">
            {batches.filter(b => b.status === 'approved').length} fireside(s) approved,
            {batches.filter(b => b.status === 'skipped').length} skipped.
          </p>
          <div className="flex gap-3 justify-center">
            <Link href="/admin/firesides"><Button variant="outline">View Firesides</Button></Link>
            <Button onClick={() => { setUploadStatus('idle'); setBatches([]); setCurrentBatchIndex(0); }}>
              <Upload className="mr-2 h-4 w-4" />Upload Another PDF
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}