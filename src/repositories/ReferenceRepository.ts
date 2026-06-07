import { ReferenceEntity } from '@/types';
import { BaseRepository } from './BaseRepository';
import { query, where, orderBy } from 'firebase/firestore';

export class ReferenceRepository extends BaseRepository<ReferenceEntity> {
  protected collectionName = 'references';

  async findByAuthorAndYear(lastName: string, year: number): Promise<ReferenceEntity[]> {
    try {
      const allReferences = await this.findAll();
      return allReferences.filter(ref => {
        const hasAuthor = ref.authors?.some(author => author.lastName.toLowerCase() === lastName.toLowerCase());
        return hasAuthor && ref.year === year;
      });
    } catch (error) {
      console.error('Error finding reference by author and year:', error);
      return [];
    }
  }

  async findByDoi(doi: string): Promise<ReferenceEntity | null> {
    try {
      const results = await this.findWhere('doi', '==', doi);
      return results.length > 0 ? results[0] : null;
    } catch (error) {
      console.error('Error finding reference by DOI:', error);
      return null;
    }
  }

  async findByFormattedAPA(formatted: string): Promise<ReferenceEntity | null> {
    try {
      const allReferences = await this.findAll();
      return allReferences.find(ref => ref.formattedAPA === formatted) || null;
    } catch (error) {
      console.error('Error finding reference by formatted APA:', error);
      return null;
    }
  }

  async findAllWithStatus(status: 'valid' | 'invalid' | 'pending' | 'offline-check'): Promise<ReferenceEntity[]> {
    try {
      return await this.findWhere('validationStatus', '==', status);
    } catch (error) {
      console.error('Error finding references by status:', error);
      return [];
    }
  }

  async findBySourceType(sourceType: string): Promise<ReferenceEntity[]> {
    try {
      return await this.findWhere('sourceType', '==', sourceType);
    } catch (error) {
      console.error('Error finding references by source type:', error);
      return [];
    }
  }

  async findBahaiTexts(): Promise<ReferenceEntity[]> {
    try {
      return await this.findBySourceType('bahai-text');
    } catch (error) {
      console.error('Error finding Bahai texts:', error);
      return [];
    }
  }

  async findSpiritualConcepts(): Promise<ReferenceEntity[]> {
    try {
      return await this.findBySourceType('spiritual-concept');
    } catch (error) {
      console.error('Error finding spiritual concepts:', error);
      return [];
    }
  }

  async findByRelatedConcept(concept: string): Promise<ReferenceEntity[]> {
    try {
      const allReferences = await this.findAll();
      return allReferences.filter(ref => 
        ref.conceptualMeta?.relatedConcepts?.some(c => c.toLowerCase() === concept.toLowerCase())
      );
    } catch (error) {
      console.error('Error finding references by related concept:', error);
      return [];
    }
  }

  async findByReligiousText(title: string): Promise<ReferenceEntity[]> {
    try {
      const allReferences = await this.findBySourceType('religious-scripture');
      return allReferences.filter(ref => 
        ref.title.toLowerCase().includes(title.toLowerCase())
      );
    } catch (error) {
      console.error('Error finding references by religious text:', error);
      return [];
    }
  }

  async updateValidationStatus(
    id: string, 
    status: 'valid' | 'invalid' | 'pending' | 'offline-check',
    errors?: string[]
  ): Promise<void> {
    try {
      const updateData: any = {
        validationStatus: status,
      };
      if (errors) {
        updateData.validationErrors = errors;
      }
      await this.update(id, updateData);
    } catch (error) {
      console.error('Error updating validation status:', error);
      throw error;
    }
  }

  async findBySpeaker(speaker: string): Promise<ReferenceEntity[]> {
    try {
      const allReferences = await this.findAll();
      return allReferences.filter(ref => 
        ref.speaker?.toLowerCase().includes(speaker.toLowerCase())
      );
    } catch (error) {
      console.error('Error finding references by speaker:', error);
      return [];
    }
  }

  async findOralTraditions(): Promise<ReferenceEntity[]> {
    try {
      return await this.findBySourceType('oral-tradition');
    } catch (error) {
      console.error('Error finding oral traditions:', error);
      return [];
    }
  }

  async findByTitle(title: string): Promise<ReferenceEntity[]> {
    try {
      const allReferences = await this.findAll();
      return allReferences.filter(ref => 
        ref.title.toLowerCase().includes(title.toLowerCase())
      );
    } catch (error) {
      console.error('Error finding references by title:', error);
      return [];
    }
  }
}

export const referenceRepository = new ReferenceRepository();
