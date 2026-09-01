'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { localIntegrationService } from '@/services/localIntegrationService';
import { firesideFamilyRepository } from '@/repositories';
import { FiresideFamily, TransitionEntry, SnippetStatus } from '@/types';
import {
  LocalIntegrationJob,
  LocalIntegrationSnippet,
  LocalIntegrationImage,
  FiresideReviewStatus,
} from '@/lib/indexedDb';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Upload, ArrowLeft, Play, Trash2, CheckCircle, Clock, Loader,
  FileText, Image, AlertCircle, Edit3, X, BookOpen, SkipForward, HelpCircle
} from 'lucide-react';

const SNIPPET_STATUSES: SnippetStatus[] = ['IN-REVIEW', 'APPROVED', 'REJECTED', 'MERGED', 'DEEPENING', 'UNDER-RESEARCH'];

export default function FiresideIntegrationPage() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const isAdmin = profile?.role === 'Admin' || profile?.role === 'SuperAdmin';

  useEffect(() => { if (profile && !isAdmin) router.push('/'); }, [isAdmin, profile, router]);

  // ─── State ──────────────────────────────────────────────────────────────
  const [families, setFamilies] = useState<FiresideFamily[]>([]);
  const [selectedFamilyId, setSelectedFamilyId] = useState('');
  const [guideContent, setGuideContent] = useState('');
  const [guideFile, setGuideFile] = useState<File | null>(null);
  const [pdfFiles, setPdfFiles] = useState<File[]>([]);

  const [job, setJob] = useState<LocalIntegrationJob | null>(null);
  const [snippets, setSnippets] = useState<LocalIntegrationSnippet[]>([]);
  const [images, setImages] = useState<LocalIntegrationImage[]>([]);
  const [processing, setProcessing] = useState(false);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [noteId, setNoteId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');

  const currentFireside: TransitionEntry | null = job
    ? job.transitions[job.currentFiresideIndex] || null
    : null;

  // ─── Load families + resume job ─────────────────────────────────────────
  useEffect(() => { firesideFamilyRepository.findAll().then(setFamilies); }, []);

  const refreshSnippets = useCallback(async (fireside: string) => {
    setSnippets(await localIntegrationService.listSnippetsForFireside(fireside));
    setImages(await localIntegrationService.listImagesForFireside(fireside));
  }, []);

  useEffect(() => {
    (async () => {
      const existing = await localIntegrationService.getJob();
      if (existing) {
        setJob(existing);
        const cur = existing.transitions[existing.currentFiresideIndex];
        if (cur) await refreshSnippets(cur.category);
      }
    })();
  }, [refreshSnippets]);

  // ─── Upload handlers ────────────────────────────────────────────────────
  const handleGuideUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setGuideFile(file);
    setGuideContent(await file.text());
  };

  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPdfFiles(prev => [...prev, ...Array.from(e.target.files || [])]);
  };
  const removePdf = (idx: number) => setPdfFiles(prev => prev.filter((_, i) => i !== idx));

  // ─── Create job ─────────────────────────────────────────────────────────
  const handleCreateJob = async () => {
    setError('');
    if (!guideContent || !selectedFamilyId || !user) {
      setError('Select a family, upload guide.md, and sign in.');
      return;
    }
    const parsed = localIntegrationService.parseGuide(guideContent);
    if (parsed.transitions.length === 0) {
      setError('No transitions found in guide.md. Check the "Fireside Transitions" table.');
      return;
    }
    if (parsed.pdfFiles.length === 0) {
      setError('No PDF files listed in guide.md.');
      return;
    }

    // Persist PDF files to IndexedDB (match by guide.md filenames)
    for (const name of parsed.pdfFiles) {
      const f = pdfFiles.find(p => p.name === name);
      if (!f) { setError(`Missing uploaded PDF: "${name}" — upload it before continuing.`); return; }
    }
    await localIntegrationService.storePdfFiles(pdfFiles);

    const family = families.find(f => f.id === selectedFamilyId);
    const created = await localIntegrationService.createJob({
      familyId: selectedFamilyId,
      familyName: family?.name || parsed.familyName,
      uploadedBy: user.uid,
      guideInstructions: parsed.instructions,
      pdfFiles: parsed.pdfFiles,
      transitions: parsed.transitions,
    });
    setJob(created);
  };

  // ─── Process current fireside ───────────────────────────────────────────
  const handleProcessCurrent = async () => {
    if (!job) return;
    setProcessing(true);
    setError('');
    try {
      await localIntegrationService.processCurrentFireside(job);
      const updated = await localIntegrationService.getJob();
      if (updated) {
        setJob(updated);
        const cur = updated.transitions[updated.currentFiresideIndex];
        if (cur) await refreshSnippets(cur.category);
      }
    } catch (e) {
      setError('Processing failed: ' + String(e));
    } finally { setProcessing(false); }
  };

  // ─── Snippet CRUD ───────────────────────────────────────────────────────
  const reloadCurrent = async () => {
    if (!currentFireside) return;
    await refreshSnippets(currentFireside.category);
  };

  const updateSnippet = async (id: string, updates: Partial<LocalIntegrationSnippet>) => {
    await localIntegrationService.updateSnippet(id, updates);
    await reloadCurrent();
  };

  const handleSaveEdit = async (id: string) => {
    await updateSnippet(id, { text: editText.trim() || undefined });
    setEditingId(null);
    setEditText('');
  };

  const handleSaveNote = async (id: string) => {
    if (!noteText.trim()) { setNoteId(null); return; }
    const snip = snippets.find(s => s.localId === id);
    if (snip) await updateSnippet(id, { annotation: snip.annotation ? snip.annotation + '\n' + noteText.trim() : noteText.trim() });
    setNoteId(null);
    setNoteText('');
  };

  // ─── Approve / skip / advance ───────────────────────────────────────────
  const handleApprove = async () => {
    if (!job) return;
    setApproving(true);
    setError('');
    try {
      await localIntegrationService.approveFireside(job);
      const updated = await localIntegrationService.getJob();
      setJob(updated || null);
      if (updated && updated.status !== 'COMPLETE') {
        const cur = updated.transitions[updated.currentFiresideIndex];
        if (cur) {
          setSnippets([]);
          setImages([]);
        }
      } else if (updated) {
        setSnippets([]);
        setImages([]);
      }
    } catch (e) {
      setError('Approve failed: ' + String(e));
    } finally { setApproving(false); }
  };

  const handleSkip = async () => {
    if (!job) return;
    await localIntegrationService.skipFireside(job);
    const updated = await localIntegrationService.getJob();
    setJob(updated || null);
    setSnippets([]);
    setImages([]);
  };

  const handleReset = async () => {
    if (!confirm('Reset the entire integration? All local progress (and in-progress snippets) will be lost. Already-approved snippets in Firestore are NOT reverted.')) return;
    await localIntegrationService.resetJob();
    setJob(null);
    setSnippets([]);
    setImages([]);
    setPdfFiles([]);
    setGuideContent('');
    setGuideFile(null);
  };

  // ─── Reset local state when current fireside changes on advance ────────
  useEffect(() => {
    if (!currentFireside) return;
    refreshSnippets(currentFireside.category);
  }, [currentFireside?.category, refreshSnippets]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isAdmin) return null;

  const guideTemplate = `# Fireside Family: General Firesides

## Fireside Transitions
| # | Fireside | PDF | Page |
|---|----------|-----|------|
| 1 | Why Life | raw-collection-1.pdf | 1 |
| 2 | The Proofs for Jesus Christ | raw-collection-1.pdf | 34 |
| 3 | The Proofs for Baha'U'llah | raw-collection-2.pdf | 20 |

## PDF Files
- raw-collection-1.pdf
- raw-collection-2.pdf

## LLM Instructions
These are scanned fireside collections. Use the transition table above.`;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Fireside Integration Pipeline</h1>
          <p className="text-muted-foreground">Upload guide.md + raw PDFs, review one fireside at a time, approve into the archive.</p>
          {job && (
            <p className="text-sm text-muted-foreground mt-1">
              Family: <span className="font-medium">{job.familyName}</span>
              {job.uploadedBy && ` · Uploaded by ${job.uploadedBy}`}
            </p>
          )}
        </div>
        <Link href="/admin/firesides">
          <Button variant="ghost" size="sm"><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>
        </Link>
      </div>

      {/* ─── FAQ / How it works ──────────────────────────────────────────── */}
      <details className="bg-card rounded-lg border border-border p-4" open>
        <summary className="cursor-pointer font-semibold text-sm flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-primary" />
          How this works — FAQ
        </summary>
        <div className="mt-3 space-y-2">

          <details className="border border-border rounded-md px-3 py-2">
            <summary className="cursor-pointer text-sm font-medium">How is a guide.md formatted?</summary>
            <div className="mt-2 text-sm text-muted-foreground space-y-2">
              <p>The guide defines the family name, the PDF source order, where each fireside begins, and optional LLM instructions.</p>
              <pre className="bg-muted p-3 rounded-md font-mono text-xs whitespace-pre-wrap">{guideTemplate}</pre>
              <p>
                <strong>Rules:</strong>
                The <code className="font-mono"># | Fireside | PDF | Page</code> table lists each fireside transition
                (the PDF and page where that fireside starts). Only transition points are listed — a PDF that is not a
                transition start still belongs to the current fireside (this lets you "skip" a PDF in the sequence).
                The <code className="font-mono">## PDF Files</code> list must include every raw PDF, in reading order.
              </p>
            </div>
          </details>

          <details className="border border-border rounded-md px-3 py-2">
            <summary className="cursor-pointer text-sm font-medium">How does this work?</summary>
            <div className="mt-2 text-sm text-muted-foreground space-y-1">
              <p>1. <strong>Parse guide.md</strong> — identify family name, PDF order, and fireside transition boundaries.</p>
              <p>2. <strong>Store locally</strong> — PDF blobs and progress are saved to your browser (IndexedDB), not Firestore.</p>
              <p>3. <strong>Process one fireside</strong> — the current fireside's page range is parsed and text is grouped into 30–50 word snippets.</p>
              <p>4. <strong>Review & edit</strong> — edit, delete/restore, change status, flag as deepening, or add notes.</p>
              <p>5. <strong>Approve</strong> — final atomized <code className="font-mono">fireside</code> + <code className="font-mono">snippet</code>(+<code className="font-mono">deepening</code>) docs are written to Firestore, then it advances to the next fireside.</p>
            </div>
          </details>

          <details className="border border-border rounded-md px-3 py-2">
            <summary className="cursor-pointer text-sm font-medium">Example workflow & expected results</summary>
            <div className="mt-2 text-sm text-muted-foreground space-y-1">
              <p>1. Create a Fireside Family via <strong>Admin → Fireside Families</strong> (e.g. "General Firesides").</p>
              <p>2. Upload a <code className="font-mono">guide.md</code> and the raw PDFs it references.</p>
              <p>3. Click <strong>Create Job</strong> — a progress bar shows "Fireside 1 of N".</p>
              <p>4. Click <strong>Process This Fireside</strong> — the first fireside's snippets (and any images) appear below with a preview.</p>
              <p>5. Review, edit, delete, or flag items as needed.</p>
              <p>6. Click <strong>Approve Fireside</strong> — the snippets are written to Firestore and the page advances to fireside 2.</p>
              <p>7. Repeat until all firesides are processed; the page shows <strong>Integration Complete</strong>.</p>
              <p className="text-xs">Expected: each approved fireside becomes one Fireside record with several Snippets (in natural order) under the chosen family.</p>
            </div>
          </details>

          <details className="border border-border rounded-md px-3 py-2">
            <summary className="cursor-pointer text-sm font-medium">What happens when I approve?</summary>
            <p className="mt-2 text-sm text-muted-foreground">
              One <code className="font-mono">fireside</code> document is created under the selected family, plus one
              <code className="font-mono"> snippet</code> per kept snippet (and a linked <code className="font-mono">deepening</code>
              if you flagged it as deepening). Snippets you deleted or skipped are not written.
            </p>
          </details>

          <details className="border border-border rounded-md px-3 py-2">
            <summary className="cursor-pointer text-sm font-medium">Where is my progress saved? Can I resume?</summary>
            <p className="mt-2 text-sm text-muted-foreground">
              Progress and raw PDFs are saved in your browser via IndexedDB, so reloading the page resumes exactly where you left
              off (same browser). <strong>Reset</strong> clears local progress but does not remove content already approved to Firestore.
            </p>
          </details>

          <details className="border border-border rounded-md px-3 py-2">
            <summary className="cursor-pointer text-sm font-medium">What if a PDF is missing or unreadable?</summary>
            <p className="mt-2 text-sm text-muted-foreground">
              If a guide references a PDF you did not upload (or one that fails to parse), the job logs a warning and skips that
              PDF's pages for the current fireside. Re-attach the PDF and click <strong>Re-process</strong> to retry.
            </p>
          </details>

        </div>
      </details>

      {/* ─── No job: upload / create ─────────────────────────────────────── */}
      {!job && (
        <div className="bg-card rounded-lg border border-border p-6 space-y-4">
          <h2 className="text-lg font-semibold">Start a New Integration</h2>

          <div className="space-y-1">
            <Label>Target Fireside Family</Label>
            <select value={selectedFamilyId} onChange={e => setSelectedFamilyId(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-sm">
              <option value="">Select family...</option>
              {families.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <Label>guide.md</Label>
            <div className="flex items-center gap-3">
              <label className="cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-3">
                <Upload className="mr-2 h-4 w-4" />Upload guide.md
                <input type="file" accept=".md,.txt" onChange={handleGuideUpload} className="hidden" />
              </label>
              {guideFile && <span className="text-sm text-muted-foreground">✅ {guideFile.name}</span>}
            </div>
            {guideContent && (
              <pre className="mt-2 bg-muted p-3 rounded-md font-mono text-xs whitespace-pre-wrap max-h-48 overflow-y-auto">{guideContent}</pre>
            )}
          </div>

          <div className="space-y-1">
            <Label>Raw Fireside PDFs (must match guide.md filenames)</Label>
            <label className="cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent h-9 px-3">
              <FileText className="mr-2 h-4 w-4" />Add PDFs
              <input type="file" accept=".pdf" multiple onChange={handlePdfUpload} className="hidden" />
            </label>
            {pdfFiles.length > 0 && (
              <ul className="mt-2 space-y-1">
                {pdfFiles.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <FileText className="h-3 w-3 text-muted-foreground" />{f.name}
                    <button onClick={() => removePdf(i)} className="text-destructive hover:underline text-xs">Remove</button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/40 rounded-md p-3 text-sm text-destructive flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />{error}
            </div>
          )}

          <Button onClick={handleCreateJob} disabled={!guideContent || !selectedFamilyId}>
            <Play className="mr-2 h-4 w-4" />Create Job
          </Button>

          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer">View guide.md template</summary>
            <pre className="mt-2 bg-muted p-3 rounded-md font-mono whitespace-pre-wrap">{guideTemplate}</pre>
          </details>
        </div>
      )}

      {/* ─── Job active: progress + one fireside at a time ───────────────── */}
      {job && (
        <>
          {/* Progress bar */}
          <div className="bg-card rounded-lg border border-border p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">
                Fireside {job.currentFiresideIndex + 1} of {job.transitions.length}
              </span>
              <div className="flex gap-2">
                <button
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent h-8 px-3 text-muted-foreground"
                  onClick={handleReset}>
                  <Trash2 className="mr-1 h-3 w-3" />Reset
                </button>
              </div>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${(job.currentFiresideIndex / Math.max(1, job.transitions.length)) * 100}%` }} />
            </div>
            {/* Transition status list */}
            <div className="mt-4 flex flex-wrap gap-2">
              {job.transitions.map((t, i) => {
                const st = job.firesideStatuses[t.category] as FiresideReviewStatus | undefined;
                return (
                  <span key={t.category + i}
                    className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border ${
                      i === job.currentFiresideIndex ? 'border-primary text-primary' :
                      st === 'approved' ? 'border-green-500/40 text-green-500' :
                      st === 'skipped' ? 'border-muted text-muted-foreground' : 'border-border text-muted-foreground'
                    }`}>
                    {i + 1}. {t.category}
                    {i < job.currentFiresideIndex && (st === 'approved' ? <CheckCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />)}
                  </span>
                );
              })}
            </div>
          </div>

          {/* ─── Current fireside ─────────────────────────────────────────── */}
          {currentFireside && job.status !== 'COMPLETE' && (
            <div className="bg-card rounded-lg border border-border p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">{currentFireside.category}</h2>
                  <p className="text-sm text-muted-foreground">
                    {job.firesideStatuses[currentFireside.category] === 'preview'
                      ? 'Preview ready — review and edit below, then approve.'
                      : 'Not processed yet.'}
                  </p>
                </div>
                <span className="text-sm font-mono text-muted-foreground">
                  p.{currentFireside.pageNumber} · {currentFireside.pdfFilename}
                </span>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2">
                {job.firesideStatuses[currentFireside.category] !== 'preview' && (
                  <Button onClick={handleProcessCurrent} disabled={processing}>
                    {processing ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                    {processing ? 'Processing...' : 'Process This Fireside'}
                  </Button>
                )}
                {job.firesideStatuses[currentFireside.category] === 'preview' && (
                  <>
                    <Button onClick={handleProcessCurrent} variant="outline" disabled={processing}>
                      <Loader className="mr-2 h-4 w-4" />Re-process
                    </Button>
                    <Button onClick={handleApprove} disabled={approving}>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      {approving ? 'Approving...' : 'Approve Fireside'}
                    </Button>
                  </>
                )}
                <Button onClick={handleSkip} variant="ghost" disabled={processing || approving}>
                  <SkipForward className="mr-2 h-4 w-4" />Skip Fireside
                </Button>
              </div>

              {error && (
                <div className="bg-destructive/10 border border-destructive/40 rounded-md p-3 text-sm text-destructive flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />{error}
                </div>
              )}

              {/* Snippets preview + CRUD */}
              {(snippets.length > 0 || images.length > 0) && (
                <div className="border-t border-border pt-3 space-y-2">
                  <p className="text-xs text-muted-foreground">
                    {snippets.length} snippets · {images.length} images
                  </p>

                  {snippets.map((s, idx) => {
                    const isDeleted = s.action === 'delete' || s.action === 'skip';
                    return (
                      <div key={s.localId}
                        className={`p-3 rounded-md border ${isDeleted ? 'border-destructive/40 bg-destructive/5 opacity-60' : 'border-border bg-secondary/10'}`}>
                        <div className="flex items-start gap-2">
                          <span className="text-xs font-mono text-muted-foreground mt-1">#{idx + 1}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              {/* Status select */}
                              <select
                                value={s.status}
                                onChange={e => updateSnippet(s.localId, { status: e.target.value as SnippetStatus })}
                                className="text-xs px-2 py-1 rounded-md border border-border bg-background">
                                {SNIPPET_STATUSES.map(st => <option key={st} value={st}>{st}</option>)}
                              </select>
                              {/* Deepening toggle */}
                              <button
                                onClick={() => updateSnippet(s.localId, { action: s.action === 'deepening' ? 'keep' : 'deepening' })}
                                className={`text-xs px-2 py-0.5 rounded-full ${s.action === 'deepening' ? 'bg-purple-500/20 text-purple-400' : 'bg-muted text-muted-foreground'}`}>
                                {s.action === 'deepening' ? 'Deepening' : 'Deepen'}
                              </button>
                              <span className="text-xs text-muted-foreground">p.{s.pageNumber} · {s.sourcePdf}</span>
                            </div>

                            {editingId === s.localId ? (
                              <div className="mt-2 space-y-2">
                                <textarea value={editText} onChange={e => setEditText(e.target.value)}
                                  className="w-full min-h-[90px] p-2 border border-border rounded-md bg-background font-mono text-sm" />
                                <div className="flex gap-2">
                                  <Button size="sm" onClick={() => handleSaveEdit(s.localId)}><CheckCircle className="mr-1 h-3 w-3" />Save</Button>
                                  <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm mt-1 whitespace-pre-wrap">{s.text}</p>
                            )}

                            {s.annotation && (
                              <p className="text-xs text-muted-foreground mt-1 italic">💬 {s.annotation}</p>
                            )}

                            {noteId === s.localId && (
                              <div className="mt-2 flex gap-2">
                                <Input value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Add a note..." className="flex-1" />
                                <Button size="sm" onClick={() => handleSaveNote(s.localId)}>Save</Button>
                                <Button size="sm" variant="ghost" onClick={() => setNoteId(null)}>Cancel</Button>
                              </div>
                            )}

                            <div className="flex gap-1 mt-2">
                              <Button variant="ghost" size="sm" onClick={() => { setEditingId(s.localId); setEditText(s.text); }}>
                                <Edit3 className="mr-1 h-3 w-3" />Edit
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => { setNoteId(s.localId); setNoteText(''); }}>
                                <BookOpen className="mr-1 h-3 w-3" />Note
                              </Button>
                              {isDeleted ? (
                                <Button variant="ghost" size="sm" onClick={() => updateSnippet(s.localId, { action: 'keep' })}>
                                  Restore
                                </Button>
                              ) : (
                                <Button variant="ghost" size="sm"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => updateSnippet(s.localId, { action: 'delete' })}>
                                  <X className="mr-1 h-3 w-3" />Delete
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {images.map(img => (
                    <div key={img.localId} className="flex items-start gap-2 p-3 rounded-md border border-border bg-secondary/10">
                      <Image className="h-5 w-5 text-muted-foreground mt-1" />
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">p.{img.pageNumber} · {img.sourcePdf}</p>
                        {img.dataUrl && <img src={img.dataUrl} alt="" className="max-h-40 rounded mt-1 border border-border" />}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ─── Complete ─────────────────────────────────────────────────── */}
          {job.status === 'COMPLETE' && (
            <div className="bg-card rounded-lg border border-border p-12 text-center">
              <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
              <h2 className="text-xl font-semibold">Integration Complete</h2>
              <p className="text-muted-foreground mt-2">
                {job.transitions.length} fireside(s) processed.
                Approved firesides are now atomized as snippets in the archive.
              </p>
              <div className="flex gap-3 justify-center mt-6">
                <Link href="/admin/firesides"><Button variant="outline">View Firesides</Button></Link>
                <Button variant="ghost" onClick={handleReset}><Upload className="mr-2 h-4 w-4" />New Integration</Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}