import { IntegrationJob } from '@/types';
import { BaseRepository } from './BaseRepository';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export class IntegrationJobRepository extends BaseRepository<IntegrationJob> {
  protected collectionName = 'integrationJobs';

  async findLatestPending(): Promise<IntegrationJob | null> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('status', 'in', ['PENDING', 'PROCESSING', 'IN-REVIEW']),
        orderBy('createdAt', 'desc'),
        limit(1)
      );
      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;
      return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as IntegrationJob;
    } catch (error) {
      console.error('Error fetching latest pending integration job:', error);
      return null;
    }
  }

  async findByUploader(userId: string): Promise<IntegrationJob[]> {
    return this.findWhere('uploadedBy', '==', userId);
  }
}

export const integrationJobRepository = new IntegrationJobRepository();