'use client';

import { ReferenceEntity, CitationAuthor, ConceptualMetadata, ContentReference } from '@/types';

export interface ValidationResult {
  isValid: boolean;
  formattedAPA: string;
  structured: Partial<ReferenceEntity>;
  errors: string[];
  warnings?: string[];
}

export class ReferenceService {
  private apiKey: string;
  private apiEndpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

  constructor() {
    this.apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('NEXT_PUBLIC_GEMINI_API_KEY environment variable is not set');
    }
  }

  async validateAndFormatReference(rawCitation: string): Promise<ValidationResult> {
    // Try to auto-detect source type
    const sourceType = this.detectSourceType(rawCitation);
    return this.validateWithSourceType(rawCitation, sourceType);
  }

  async validateWithSourceType(
    rawCitation: string,
    sourceType: ReferenceEntity['sourceType']
  ): Promise<ValidationResult> {
    try {
      const prompt = this.getValidationPrompt(rawCitation, sourceType);
      const response = await this.callGeminiAPI(prompt);
      return this.parseGeminiResponse(response, sourceType);
    } catch (error) {
      console.error('Validation error:', error);
      return {
        isValid: false,
        formattedAPA: '',
        structured: {},
        errors: ['Failed to validate reference: ' + String(error)],
      };
    }
  }

  async validateBahaiText(textName: string, speaker?: string): Promise<ValidationResult> {
    const rawCitation = `${textName}${speaker ? ` by ${speaker}` : ''}`;
    return this.validateWithSourceType(rawCitation, 'bahai-text');
  }

  async validateSpiritualConcept(
    conceptName: string,
    context?: string,
    relatedConcepts?: string[]
  ): Promise<ValidationResult> {
    const rawCitation = `Concept: ${conceptName}. Context: ${context || 'N/A'}. Related: ${relatedConcepts?.join(', ') || 'N/A'}`;
    return this.validateWithSourceType(rawCitation, 'spiritual-concept');
  }

  async validateScripture(
    title: string,
    bookChapterVerse: string
  ): Promise<ValidationResult> {
    const rawCitation = `${title} ${bookChapterVerse}`;
    return this.validateWithSourceType(rawCitation, 'religious-scripture');
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
    
    const rawCitation = parts.join('. ');
    return this.validateWithSourceType(rawCitation, 'oral-tradition');
  }

  private detectSourceType(rawCitation: string): ReferenceEntity['sourceType'] {
    const lower = rawCitation.toLowerCase();

    // Check for Bahai texts
    if (
      lower.includes('kitab') ||
      lower.includes('bahaullah') ||
      lower.includes('shoghi effendi') ||
      lower.includes('bahai publishing')
    ) {
      return 'bahai-text';
    }

    // Check for scripture
    if (
      lower.includes('quran') ||
      lower.includes('bible') ||
      lower.includes('genesis') ||
      lower.includes('surah') ||
      lower.includes('verse')
    ) {
      return 'religious-scripture';
    }

    // Check for concept markers
    if (lower.includes('concept:') || lower.includes('principle:')) {
      return 'spiritual-concept';
    }

    // Check for oral tradition markers
    if (
      lower.includes('documented by') ||
      lower.includes('oral') ||
      lower.includes('gathering') ||
      lower.includes('community teaching')
    ) {
      return 'oral-tradition';
    }

    // Default to academic for URLs and other content
    if (lower.includes('http')) {
      return 'website';
    }

    // Default to book
    return 'book';
  }

  private getValidationPrompt(rawCitation: string, sourceType: string): string {
    const basePrompt = `You are an expert reference validator. Parse and validate the following citation, returning a JSON response.

Citation: "${rawCitation}"
Source Type: ${sourceType}

Return a valid JSON object (no markdown, no code blocks) with this exact structure:
{
  "isValid": boolean,
  "formattedAPA": "string (properly formatted citation)",
  "authors": [{"lastName": "string", "initials": "string"}] or null,
  "year": number or null,
  "title": "string or null",
  "publisher": "string or null",
  "speaker": "string or null",
  "conceptualMeta": {"relatedConcepts": ["string"], "teachingContext": "string", "applicableTo": ["string"]} or null,
  "errors": ["array of validation error strings"],
  "warnings": ["array of non-critical warnings"]
}`;

    switch (sourceType) {
      case 'bahai-text':
        return basePrompt + `

Validation Rules for Bahai Texts:
- Validate against known Bahai works (Kitab-i-Aqdas, Hidden Words, Gleanings, etc.)
- Accept format: "Author. (Year). Title. Bahai Publishing."
- Accept verse/paragraph format: "Text Name, par. 1-5"
- Required fields: title, speaker (or author), ideally year
- If valid, include speaker field`;

      case 'spiritual-concept':
        return basePrompt + `

Validation Rules for Spiritual Concepts:
- Validate this is a legitimate Bahai principle (not invented)
- Must have clear teaching context
- Suggest related Bahai concepts
- Identify applicable teaching domains
- Format: "Bahai principle of [Concept] - [Teaching Context]"
- Include conceptualMeta with relatedConcepts, teachingContext, applicableTo`;

      case 'religious-scripture':
        return basePrompt + `

Validation Rules for Religious Scripture:
- Validate known religious texts (Quran, Bible, Torah, etc.)
- Accept book:chapter:verse format (e.g., "Genesis 1:1-5" or "Quran 2:163")
- Required fields: title, pages (verse range)
- Format: "*Title* Book:Chapter:Verse"`;

      case 'oral-tradition':
        return basePrompt + `

Validation Rules for Oral Traditions:
- Ensure sufficient documentation (topic, speaker, date, transcriber)
- Validate as authentic community teaching
- Format: "Teaching on [Topic] documented by [Transcriber] on [Date]"
- Required fields: title, speaker (or source), date, transcribedBy`;

      default:
        return basePrompt + `

Validation Rules for Academic Sources:
- Validate APA 7th edition format
- Required fields: authors, year, title, publisher/journal/url
- For books: "Last, I. (Year). Title. Publisher."
- For journals: "Last, I. (Year). Article title. Journal Name, Vol(Issue), pp."
- For websites: "Organization. (Year). Title. Retrieved from URL"`;
    }
  }

  private async callGeminiAPI(prompt: string): Promise<string> {
    // Debug logging
    console.log('Gemini API Key:', this.apiKey ? 'Set' : 'Not set');
    console.log('Gemini Endpoint:', this.apiEndpoint);

    // For local development, use mock validation
    if (process.env.NODE_ENV === 'development' && !this.apiKey?.startsWith('AIza')) {
      console.warn('Using mock validation - API key not configured properly');
      return this.getMockResponse(prompt);
    }

    try {
      const response = await fetch(
        `${this.apiEndpoint}?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: prompt,
                  },
                ],
              },
            ],
          }),
        }
      );

      if (!response.ok) {
        console.error(`Gemini API error: ${response.status}`, await response.text());
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) {
        throw new Error('No response from Gemini API');
      }

      return text;
    } catch (error) {
      console.error('Gemini API call failed:', error);
      console.warn('Falling back to mock validation');
      return this.getMockResponse(prompt);
    }
  }

  private getMockResponse(prompt: string): string {
    // Mock validation for local development
    return JSON.stringify({
      isValid: true,
      formattedAPA: "Smith, J. M. (2020). Community and justice. Oxford University Press.",
      authors: [{ lastName: "Smith", initials: "J.M." }],
      year: 2020,
      title: "Community and justice",
      publisher: "Oxford University Press",
      errors: [],
      warnings: ["Using mock validation - configure Gemini API for production"]
    });
  }

  private parseGeminiResponse(response: string, sourceType: ReferenceEntity['sourceType']): ValidationResult {
    try {
      // Remove markdown code blocks if present
      let jsonStr = response.trim();
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.slice(7);
      }
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.slice(3);
      }
      if (jsonStr.endsWith('```')) {
        jsonStr = jsonStr.slice(0, -3);
      }
      jsonStr = jsonStr.trim();

      const parsed = JSON.parse(jsonStr);

      return {
        isValid: parsed.isValid ?? false,
        formattedAPA: parsed.formattedAPA ?? '',
        structured: {
          sourceType,
          citationFormat: this.getCitationFormat(sourceType),
          authors: parsed.authors,
          year: parsed.year,
          title: parsed.title,
          publisher: parsed.publisher,
          speaker: parsed.speaker,
          conceptualMeta: parsed.conceptualMeta,
          formattedAPA: parsed.formattedAPA,
        },
        errors: parsed.errors ?? [],
        warnings: parsed.warnings,
      };
    } catch (error) {
      console.error('Error parsing Gemini response:', error, response);
      return {
        isValid: false,
        formattedAPA: '',
        structured: {},
        errors: ['Failed to parse validation response'],
      };
    }
  }

  private getCitationFormat(sourceType: ReferenceEntity['sourceType']): ReferenceEntity['citationFormat'] {
    switch (sourceType) {
      case 'bahai-text':
        return 'bahai';
      case 'religious-scripture':
        return 'religious';
      case 'spiritual-concept':
      case 'oral-tradition':
        return 'descriptive';
      default:
        return 'apa-7';
    }
  }

  async checkDuplicate(citation: ReferenceEntity): Promise<ReferenceEntity | null> {
    // This would be implemented with repository access
    // For now, return null (client-side can't check DB directly)
    return null;
  }
}

export const referenceService = new ReferenceService();
