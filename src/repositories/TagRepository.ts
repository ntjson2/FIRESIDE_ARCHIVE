import { TagEntity } from '@/types';
import { BaseRepository } from './BaseRepository';

export class TagRepository extends BaseRepository<TagEntity> {
  protected collectionName = 'tag';

  async findByName(name: string): Promise<TagEntity | null> {
    const results = await this.findWhere('name', '==', name);
    return results.length > 0 ? results[0] : null;
  }

  async incrementCount(tagId: string): Promise<void> {
    try {
      const tag = await this.findById(tagId);
      if (tag) {
        await this.update(tagId, { count: tag.count + 1 });
      }
    } catch (error) {
      console.error('Error incrementing tag count:', error);
    }
  }

  async decrementCount(tagId: string): Promise<void> {
    try {
      const tag = await this.findById(tagId);
      if (tag && tag.count > 0) {
        await this.update(tagId, { count: tag.count - 1 });
      }
    } catch (error) {
      console.error('Error decrementing tag count:', error);
    }
  }
}
