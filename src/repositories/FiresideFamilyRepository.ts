import { FiresideFamily } from '@/types';
import { BaseRepository } from './BaseRepository';

export class FiresideFamilyRepository extends BaseRepository<FiresideFamily> {
  protected collectionName = 'firesideFamily';

  async findByUserId(uid: string): Promise<FiresideFamily[]> {
    return this.findWhere('uid', '==', uid);
  }
}

export const firesideFamilyRepository = new FiresideFamilyRepository();
