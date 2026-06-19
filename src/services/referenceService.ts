'use client';

import { ReferenceEntity, CitationAuthor, ConceptualMetadata, ContentReference } from '@/types';

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface ValidationResult {
  isValid: boolean;
  formattedAPA: string;
  structured: Partial<ReferenceEntity>;
  errors: string[];
  warnings?: string[];
}

export interface CitationCandidate {
  title: string;
  authors: CitationAuthor[];
  year: number | null;
  publisher?: string;
  doi?: string;
  url?: string;
  formattedCitation: string;
  confidence: number;       // 0-1
  sourceUrl: string;        // Link to source for verification
  source: string;           // "crossref" | "google-books" | "openalex" | "deepseek"
}

export interface CitationAdvisory {
  detectedType: ReferenceEntity['sourceType'];
  recommendedFormat: ReferenceEntity['citationFormat'];
  confidence: number;
  formattedCitation: string;
  alternativeFormats?: {
    format: ReferenceEntity['citationFormat'];
    label: string;
    citation: string;
  }[];
  warnings: string[];
  rawAnalysis: string;
  structured: Partial<ReferenceEntity>;
}

// ─── AI Provider Abstraction ─────────────────────────────────────────────────

interface AIProviderConfig {
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  priority: number;        // lower = tried first
}

const PROVIDERS: AIProviderConfig[] = [
  {
    name: 'deepseek',
    baseUrl: 'https://api.deepseek.com/v1',
    apiKey: process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY || '',
    model: process.env.NEXT_PUBLIC_DEEPSEEK_MODEL || 'deepseek-chat',
    priority: 1,
  },
  {
    name: 'ollama',
    baseUrl: process.env.NEXT_PUBLIC_OLLAMA_BASE_URL || 'http://localhost:11434',
    apiKey: '',
    model: process.env.NEXT_PUBLIC_OLLAMA_MODEL || 'llama3',
    priority: 2,
  },
];

// ─── Service Class ───────────────────────────────────────────────────────────

export class ReferenceService {
  private providers: AIProviderConfig[];

  constructor() {
    // Sort by priority and filter out providers with required missing config
    this.providers = PROVIDERS
      .filter(p => {
        if (p.name === 'deepseek' && !p.apiKey) return false;
        return true; // Ollama doesn't need an API key
      })
      .sort((a, b) => a.priority - b.priority);

    if (this.providers.length === 0) {
      console.warn('No AI providers configured. Reference validation will use local fallback only.');
    }
  }

  // ─── Public API ──────────────────────────────────────────────────────────

  /** Step 1: Analyze raw input → detect source type, recommend format, rewrite */
  async analyzeReference(rawInput: string): Promise<CitationAdvisory> {
    const prompt = this.buildAnalysisPrompt(rawInput);
    const response = await this.callAI(prompt, 'analyze');
    return this.parseAdvisoryResponse(response, rawInput);
  }

  /** Step 2: Rewrite an already-validated reference to a different format */
  async rewriteToFormat(
    rawInput: string,
    targetFormat: ReferenceEntity['citationFormat']
  ): Promise<CitationAdvisory> {
    const prompt = this.buildRewritePrompt(rawInput, targetFormat);
    const response = await this.callAI(prompt, 'rewrite');
    const advisory = this.parseAdvisoryResponse(response, rawInput);
    advisory.recommendedFormat = targetFormat;
    return advisory;
  }

  /** Step 3 (a): Locate a reference online via Crossref / Google Books / DeepSeek */
  async locateReferenceOnline(
    partialInput: string,
    sourceTypeHint?: string
  ): Promise<{
    candidates: CitationCandidate[];
    bestMatch: CitationCandidate | null;
    searchSource: string;
  }> {
    // Try Crossref first for academic sources
    const crossrefResults = await this.tryCrossrefLookup(partialInput);
    if (crossrefResults.length > 0) {
      return {
        candidates: crossrefResults,
        bestMatch: crossrefResults[0],
        searchSource: 'crossref',
      };
    }

    // Try Google Books
    const booksResults = await this.tryGoogleBooksLookup(partialInput);
    if (booksResults.length > 0) {
      return {
        candidates: booksResults,
        bestMatch: booksResults[0],
        searchSource: 'google-books',
      };
    }

    // Fall back to DeepSeek for web search / concept / oral tradition
    const aiResult = await this.tryAISearch(partialInput, sourceTypeHint);
    if (aiResult) {
      return {
        candidates: [aiResult],
        bestMatch: aiResult,
        searchSource: 'deepseek',
      };
    }

    return { candidates: [], bestMatch: null, searchSource: 'none' };
  }

  /** Legacy: validate and format (now uses analyzeReference internally) */
  async validateAndFormatReference(rawCitation: string): Promise<ValidationResult> {
    try {
      const advisory = await this.analyzeReference(rawCitation);
      return this.advisoryToValidationResult(advisory);
    } catch (error) {
      return {
        isValid: false,
        formattedAPA: '',
        structured: {},
        errors: ['Failed to validate reference: ' + String(error)],
      };
    }
  }

  async validateWithSourceType(
    rawCitation: string,
    sourceType: ReferenceEntity['sourceType']
  ): Promise<ValidationResult> {
    try {
      const advisory = await this.analyzeReference(rawCitation);
      advisory.detectedType = sourceType;
      return this.advisoryToValidationResult(advisory);
    } catch (error) {
      return {
        isValid: false,
        formattedAPA: '',
        structured: {},
        errors: ['Failed to validate reference: ' + String(error)],
      };
    }
  }

  async validateBahaiText(textName: string, speaker?: string): Promise<ValidationResult> {
    const input = `${textName}${speaker ? ` by ${speaker}` : ''}`;
    const advisory = await this.analyzeReference(input);
    advisory.detectedType = 'bahai-text';
    return this.advisoryToValidationResult(advisory);
  }

  async validateSpiritualConcept(
    conceptName: string,
    context?: string,
    relatedConcepts?: string[]
  ): Promise<ValidationResult> {
    const input = `Concept: ${conceptName}. Context: ${context || 'N/A'}. Related: ${relatedConcepts?.join(', ') || 'N/A'}`;
    const advisory = await this.analyzeReference(input);
    advisory.detectedType = 'spiritual-concept';
    return this.advisoryToValidationResult(advisory);
  }

  async validateScripture(title: string, bookChapterVerse: string): Promise<ValidationResult> {
    const input = `${title} ${bookChapterVerse}`;
    const advisory = await this.analyzeReference(input);
    advisory.detectedType = 'religious-scripture';
    return this.advisoryToValidationResult(advisory);
  }

  async validateOralTradition(
    topic: string,
    speaker?: string,
    date?: Date,
    transcribedBy?: string
  ): Promise<ValidationResult> {
    const parts = [
      `Topic: ${topic}`,
      speaker ? `Speaker: ${speaker}` : '',
      date ? `Date: ${date.toISOString().split('T')[0]}` : '',
      transcribedBy ? `Documented by: ${transcribedBy}` : '',
    ].filter(Boolean);
    const input = parts.join('. ');
    const advisory = await this.analyzeReference(input);
    advisory.detectedType = 'oral-tradition';
    return this.advisoryToValidationResult(advisory);
  }

  async checkDuplicate(citation: ReferenceEntity): Promise<ReferenceEntity | null> {
    // Would need repository access — returning null for client-side
    return null;
  }

  // ─── Prompt Builders ────────────────────────────────────────────────────

  private buildAnalysisPrompt(rawInput: string): string {
    return `You are a citation specialist for the Fireside Archive, a Bahá'í teaching reference system.

Your task:
1. DETECT the source type (book, journal, website, bahai-text, religious-scripture, spiritual-concept, oral-tradition, or other)
2. RECOMMEND the best citation format (apa-7 for academic, chicago for humanities, bahai for sacred texts, religious for scripture, descriptive for concepts/oral traditions, custom for other)
3. REWRITE the input into a properly formatted citation in the recommended format
4. Provide at least one ALTERNATIVE format if applicable
5. FLAG any missing information or potential errors

Input citation: "${rawInput}"

Return ONLY valid JSON (no markdown, no code blocks) with this exact structure:
{
  "detectedType": "book|journal|website|other|bahai-text|religious-scripture|spiritual-concept|oral-tradition",
  "recommendedFormat": "apa-7|chicago|bahai|religious|descriptive|custom",
  "confidence": 0.95,
  "formattedCitation": "The fully formatted citation string",
  "alternativeFormats": [
    { "format": "apa-7", "label": "APA 7th Edition", "citation": "Formatted in APA" },
    { "format": "chicago", "label": "Chicago Style", "citation": "Formatted in Chicago" }
  ],
  "warnings": ["Missing DOI", "Year inferred from context"],
  "rawAnalysis": "Brief explanation of what was detected and why format was chosen",
  "structured": {
    "title": "Work title",
    "authors": [{"lastName": "Smith", "initials": "J.M."}],
    "year": 2020,
    "publisher": "Publisher name",
    "speaker": null,
    "journal": null,
    "volume": null,
    "issue": null,
    "pages": null,
    "doi": null,
    "url": null,
    "conceptualMeta": null
  }
}`;
  }

  private buildRewritePrompt(rawInput: string, targetFormat: ReferenceEntity['citationFormat']): string {
    const formatDescriptions: Record<string, string> = {
      'apa-7': 'APA 7th Edition: Author, I. (Year). Title. Publisher.',
      'chicago': 'Chicago Style: Author, First Name. Year. Title. Publisher.',
      'bahai': 'Bahai Convention: Speaker. (Year). Title. Bahai Publishing, par./sec. range.',
      'religious': 'Religious: *Title* Book:Chapter:Verse (Translation).',
      'descriptive': 'Descriptive: Clear prose describing the source, speaker, context, and date.',
      'custom': 'Keep the original format but clean up formatting consistently.',
    };

    return `You are a citation formatter for the Fireside Archive.

Reformat the following citation into ${targetFormat} format (${formatDescriptions[targetFormat] || targetFormat}):

Input: "${rawInput}"

Return ONLY valid JSON (no markdown, no code blocks) with this structure:
{
  "detectedType": "source type",
  "recommendedFormat": "${targetFormat}",
  "confidence": 0.95,
  "formattedCitation": "The reformatted citation string",
  "alternativeFormats": [],
  "warnings": [],
  "rawAnalysis": "Brief note on what changed",
  "structured": {
    "title": "Work title",
    "authors": [{"lastName": "", "initials": ""}],
    "year": null,
    "publisher": null,
    "speaker": null,
    "journal": null,
    "volume": null,
    "issue": null,
    "pages": null,
    "doi": null,
    "url": null,
    "conceptualMeta": null
  }
}`;
  }

  // ─── Online Lookup (CrossRef + Google Books + AI) ───────────────────────

  private async tryCrossrefLookup(query: string): Promise<CitationCandidate[]> {
    try {
      const url = `https://api.crossref.org/works?query=${encodeURIComponent(query)}&rows=5`;
      const response = await fetch(url, {
        headers: { 'User-Agent': 'FiresideArchive/1.0 (mailto:admin@example.com)' },
      });
      if (!response.ok) return [];

      const data = await response.json();
      const items = data?.message?.items || [];

      return items.map((item: any) => {
        const author = item.author?.[0] || {};
        return {
          title: item.title?.[0] || 'Unknown Title',
          authors: (item.author || []).map((a: any) => ({
            lastName: a.family || a.name || '',
            initials: (a.given || '').split(' ').map((s: string) => s[0]).join('.') + '.',
          })),
          year: item.published?.['date-parts']?.[0]?.[0] || null,
          publisher: item.publisher || item['container-title']?.[0] || '',
          doi: item.DOI || '',
          url: item.URL || (item.DOI ? `https://doi.org/${item.DOI}` : ''),
          formattedCitation: '',
          confidence: 0.7,
          sourceUrl: item.URL || (item.DOI ? `https://doi.org/${item.DOI}` : ''),
          source: 'crossref',
        };
      });
    } catch {
      return [];
    }
  }

  private async tryGoogleBooksLookup(query: string): Promise<CitationCandidate[]> {
    try {
      const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=5`;
      const response = await fetch(url);
      if (!response.ok) return [];

      const data = await response.json();
      const items = data?.items || [];

      return items.map((item: any) => {
        const info = item.volumeInfo || {};
        return {
          title: info.title || 'Unknown Title',
          authors: (info.authors || []).map((name: string) => {
            const parts = name.split(', ');
            return {
              lastName: parts[0] || name,
              initials: parts[1] ? parts[1].split(' ').map((s: string) => s[0]).join('.') + '.' : '',
            };
          }),
          year: info.publishedDate ? parseInt(info.publishedDate) : null,
          publisher: info.publisher || '',
          doi: '',
          url: info.infoLink || '',
          formattedCitation: '',
          confidence: 0.6,
          sourceUrl: info.infoLink || '',
          source: 'google-books',
        };
      });
    } catch {
      return [];
    }
  }

  private async tryAISearch(partialInput: string, sourceTypeHint?: string): Promise<CitationCandidate | null> {
    const hint = sourceTypeHint ? ` (hint: source type may be ${sourceTypeHint})` : '';
    const prompt = `You are a citation search assistant. Given this partial reference, find the most likely source and return structured data.

Partial input: "${partialInput}"${hint}

Search the web or use your knowledge to identify the source. Return ONLY valid JSON:
{
  "title": "Full title",
  "authors": [{"lastName": "Smith", "initials": "J.M."}],
  "year": 2020,
  "publisher": "Publisher Name",
  "doi": "",
  "url": "",
  "formattedCitation": "Full formatted citation in appropriate format",
  "confidence": 0.8,
  "sourceUrl": "URL if known",
  "notes": "Any notes about the search"
}`;

    try {
      const response = await this.callAI(prompt, 'search');
      const parsed = JSON.parse(this.cleanJSON(response));
      return {
        title: parsed.title || 'Unknown',
        authors: parsed.authors || [],
        year: parsed.year || null,
        publisher: parsed.publisher || '',
        doi: parsed.doi || '',
        url: parsed.url || '',
        formattedCitation: parsed.formattedCitation || '',
        confidence: parsed.confidence || 0.3,
        sourceUrl: parsed.sourceUrl || '',
        source: 'deepseek',
      };
    } catch {
      return null;
    }
  }

  // ─── AI Provider Abstraction ────────────────────────────────────────────

  private async callAI(prompt: string, task: string): Promise<string> {
    const errors: string[] = [];

    for (const provider of this.providers) {
      try {
        console.log(`[ReferenceService] Trying ${provider.name} (${task})...`);
        const response = await this.callProvider(provider, prompt);
        if (response) return response;
      } catch (err) {
        const msg = `${provider.name} failed: ${err}`;
        console.warn(msg);
        errors.push(msg);
      }
    }

    // Last resort: local mock for development
    if (process.env.NODE_ENV === 'development') {
      console.warn('[ReferenceService] All providers failed. Using local mock.');
      return this.getMockResponse(task);
    }

    throw new Error(`All AI providers failed: ${errors.join('; ')}`);
  }

  private async callProvider(provider: AIProviderConfig, prompt: string): Promise<string | null> {
    if (provider.name === 'ollama') {
      return this.callOllama(provider, prompt);
    }
    // DeepSeek (OpenAI-compatible API)
    return this.callOpenAICompatible(provider, prompt);
  }

  private async callOpenAICompatible(provider: AIProviderConfig, prompt: string): Promise<string | null> {
    const response = await fetch(`${provider.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${provider.apiKey}`,
      },
      body: JSON.stringify({
        model: provider.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,  // Low temp for structured output
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`${provider.name} API error ${response.status}: ${text}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || null;
  }

  private async callOllama(provider: AIProviderConfig, prompt: string): Promise<string | null> {
    const response = await fetch(`${provider.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: provider.model,
        messages: [{ role: 'user', content: prompt }],
        stream: false,
        options: { temperature: 0.1 },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Ollama error ${response.status}: ${text}`);
    }

    const data = await response.json();
    return data.message?.content || null;
  }

  // ─── Response Parsing ───────────────────────────────────────────────────

  private parseAdvisoryResponse(response: string, rawInput: string): CitationAdvisory {
    try {
      const cleaned = this.cleanJSON(response);
      const parsed = JSON.parse(cleaned);

      return {
        detectedType: parsed.detectedType || this.detectSourceType(rawInput),
        recommendedFormat: parsed.recommendedFormat || 'apa-7',
        confidence: parsed.confidence ?? 0.5,
        formattedCitation: parsed.formattedCitation || '',
        alternativeFormats: parsed.alternativeFormats || [],
        warnings: parsed.warnings || [],
        rawAnalysis: parsed.rawAnalysis || '',
        structured: {
          sourceType: parsed.detectedType || this.detectSourceType(rawInput),
          citationFormat: parsed.recommendedFormat || 'apa-7',
          formattedAPA: parsed.formattedCitation || '',
          title: parsed.structured?.title,
          authors: parsed.structured?.authors,
          year: parsed.structured?.year,
          publisher: parsed.structured?.publisher,
          speaker: parsed.structured?.speaker,
          journal: parsed.structured?.journal,
          volume: parsed.structured?.volume,
          issue: parsed.structured?.issue,
          pages: parsed.structured?.pages,
          doi: parsed.structured?.doi,
          url: parsed.structured?.url,
          conceptualMeta: parsed.structured?.conceptualMeta,
        },
      };
    } catch {
      return {
        detectedType: this.detectSourceType(rawInput),
        recommendedFormat: 'apa-7',
        confidence: 0.3,
        formattedCitation: rawInput,
        warnings: ['Failed to parse AI response — using raw input'],
        rawAnalysis: 'Parse error',
        structured: {
          sourceType: this.detectSourceType(rawInput),
          citationFormat: 'apa-7',
          formattedAPA: rawInput,
        },
      };
    }
  }

  private advisoryToValidationResult(advisory: CitationAdvisory): ValidationResult {
    const hasContent = advisory.formattedCitation.length > 0;
    return {
      isValid: hasContent && advisory.confidence >= 0.3,
      formattedAPA: advisory.formattedCitation,
      structured: advisory.structured,
      errors: !hasContent ? ['No citation could be generated'] : [],
      warnings: advisory.warnings,
    };
  }

  // ─── Utilities ──────────────────────────────────────────────────────────

  private cleanJSON(text: string): string {
    let cleaned = text.trim();
    // Remove markdown code blocks
    if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
    else if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
    if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
    cleaned = cleaned.trim();

    // Handle newlines in strings (common AI mistake)
    try {
      JSON.parse(cleaned);
      return cleaned; // Already valid
    } catch {
      // Try to fix common issues
      cleaned = cleaned.replace(/\n/g, ' ');
      cleaned = cleaned.replace(/\s+/g, ' ');
      return cleaned;
    }
  }

  private getCitationFormat(sourceType: ReferenceEntity['sourceType']): ReferenceEntity['citationFormat'] {
    switch (sourceType) {
      case 'bahai-text': return 'bahai';
      case 'religious-scripture': return 'religious';
      case 'spiritual-concept':
      case 'oral-tradition': return 'descriptive';
      default: return 'apa-7';
    }
  }

  private detectSourceType(rawCitation: string): ReferenceEntity['sourceType'] {
    const lower = rawCitation.toLowerCase();

    if (lower.includes('kitab') || lower.includes('bahaullah') ||
        lower.includes('shoghi effendi') || lower.includes('bahai publishing')) {
      return 'bahai-text';
    }
    if (lower.includes('quran') || lower.includes('bible') ||
        lower.includes('genesis') || lower.includes('surah') || lower.includes('verse')) {
      return 'religious-scripture';
    }
    if (lower.includes('concept:') || lower.includes('principle:')) {
      return 'spiritual-concept';
    }
    if (lower.includes('documented by') || lower.includes('oral') ||
        lower.includes('gathering') || lower.includes('community teaching')) {
      return 'oral-tradition';
    }
    if (lower.includes('http')) return 'website';
    return 'book';
  }

  private getMockResponse(task: string): string {
    if (task === 'search') {
      return JSON.stringify({
        title: 'Sample Work (Mock)',
        authors: [{ lastName: 'Smith', initials: 'J.M.' }],
        year: 2020,
        publisher: 'Mock Publisher',
        formattedCitation: 'Smith, J. M. (2020). Sample work. Mock Publisher.',
        confidence: 0.5,
        sourceUrl: 'https://example.com',
        notes: 'Mock response — no actual API was called',
      });
    }

    return JSON.stringify({
      detectedType: 'book',
      recommendedFormat: 'apa-7',
      confidence: 0.9,
      formattedCitation: 'Smith, J. M. (2020). Community and justice. Oxford University Press.',
      alternativeFormats: [
        { format: 'chicago', label: 'Chicago Style', citation: 'Smith, J. M. 2020. Community and Justice. Oxford: Oxford University Press.' },
      ],
      warnings: ['Using mock validation — configure DeepSeek or Ollama for production'],
      rawAnalysis: 'Detected academic book, recommended APA 7th format.',
      structured: {
        title: 'Community and justice',
        authors: [{ lastName: 'Smith', initials: 'J.M.' }],
        year: 2020,
        publisher: 'Oxford University Press',
        speaker: null,
        journal: null,
        volume: null,
        issue: null,
        pages: null,
        doi: null,
        url: null,
        conceptualMeta: null,
      },
    });
  }
}

export const referenceService = new ReferenceService();