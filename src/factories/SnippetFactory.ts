import { Snippet } from '@/types';
import { BaseFactory } from './BaseFactory';

export class SnippetFactory extends BaseFactory<Snippet> {
  create(data: Partial<Snippet>): Omit<Snippet, 'id' | 'createdAt' | 'updatedAt'> {
    this.validateRequired(data, ['firesideId', 'name', 'text', 'naturalOrder']);
    
    return {
      firesideId: data.firesideId!,
      name: data.name!,
      text: data.text!,
      naturalOrder: data.naturalOrder!,
      tags: data.tags || [],
      visibility: data.visibility || 'public'
    };
  }
}
