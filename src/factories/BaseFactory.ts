import { BaseEntity } from '@/types';
import { Timestamp } from 'firebase/firestore';

export abstract class BaseFactory<T extends BaseEntity> {
  abstract create(data: Partial<T>): Omit<T, 'id' | 'createdAt' | 'updatedAt'>;
  
  protected addTimestamps(data: any): any {
    const now = Timestamp.now();
    return {
      ...data,
      createdAt: now,
      updatedAt: now
    };
  }

  protected validateRequired(data: any, fields: string[]): void {
    const missing = fields.filter(field => !data[field]);
    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }
  }
}
