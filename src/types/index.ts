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

export interface Fireside extends BaseEntity {
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
}

export interface SupportingMaterial extends BaseEntity {
  sourceId: string;
  sourceType: 'snippet' | 'deepening';
  text: string;
}

export interface Comment extends BaseEntity {
  sourceId: string;
  sourceType: 'snippet' | 'deepening';
  userId: string;
  text: string;
}

export interface OutlineItem {
  itemId: string;
  type: 'snippet' | 'deepening';
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
