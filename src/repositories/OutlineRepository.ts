import { Outline } from '@/types';
import { BaseRepository } from './BaseRepository';

export class OutlineRepository extends BaseRepository<Outline> {
  protected collectionName = 'outline';

  async findByUserId(userId: string): Promise<Outline[]> {
    return this.findWhere('userId', '==', userId);
  }

  async findPublicOutlines(): Promise<Outline[]> {
    return this.findWhere('isPublic', '==', true);
  }
}

export const outlineRepository = new OutlineRepository();
