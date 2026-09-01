'use client';

import {
  LocalIntegrationJob,
  LocalIntegrationSnippet,
  LocalIntegrationImage,
  FiresideReviewStatus,
  ACTIVE_JOB_ID,
  integrationDb,
} from '@/lib/indexedDb';
import { TransitionEntry, UNIVERSAL_FIRESIDE_CATEGORIES, UniversalFiresideCategory } from '@/types';
import { pdfParserService } from '@/services/pdfParserService';
import {
  firesideRepository,
  snippetRepository,
  deepeningRepository,
} from '@/repositories';
import { FiresideFactory, SnippetFactory, DeepeningFactory } from '@/factories';
import { Timestamp } from 'firebase/firestore';

interface GuideData {
  familyName: string;
  pdfFiles: string[];
  transitions: TransitionEntry[];
  instructions: string;
}

interface PlanEntry {
  category: UniversalFiresideCategory;
  pdfFilename: string;
  startPage: number;
  endPage: number;
}

const WORD_MIN = 30;
const WORD_MAX = 50;

export class LocalIntegrationService {
  // ─── Guide parsing ────────────────────────────────────────────────────────

  parseGuide(markdownContent: string): GuideData {
    const familyMatch = markdownContent.match(/#\s*Fireside Family:\s*(.+)/i);
    const familyName = familyMatch?.[1]?.trim() || 'Unnamed Family';

    const pdfSection = markdownContent.match(/##\s*PDF Files\s*[\r\n]+((?:[-*]\s*.+[\r\n]*)+)/i)
      || markdownContent.match(/PDF\s*Files\s*[\r\n]+((?:[-*]\s*.+[\r\n]*)+)/i);
    const pdfFiles: string[] = [];
    if (pdfSection) {
      for (const line of pdfSection[1].split(/[\r\n]+/)) {
        const m = line.match(/[-*]\s*(.+)/);
        if (m) pdfFiles.push(m[1].trim());
      }
    }

    const tableMatch = markdownContent.match(/\| # \| Fireside \| PDF \| Page \|[\s\S]+?(?=\n\n|\n##|\Z)/);
    const transitions: TransitionEntry[] = [];
    if (tableMatch) {
      for (const row of tableMatch[0].split(/[\r\n]+/)) {
        const parts = row.split('|').map(p => p.trim()).filter(Boolean);
        if (parts.length >= 4 && !isNaN(parseInt(parts[0]))) {
          const n = parseInt(parts[0]);
          const pdfFilename = parts[2];
          const pageNumber = parseInt(parts[3]);
          if (n >= 1 && n <= 7 && pdfFilename && !isNaN(pageNumber)) {
            transitions.push({
              firesideNumber: n,
              category: UNIVERSAL_FIRESIDE_CATEGORIES[n - 1],
              pdfFilename,
              pageNumber,
            });
          }
        }
      }
    }

    const instructionsMatch = markdownContent.match(/## LLM Instructions[\s\S]*/i);
    const instructions = instructionsMatch?.[0] || '';

    return { familyName, pdfFiles, transitions, instructions };
  }

  // ─── Job lifecycle ────────────────────────────────────────────────────────

  async createJob(params: {
    familyId: string;
    familyName: string;
    uploadedBy: string;
    guideInstructions: string;
    pdfFiles: string[];
    transitions: TransitionEntry[];
  }): Promise<LocalIntegrationJob> {
    const statuses: Record<string, FiresideReviewStatus> = {};
    for (const t of params.transitions) statuses[t.category] = 'pending';

    const job: LocalIntegrationJob = {
      id: ACTIVE_JOB_ID,
      familyId: params.familyId,
      familyName: params.familyName,
      uploadedBy: params.uploadedBy,
      guideInstructions: params.guideInstructions,
      transitions: params.transitions,
      pdfFiles: params.pdfFiles,
      currentFiresideIndex: 0,
      firesideStatuses: statuses,
      firesideIds: {},
      status: 'PENDING',
      createdAt: Date.now(),
      logEntries: [{
        timestamp: Date.now(),
        level: 'info',
        message: `Job created: ${params.transitions.length} firesides, ${params.pdfFiles.length} PDFs`,
      }],
    };

    await integrationDb.saveJob(job);
    return job;
  }

  async getJob(): Promise<LocalIntegrationJob | undefined> {
    return integrationDb.getJob();
  }

  async saveJob(job: LocalIntegrationJob): Promise<void> {
    await integrationDb.saveJob(job);
  }

  async storePdfFiles(files: File[]): Promise<void> {
    for (const f of files) {
      await integrationDb.saveFile({ name: f.name, blob: f, kind: 'pdf' });
    }
  }

  async resetJob(): Promise<void> {
    await integrationDb.wipeAll();
  }

  // ─── Fireside iteration ───────────────────────────────────────────────────

  getCurrentFireside(job: LocalIntegrationJob): TransitionEntry | null {
    return job.transitions[job.currentFiresideIndex] || null;
  }

  /** Compute the page ranges (plan entries) that constitute the current fireside. */
  async buildCurrentPlan(
    job: LocalIntegrationJob,
    pageCounts: Record<string, number>
  ): Promise<PlanEntry[]> {
    const idx = job.currentFiresideIndex;
    const entry = job.transitions[idx];
    if (!entry) return [];

    const next = job.transitions[idx + 1];
    const pdfList = job.pdfFiles;
    const plans: PlanEntry[] = [];

    // Ensure page counts for relevant PDFs
    for (const name of [entry.pdfFilename, next?.pdfFilename]) {
      if (name && pageCounts[name] == null) {
        pageCounts[name] = await this.getPdfPageCount(name);
      }
    }

    const curIdx = pdfList.indexOf(entry.pdfFilename);
    if (curIdx === -1) return [];

    const endOfCur = pageCounts[entry.pdfFilename] || 999;

    if (!next) {
      // Last fireside: from start to end of this PDF + all subsequent PDFs in full
      plans.push({ category: entry.category, pdfFilename: entry.pdfFilename, startPage: entry.pageNumber, endPage: endOfCur });
      for (let i = curIdx + 1; i < pdfList.length; i++) {
        const name = pdfList[i];
        if (pageCounts[name] == null) pageCounts[name] = await this.getPdfPageCount(name);
        plans.push({ category: entry.category, pdfFilename: name, startPage: 1, endPage: pageCounts[name] || 999 });
      }
      return plans;
    }

    const nextIdx = pdfList.indexOf(next.pdfFilename);

    if (entry.pdfFilename === next.pdfFilename) {
      plans.push({ category: entry.category, pdfFilename: entry.pdfFilename, startPage: entry.pageNumber, endPage: Math.max(entry.pageNumber, next.pageNumber - 1) });
      return plans;
    }

    // Current PDF from start page to end
    plans.push({ category: entry.category, pdfFilename: entry.pdfFilename, startPage: entry.pageNumber, endPage: endOfCur });

    // Intermediate PDFs (full range)
    for (let i = curIdx + 1; i < nextIdx; i++) {
      const name = pdfList[i];
      if (name == null) continue;
      if (pageCounts[name] == null) pageCounts[name] = await this.getPdfPageCount(name);
      plans.push({ category: entry.category, pdfFilename: name, startPage: 1, endPage: pageCounts[name] || 999 });
    }

    // Next PDF from page 1 to next transition - 1
    if (nextIdx > curIdx) {
      plans.push({ category: entry.category, pdfFilename: next.pdfFilename, startPage: 1, endPage: Math.max(1, next.pageNumber - 1) });
    }

    return plans;
  }

  private async getPdfPageCount(name: string): Promise<number> {
    const stored = await integrationDb.getFile(name);
    if (!stored || stored.kind !== 'pdf') return 0;
    const file = new File([stored.blob], stored.name, { type: 'application/pdf' });
    try {
      return await pdfParserService.getPageCount(file);
    } catch {
      return 0;
    }
  }

  // ─── Processing one fireside ──────────────────────────────────────────────

  async processCurrentFireside(job: LocalIntegrationJob): Promise<void> {
    const current = this.getCurrentFireside(job);
    if (!current) return;

    // Mark processing
    job.firesideStatuses[current.category] = 'processing';
    job.logEntries.push({ timestamp: Date.now(), level: 'info', message: `Processing fireside: ${current.category}` });
    await integrationDb.saveJob(job);

    const pageCounts: Record<string, number> = {};
    const plans = await this.buildCurrentPlan(job, pageCounts);

    // Clear any previous partial snippets for this fireside (idempotent re-processing)
    const existing = await integrationDb.listSnippets();
    for (const s of existing) {
      if (s.fireside === current.category) await integrationDb.deleteSnippet(s.localId);
    }
    const existingImages = await integrationDb.listImages();
    for (const img of existingImages) {
      if (img.fireside === current.category) await integrationDb.deleteImage(img.localId);
    }

    let snippetOrder = 0;
    let imageOrder = 0;

    for (const plan of plans) {
      const stored = await integrationDb.getFile(plan.pdfFilename);
      if (!stored || stored.kind !== 'pdf') {
        job.logEntries.push({ timestamp: Date.now(), level: 'warning', message: `Missing PDF: ${plan.pdfFilename}` });
        continue;
      }

      const file = new File([stored.blob], stored.name, { type: 'application/pdf' });
      try {
        const { textItems, images } = await pdfParserService.parsePdf(file);

        // Filter text items to this page range, sort by page then y (higher y = earlier)
        const inRange = textItems
          .filter(t => t.pageNumber >= plan.startPage && t.pageNumber <= plan.endPage)
          .sort((a, b) => a.pageNumber - b.pageNumber || b.y - a.y);

        for (const snippet of this.groupIntoSnippets(inRange, current.category, plan.pdfFilename, snippetOrder)) {
          await integrationDb.saveSnippet(snippet);
          snippetOrder = Math.max(snippetOrder, snippet.order + 1);
        }

        // Store images as full-page data URLs (lighter; no crop yet)
        for (const img of images) {
          if (img.pageNumber >= plan.startPage && img.pageNumber <= plan.endPage && img.base64) {
            await integrationDb.saveImage({
              localId: `img-${current.category}-${Date.now()}-${imageOrder}`,
              fireside: current.category,
              dataUrl: `data:image/png;base64,${img.base64}`,
              pageNumber: img.pageNumber,
              sourcePdf: plan.pdfFilename,
              order: imageOrder++,
            });
          }
        }
      } catch (e) {
        job.logEntries.push({ timestamp: Date.now(), level: 'error', message: `Failed to parse ${plan.pdfFilename}: ${String(e)}` });
        await integrationDb.saveJob(job);
        continue;
      }
    }

    // Mark preview (ready for review)
    job.firesideStatuses[current.category] = 'preview';
    job.status = 'IN-REVIEW';
    job.logEntries.push({ timestamp: Date.now(), level: 'info', message: `Fireside ready for preview: ${current.category}` });
    await integrationDb.saveJob(job);
  }

  /** Group ordered text items into 30-50 word snippets. */
  private groupIntoSnippets(
    items: { text: string; pageNumber: number }[],
    fireside: string,
    sourcePdf: string,
    startOrder: number
  ): LocalIntegrationSnippet[] {
    const snippets: LocalIntegrationSnippet[] = [];
    let buffer: string[] = [];
    let bufferPage = items[0]?.pageNumber ?? 1;
    let wordCount = 0;

    const flush = (page: number) => {
      const text = buffer.join(' ').trim();
      if (!text) return;
      snippets.push({
        localId: `snip-${fireside}-${Date.now()}-${snippets.length}`,
        fireside,
        text,
        order: startOrder + snippets.length,
        pageNumber: page,
        sourcePdf,
        status: 'IN-REVIEW',
        action: 'keep',
      });
      buffer = [];
      wordCount = 0;
    };

    for (const item of items) {
      buffer.push(item.text);
      wordCount += item.text.split(/\s+/).filter(Boolean).length;

      const endsSentence = /[.!?]["']?$/.test(item.text);
      if (wordCount >= WORD_MIN && (wordCount >= WORD_MAX || endsSentence)) {
        flush(bufferPage);
        bufferPage = item.pageNumber;
      } else if (wordCount >= WORD_MIN) {
        bufferPage = item.pageNumber;
      }
    }

    if (buffer.length > 0) flush(bufferPage);

    return snippets;
  }

  // ─── Snippet CRUD ─────────────────────────────────────────────────────────

  async listSnippetsForFireside(fireside: string): Promise<LocalIntegrationSnippet[]> {
    const all = await integrationDb.listSnippets();
    return all.filter(s => s.fireside === fireside).sort((a, b) => a.order - b.order);
  }

  async listImagesForFireside(fireside: string): Promise<LocalIntegrationImage[]> {
    const all = await integrationDb.listImages();
    return all.filter(i => i.fireside === fireside).sort((a, b) => a.order - b.order);
  }

  async updateSnippet(localId: string, updates: Partial<LocalIntegrationSnippet>): Promise<void> {
    const existing = await integrationDb.getSnippet(localId);
    if (existing) await integrationDb.saveSnippet({ ...existing, ...updates });
  }

  async deleteSnippet(localId: string): Promise<void> {
    await integrationDb.deleteSnippet(localId);
  }

  // ─── Approve → final atoms to Firestore ───────────────────────────────────

  async approveFireside(job: LocalIntegrationJob): Promise<void> {
    const current = this.getCurrentFireside(job);
    if (!current) return;

    const snippets = await this.listSnippetsForFireside(current.category);
    const kept = snippets.filter(s => s.action !== 'delete' && s.action !== 'skip');
    if (kept.length === 0) {
      throw new Error(`No snippets to approve for "${current.category}". Delete/activate at least one.`);
    }

    // Create (or reuse) the fireside in Firestore
    let firesideId = job.firesideIds[current.category];
    if (!firesideId) {
      firesideId = await firesideRepository.save(
        new FiresideFactory().create({
          firesideFamilyId: job.familyId,
          name: current.category,
          description: `Imported from PDF via integration pipeline`,
          date: Timestamp.now(),
        })
      );
      job.firesideIds[current.category] = firesideId;
    }

    // Atomize into snippets (+ deepenings when flagged)
    let order = 0;
    for (const s of kept) {
      order++;
      const snippetId = await snippetRepository.save(
        new SnippetFactory().create({
          firesideId,
          name: s.text.substring(0, 72),
          text: s.text,
          naturalOrder: order,
          visibility: 'public',
          tags: [],
        })
      );

      if (s.action === 'deepening') {
        await deepeningRepository.save(
          new DeepeningFactory().create({
            snippetId,
            name: `${s.text.substring(0, 30)} (deepening)`,
            text: s.text,
            tags: [],
          })
        );
      }
    }

    job.firesideStatuses[current.category] = 'approved';
    job.logEntries.push({ timestamp: Date.now(), level: 'info', message: `Approved fireside "${current.category}" — ${kept.length} snippets written` });

    // Advance
    if (job.currentFiresideIndex < job.transitions.length - 1) {
      job.currentFiresideIndex++;
    } else {
      job.status = 'COMPLETE';
    }

    await integrationDb.saveJob(job);
  }

  async skipFireside(job: LocalIntegrationJob): Promise<void> {
    const current = this.getCurrentFireside(job);
    if (!current) return;

    job.firesideStatuses[current.category] = 'skipped';
    job.logEntries.push({ timestamp: Date.now(), level: 'warning', message: `Skipped fireside: ${current.category}` });

    if (job.currentFiresideIndex < job.transitions.length - 1) {
      job.currentFiresideIndex++;
    } else {
      job.status = 'COMPLETE';
    }

    await integrationDb.saveJob(job);
  }
}

export const localIntegrationService = new LocalIntegrationService();