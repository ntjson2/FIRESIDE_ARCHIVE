import { FiresideFamily } from '@/types';
import { BaseFactory } from './BaseFactory';

export class FiresideFamilyFactory extends BaseFactory<FiresideFamily> {
  create(data: Partial<FiresideFamily>): Omit<FiresideFamily, 'id' | 'createdAt' | 'updatedAt'> {
    this.validateRequired(data, ['uid', 'name', 'description']);
    
    return {
      uid: data.uid!,
      name: data.name!,
      description: data.description!
    };
  }
}
