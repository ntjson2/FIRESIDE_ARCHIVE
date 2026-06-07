export { BaseRepository } from './BaseRepository';
export { FiresideFamilyRepository, firesideFamilyRepository } from './FiresideFamilyRepository';
export { FiresideRepository, firesideRepository } from './FiresideRepository';
export { SnippetRepository, snippetRepository } from './SnippetRepository';
export { DeepeningRepository, deepeningRepository } from './DeepeningRepository';
export { OutlineRepository, outlineRepository } from './OutlineRepository';
export { MediaRepository, mediaRepository } from './MediaRepository';
export { ReferenceRepository, referenceRepository } from './ReferenceRepository';

// TagRepository must be imported first, then instantiated
import { TagRepository as TagRepositoryClass } from './TagRepository';
export { TagRepositoryClass as TagRepository };
export const tagRepository = new TagRepositoryClass();
