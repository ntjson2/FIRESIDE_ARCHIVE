import { Timestamp } from 'firebase/firestore';

export interface BaseEntity {
  id: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface SnippetTag {
  tagId: string;
  weight: number; // 1-100
  distance: number; // 1-10
}

export interface CitationAuthor {
  lastName: string;
  initials: string;
}

export interface ConceptualMetadata {
  relatedConcepts: string[];
  teachingContext: string;
  applicableTo: string[];
}

export interface LinkedItem {
  itemId: string;
  itemType: 'snippet' | 'deepening' | 'media';
}

export interface ReferenceEntity extends BaseEntity {
  // Core fields
  title: string;
  sourceType: 'book' | 'journal' | 'website' | 'other' | 'bahai-text' | 'religious-scripture' | 'spiritual-concept' | 'oral-tradition';
  citationFormat: 'apa-7' | 'chicago' | 'bahai' | 'religious' | 'descriptive' | 'custom';

  // Academic publication fields (optional)
  authors?: CitationAuthor[];
  year?: number;
  publisher?: string;
  journal?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  doi?: string;
  url?: string;
  accessDate?: Timestamp;

  // Bahai/Spiritual fields (optional)
  speaker?: string;
  date?: Timestamp;
  transcribedBy?: string;
  conceptualMeta?: ConceptualMetadata;

  // Formatted output & validation
  formattedAPA: string;
  validationStatus: 'pending' | 'valid' | 'invalid' | 'offline-check';
  validatedAt?: Timestamp;
  validationErrors?: string[];

  // Linking to snippets, deepenings, media
  linkedItems?: LinkedItem[];

  // Metadata
  createdBy: string;
}

export interface ContentReference {
  refId: string;
  page?: string;
  context?: string;
  relationshipType?: 'cites' | 'illustrates' | 'derived-from' | 'contradicts' | 'extends';
}

export interface ParallelRefCandidate {
  title: string;
  authors?: CitationAuthor[];
  year?: number;
  publisher?: string;
  url?: string;
  doi?: string;
  formattedCitation: string;
  relevanceScore: number;        // 0-1 how well it supports the same point
  relevanceExplanation: string;  // LLM's reasoning for the match
  sourceOfSuggestion: 'existing-library' | 'crossref' | 'google-books' | 'llm-knowledge';
}

export interface ParallelRefResult {
  urlAnalysis: {
    thesis: string;
    topics: string[];
    confidence: number;
  };
  candidates: ParallelRefCandidate[];
  existingLibraryMatches: ReferenceEntity[];
}

export interface TagEntity extends BaseEntity {
  name: string;
  count: number;
  mediaIds?: string[];
}

export interface FiresideFamily extends BaseEntity {
  uid: string;
  name: string;
  description: string;
}

export interface Fireside extends BaseEntity {
  firesideFamilyId: string;
  name: string;
  description: string;
  date: Timestamp;
}

export interface Snippet extends BaseEntity {
  firesideId: string;
  name: string;
  text: string; // Markdown
  naturalOrder: number;
  tags: SnippetTag[];
  references?: ContentReference[];
  visibility: 'public' | 'private';
}

export interface Deepening extends BaseEntity {
  snippetId: string;
  name: string;
  text: string; // Markdown
  tags: SnippetTag[];
  references?: ContentReference[];
  mediaIds?: string[];
}

export interface SupportingMaterial extends BaseEntity {
  sourceIds: string[]; // unique IDs
  sourceType: 'snippet' | 'deepening';
  text: string;
  mediaIds?: string[];
}

export interface Media extends BaseEntity {
  name: string;
  description: string;
  ipfsLink: string;
  size: number; // in bytes
  type: string; // MIME type e.g. "image/jpeg"
  dimensions?: string; // e.g. "1920x1080"
  references?: ContentReference[];
}

export interface Comment extends BaseEntity {
  sourceId: string;
  sourceType: 'snippet' | 'deepening';
  userId: string;
  text: string;
  mediaIds?: string[];
}

export interface OutlineItem {
  itemId: string;
  type: 'snippet' | 'deepening' | 'media';
  refId: string;
  isVisible: boolean;
  children?: OutlineItem[];
}

export interface Outline extends BaseEntity {
  userId: string;
  title: string;
  items: OutlineItem[];
  markdown?: string;
  isPublic: boolean;
}

// ─── PDF Integration Types ───────────────────────────────────────────────────

export type ChunkType = 'text' | 'image' | 'heading';

export interface ParsedChunk {
  localId: string;
  type: ChunkType;
  order: number;
  pageNumber: number;
  content: string;
  imageUrl?: string;
  imageBase64?: string;
  firebaseStoragePath?: string;
  notes: string;
  action: 'keep' | 'delete' | 'deepening' | 'skip';
  editedContent?: string;
  references?: ContentReference[];
  marks: { type: string; note: string }[];
  originalContent?: string;
  scanVersion: number;
  scanHistory: { content: string; type: ChunkType; timestamp: number }[];
}

export interface FiresideBatch {
  firesideName: string;
  firesideIndex: number;
  chunks: ParsedChunk[];
  status: 'pending' | 'approved' | 'skipped';
  targetFamilyId?: string;
}

// ─── Fireside Integration Pipeline Types ──────────────────────────────────────

export type SnippetStatus =
  | 'IN-REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'MERGED'
  | 'DEEPENING'
  | 'UNDER-RESEARCH';

export type UniversalFiresideCategory =
  | 'Why Life'
  | 'The Proofs for Jesus Christ'
  | 'The Proofs for BahaUllah'
  | 'The Covenant'
  | 'The Proofs for the Establisher'
  | 'The Great Pyramid of Giza'
  | 'The Lambs Explanations and Commentaries on The Book of Revelations'
  | 'UNCATEGORIZED';

export const UNIVERSAL_FIRESIDE_CATEGORIES: UniversalFiresideCategory[] = [
  'Why Life',
  'The Proofs for Jesus Christ',
  'The Proofs for BahaUllah',
  'The Covenant',
  'The Proofs for the Establisher',
  'The Great Pyramid of Giza',
  'The Lambs Explanations and Commentaries on The Book of Revelations',
];

export type AnnotationType = 'grammar' | 'unclear-word' | 'ocr-artifact' | 'double-column-mix' | 'other';

export interface IntegratedSnippet {
  localId: string;
  text: string;
  order: number;
  status: SnippetStatus;
  category: UniversalFiresideCategory;
  categoryConfidence: number;
  isTransitionBoundary: boolean;
  transitionConfidence?: number;
  pageNumber: number;
  sourcePdf: string;
  annotation?: string;
  annotationType?: AnnotationType;
}

export interface IntegratedImage {
  localId: string;
  cropBounds: { x: number; y: number; width: number; height: number };
  fullPageImageUrl: string;
  croppedImageUrl?: string;
  firebaseStoragePath: string;
  geminiLabel: string;
  pageNumber: number;
  sourcePdf: string;
  order: number;
  status: SnippetStatus;
  category: UniversalFiresideCategory;
  categoryConfidence: number;
  annotation?: string;
}

export interface TransitionEntry {
  firesideNumber: number;
  category: UniversalFiresideCategory;
  pdfFilename: string;
  pageNumber: number;
}

export interface PDFProcessingPlan {
  category: UniversalFiresideCategory;
  pdfFilename: string;
  startPage: number;
  endPage: number; // computed: start of next fireside - 1, or last page of PDF chain
}

export interface IntegrationJob extends BaseEntity {
  guideFilePath: string;
  familyId: string;
  familyName: string;
  pdfFiles: string[];
  transitions: TransitionEntry[];
  processingPlan: PDFProcessingPlan[];
  uploadedBy: string;
  processedBy: string;
  status: 'PENDING' | 'PROCESSING' | 'IN-REVIEW' | 'COMPLETE' | 'ERROR';
  currentPlanIndex: number;
  currentPage: number;
  totalPages: number;
  categoryResults: {
    [category: string]: {
      snippets: IntegratedSnippet[];
      images: IntegratedImage[];
    }
  };
  logEntries: { timestamp: Timestamp; level: 'info' | 'warning' | 'error'; message: string }[];
  errorAt?: { planIndex: number; page: number; step: string; message: string };
}
