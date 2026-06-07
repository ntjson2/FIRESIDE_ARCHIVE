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
  citationFormat: 'apa-7' | 'bahai' | 'religious' | 'descriptive' | 'custom';

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
