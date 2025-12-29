import { Deepening } from '@/types';
import { BaseFactory } from './BaseFactory';

export class DeepeningFactory extends BaseFactory<Deepening> {
  create(data: Partial<Deepening>): Omit<Deepening, 'id' | 'createdAt' | 'updatedAt'> {
    this.validateRequired(data, ['snippetId', 'name', 'text']);
    
    return {
      snippetId: data.snippetId!,
      name: data.name!,
      text: data.text!,
      tags: data.tags || [],
      mediaIds: data.mediaIds || []
    };
  }
}
