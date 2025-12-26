import { Fireside } from '@/types';
import { BaseRepository } from './BaseRepository';
import { orderBy } from 'firebase/firestore';

export class FiresideRepository extends BaseRepository<Fireside> {
  protected collectionName = 'fireside';

  async findByFamilyId(firesideFamilyId: string): Promise<Fireside[]> {
    return this.findWhere('firesideFamilyId', '==', firesideFamilyId);
  }

  async findAllOrdered(): Promise<Fireside[]> {
    return this.findAll([orderBy('date', 'desc')]);
  }
}

export const firesideRepository = new FiresideRepository();
