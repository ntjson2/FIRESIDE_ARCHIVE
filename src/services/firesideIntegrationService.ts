'use client';

import {
  IntegrationJob, TransitionEntry, PDFProcessingPlan,
  IntegratedSnippet, IntegratedImage, UniversalFiresideCategory, UNIVERSAL_FIRESIDE_CATEGORIES, AnnotationType,
} from '@/types';
import { integrationJobRepository } from '@/repositories/IntegrationJobRepository';
import { Timestamp } from 'firebase/firestore';

// ─── Types ──────────────────────────────────────────────────────────────────

interface GuideData {
  familyName: string;
  pdfFiles: string[];
  transitions: TransitionEntry[];
  instructions: string;
}

interface DeepSeekExtractionResult {
  snippets: { text: string; order: number; position: { y: number } }[];
  detectedImages: { page: number; bounds: { x: number; y: number; width: number; height: number }; description: string }[];
  transitionMismatch?: { expectedCategory: string; actualContent: string; suggestedPage: number };
}

interface GeminiImageLabel {
  type: string;
  description: string;
  isPrimary: boolean;
}

// ─── Service Class ───────────────────────────────────────────────────────────

export class FiresideIntegrationService {

  // ─── Step 1: Parse guide.md ──────────────────────────────────────────────

  parseGuide(markdownContent: string, uploadedBy: string, familyId: string): { guide: GuideData; job: Partial<IntegrationJob> } {
    const familyMatch = markdownContent.match(/#\s*Fireside Family:\s*(.+)/i);
    const familyName = familyMatch?.[1]?.trim() || 'Unnamed Family';

    // Parse PDF list
    const pdfSection = markdownContent.match(/PDF\s*Files\s*[\r\n]+((?:[-*]\s*.+[\r\n]*)+)/i);
    const pdfFiles: string[] = [];
    if (pdfSection) {
      const lines = pdfSection[1].split(/[\r\n]+/);
      for (const line of lines) {
        const match = line.match(/[-*]\s*(.+)/);
        if (match) pdfFiles.push(match[1].trim());
      }
    }

    // Parse transition table
    const tableMatch = markdownContent.match(/\| # \| Fireside \| PDF \| Page \|[\s\S]+?(?=\n\n|\n##|\Z)/);
    const transitions: TransitionEntry[] = [];
    if (tableMatch) {
      const rows = tableMatch[0].split(/[\r\n]+/);
      for (const row of rows) {
        const parts = row.split('|').map(p => p.trim()).filter(Boolean);
        if (parts.length >= 4 && !isNaN(parseInt(parts[0]))) {
          const firesideNumber = parseInt(parts[0]);
          const pdfFilename = parts[2];
          const pageNumber = parseInt(parts[3]);
          if (firesideNumber >= 1 && firesideNumber <= 7 && pdfFilename && !isNaN(pageNumber)) {
            transitions.push({
              firesideNumber,
              category: UNIVERSAL_FIRESIDE_CATEGORIES[firesideNumber - 1],
              pdfFilename,
              pageNumber,
            });
          }
        }
      }
    }

    // Parse LLM instructions
    const instructionsMatch = markdownContent.match(/## LLM Instructions[\s\S]*/i);
    const instructions = instructionsMatch?.[0] || '';

    const guide: GuideData = { familyName, pdfFiles, transitions, instructions };

    const job: Partial<IntegrationJob> = {
      guideFilePath: '',
      familyId,
      familyName,
      pdfFiles,
      transitions,
      processingPlan: [],
      uploadedBy,
      status: 'PENDING',
      currentPlanIndex: 0,
      currentPage: 0,
      totalPages: 0,
      categoryResults: {},
      logEntries: [{
        timestamp: Timestamp.now(),
        level: 'info',
        message: `Guide parsed: ${transitions.length} transitions, ${pdfFiles.length} PDFs`,
      }],
    };

    return { guide, job };
  }

  // ─── Step 2: Build Processing Plan ───────────────────────────────────────

  buildProcessingPlan(pdfFiles: string[], transitions: TransitionEntry[], pdfPageCounts: Record<string, number>): PDFProcessingPlan[] {
    const plan: PDFProcessingPlan[] = [];
    const pdfListOrdered = pdfFiles;

    for (let t = 0; t < transitions.length; t++) {
      const entry = transitions[t];
      const nextEntry = transitions[t + 1];

      const plansForCategory: PDFProcessingPlan[] = [];

      // Find position of this PDF in the ordered list
      let currentPdfIdx = pdfListOrdered.indexOf(entry.pdfFilename);
      if (currentPdfIdx === -1) continue;

      // First PDF: start at entry.pageNumber
      const firstPlan: PDFProcessingPlan = {
        category: entry.category,
        pdfFilename: entry.pdfFilename,
        startPage: entry.pageNumber,
        endPage: pdfPageCounts[entry.pdfFilename] || 999,
      };
      plansForCategory.push(firstPlan);

      // If there's a next transition, figure out intermediate PDFs and final PDF end
      if (nextEntry) {
        const nextPdfIdx = pdfListOrdered.indexOf(nextEntry.pdfFilename);

        if (entry.pdfFilename === nextEntry.pdfFilename) {
          // Same PDF: end at next transition's page - 1
          firstPlan.endPage = nextEntry.pageNumber - 1;
        } else {
          // Different PDFs: first PDF goes to end
          firstPlan.endPage = pdfPageCounts[entry.pdfFilename] || 999;

          // Intermediate PDFs (full range)
          for (let i = currentPdfIdx + 1; i < nextPdfIdx; i++) {
            plansForCategory.push({
              category: entry.category,
              pdfFilename: pdfListOrdered[i],
              startPage: 1,
              endPage: pdfPageCounts[pdfListOrdered[i]] || 999,
            });
          }

          // Final PDF: start at 1, end at next transition - 1
          if (nextPdfIdx < pdfListOrdered.length) {
            plansForCategory.push({
              category: entry.category,
              pdfFilename: nextEntry.pdfFilename,
              startPage: 1,
              endPage: nextEntry.pageNumber - 1,
            });
          }
        }
      }
      // If no next transition, this fireside runs to the end of last PDF

      plan.push(...plansForCategory);
    }

    return plan;
  }

  // ─── Step 3: LLM Extraction ──────────────────────────────────────────────

  async extractSnippetsFromPage(
    pageBase64: string,
    context: { category: string; guideInstructions: string; pageNum: number; totalPdfPages: number }
  ): Promise<DeepSeekExtractionResult> {
    const prompt = `You are processing a scanned Bahá'í fireside teaching document using OCR.

CURRENT CONTEXT:
- Fireside Category: "${context.category}"
- Page: ${context.pageNum} of ${context.totalPdfPages} in this PDF
- Guide Instructions: ${context.guideInstructions || '(none)'}

TASK:
1. Extract 30-50 word teaching snippets in reading order. Each snippet must be a coherent unit of meaning.
2. Identify any images, diagrams, or figures with bounding box coordinates (approximate x, y, width, height in pixels).
3. Classify ALL text to "${context.category}" — only use UNCATEGORIZED for extreme anomalies (unreadable, blank pages, non-fireside content).
4. Flag questionable text:
   - "grammar": awkward phrasing
   - "unclear-word": single word that appears wrong (provide best guess)
   - "ocr-artifact": garbled characters
   - "double-column-mix": text from two columns mixed together

IMPORTANT:
- Every snippet MUST be classified to the current category (categoryConfidence 0.5-1.0)
- Only flag UNCATEGORIZED if truly unclassifiable (<1% of cases)
- Preserve original wording — do not summarize or paraphrase
- Note page position (approximate Y) for ordering

Return ONLY valid JSON:
{
  "snippets": [
    {"text": "snippet text", "order": 1, "position": {"y": 120}, "categoryConfidence": 0.9, "annotation": null, "annotationType": null},
    {"text": "snippet text", "order": 2, "position": {"y": 250}, "categoryConfidence": 0.7, "annotation": "'thr0ugh' may be 'through'", "annotationType": "unclear-word"}
  ],
  "detectedImages": [
    {"page": ${context.pageNum}, "bounds": {"x": 100, "y": 350, "width": 400, "height": 250}, "description": "diagram of spiritual hierarchy"}
  ]
}`;

    try {
      const apiKey = process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY || '';
      const model = process.env.NEXT_PUBLIC_DEEPSEEK_REASONER_MODEL || process.env.NEXT_PUBLIC_DEEPSEEK_MODEL || 'deepseek-chat';

      const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'user', content: `${prompt}\n\n[Image data is a base64-encoded page render. Process text from this image.]` },
          ],
          temperature: 0.2,
          max_tokens: 4096,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const text = data.choices?.[0]?.message?.content || '{}';
        return JSON.parse(this.cleanJSON(text));
      }
    } catch (e) { console.warn('DeepSeek extraction failed:', e); }

    // Mock fallback
    return { snippets: [], detectedImages: [] };
  }

  // ─── Step 4: Gemini Flash Image Labeling ─────────────────────────────────

  async labelImageWithGemini(imageBase64: string): Promise<GeminiImageLabel> {
    try {
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
      if (!apiKey) return { type: 'unknown', description: 'No Gemini API key configured', isPrimary: false };

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: 'Describe this image from a Bahá\'í fireside collection. Return JSON: {"type": "diagram|photo|illustration|chart|text", "description": "...", "isPrimary": true/false}' },
                { inline_data: { mime_type: 'image/png', data: imageBase64 } },
              ],
            }],
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        return JSON.parse(this.cleanJSON(text));
      }
    } catch (e) { console.warn('Gemini Flash failed:', e); }

    return { type: 'unknown', description: 'Failed to label image', isPrimary: false };
  }

  // ─── Checkpoint ──────────────────────────────────────────────────────────

  async saveCheckpoint(jobId: string, updates: Partial<IntegrationJob>): Promise<void> {
    await integrationJobRepository.update(jobId, updates);
  }

  // ─── PDF Cleanup ────────────────────────────────────────────────────────

  /** Clean up all results from a specific PDF so it can be re-processed */
  async cleanupPdfResults(jobId: string, pdfFilename: string): Promise<void> {
    const job = await integrationJobRepository.findById(jobId);
    if (!job) return;

    // Remove snippets and images from this PDF across all categories
    const cleanedResults: typeof job.categoryResults = {};
    let removedSnippets = 0;
    let removedImages = 0;

    for (const [cat, data] of Object.entries(job.categoryResults || {})) {
      const keptSnippets = (data.snippets || []).filter(s => {
        if (s.sourcePdf === pdfFilename) { removedSnippets++; return false; }
        return true;
      });
      const keptImages = (data.images || []).filter(img => {
        if (img.sourcePdf === pdfFilename) { removedImages++; return false; }
        return true;
      });
      if (keptSnippets.length > 0 || keptImages.length > 0) {
        cleanedResults[cat] = { snippets: keptSnippets, images: keptImages };
      }
    }

    // Remove PDF from processedPdfs
    const cleanedPdfs = { ...(job.processedPdfs || {}) };
    delete cleanedPdfs[pdfFilename];

    // Update log
    const logEntry = {
      timestamp: Timestamp.now(),
      level: 'warning' as const,
      message: `Cleaned up ${pdfFilename}: removed ${removedSnippets} snippets and ${removedImages} images for re-processing`,
    };

    await integrationJobRepository.update(jobId, {
      categoryResults: cleanedResults,
      processedPdfs: cleanedPdfs,
      logEntries: [...(job.logEntries || []), logEntry],
    });
  }

  // ─── Storage Helpers ─────────────────────────────────────────────────────

  async uploadImageToStorage(base64: string, path: string): Promise<string> {
    // In production, use Firebase Storage SDK. For now, return data URL.
    return `data:image/png;base64,${base64}`;
  }

  // ─── Utils ───────────────────────────────────────────────────────────────

  private cleanJSON(text: string): string {
    let cleaned = text.trim();
    if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
    else if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
    if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
    return cleaned.trim();
  }
}

export const firesideIntegrationService = new FiresideIntegrationService();