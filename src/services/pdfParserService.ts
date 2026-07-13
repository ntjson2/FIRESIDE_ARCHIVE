'use client';

import { ParsedChunk, FiresideBatch, ChunkType } from '@/types';

// ─── Types ──────────────────────────────────────────────────────────────────

interface PdfTextItem {
  text: string;
  pageNumber: number;
  y: number;       // vertical position on page (higher = earlier in page)
  fontSize: number;
  fontName: string;
  isBold: boolean;
}

interface PdfImageItem {
  pageNumber: number;
  y: number;
  width: number;
  height: number;
  base64: string;
}

// ─── Main Parser ────────────────────────────────────────────────────────────

export class PdfParserService {

  /** Parse a PDF file into raw text and image items */
  async parsePdf(file: File): Promise<{ textItems: PdfTextItem[]; images: PdfImageItem[] }> {
    const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist');
    GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.7.76/pdf.worker.min.mjs';

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await getDocument({ data: arrayBuffer }).promise;

    const textItems: PdfTextItem[] = [];
    const images: PdfImageItem[] = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const viewport = page.getViewport({ scale: 1 });

      // Extract text items with position
      for (const item of textContent.items) {
        if ('str' in item && item.str.trim()) {
          const transform = (item as any).transform || [1, 0, 0, 1, 0, 0];
          const fontSize = transform[0] || 12;
          const fontName = (item as any).fontName || '';

          textItems.push({
            text: item.str.trim(),
            pageNumber: pageNum,
            y: Math.round(transform[5] || 0), // y position
            fontSize: Math.round(fontSize),
            fontName,
            isBold: fontName.toLowerCase().includes('bold') || fontSize > 14,
          });
        }
      }

      // Extract images
      const ops = await page.getOperatorList();
      for (let i = 0; i < ops.fnArray.length; i++) {
        if (ops.fnArray[i] === 82 || ops.fnArray[i] === 87) { // paintImageXObject
          try {
            const imgData = await this.extractImageFromPage(page, viewport);
            if (imgData) {
              images.push({ ...imgData, pageNumber: pageNum, y: 0 });
            }
          } catch { /* skip failed image extraction */ }
        }
      }
    }

    return { textItems, images };
  }

  /** Convert parsed PDF items into ordered chunks */
  createChunks(textItems: PdfTextItem[], images: PdfImageItem[]): ParsedChunk[] {
    let chunks: ParsedChunk[] = [];
    let orderCounter = 0;

    // Merge text and image items sorted by page, then y position
    type MergedItem = { type: ChunkType; pageNumber: number; y: number; data: any };
    const merged: MergedItem[] = [
      ...textItems.map(t => ({ type: 'text' as ChunkType, pageNumber: t.pageNumber, y: t.y, data: t })),
      ...images.map(i => ({ type: 'image' as ChunkType, pageNumber: i.pageNumber, y: i.y, data: i })),
    ];

    merged.sort((a, b) => {
      if (a.pageNumber !== b.pageNumber) return a.pageNumber - b.pageNumber;
      return b.y - a.y; // higher y = earlier on page (PDF coordinates, y increases upward)
    });

    for (const item of merged) {
      if (item.type === 'text') {
        const t = item.data as PdfTextItem;
        const chunkType: ChunkType = t.isBold && t.text.length < 100 ? 'heading' : 'text';
        chunks.push({
          localId: `chunk-${orderCounter}`,
          type: chunkType,
          order: orderCounter,
          pageNumber: t.pageNumber,
          content: t.text,
          notes: '',
          action: 'keep',
          references: [],
          marks: [],
          scanVersion: 1,
          scanHistory: [],
          originalContent: t.text,
        });
        orderCounter++;
      } else if (item.type === 'image') {
        const img = item.data as PdfImageItem;
        chunks.push({
          localId: `chunk-${orderCounter}`,
          type: 'image',
          order: orderCounter,
          pageNumber: img.pageNumber,
          content: `[Image: ${img.width}x${img.height}px]`,
          imageUrl: img.base64 ? `data:image/png;base64,${img.base64}` : undefined,
          imageBase64: img.base64,
          notes: '',
          action: 'keep',
          references: [],
          marks: [],
          scanVersion: 1,
          scanHistory: [],
        });
        orderCounter++;
      }
    }

    return chunks;
  }

  /** Group chunks into fireside batches by detecting heading boundaries */
  createBatches(chunks: ParsedChunk[]): FiresideBatch[] {
    const batches: FiresideBatch[] = [];
    let currentBatch: ParsedChunk[] = [];
    let batchIndex = 0;

    for (const chunk of chunks) {
      // A heading chunk starts a new fireside batch
      if (chunk.type === 'heading' && currentBatch.length > 0) {
        batches.push({
          firesideName: currentBatch[0]?.content || `Fireside ${batchIndex + 1}`,
          firesideIndex: batchIndex,
          chunks: [...currentBatch],
          status: 'pending',
        });
        batchIndex++;
        currentBatch = [];
      }
      currentBatch.push(chunk);
    }

    // Final batch
    if (currentBatch.length > 0) {
      batches.push({
        firesideName: currentBatch[0]?.content || `Fireside ${batchIndex + 1}`,
        firesideIndex: batchIndex,
        chunks: [...currentBatch],
        status: 'pending',
      });
    }

    return batches;
  }

  /** Re-scan a chunk — send to LLM for re-extraction from a different angle */
  async rescanChunk(
    chunk: ParsedChunk,
    pageText: string,
    firesideName: string,
    prevContent: string,
    nextContent: string
  ): Promise<{ improvedContent: string; changedType: ChunkType; confidence: number; explanation: string }> {
    const prompt = `You are re-scanning a chunk from a fireside collection PDF.

ORIGINAL EXTRACTION (type: ${chunk.type}):
"${chunk.content}"

CONTEXT:
- Fireside: "${firesideName}"
- Previous chunk: "${prevContent.substring(0, 300)}"
- Next chunk: "${nextContent?.substring(0, 300) || '(end)'}"
- Full page text: "${pageText.substring(0, 1500)}"

RE-SCAN from a different angle:
1. Check if the original extraction missed text or OCR garbled it
2. Correct any OCR artifacts or formatting issues
3. If this is an image chunk, describe what the image depicts (for alt-text)
4. Detect if this chunk should actually be a deepening (supporting/explanatory material) vs a snippet (main teaching content)
5. Preserve the original meaning while improving clarity

Return ONLY valid JSON:
{
  "improvedContent": "The corrected/extracted text",
  "changedType": "text" or "deepening" or "image" (or keep original type),
  "confidence": 0.85,
  "explanation": "Brief note on what was changed and why"
}`;

    // Try DeepSeek API
    try {
      const apiKey = process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY || '';
      const model = process.env.NEXT_PUBLIC_DEEPSEEK_MODEL || 'deepseek-chat';

      const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          max_tokens: 1024,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const text = data.choices?.[0]?.message?.content || '';
        const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const parsed = JSON.parse(clean);
        return {
          improvedContent: parsed.improvedContent || chunk.content,
          changedType: parsed.changedType || chunk.type,
          confidence: parsed.confidence || 0.5,
          explanation: parsed.explanation || 'No explanation provided',
        };
      }
    } catch (e) {
      console.warn('DeepSeek re-scan failed, trying Ollama fallback:', e);
    }

    // Ollama fallback
    try {
      const ollamaUrl = process.env.NEXT_PUBLIC_OLLAMA_BASE_URL || 'http://localhost:11434';
      const ollamaModel = process.env.NEXT_PUBLIC_OLLAMA_MODEL || 'llama3';

      const response = await fetch(`${ollamaUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: ollamaModel,
          messages: [{ role: 'user', content: prompt }],
          stream: false,
          options: { temperature: 0.3 },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const text = data.message?.content || '';
        const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const parsed = JSON.parse(clean);
        return {
          improvedContent: parsed.improvedContent || chunk.content,
          changedType: parsed.changedType || chunk.type,
          confidence: parsed.confidence || 0.5,
          explanation: parsed.explanation || 'No explanation provided',
        };
      }
    } catch { /* fall through to mock */ }

    // Mock fallback
    return {
      improvedContent: chunk.content,
      changedType: chunk.type,
      confidence: 0.3,
      explanation: 'Could not re-scan (LLM unavailable). Original preserved.',
    };
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────

  private async extractImageFromPage(page: any, viewport: any): Promise<{ width: number; height: number; base64: string } | null> {
    try {
      // Create a canvas from the page render
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      await page.render({ canvasContext: ctx, viewport }).promise;
      const base64 = canvas.toDataURL('image/png').split(',')[1];
      return { width: viewport.width, height: viewport.height, base64 };
    } catch {
      return null;
    }
  }
}

export const pdfParserService = new PdfParserService();