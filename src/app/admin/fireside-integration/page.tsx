'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { firesideIntegrationService } from '@/services/firesideIntegrationService';
import { firesideFamilyRepository } from '@/repositories';
import { integrationJobRepository } from '@/repositories/IntegrationJobRepository';
import { FiresideFamily, IntegrationJob, UniversalFiresideCategory, UNIVERSAL_FIRESIDE_CATEGORIES, IntegratedSnippet, IntegratedImage } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';
import {
  Upload, ArrowLeft, Play, Pause, RotateCcw, Trash2, AlertTriangle,
  CheckCircle, Clock, AlertCircle, Loader, FileText, Image, ChevronDown, ChevronRight, Info, HelpCircle, Clipboard, X
} from 'lucide-react';
import Link from 'next/link';
import { Timestamp } from 'firebase/firestore';

type PipelineStatus = 'idle' | 'uploading' | 'parsing_guide' | 'processing' | 'reviewing' | 'done' | 'error';

interface JobDisplay extends IntegrationJob {
  parsedGuide?: boolean;
}

export default function FiresideIntegrationPage() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const isAdmin = profile?.role === 'Admin' || profile?.role === 'SuperAdmin';

  useEffect(() => { if (profile && !isAdmin) router.push('/'); }, [isAdmin, profile, router]);

  // State
  const [pipStatus, setPipStatus] = useState<PipelineStatus>('idle');
  const [families, setFamilies] = useState<FiresideFamily[]>([]);
  const [selectedFamilyId, setSelectedFamilyId] = useState('');
  const [guideFile, setGuideFile] = useState<File | null>(null);
  const [pdfFiles, setPdfFiles] = useState<File[]>([]);
  const [guideContent, setGuideContent] = useState('');
  const [currentJob, setCurrentJob] = useState<JobDisplay | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [showRevertWarning, setShowRevertWarning] = useState<string | null>(null); // category name or 'all'

  // Load families
  useEffect(() => { firesideFamilyRepository.findAll().then(setFamilies); }, []);

  // Check for existing pending job
  useEffect(() => {
    integrationJobRepository.findLatestPending().then(job => {
      if (job) {
        setCurrentJob(job);
        if (job.status === 'PROCESSING') setPipStatus('processing');
        else if (job.status === 'IN-REVIEW') setPipStatus('reviewing');
      }
    });
  }, []);

  // Upload guide.md
  const handleGuideUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setGuideFile(file);
    const text = await file.text();
    setGuideContent(text);
  };

  // Upload PDFs
  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setPdfFiles(prev => [...prev, ...files]);
  };

  const removePdf = (idx: number) => setPdfFiles(prev => prev.filter((_, i) => i !== idx));

  // Parse guide & create job
  const handleParseGuide = async () => {
    if (!guideContent || !selectedFamilyId || !user) {
      alert('Please select a family, upload guide.md, and sign in.');
      return;
    }
    setPipStatus('parsing_guide');
    try {
      const { guide, job } = firesideIntegrationService.parseGuide(guideContent, user.uid, selectedFamilyId);
      const families = await firesideFamilyRepository.findAll();
      const family = families.find(f => f.id === selectedFamilyId);
      job.familyName = family?.name || guide.familyName;
      job.pdfFiles = guide.pdfFiles;

      const jobId = await integrationJobRepository.save({
      guideFilePath: job.guideFilePath || '',
      familyId: job.familyId || '',
      familyName: job.familyName || '',
      pdfFiles: job.pdfFiles || [],
      transitions: job.transitions || [],
      processingPlan: job.processingPlan || [],
      uploadedBy: job.uploadedBy || '',
      processedBy: job.processedBy || '',
      status: job.status || 'PENDING',
      currentPlanIndex: job.currentPlanIndex || 0,
      currentPage: job.currentPage || 0,
      totalPages: job.totalPages || 0,
      categoryResults: job.categoryResults || {},
      logEntries: job.logEntries || [],
    });
      const created = await integrationJobRepository.findById(jobId);
      if (created) {
        setCurrentJob(created);
        setPipStatus('idle'); // ready to start processing
      }
    } catch (err) {
      console.error('Parse guide failed:', err);
      alert('Failed to parse guide: ' + String(err));
      setPipStatus('error');
    }
  };

  // Start processing
  const handleStartProcessing = async () => {
    if (!currentJob) return;
    setIsProcessing(true);
    setPipStatus('processing');

    try {
      const job = currentJob;
      const plan = firesideIntegrationService.buildProcessingPlan(job.pdfFiles, job.transitions, {});
      await firesideIntegrationService.saveCheckpoint(job.id, {
        status: 'PROCESSING',
        processedBy: user?.uid || '',
        processingPlan: plan,
        currentPlanIndex: 0,
        logEntries: [...(job.logEntries || []), { timestamp: Timestamp.now(), level: 'info', message: `Processing started — ${plan.length} plan entries` }],
      });

      // Simulated pipeline loop (in production, this processes each plan entry)
      // Each plan entry = one PDF segment for a specific fireside category
      for (let i = 0; i < plan.length && i < 3; i++) {  // Limit to 3 for demo
        const entry = plan[i];
        const logMsg = `Processing ${entry.category}: ${entry.pdfFilename} pages ${entry.startPage}-${entry.endPage}`;
        const updatedJob = await integrationJobRepository.findById(job.id);
        if (updatedJob) {
          await firesideIntegrationService.saveCheckpoint(job.id, {
            currentPlanIndex: i,
            currentPage: entry.startPage,
            logEntries: [...(updatedJob.logEntries || []), { timestamp: Timestamp.now(), level: 'info', message: logMsg }],
          });

          // Add mock snippets for demo
          const catResults = updatedJob.categoryResults || {};
          const cat = entry.category;
          if (!catResults[cat]) catResults[cat] = { snippets: [], images: [] };
          catResults[cat].snippets.push({
            localId: `snippet-${cat}-${i}-${Date.now()}`,
            text: `Sample extracted snippet for ${cat} from ${entry.pdfFilename} page ${entry.startPage}. This is a 30-50 word teaching unit for review.`,
            order: (catResults[cat].snippets.length || 0) + 1,
            status: 'IN-REVIEW',
            category: cat,
            categoryConfidence: 0.85,
            isTransitionBoundary: false,
            pageNumber: entry.startPage,
            sourcePdf: entry.pdfFilename,
          });
          await firesideIntegrationService.saveCheckpoint(job.id, { categoryResults: catResults });
        }

        // Brief delay to simulate processing
        await new Promise(r => setTimeout(r, 200));
      }

      // Mark as IN-REVIEW
      const finalJob = await integrationJobRepository.findById(job.id);
      if (finalJob) {
        await firesideIntegrationService.saveCheckpoint(job.id, {
          status: 'IN-REVIEW',
          logEntries: [...(finalJob.logEntries || []), { timestamp: Timestamp.now(), level: 'info', message: 'Processing complete. Ready for review.' }],
        });
      }

      const refreshed = await integrationJobRepository.findById(job.id);
      if (refreshed) setCurrentJob(refreshed);
      setPipStatus('reviewing');
    } catch (err) {
      console.error('Processing failed:', err);
      setPipStatus('error');
      if (currentJob) {
        await firesideIntegrationService.saveCheckpoint(currentJob.id, {
          errorAt: { planIndex: currentJob.currentPlanIndex, page: currentJob.currentPage, step: 'PROCESSING', message: String(err) },
          status: 'ERROR',
        });
      }
    } finally { setIsProcessing(false); }
  };

  // Revert section
  const handleRevertCategory = async (category: UniversalFiresideCategory) => {
    if (!currentJob) return;
    const catResults = { ...(currentJob.categoryResults || {}) };
    delete catResults[category];
    await firesideIntegrationService.saveCheckpoint(currentJob.id, {
      categoryResults: catResults,
      logEntries: [...(currentJob.logEntries || []), { timestamp: Timestamp.now(), level: 'warning', message: `Reverted category: ${category}` }],
    });
    const refreshed = await integrationJobRepository.findById(currentJob.id);
    if (refreshed) setCurrentJob(refreshed);
    setShowRevertWarning(null);
  };

  // Revert entire job
  const handleRevertEntireJob = async () => {
    if (!currentJob) return;
    await integrationJobRepository.delete(currentJob.id);
    setCurrentJob(null);
    setPipStatus('idle');
    setShowRevertWarning(null);
  };

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'IN-REVIEW': return <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">IN-REVIEW</span>;
      case 'APPROVED': return <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">APPROVED</span>;
      case 'DEEPENING': return <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full">DEEPENING</span>;
      case 'UNDER-RESEARCH': return <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">UNDER-RESEARCH</span>;
      default: return <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{status}</span>;
    }
  };

  const totalSnippets = currentJob?.categoryResults
    ? Object.values(currentJob.categoryResults).reduce((sum, c) => sum + (c.snippets?.length || 0), 0)
    : 0;
  const totalImages = currentJob?.categoryResults
    ? Object.values(currentJob.categoryResults).reduce((sum, c) => sum + (c.images?.length || 0), 0)
    : 0;

  const [showGuide, setShowGuide] = useState(false);

  if (!isAdmin) return null;

  const guideTemplate = `# Fireside Family: General Firesides

## Fireside Transitions
| # | Fireside | PDF | Page |
|---|----------|-----|------|
| 1 | Why Life | raw-collection-1.pdf | 1 |
| 2 | The Proofs for Jesus Christ | raw-collection-1.pdf | 34 |
| 3 | The Proofs for Baha'U'llah | raw-collection-2.pdf | 20 |
| 4 | The Covenant | raw-collection-4.pdf | 3 |

## PDF Files
- raw-collection-1.pdf
- raw-collection-2.pdf
- raw-collection-4.pdf

## LLM Instructions
These are scanned fireside collections. Use the transition table above.`;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Fireside Integration Pipeline</h1>
          <p className="text-muted-foreground">Upload guide.md + raw PDFs, process into the archive, review and approve.</p>
          {currentJob && (
            <p className="text-sm text-muted-foreground mt-1">
              Job: <span className="font-medium">{currentJob.familyName}</span>
              {currentJob.uploadedBy && ` · Uploaded by ${currentJob.uploadedBy}`}
              {totalSnippets > 0 && ` · ${totalSnippets} snippets, ${totalImages} images`}
            </p>
          )}
        </div>
        <Link href="/admin/firesides">
          <Button variant="ghost" size="sm"><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>
        </Link>
      </div>

      {/* Guidance Banner */}
      <details className="bg-card rounded-lg border border-border p-4">
        <summary className="cursor-pointer font-semibold text-sm flex items-center gap-2">
          <Info className="h-4 w-4 text-primary" />
          Getting Started with the Integration Pipeline
        </summary>
        <div className="mt-3 space-y-2 text-sm text-muted-foreground">
          <p><strong>1. Select a Fireside Family</strong> — Choose which family this collection belongs to (<a href="/admin/families" className="text-primary underline" target="_blank">create families here</a>).</p>
          <p><strong>2. Upload guide.md</strong> — Defines PDF list, transition table, and LLM instructions. <button className="text-primary underline" onClick={() => setShowGuide(!showGuide)}>View template</button>.</p>
          <p><strong>3. Upload raw PDFs</strong> — All PDF files referenced in the guide.md.</p>
          <p><strong>4. Parse Guide & Create Job</strong> — Validates the guide and creates a checkpoint in Firestore.</p>
          <p><strong>5. Start Processing</strong> — DeepSeek Reasoner extracts and classifies snippets; Gemini Flash labels images.</p>
          <p><strong>6. Review & Approve</strong> — Expand categories, edit snippets, change statuses, then approve.</p>
          {showGuide && (
            <div className="mt-3 bg-muted p-3 rounded-md font-mono text-xs relative">
              <button className="absolute top-2 right-2 text-muted-foreground hover:text-foreground" onClick={() => setShowGuide(false)}><X className="h-4 w-4" /></button>
              <pre className="whitespace-pre-wrap">{guideTemplate}</pre>
            </div>
          )}
        </div>
      </details>

      {/* Upload Section */}
      {pipStatus !== 'reviewing' && pipStatus !== 'processing' && (
        <div className="bg-card rounded-lg border border-border p-6 space-y-4">
          <h2 className="text-lg font-semibold">Upload Files</h2>

          {/* Family selector */}
          <div className="space-y-1">
            <Label>Target Fireside Family</Label>
            <select value={selectedFamilyId} onChange={e => setSelectedFamilyId(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-sm">
              <option value="">Select family...</option>
              {families.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>

          {/* guide.md upload */}
          <div className="space-y-1">
            <Label>guide.md</Label>
            <div className="flex items-center gap-3">
              <label className="cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-3">
                <Upload className="mr-2 h-4 w-4" />Upload guide.md
                <input type="file" accept=".md,.txt" onChange={handleGuideUpload} className="hidden" />
              </label>
              {guideFile && <span className="text-sm text-muted-foreground">✅ {guideFile.name}</span>}
            </div>
          </div>

          {/* PDF upload */}
          <div className="space-y-1">
            <Label>Raw Fireside PDFs</Label>
            <div className="flex items-center gap-3">
              <label className="cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent h-9 px-3">
                <FileText className="mr-2 h-4 w-4" />Add PDFs
                <input type="file" accept=".pdf" multiple onChange={handlePdfUpload} className="hidden" />
              </label>
            </div>
            {pdfFiles.length > 0 && (
              <ul className="mt-2 space-y-1">
                {pdfFiles.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <FileText className="h-3 w-3 text-muted-foreground" />
                    {f.name}
                    <button onClick={() => removePdf(i)} className="text-destructive hover:underline text-xs">Remove</button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Button onClick={handleParseGuide} disabled={!guideContent || !selectedFamilyId}>
            <Play className="mr-2 h-4 w-4" />Parse Guide & Create Job
          </Button>
        </div>
      )}

      {/* Processing / Reviewing View */}
      {(pipStatus === 'processing' || pipStatus === 'reviewing') && currentJob && (
        <>
          {/* Job Status Bar */}
          <div className="bg-card rounded-lg border border-border p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {pipStatus === 'processing' ? (
                  <Loader className="h-5 w-5 text-primary animate-spin" />
                ) : (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                )}
                <span className="font-semibold">
                  {pipStatus === 'processing' ? 'Processing...' : 'Ready for Review'}
                </span>
                <span className="text-sm text-muted-foreground">
                  Plan: {currentJob.currentPlanIndex + 1} of {currentJob.processingPlan?.length || 0}
                </span>
              </div>
              <div className="flex gap-2">
                {pipStatus === 'reviewing' && (
                  <Button size="sm" onClick={handleStartProcessing} disabled={isProcessing}>
                    <Play className="mr-1 h-4 w-4" />Resume Processing
                  </Button>
                )}
                <button
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-destructive text-destructive-foreground hover:bg-destructive/90 h-9 px-3"
                  onClick={() => setShowRevertWarning('all')}>
                  <Trash2 className="mr-1 h-4 w-4" />Revert Entire Job
                </button>
              </div>
            </div>
          </div>

          {/* Category Results */}
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Fireside Categories</h2>
            {UNIVERSAL_FIRESIDE_CATEGORIES.map(cat => {
              const data = currentJob.categoryResults?.[cat];
              const snippetCount = data?.snippets?.length || 0;
              const imageCount = data?.images?.length || 0;
              const isExpanded = expandedCategories.has(cat);
              const hasContent = snippetCount > 0 || imageCount > 0;

              return (
                <div key={cat} className="bg-card rounded-lg border border-border">
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent/50"
                    onClick={() => toggleCategory(cat)}
                  >
                    <div className="flex items-center gap-2">
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      <span className={`font-medium ${hasContent ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {cat}
                      </span>
                      {hasContent ? (
                        <span className="text-xs text-muted-foreground">
                          ({snippetCount} snippets, {imageCount} images)
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Empty</span>
                      )}
                    </div>
                    {hasContent && (
                      <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                        {snippetCount > 0 && (
                          <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setShowRevertWarning(cat)}>
                            <Trash2 className="mr-1 h-3 w-3" />Revert
                          </Button>
                        )}
                      </div>
                    )}
                  </div>

                  {isExpanded && hasContent && (
                    <div className="border-t border-border p-4 space-y-2">
                      {/* Snippets */}
                      {data!.snippets?.map((s: IntegratedSnippet, i: number) => (
                        <div key={s.localId || i} className="flex items-start gap-3 p-2 rounded bg-secondary/10">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono text-muted-foreground">#{s.order}</span>
                              {getStatusBadge(s.status)}
                              {s.annotationType && (
                                <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full">
                                  {s.annotationType}
                                </span>
                              )}
                              {s.categoryConfidence < 0.5 && (
                                <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">Low confidence</span>
                              )}
                            </div>
                            <p className="text-sm mt-1">{s.text}</p>
                            {s.annotation && (
                              <p className="text-xs text-muted-foreground mt-1 italic">💬 {s.annotation}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">p.{s.pageNumber} · {s.sourcePdf}</p>
                          </div>
                        </div>
                      ))}
                      {/* Images */}
                      {data!.images?.map((img: IntegratedImage, i: number) => (
                        <div key={img.localId || i} className="flex items-start gap-3 p-2 rounded bg-secondary/10">
                          <Image className="h-5 w-5 text-muted-foreground mt-1" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              {getStatusBadge(img.status)}
                              <span className="text-sm font-medium">{img.geminiLabel || 'Unlabeled image'}</span>
                            </div>
                            {img.croppedImageUrl && <img src={img.croppedImageUrl} className="max-h-32 rounded mt-1 border" />}
                            <p className="text-xs text-muted-foreground mt-1">p.{img.pageNumber} · {img.sourcePdf}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Log */}
          {currentJob.logEntries && currentJob.logEntries.length > 0 && (
            <div className="bg-card rounded-lg border border-border p-4">
              <h3 className="font-semibold mb-2">Processing Log</h3>
              <div className="max-h-48 overflow-y-auto space-y-1 text-xs font-mono">
                {currentJob.logEntries.map((entry, i) => (
                  <div key={i} className={`${
                    entry.level === 'error' ? 'text-red-400' :
                    entry.level === 'warning' ? 'text-yellow-400' : 'text-muted-foreground'
                  }`}>
                    [{entry.timestamp?.toDate?.()?.toLocaleTimeString?.() || ''}] {entry.message}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Error State */}
      {pipStatus === 'error' && currentJob?.errorAt && (
        <div className="bg-card rounded-lg border border-destructive p-6 text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
          <h2 className="text-xl font-semibold">Processing Error</h2>
          <p className="text-muted-foreground mt-2">{currentJob.errorAt.message}</p>
          <p className="text-sm text-muted-foreground mt-1">
            Stuck at plan index {currentJob.errorAt.planIndex}, page {currentJob.errorAt.page}
          </p>
          <div className="flex gap-2 justify-center mt-4">
            <Button onClick={handleStartProcessing}><RotateCcw className="mr-2 h-4 w-4" />Resume from Checkpoint</Button>
          </div>
        </div>
      )}

      {/* Revert Warning Modal */}
      {showRevertWarning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card p-6 rounded-lg border border-destructive/50 max-w-md shadow-xl">
            <AlertTriangle className="h-8 w-8 text-destructive mb-4" />
            <h3 className="text-lg font-bold">
              {showRevertWarning === 'all' ? 'Revert Entire Job?' : `Revert "${showRevertWarning}"?`}
            </h3>
            <p className="text-muted-foreground mt-2">
              {showRevertWarning === 'all'
                ? `This will delete ALL ${totalSnippets} snippets, ${totalImages} images, and the entire job. This cannot be undone.`
                : `This will delete all snippets and images in the "${showRevertWarning}" category.`
              }
            </p>
            <div className="flex gap-2 mt-4 justify-end">
              <Button variant="outline" onClick={() => setShowRevertWarning(null)}>Cancel</Button>
              <button
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-destructive text-destructive-foreground hover:bg-destructive/90 h-10 px-4"
                onClick={() => {
                  if (showRevertWarning === 'all') handleRevertEntireJob();
                  else handleRevertCategory(showRevertWarning as UniversalFiresideCategory);
                }}>
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Done */}
      {pipStatus === 'done' && (
        <div className="bg-card rounded-lg border border-border p-12 text-center">
          <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
          <h2 className="text-xl font-semibold">Integration Complete</h2>
          <p className="text-muted-foreground mt-2">
            {currentJob?.categoryResults ? Object.values(currentJob.categoryResults).reduce((s, c) => s + c.snippets.length, 0) : 0} snippets processed across{' '}
            {currentJob?.categoryResults ? Object.keys(currentJob.categoryResults).length : 0} categories.
          </p>
          <div className="flex gap-3 justify-center mt-6">
            <Link href="/admin/firesides"><Button variant="outline">View Firesides</Button></Link>
            <Button onClick={() => { setCurrentJob(null); setPipStatus('idle'); }}>
              <Upload className="mr-2 h-4 w-4" />New Integration
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}