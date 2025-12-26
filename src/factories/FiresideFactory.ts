import { Fireside } from '@/types';
import { BaseFactory } from './BaseFactory';
import { Timestamp } from 'firebase/firestore';

export class FiresideFactory extends BaseFactory<Fireside> {
  create(data: Partial<Fireside>): Omit<Fireside, 'id' | 'createdAt' | 'updatedAt'> {
    this.validateRequired(data, ['firesideFamilyId', 'name', 'description', 'date']);
    
    return {
      firesideFamilyId: data.firesideFamilyId!,
      name: data.name!,
      description: data.description!,
      date: data.date || Timestamp.now()
    };
  }
}
