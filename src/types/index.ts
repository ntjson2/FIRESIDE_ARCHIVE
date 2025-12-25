import { Timestamp } from 'firebase/firestore';

export interface BaseEntity {
  id: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface Tag {
  tagId: string;
  name: string;
  weight: number; // 1-100
  distance: number; // 1-10
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
  tags: Tag[];
  visibility: 'public' | 'private';
}

export interface Deepening extends BaseEntity {
  snippetId: string;
  name: string;
  text: string; // Markdown
  tags: Tag[];
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
