// Legacy service - use repositories from @/repositories instead
// This file is kept for backward compatibility during migration

import { 
  firesideFamilyRepository,
  firesideRepository,
  snippetRepository,
  deepeningRepository,
  outlineRepository,
  mediaRepository
} from '@/repositories';

// Re-export repositories as services for backward compatibility
export const firesideFamilyService = firesideFamilyRepository;
export const firesideService = firesideRepository;
export const snippetService = snippetRepository;
export const deepeningService = deepeningRepository;
export const mediaService = mediaRepository;
export const outlineService = outlineRepository;

// Note: New code should import directly from @/repositories
