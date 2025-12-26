import { Media } from '@/types';
import { BaseRepository } from './BaseRepository';

export class MediaRepository extends BaseRepository<Media> {
  protected collectionName = 'media';

  async findByIds(ids: string[]): Promise<Media[]> {
    if (ids.length === 0) return [];
    
    const mediaItems = await Promise.all(
      ids.map(id => this.findById(id))
    );
    
    return mediaItems.filter((item): item is Media => item !== null);
  }
}

export const mediaRepository = new MediaRepository();
