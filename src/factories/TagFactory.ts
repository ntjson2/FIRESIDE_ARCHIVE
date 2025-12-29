import { TagEntity } from '@/types';
import { BaseFactory } from './BaseFactory';

export class TagFactory extends BaseFactory<TagEntity> {
  create(data: Partial<TagEntity>): Omit<TagEntity, 'id' | 'createdAt' | 'updatedAt'> {
    this.validateRequired(data, ['name']);
    
    return {
      name: data.name!,
      count: data.count || 0,
      mediaIds: data.mediaIds || []
    };
  }
}
