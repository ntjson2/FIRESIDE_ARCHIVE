import { Deepening } from '@/types';
import { BaseRepository } from './BaseRepository';

export class DeepeningRepository extends BaseRepository<Deepening> {
  protected collectionName = 'deepening';

  async findBySnippetId(snippetId: string): Promise<Deepening[]> {
    return this.findWhere('snippetId', '==', snippetId);
  }
}

export const deepeningRepository = new DeepeningRepository();
