import { Snippet } from '@/types';
import { BaseRepository } from './BaseRepository';
import { orderBy } from 'firebase/firestore';

export class SnippetRepository extends BaseRepository<Snippet> {
  protected collectionName = 'snippet';

  async findByFiresideId(firesideId: string): Promise<Snippet[]> {
    return this.findAll([
      orderBy('naturalOrder', 'asc')
    ]).then(snippets => 
      snippets.filter(s => s.firesideId === firesideId)
    );
  }

  async findPublicByFiresideId(firesideId: string): Promise<Snippet[]> {
    const snippets = await this.findByFiresideId(firesideId);
    return snippets.filter(s => s.visibility === 'public');
  }
}

export const snippetRepository = new SnippetRepository();
