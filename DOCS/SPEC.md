# Fireside Archive - Project Specification

## 1. Project Overview
A web-based and locally mirrorable system for collecting, searching, composing, and exporting short-form BUPC (Bahá'í) fireside deepenings. Content is stored as atomic snippets and assembled into teaching outlines. The system integrates a self-hosted, open-source AI for semantic search, suggestion, and outline assistance.

**Core Philosophy**: Markdown-first, Atomic Content, Offline-Mirrorable, AI-Augmented (not dependent).

**Primary Goals**:
- Fast retrieval of short authoritative deepenings
- Easy composition of outlines for teaching and reference
- Clean export to PDF / Markdown
- Privacy-respecting AI assistance
- Simple mirroring for local or LAN-only use

## 2. Core Design Principles
- **Markdown-first** content model
- **Atomic snippets, composable outlines**
- **Offline-capable / mirrorable** architecture
- **No vendor lock-in** for content
- **AI-augmented, not AI-dependent**

## 3. Tech Stack
- **Frontend Framework**: Next.js 15 (App Router) with TypeScript
- **Styling**: Tailwind CSS
- **Database**: Firebase Firestore (NoSQL)
- **Authentication**: Firebase Authentication
- **State Management**: Zustand (for Outline editor state)
- **Editor**: Tiptap (WYSIWYG serialization to Markdown)
- **Drag & Drop**: dnd-kit (Recommended for accessibility/performance)
- **Export Engine**: Puppeteer (Server-side PDF generation) or Client-side fallback
- **AI Integration**: DeepSeek v4 (primary cloud AI, OpenAI-compatible API), Ollama (local fallback with Llama 3 / Mistral 7B)
- **Online Reference Lookup**: Crossref API (academic), Google Books API (free, no API key)
- **AI Provider Fallback Chain**: DeepSeek → Ollama → Local offline mock

## 4. AI Strategy (Specialist & Local-First)
**Goal**: Create a "BUPC Specialist" AI that is free, open-source, and runs locally.

### The Stack
- **Base Model**: **Llama 3 (8B)** or **Mistral 7B**
  - *Why*: "Sweet spot" for performance vs. hardware requirements (runs on consumer laptops)
- **Engine**: **Ollama**
  - *Role*: The local runtime to execute the model on Windows/Mac/Linux
- **Training**: **Fine-Tuning with QLoRA**
  - *Method*: Train the base model on the specific vocabulary, tone, and concepts of the archive
  - *Artifact*: A lightweight "adapter" file distributed to users
- **Retrieval**: **RAG (Retrieval Augmented Generation)**
  - *Method*: Connect the AI to the Firestore/Vector database to fetch exact citations
  - *Benefit*: Prevents hallucinations by grounding answers in the actual text

### AI Capabilities
- Semantic snippet discovery
- Suggested snippet groupings
- Optional outline suggestions
- AI never overwrites source text
- AI outputs references, not doctrine
- Fully optional layer

### AI Provider Fallback Chain
The service uses a priority-based provider chain:
1. **DeepSeek v4** (primary cloud AI) — OpenAI-compatible API, fast and cost-effective
2. **Ollama** (local fallback) — Llama 3 / Mistral 7B running on `localhost:11434`
3. **Local offline mock** (development only) — regex-based validation fallback

### Deployment Phases
- **Phase 1 (Cloud Prototype)**: Use DeepSeek v4 API (OpenAI-compatible) to build the UI, advisory pipeline, and RAG logic. Environment variable: `NEXT_PUBLIC_DEEPSEEK_API_KEY`.
- **Phase 2 (Local Transition)**:
  - Train the QLoRA adapter on the dataset
  - Create a custom Ollama Modelfile
  - Switch the Next.js app to talk to `localhost:11434` (Ollama) instead of DeepSeek API
  - Fall back to Ollama automatically when DeepSeek is unavailable

## 5. User Roles & Permissions
- **SuperAdmin**: Full system access, user management, schema changes.
- **Admin**: Content management (CRUD on Snippets, Deepenings, Firesides, Tags, Media, References), manage citations, view logs.
- **Participant**: View content, create personal outlines, add comments (if enabled).
- **Guest**: Read-only access to public content.

### Permission Matrix
| Action | SuperAdmin | Admin | Participant | Guest |
|--------|-----------|-------|-------------|-------|
| Create/Edit/Delete Snippets | ✓ | ✓ | ✗ | ✗ |
| Create/Edit/Delete Deepenings | ✓ | ✓ | ✗ | ✗ |
| Create/Edit/Delete Firesides | ✓ | ✓ | ✗ | ✗ |
| Create/Edit/Delete Tags | ✓ | ✓ | ✗ | ✗ |
| Create/Edit/Delete References | ✓ | ✓ | ✗ | ✗ |
| Link References to Content | ✓ | ✓ | ✗ | ✗ |
| Create/Edit Personal Outlines | ✓ | ✓ | ✓ | ✗ |
| View Public Content | ✓ | ✓ | ✓ | ✓ |
| View References (read-only) | ✓ | ✓ | ✓ | ✓ |
| User Management | ✓ | ✗ | ✗ | ✗ |

## 6. Data Model (Firestore Schema)

### `user` Collection
- `uid` (string): Firebase Auth ID
- `email` (string)
- `displayName` (string)
- `role` (string): "SuperAdmin" | "Admin" | "Participant" | "Guest"
- `createdAt` (timestamp)
- `lastLogin` (timestamp)

### `firesideFamily` Collection
- `uid` (string): Unique ID
- `name` (string): e.g., "General Firesides"
- `description` (string)

### `fireside` Collection
- `id` (string): Auto-generated
- `firesideFamilyId` (string): Reference to `firesideFamily` doc
- `name` (string): e.g., "Why Life"
- `description` (string): e.g., "The purpose of life..."
- `date` (timestamp)
- `createdAt` (timestamp)

### `snippet` Collection
- `id` (string): Auto-generated
- `firesideId` (string): Reference to `fireside` doc
- `name` (string): Short name (up to 72 words)
- `text` (string): Main content
- `naturalOrder` (number): e.g., 2.30 (Rank in original fireside)
- `tags` (array of objects): 
  - `[{ tagId: string, name: string, weight: number (1-100), distance: number (1-10) }]`
- `references` (array of objects): Optional citations and sources
  - `[{ refId: string, page?: string, context?: string, relationshipType?: string }]`
  - `refId`: Reference to `references` collection doc
  - `page`: Optional page/verse range
    - Academic: "45-47", "120"
    - Bahai text: "par. 1-3", "paragraph 5"
    - Scripture: "2:163" (Surah:Verse), "Genesis 1:1-5"
  - `context`: Optional description of how reference is used
  - `relationshipType`: How this content relates to the reference

### `deepening` Collection
- `id` (string): Auto-generated
- `snippetId` (string): Reference to parent `snippet` doc
- `name` (string)
- `text` (string): Extended research text
- `tags` (array of objects): Same structure as Snippets
- `mediaIds` (array of strings): Optional references to `media` docs
- `references` (array of objects): Optional citations and sources
  - `[{ refId: string, page?: string, context?: string, relationshipType?: string }]`
  - `refId`: Reference to `references` collection doc
  - `page`: Optional page/verse range
    - Academic: "45-47", "120"
    - Bahai text: "par. 1-3", "paragraph 5"
    - Scripture: "2:163" (Surah:Verse), "Genesis 1:1-5"
  - `context`: Optional description of how reference is used
  - `relationshipType`: How this content relates to the reference

### `supportingMaterial` Collection
- `id` (string): Auto-generated
- `sourceIds` (array of strings): IDs of the Snippets or Deepenings (unique)
- `sourceType` (string): "snippet" | "deepening"
- `text` (string): Reference text
- `mediaIds` (array of strings): Optional references to `media` docs

### `comment` Collection
- `id` (string): Auto-generated
- `sourceId` (string): ID of the Snippet or Deepening
- `sourceType` (string): "snippet" | "deepening"
- `userId` (string): Author
- `text` (string)
- `createdAt` (timestamp)
- `mediaIds` (array of strings): Optional references to `media` docs

### `tag` Collection (Global Tag Registry)
- `id` (string): Auto-generated
- `name` (string): e.g., "Shilo"
- `count` (number): Usage frequency
- `mediaIds` (array of strings): Optional references to `media` docs

### `outline` Collection
- `id` (string): Auto-generated
- `userId` (string): Owner
- `title` (string)
- `isPublic` (boolean)
- `items` (array of objects - JSON):
  - Stores the structure and order of the outline.
  - Structure: `[{ itemId: "uuid", type: "snippet"|"deepening"|"media", refId: "db_id", isVisible: boolean, children: [] }]`
- `createdAt` (timestamp)
- `updatedAt` (timestamp)

#### Note on References in Outlines
- References linked to snippets/deepenings are inherited in the outline
- Bibliography can be auto-generated from all referenced works in outline

### `media` Collection
- `id` (string): Auto-generated
- `name` (string)
- `description` (string)
- `ipfsLink` (string): IPFS CID or gateway URL
- `size` (number): Size in bytes
- `type` (string): MIME type
- `dimensions` (string): Optional, e.g., "1920x1080"
- `references` (array of objects): Optional citations and sources
  - `[{ refId: string, context?: string, relationshipType?: string }]`
  - `refId`: Reference to `references` collection doc
  - `context`: Optional description of source or attribution
  - `relationshipType`: How this media relates to the reference
- `createdAt` (timestamp)

### `references` Collection
**Purpose**: Global registry of scholarly sources, spiritual teachings, religious texts, and conceptual references. Supports deduplication, centralized validation, and reverse lookup ("where is this reference used?"). Handles both traditional academic citations and Bahai/spiritual/oral sources.

#### Core Fields
- `id` (string): Auto-generated
- `title` (string): Full title or name of work/concept/teaching
- `sourceType` (string): 
  - Academic: "book" | "journal" | "website" | "other"
  - Bahai/Religious: "bahai-text" | "religious-scripture" | "spiritual-concept" | "oral-tradition"
- `citationFormat` (string): "apa-7" | "bahai" | "religious" | "descriptive" | "custom"

#### Scholarly Publication Fields (for book/journal/website)
- `authors` (array of objects): Structured author information
  - `[{ lastName: string, initials: string }]`
  - Example: `[{ lastName: "Smith", initials: "J.M." }, { lastName: "Jones", initials: "A." }]`
- `year` (number): Publication year
- `publisher` (string): Optional, publisher name (for books)
- `journal` (string): Optional, journal name (for articles)
- `volume` (string): Optional, journal volume
- `issue` (string): Optional, journal issue
- `pages` (string): Optional, page range (e.g., "45-67") or reference format (e.g., "par. 1-3" for Bahai, "2:163" for scripture)
- `doi` (string): Optional, DOI number
- `url` (string): Optional, website or access URL
- `accessDate` (timestamp): Optional, date accessed (for web sources)

#### Bahai/Spiritual Fields (for bahai-text, spiritual-concept, oral-tradition)
- `speaker` (string): Optional, who taught/spoke (e.g., "Bahaullah", "Shoghi Effendi", "Community gathering")
- `date` (timestamp): Optional, when said/recorded/published
- `transcribedBy` (string): Optional, who documented oral traditions
- `conceptualMeta` (object): Optional, for spiritual-concept sourceType
  - `relatedConcepts` (array of strings): Related Bahai principles (e.g., ["unity", "consultation"])
  - `teachingContext` (string): Description of how concept relates to Bahai teachings
  - `applicableTo` (array of strings): Teaching domains (e.g., ["community leadership", "personal growth"])

#### Formatted Output & Validation
- `formattedAPA` (string): Complete citation in appropriate format (APA 7th, Bahai convention, descriptive, etc.)
- `validationStatus` (string): "pending" | "valid" | "invalid"
- `validatedAt` (timestamp): When last validated by LLM
- `validationErrors` (array of strings): Error messages if validation failed

#### Metadata
- `createdAt` (timestamp)
- `updatedAt` (timestamp)
- `createdBy` (string): User ID who added this reference

### `auditLog` Collection (Future)
- `id` (string): Auto-generated
- `userId` (string): Who performed the action
- `userName` (string): Cached display name
- `action` (string): "CREATE", "UPDATE", "DELETE"
- `targetCollection` (string): e.g., "snippet"
- `targetId` (string)
- `summary` (string): e.g., "Joe B. updated Snippet X"
- `timestamp` (timestamp)

## 7. Functional Requirements

### Content Management (CRUD)
- **Firesides**: Full CRUD for Admin and SuperAdmin roles only.
- **Snippets**: Full CRUD for Admin and SuperAdmin roles only.
  - Create: Admin interface at `/admin/snippets/new`
  - Edit: Admin interface at `/admin/snippets/[id]/edit`
  - Delete: Confirmation required, decrements tag usage counts
  - View: Public read access for all users
- **Deepenings**: Full CRUD for Admin and SuperAdmin roles only.
- **Tags**: Ability to associate tags with weight/distance metrics during creation/editing.
  - Global tag registry managed automatically
  - Usage counts tracked and maintained
  - Admin and SuperAdmin can create/edit/delete tags

### References & Citation Management
**Goal**: Provide robust, APA 7th edition-compliant citations for all content (snippets, deepenings, media).

#### Reference Workflow
1. **Admin Input**: Admin adds raw citation text via form (author, year, title, source, etc. or free-form paste), or selects source type (academic, Bahai text, spiritual concept, etc.)
2. **LLM Validation**: System sends to LLM API with source-type-specific validation prompt (APA rules for academic, Bahai conventions for texts, semantic validation for concepts, etc.)
3. **Parsing & Structuring**: LLM extracts structured fields appropriate to source type (authors/year/title for academic, speaker/date/text for Bahai, conceptualMeta for spiritual, etc.)
4. **Storage**: Validated citation saved to global `references` collection with:
   - Full formatted citation string (APA 7th, Bahai convention, religious format, or descriptive as appropriate)
   - Structured fields for querying and display
   - `validationStatus`: "valid" | "invalid" | "pending"
   - Error messages or warnings if validation flagged issues
5. **Linking**: Admin can link references to content (snippets, deepenings, media) with optional metadata:
   - Page number(s), verse range, or paragraph reference
   - Context describing why/how reference is used
   - Relationship type (cites, illustrates, derived-from, contradicts, extends)
6. **Reuse**: Same reference used in multiple places (deduplication)

#### Reference Features
- **Deduplication**: Identical citations stored once, linked from multiple content items
- **Centralized Validation**: Update or re-validate a reference; changes propagate to all linked content
- **Global Registry**: All citations (academic, Bahai texts, spiritual concepts, oral traditions) available for linking to any content
- **Reverse Lookup**: Find all snippets/deepenings/media citing a specific reference or related to a spiritual concept
- **Format Flexibility**: Support multiple citation formats adapted to source type
  - **Academic (APA 7th)**: Traditional scholarly citation format
  - **Bahai Texts**: Bahaullah, Shoghi Effendi, etc. with paragraph/tablet references
  - **Religious Scripture**: Book:Chapter:Verse format
  - **Spiritual Concepts**: Descriptive format with conceptual metadata
  - **Oral Traditions**: Speaker, date, and documentation metadata
- **Compliance & Validation**: 
  - Academic sources: APA 7th edition rules enforced
  - Bahai texts: Known texts database, proper attribution
  - Spiritual concepts: Grounded in Bahai teachings with related concept suggestions
  - Religious scripture: Recognized texts with proper verse format
  - Oral traditions: Proper documentation (who, when, what)

#### Reference Types & Citation Formats

**Academic Sources (Traditional)**
- **book**: Author, Year, Title, Publisher. (APA 7 format)
- **journal**: Author, Year. Title of article. *Journal Name*, Vol(Issue), pp. XX-XX. DOI/URL
- **website**: Author/Organization, Year. Title. Retrieved from URL

**Bahai & Spiritual Sources**
- **bahai-text**: Bahaullah/Shoghi Effendi/etc. (Year). *Title*. Bahai Publishing. [par. 1-3]
  - Example: "Bahaullah. (1873). The Kitab-i-Aqdas. Bahai Publishing Trust, par. 30-45"
- **religious-scripture**: *Title* Book:Chapter:Verse
  - Example: "Quran 2:163" or "Bible, Genesis 1:1-5"
- **spiritual-concept**: Bahai principle - [Teaching Context]
  - Example: "Bahai principle of Consultation (Shura) - collective decision-making through divine guidance"
- **oral-tradition**: Descriptive - "[Topic] documented by [transcriber] on [date]"
  - Example: "Teaching on unity from Ridvan gathering 2024, documented by Archive team, March 15, 2024"

#### Permissions
| Action | SuperAdmin | Admin | Participant | Guest |
|--------|-----------|-------|-------------|-------|
| Add/Edit/Delete References | ✓ | ✓ | ✗ | ✗ |
| Add Bahai/Spiritual References | ✓ | ✓ | ✗ | ✗ |
| Link References to Content | ✓ | ✓ | ✗ | ✗ |
| View References (read-only) | ✓ | ✓ | ✓ | ✓ |
| Download References (APA, BibTeX, etc.) | ✓ | ✓ | ✓ | ✓ |

#### LLM Validation Service
**Advisory Pipeline**: The reference system now uses a three-step "check → advise → rewrite" flow.

- **Step 1 — Analyze & Detect**: `analyzeReference(rawInput)` detects the source type, recommends the best citation format, and rewrites the citation accordingly
- **Step 2 — Format Switching**: `rewriteToFormat(rawInput, targetFormat)` converts between APA 7th, Chicago, Bahai convention, Religious, Descriptive, or Custom formats
- **Step 3 — Locate Online**: `locateReferenceOnline(partialInput, sourceTypeHint)` searches Crossref, Google Books, and DeepSeek to find and format the reference automatically

- **API Integration**: DeepSeek v4 (primary, OpenAI-compatible API) with Ollama (local fallback) and offline mock (development)
  - Routes validation request through a priority-based provider chain
  - Provider order: DeepSeek → Ollama → Local offline mock
  - DeepSeek configured via `NEXT_PUBLIC_DEEPSEEK_API_KEY` and `NEXT_PUBLIC_DEEPSEEK_MODEL`
  - Ollama configured via `NEXT_PUBLIC_OLLAMA_BASE_URL` and `NEXT_PUBLIC_OLLAMA_MODEL`
  - Can fall back between providers automatically if one is unavailable
  - Low temperature (0.1) for structured JSON output

- **Source-Specific Validation Prompts**:
  - **Academic Sources Prompt** (book/journal/website): Validate APA 7th edition rules, extract authors/year/title/publisher/DOI/URL
  - **Bahai Text Prompt**: Validate against known Bahai works database, check citation format, ensure proper author/date/paragraph references
  - **Spiritual Concept Prompt**: Verify concept is legitimate Bahai principle (not invented), ensure clear teaching context, suggest related concepts
  - **Religious Scripture Prompt**: Validate known religious texts, accept multiple citation formats (Book:Chapter:Verse), handle translations
  - **Oral Tradition Prompt**: Ensure sufficient documentation (topic, speaker, date, transcriber), validate as authentic community teaching

- **Validation Rules by Type**:
  - Academic: Standard APA 7th, authors, year, title, source all required
  - Bahai texts: Known work database, proper attribution, format validation
  - Spiritual concepts: Grounded in Bahai teachings, clear context, semantic coherence
  - Religious scripture: Recognized canonical texts, valid verse ranges
  - Oral traditions: Complete metadata (topic + speaker + date + context)

- **Error Handling**: Detailed, context-specific error messages
  - Academic: "Missing publication year", "Invalid author format", "DOI mismatch"
  - Bahai: "Unknown Bahai text", "Invalid paragraph format", "Missing source attribution"
  - Spiritual: "Not a recognized Bahai principle", "Unclear teaching context", "Suggest related concepts: [...]"
  - Religious: "Unknown scripture", "Invalid verse format", "Verse out of range"
  - Oral: "Missing speaker/date", "Incomplete documentation"

- **Caching**: Identical raw citations not re-validated (same API call = same result)
- **Rate Limiting**: Batch validation requests, implement backoff for quota management
- **Fallback**: If API unavailable, reference marked as "pending" for later validation
- **Environment Configuration**: API key stored in `.env.local`, configurable endpoint and provider selection

#### Manual Reference Verification (Post-Creation)
**Admin can verify/re-verify references anytime:**

- **UI Button**: "Verify Reference" action button appears on:
  - Reference management page (`/admin/references`) — for each reference row
  - Reference detail view (`/admin/references/[id]`) — prominently displayed
  - References with `validationStatus: "pending"` show a warning badge ("Pending Verification")

- **Behavior**:
  1. Admin clicks "Verify Reference" button
  2. If online: System immediately calls LLM API with reference data
     - Updates `validationStatus` to "valid" or "invalid"
     - Updates `validatedAt` timestamp
     - Shows result in UI (green ✓ for valid, red ✗ for invalid with errors)
  3. If offline: System shows "offline mode" message
     - Stores verification request locally (in browser cache/IndexedDB)
     - Marks reference as "pending online verification"
     - When connection restored, auto-verifies or user can manually retry

- **Service Method**:
  ```typescript
  // In ReferenceService:
  async verifyReferenceOnDemand(referenceId: string): Promise<ValidationResult>
  // - Fetches reference from database
  // - Calls LLM validation (or offline validation if available)
  // - Updates validationStatus and validatedAt
  // - Returns validation result to UI
  ```

- **Offline Verification (Phase 2)**:
  - Local reference format checker (regex/rules-based, no LLM needed)
  - Can validate basic APA structure without API
  - Full LLM validation queued for when online
  - Status badge shows: "⚠️ Validated offline only — requires online verification"

#### Verification Status Indicators (UI)
| Status | Icon | Color | Meaning |
|--------|------|-------|---------|
| valid | ✓ | Green | LLM verified, meets standards |
| invalid | ✗ | Red | LLM found errors (shows details) |
| pending | ⏳ | Yellow | Waiting for LLM verification |
| offline-check | 📡 | Orange | Passed offline rules, needs online LLM check |

### Outline Editor (Advanced Feature)
- **Interface**: Split screen or drawer.
    - **Source (Right/Left Panel)**: Searchable list of Snippets, Deepenings, etc.
    - **Canvas (Main Panel)**: Drop zone for compiling content.
- **Actions**:
    - Drag and drop to reorder.
    - Toggle visibility of specific sections.
    - Auto-save every 5 seconds.
- **Export**:
    - PDF
    - Markdown
    - Static HTML + Images (Zip)

### Administration
- **Audit Log**: View history of data changes.
- **User Management**: Assign roles (SuperAdmin only).

### Architecture Patterns
- **Repository Pattern**: Domain-specific data access in `src/repositories/`
- **Factory Pattern**: Entity creation and validation in `src/factories/`
- **Service Layer**: Business logic in `src/services/`
- **Components**: Reusable Tailwind components in `src/components/`

### Editor Specification
- **Tiptap** WYSIWYG editor
- **Supported formatting**:
  - Headings (H1-H6)
  - Bold / Italic / Underline
  - Blockquotes
  - Ordered & Unordered Lists
  - Links
  - No raw HTML
  - Markdown serialization only

### Search System
- **Basic Search**: Firestore text + tag search
- **AI-Enhanced Search**: Semantic query → AI returns ranked snippet IDs

### Export System
- **Supported Formats**: Markdown (.md), PDF
- **PDF Pipeline**: Markdown → HTML → PDF (Puppeteer or client-side)

### Authentication & Security
- Firebase Auth (Email / OAuth optional)
- Firestore security rules:
  - Public read for public content
  - Private write for authenticated users
  - User-owned outlines

## 8. Local / Offline Mirroring

### Supported Modes
- Full local Firebase emulator
- LAN-only deployment
- Static snapshot export

### Data Portability
- Markdown files exportable
- JSON snapshot support
- Git-friendly structure

## 9. Deployment

### Cloud
- Firebase Hosting
- Cloud Functions

### Local
- Docker Compose
- `.env` driven configuration

## 10. Implementation Guide: References & Citations

### TypeScript Types Required
Add to `src/types/index.ts`:

```typescript
export interface CitationAuthor {
  lastName: string;
  initials: string;  // e.g., "J.M.", "A."
}

export interface ConceptualMetadata {
  relatedConcepts: string[];      // e.g., ["unity", "justice", "consultation"]
  teachingContext: string;        // How concept relates to Bahai teachings
  applicableTo: string[];         // Teaching domains (e.g., "community leadership")
}

export interface ReferenceEntity extends BaseEntity {
  // Core fields
  title: string;
  sourceType: 
    | 'book' | 'journal' | 'website' | 'other'        // Academic
    | 'bahai-text' | 'religious-scripture'            // Primary sources
    | 'spiritual-concept' | 'oral-tradition';         // Spiritual/conceptual
  citationFormat: 'apa-7' | 'bahai' | 'religious' | 'descriptive' | 'custom';

  // Academic publication fields (optional, for book/journal/website)
  authors?: CitationAuthor[];
  year?: number;
  publisher?: string;
  journal?: string;
  volume?: string;
  issue?: string;
  pages?: string;  // Flexible: "45-47", "par. 1-3", "2:163", etc.
  doi?: string;
  url?: string;
  accessDate?: Timestamp;

  // Bahai/Spiritual fields (optional, for bahai-text, spiritual-concept, oral-tradition)
  speaker?: string;               // e.g., "Bahaullah", "Shoghi Effendi"
  date?: Timestamp;               // When said/recorded/published
  transcribedBy?: string;         // Who documented oral traditions
  conceptualMeta?: ConceptualMetadata;  // For spiritual-concept sourceType

  // Formatted output & validation
  formattedAPA: string;           // Citation in appropriate format
  validationStatus: 'pending' | 'valid' | 'invalid';
  validatedAt?: Timestamp;
  validationErrors?: string[];

  // Metadata
  createdBy: string;              // User ID who added reference
}

export interface ContentReference {
  refId: string;                  // Reference to references collection
  page?: string;                  // Flexible: "45-47", "par. 1-3", "2:163"
  context?: string;               // Usage description
  relationshipType?: 
    | 'cites'                      // Directly quotes
    | 'illustrates'                // Exemplifies concept
    | 'derived-from'               // Concept derived from teaching
    | 'contradicts'                // Raises question about teaching
    | 'extends';                   // Deepens Bahai teaching
}

// Update existing entity types to include references:
export interface Snippet extends BaseEntity {
  firesideId: string;
  name: string;
  text: string;
  naturalOrder: number;
  tags: SnippetTag[];
  references?: ContentReference[];  // ADD THIS
  visibility: 'public' | 'private';
}

export interface Deepening extends BaseEntity {
  snippetId: string;
  name: string;
  text: string;
  tags: SnippetTag[];
  references?: ContentReference[];  // ADD THIS
  mediaIds?: string[];
}

export interface Media extends BaseEntity {
  name: string;
  description: string;
  ipfsLink: string;
  size: number;
  type: string;
  dimensions?: string;
  references?: ContentReference[];  // ADD THIS
}
```

### Repository Required
Create `src/repositories/ReferenceRepository.ts`:

```typescript
// Extends BaseRepository<ReferenceEntity>
// Key methods:
// - findByAuthorAndYear(lastName: string, year: number): Promise<ReferenceEntity[]>
// - findByDoi(doi: string): Promise<ReferenceEntity | null>
// - findByFormattedAPA(formatted: string): Promise<ReferenceEntity | null>
// - findAllWithStatus(status: 'valid' | 'invalid' | 'pending'): Promise<ReferenceEntity[]>
// - findBySourceType(sourceType: string): Promise<ReferenceEntity[]>
// - findBahaiTexts(): Promise<ReferenceEntity[]>  // All bahai-text sources
// - findSpiritualConcepts(): Promise<ReferenceEntity[]>  // All spiritual-concept sources
// - findByRelatedConcept(concept: string): Promise<ReferenceEntity[]>  // Search conceptualMeta
// - findByReligiousText(title: string): Promise<ReferenceEntity[]>  // Search scripture
// - updateValidationStatus(id: string, status: string, errors?: string[]): Promise<void>
// - findBySpeaker(speaker: string): Promise<ReferenceEntity[]>  // For oral traditions
// - findOralTraditions(): Promise<ReferenceEntity[]>  // All oral-tradition sources
// - incrementUsageCount(id: string): Promise<void>  // For tracking citations
```

### Service Required
`src/services/referenceService.ts` implements the full advisory pipeline:

**New Types:**
```typescript
interface CitationAdvisory {
  detectedType: ReferenceEntity['sourceType'];
  recommendedFormat: ReferenceEntity['citationFormat'];
  confidence: number;                    // 0-1
  formattedCitation: string;             // AI-rewritten citation
  alternativeFormats?: {
    format: ReferenceEntity['citationFormat'];
    label: string;
    citation: string;
  }[];
  warnings: string[];
  rawAnalysis: string;                   // AI explanation
  structured: Partial<ReferenceEntity>;
}

interface CitationCandidate {
  title: string;
  authors: CitationAuthor[];
  year: number | null;
  publisher?: string;
  doi?: string;
  url?: string;
  formattedCitation: string;
  confidence: number;
  sourceUrl: string;
  source: string;                        // "crossref" | "google-books" | "deepseek"
}

interface ValidationResult {
  isValid: boolean;
  formattedAPA: string;
  structured: Partial<ReferenceEntity>;
  errors: string[];
  warnings?: string[];
}
```

**AI Provider Abstraction:**
```typescript
// Priority-based provider chain:
const PROVIDERS = [
  { name: 'deepseek', baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat', priority: 1 },
  { name: 'ollama', baseUrl: 'http://localhost:11434', model: 'llama3', priority: 2 },
];
// Fallback: DeepSeek → Ollama → Local offline mock
```

**Public Methods:**
```typescript
export class ReferenceService {
  // Step 1: Analyze raw input → detect type, recommend format, rewrite
  async analyzeReference(rawInput: string): Promise<CitationAdvisory>
  
  // Step 2: Rewrite to a different citation format
  async rewriteToFormat(
    rawInput: string,
    targetFormat: 'apa-7' | 'chicago' | 'bahai' | 'religious' | 'descriptive' | 'custom'
  ): Promise<CitationAdvisory>
  
  // Step 3: Locate reference online (Crossref, Google Books, DeepSeek)
  async locateReferenceOnline(
    partialInput: string,
    sourceTypeHint?: string
  ): Promise<{ candidates: CitationCandidate[]; bestMatch: CitationCandidate | null; searchSource: string }>
  
  // Legacy methods (now delegate to analyzeReference)
  async validateAndFormatReference(rawCitation: string): Promise<ValidationResult>
  async validateWithSourceType(rawCitation: string, sourceType: string): Promise<ValidationResult>
  async checkDuplicate(citation: ReferenceEntity): Promise<ReferenceEntity | null>
  async validateBahaiText(textName: string, speaker?: string): Promise<ValidationResult>
  async validateSpiritualConcept(conceptName: string, context?: string, relatedConcepts?: string[]): Promise<ValidationResult>
  async validateScripture(title: string, bookChapterVerse: string): Promise<ValidationResult>
  async validateOralTradition(topic: string, speaker?: string, date?: Date, transcribedBy?: string): Promise<ValidationResult>
}
```

### LLM Integration
**Multi-Format System Prompts**:

1. **Academic Citation Prompt** (for book, journal, website):
   - Validate against APA 7th edition rules
   - Extract: authors, year, title, publisher, DOI, URL
   - Output: APA formatted string + structured fields

2. **Bahai Text Prompt** (for bahai-text):
   - Validate against known Bahai works (Kitab-i-Aqdas, Hidden Words, etc.)
   - Accept Bahai citation format: "Author. (Year). Title. Bahai Publishing."
   - Accept verse/paragraph format: "Text Name, par. 1-5"
   - Extract: speaker, year, title, paragraph ranges
   - Output: Bahai formatted string + structured fields

3. **Spiritual Concept Prompt** (for spiritual-concept):
   - Validate concept is legitimate Bahai principle (not invented)
   - Ensure clear teaching context
   - Suggest related Bahai concepts
   - Identify applicable teaching domains
   - Output: Descriptive formatted string + conceptualMeta

4. **Religious Scripture Prompt** (for religious-scripture):
   - Validate known religious texts (Quran, Bible, etc.)
   - Validate book:chapter:verse format
   - Extract: title, verse range, translation if applicable
   - Output: Religious formatted string + structured fields

5. **Oral Tradition Prompt** (for oral-tradition):
   - Ensure sufficient documentation (topic, speaker, date, transcriber)
   - Validate as authentic community teaching
   - Extract: topic, speaker, date, transcriber
   - Output: Descriptive formatted string + metadata

- **Input**: Raw citation string or structured fields + sourceType hint
- **Output**: Validated formatted citation + structured fields + any warnings
- **Caching Strategy**: Cache by hash of input + sourceType (avoid duplicate validations)
- **Routing**: Auto-detect sourceType and route to appropriate validation prompt, or use user-specified sourceType

## 11. Usage Examples: References & Citations

### Example 1: Adding an Academic Reference

**User Input (Admin adds a book):**
```
Smith, J.M., & Jones, A. (2020). The Nature of Community. Academic Press.
```

**LLM Validation Request (via API):**
```json
{
  "rawCitation": "Smith, J.M., & Jones, A. (2020). The Nature of Community. Academic Press.",
  "sourceType": "book",
  "systemPrompt": "Validate this academic citation against APA 7th edition rules..."
}
```

**LLM Response:**
```json
{
  "isValid": true,
  "formattedAPA": "Smith, J. M., & Jones, A. (2020). The nature of community. Academic Press.",
  "structured": {
    "authors": [
      { "lastName": "Smith", "initials": "J.M." },
      { "lastName": "Jones", "initials": "A." }
    ],
    "year": 2020,
    "title": "The nature of community",
    "publisher": "Academic Press",
    "sourceType": "book",
    "citationFormat": "apa-7"
  },
  "errors": [],
  "warnings": []
}
```

**Stored in Firestore (`references` collection):**
```javascript
{
  id: "ref_abc123",
  title: "The nature of community",
  sourceType: "book",
  citationFormat: "apa-7",
  authors: [
    { lastName: "Smith", initials: "J.M." },
    { lastName: "Jones", initials: "A." }
  ],
  year: 2020,
  publisher: "Academic Press",
  formattedAPA: "Smith, J. M., & Jones, A. (2020). The nature of community. Academic Press.",
  validationStatus: "valid",
  validatedAt: Timestamp.now(),
  createdBy: "admin-user-id",
  createdAt: Timestamp.now()
}
```

---

### Example 2: Adding a Bahai Text Reference

**User Input (Admin adds Bahai writing):**
```
Kitab-i-Aqdas, paragraphs 30-45
```

**LLM Validation Request:**
```json
{
  "rawCitation": "Kitab-i-Aqdas, paragraphs 30-45",
  "sourceType": "bahai-text",
  "systemPrompt": "Validate this Bahai text citation. Check against known works..."
}
```

**LLM Response:**
```json
{
  "isValid": true,
  "formattedAPA": "Bahaullah. (1873). The Kitab-i-Aqdas. Bahai Publishing Trust, par. 30-45.",
  "structured": {
    "speaker": "Bahaullah",
    "year": 1873,
    "title": "The Kitab-i-Aqdas",
    "pages": "par. 30-45",
    "sourceType": "bahai-text",
    "citationFormat": "bahai"
  },
  "errors": [],
  "warnings": []
}
```

**Stored in Firestore:**
```javascript
{
  id: "ref_bahai_001",
  title: "The Kitab-i-Aqdas",
  sourceType: "bahai-text",
  citationFormat: "bahai",
  speaker: "Bahaullah",
  year: 1873,
  pages: "par. 30-45",
  formattedAPA: "Bahaullah. (1873). The Kitab-i-Aqdas. Bahai Publishing Trust, par. 30-45.",
  validationStatus: "valid",
  validatedAt: Timestamp.now(),
  createdBy: "admin-user-id",
  createdAt: Timestamp.now()
}
```

---

### Example 3: Adding a Spiritual Concept Reference

**User Input (Admin adds concept):**
```
Concept: Consultation
Bahai teaching on collective decision-making through divine guidance
Related concepts: unity, justice, collective wisdom
```

**LLM Validation Request:**
```json
{
  "sourceType": "spiritual-concept",
  "data": {
    "title": "Consultation",
    "conceptualMeta": {
      "teachingContext": "collective decision-making through divine guidance",
      "relatedConcepts": ["unity", "justice", "collective wisdom"],
      "applicableTo": ["community leadership", "administrative decisions"]
    }
  },
  "systemPrompt": "Validate this is a legitimate Bahai principle..."
}
```

**LLM Response:**
```json
{
  "isValid": true,
  "formattedAPA": "Bahai principle of Consultation (Shura) - collective decision-making through divine guidance, referenced in Bahaullah's writings and explicated by Shoghi Effendi.",
  "structured": {
    "title": "Consultation",
    "sourceType": "spiritual-concept",
    "citationFormat": "descriptive",
    "conceptualMeta": {
      "teachingContext": "Collective decision-making grounded in Bahai principle of unity of purpose",
      "relatedConcepts": ["unity", "justice", "collective wisdom", "divine guidance"],
      "applicableTo": ["community leadership", "administrative decisions", "personal consultation"]
    }
  },
  "errors": [],
  "warnings": ["Consider also linking to Hidden Words teachings on obedience"]
}
```

**Stored in Firestore:**
```javascript
{
  id: "ref_concept_consultation",
  title: "Consultation",
  sourceType: "spiritual-concept",
  citationFormat: "descriptive",
  formattedAPA: "Bahai principle of Consultation (Shura) - collective decision-making through divine guidance...",
  conceptualMeta: {
    teachingContext: "Collective decision-making grounded in Bahai principle of unity of purpose",
    relatedConcepts: ["unity", "justice", "collective wisdom", "divine guidance"],
    applicableTo: ["community leadership", "administrative decisions", "personal consultation"]
  },
  validationStatus: "valid",
  validatedAt: Timestamp.now(),
  createdBy: "admin-user-id",
  createdAt: Timestamp.now()
}
```

---

### Example 4: Adding an Oral Tradition Reference

**User Input (Admin documents community teaching):**
```
Topic: Unity of humanity
Speaker: Community gathering at Ridvan feast 2024
Date: March 15, 2024
Documented by: Sarah M., Archive team
Context: Teaching on oneness of human family in Bahai context
```

**LLM Validation Request:**
```json
{
  "sourceType": "oral-tradition",
  "data": {
    "title": "Unity of humanity",
    "speaker": "Ridvan feast gathering 2024",
    "date": "2024-03-15",
    "transcribedBy": "Sarah M., Archive team",
    "context": "Teaching on oneness of human family"
  }
}
```

**LLM Response:**
```json
{
  "isValid": true,
  "formattedAPA": "Bahai community gathering. (2024). Teaching on unity of humanity. Documented by Archive team, March 15, 2024.",
  "structured": {
    "title": "Unity of humanity",
    "sourceType": "oral-tradition",
    "citationFormat": "descriptive",
    "speaker": "Ridvan feast gathering 2024",
    "date": 1710460800000,
    "transcribedBy": "Sarah M., Archive team"
  },
  "errors": [],
  "warnings": []
}
```

---

### Example 5: Linking References to a Snippet

**Snippet Content:**
```
Title: "Why We Gather"
Text: "Community gathering is central to Bahai practice.
Consultation enables wisdom, unity binds us together..."
```

**Admin links 3 references:**

```javascript
const snippetWithReferences = {
  id: "snippet_123",
  name: "Why We Gather",
  text: "Community gathering is central...",
  references: [
    {
      refId: "ref_bahai_001",  // Kitab-i-Aqdas
      page: "par. 30-32",
      context: "Scriptural basis for community gathering",
      relationshipType: "cites"
    },
    {
      refId: "ref_concept_consultation",  // Consultation concept
      context: "Core Bahai principle illustrated",
      relationshipType: "illustrates"
    },
    {
      refId: "ref_concept_unity",  // Unity concept
      context: "Result of collective gathering",
      relationshipType: "illustrates"
    }
  ]
};
```

**When rendered (for public viewing):**
```
SNIPPET: Why We Gather
---
Community gathering is central to Bahai practice. Consultation enables wisdom, 
unity binds us together...

REFERENCES:
[1] Bahaullah. (1873). The Kitab-i-Aqdas. Bahai Publishing Trust, par. 30-32.
    (Scriptural basis for community gathering)

[2] Bahai principle of Consultation (Shura) - collective decision-making through 
    divine guidance. (Core Bahai principle illustrated)

[3] Bahai principle of Unity - oneness of human family and collective purpose.
    (Result of collective gathering)
```

---

### Example 6: Finding All Content Related to a Concept

**Query (using ReferenceRepository):**
```typescript
// Find all snippets/deepenings referencing "consultation" concept
const consultationRef = await referenceRepository.findByTitle("Consultation");
// Result: ref_concept_consultation

// Find all content citing this reference
const allSnippetsUsingConsultation = await snippetRepository.findWhere(
  'references', 
  'array-contains', 
  { refId: 'ref_concept_consultation' }
);
// Result: [snippet_123, snippet_456, snippet_789]

// Show all with full reference display
allSnippetsUsingConsultation.forEach(snippet => {
  const ref = snippet.references.find(r => r.refId === 'ref_concept_consultation');
  console.log(`${snippet.name}: "${ref.context}"`);
});
```

**Output:**
```
Why We Gather: "Core Bahai principle illustrated"
Community Leadership: "Foundation for decision-making"
Deepening on Shura: "Historical development of concept"
```

---

### Example 7: Exporting Content with Bibliography

**Export Function (TypeScript):**
```typescript
async function exportSnippetWithBibliography(
  snippetId: string,
  format: 'markdown' | 'pdf'
): Promise<string> {
  const snippet = await snippetRepository.findById(snippetId);
  
  // Gather all references
  const allReferences = [];
  for (const contentRef of snippet.references || []) {
    const ref = await referenceRepository.findById(contentRef.refId);
    allReferences.push({
      ...ref,
      context: contentRef.context,
      relationshipType: contentRef.relationshipType
    });
  }
  
  // Sort by relationship type
  const byType = {
    cites: allReferences.filter(r => r.relationshipType === 'cites'),
    illustrates: allReferences.filter(r => r.relationshipType === 'illustrates'),
    derived_from: allReferences.filter(r => r.relationshipType === 'derived-from')
  };
  
  // Build bibliography
  let bibliography = `\n## Bibliography\n\n`;
  bibliography += `### Primary Sources\n`;
  byType.cites.forEach((ref, i) => {
    bibliography += `[${i+1}] ${ref.formattedAPA}\n`;
  });
  
  bibliography += `\n### Conceptual Foundations\n`;
  byType.illustrates.forEach((ref, i) => {
    bibliography += `[${byType.cites.length + i + 1}] ${ref.formattedAPA}\n`;
  });
  
  return `# ${snippet.name}\n\n${snippet.text}\n${bibliography}`;
}
```

**Output (Markdown):**
```markdown
# Why We Gather

Community gathering is central to Bahai practice. Consultation enables wisdom, 
unity binds us together...

## Bibliography

### Primary Sources
[1] Bahaullah. (1873). The Kitab-i-Aqdas. Bahai Publishing Trust, par. 30-32.

### Conceptual Foundations
[2] Bahai principle of Consultation (Shura) - collective decision-making through 
    divine guidance.
[3] Bahai principle of Unity - oneness of human family and collective purpose.
```

---

### Example 8: API Endpoint for Reference Management

**POST `/api/references/validate`**
```json
Request:
{
  "rawCitation": "Smith, J.M. (2020). Community and Justice. Oxford University Press.",
  "sourceType": "book"  // Optional - will auto-detect if not provided
}

Response (200 OK):
{
  "isValid": true,
  "validationStatus": "valid",
  "formattedAPA": "Smith, J. M. (2020). Community and justice. Oxford University Press.",
  "structured": {
    "authors": [{ "lastName": "Smith", "initials": "J.M." }],
    "year": 2020,
    "title": "Community and justice",
    "publisher": "Oxford University Press",
    "sourceType": "book",
    "citationFormat": "apa-7"
  },
  "errors": []
}
```

**POST `/api/references` (Create)**
```json
Request:
{
  "title": "Community and Justice",
  "sourceType": "book",
  "authors": [{ "lastName": "Smith", "initials": "J.M." }],
  "year": 2020,
  "publisher": "Oxford University Press",
  "formattedAPA": "Smith, J. M. (2020). Community and justice. Oxford University Press."
}

Response (201 Created):
{
  "id": "ref_xyz789",
  "title": "Community and Justice",
  ...
  "validationStatus": "valid",
  "createdAt": "2024-06-07T10:30:00Z"
}
```

**PUT `/api/snippets/:id/references/:refId`**
```json
Request:
{
  "refId": "ref_xyz789",
  "page": "45-67",
  "context": "Primary theoretical framework",
  "relationshipType": "cites"
}

Response (200 OK):
{
  "snippetId": "snippet_123",
  "references": [
    { "refId": "ref_xyz789", "page": "45-67", ... },
    ...
  ]
}
```

---

### Example 9: Admin UI Workflow

**Step 1: Create Reference**
```
Admin navigates to /admin/references/new
- Selects "Book" as source type
- Pastes: "Smith, J.M. (2020) Community and Justice. Oxford."
- System validates via LLM
- Displays: ✓ Valid citation
- Admin clicks "Save Reference"
```

**Step 2: Link to Snippet**
```
Admin edits snippet at /admin/snippets/snippet_123/edit
- Scrolls to "References" section
- Clicks "+ Add Reference"
- Search box appears: filters existing references by title/author
- Finds: "Community and Justice - Smith (2020)"
- Selects it, adds page range "45-67"
- Adds context: "Primary theoretical framework"
- Selects relationship: "cites"
- Reference appears in list with green ✓ badge
- Admin saves snippet
```

**Step 3: View in Public**
```
Public user visits /firesides/[id]/snippets/snippet_123
- Sees snippet content
- Sees "References (3)" section with formatted citations
- Can click reference to see other content citing same source
- Can download bibliography in APA or BibTeX format
```

### Example 9: Admin UI Workflow

**Step 1: Create Reference**
```
Admin navigates to /admin/references/new
- Selects "Book" as source type
- Pastes: "Smith, J.M. (2020) Community and Justice. Oxford."
- System validates via LLM
- Displays: ✓ Valid citation
- Admin clicks "Save Reference"
```

**Step 2: Link to Snippet**
```
Admin edits snippet at /admin/snippets/snippet_123/edit
- Scrolls to "References" section
- Clicks "+ Add Reference"
- Search box appears: filters existing references by title/author
- Finds: "Community and Justice - Smith (2020)"
- Selects it, adds page range "45-67"
- Adds context: "Primary theoretical framework"
- Selects relationship: "cites"
- Reference appears in list with green ✓ badge
- Admin saves snippet
```

**Step 3: View in Public**
```
Public user visits /firesides/[id]/snippets/snippet_123
- Sees snippet content
- Sees "References (3)" section with formatted citations
- Can click reference to see other content citing same source
- Can download bibliography in APA or BibTeX format
```

---

### Example 10: Manual Reference Verification (Offline Aware)

**Scenario 1: Online - Immediate Verification**
```
Admin is at /admin/references (management page)
- Sees list of 10 references
- Reference #4 shows: "Smith, J.M. (2020)..." with status badge "⏳ pending"
- Admin clicks "Verify Reference" button on that row
- System shows loading spinner: "Checking with LLM..."
- API call to Groq: validates formatting and integrity
- Result: ✓ Valid (Green badge)
- Status updates: "Verified 2 hours ago"
```

**Scenario 2: Offline - Graceful Degradation**
```
Admin creates reference while offline (or during network outage):
- Tries to create: "Smith, J.M. (2020) Community and Justice."
- System shows: "Offline mode - basic validation only"
- Runs local regex validation: ✓ Passes (looks like valid APA format)
- Badge shows: "📡 Offline-checked (orange)" with message: "Requires online verification"
- Reference saved with status: "offline-check"
- When internet returns, admin sees notification: "2 references waiting for online verification"
- Admin clicks "Verify All Pending" button
- System validates all offline references
- Updates badges to ✓ Valid or ✗ Invalid
```

**Scenario 3: Re-verifying After Edit**
```
Admin edits a reference (changes year or author):
- Original reference: "Smith, J.M. (2020)..." with status ✓ Valid
- Admin changes to: "Smith, J.M. (2021)..." [typo - wrong year]
- Saves changes
- System shows status: "⏳ Needs re-verification" (orange badge)
- Admin clicks "Verify Reference" button
- LLM validates new format
- Result: ✗ Invalid - "Publication year 2021 not found. Did you mean 2020?"
- Admin corrects typo, re-verifies
- Result: ✓ Valid
- Status updates, all linked content inherits validation update
```

---

### Example 11: Batch Verification (Mass Operation)

**Scenario: Admin has offline references waiting**
```
Admin navigates to /admin/references/pending
- Sees filter: "Show pending (7 references waiting verification)"
- Selects all 7 checkboxes
- Clicks "Verify All Selected"
- System processes batch:
  - Reference 1: ✓ Valid
  - Reference 2: ✓ Valid
  - Reference 3: ✗ Invalid (shows error message)
  - Reference 4: ✓ Valid
  - ...
- Summary: "Verified 6/7. 1 has errors."
- Only reference 3 remains with ✗ status
- Admin can click on it to see error details and fix
```

---

### Example 12: API Endpoint for On-Demand Verification

**POST `/api/references/:id/verify`**
```json
Request:
{
  // No body needed - uses existing reference data from database
}

Response (200 OK - Successfully verified):
{
  "referenceId": "ref_xyz789",
  "previousStatus": "pending",
  "newStatus": "valid",
  "formattedAPA": "Smith, J. M., & Jones, A. (2020). Community and justice. Oxford University Press.",
  "validatedAt": "2024-06-07T14:30:00Z",
  "errors": []
}

Response (200 OK - Found errors):
{
  "referenceId": "ref_invalid",
  "previousStatus": "pending",
  "newStatus": "invalid",
  "formattedAPA": null,
  "validatedAt": "2024-06-07T14:30:00Z",
  "errors": [
    "Missing publication year",
    "Invalid author format - expected 'Last, Initial.'"
  ]
}

Response (503 Service Unavailable - Offline):
{
  "error": "API unavailable",
  "message": "LLM service offline. Running local validation only.",
  "localValidationPassed": true,
  "status": "offline-check",
  "message": "Will auto-verify when online"
}
```

**GET `/api/references/pending`**
```json
Response:
{
  "count": 3,
  "references": [
    {
      "id": "ref_123",
      "title": "Reference Title",
      "status": "pending",
      "reason": "Created offline",
      "createdAt": "2024-06-07T12:00:00Z"
    },
    ...
  ]
}
```

---

### Admin UI Components Required
1. **Reference Management Page** (`/admin/references`)
   - List all references with validation status (✓ valid, ✗ invalid, ⏳ pending, 📡 offline-check)
   - Search/filter by author, year, title, source type
   - **Verify Reference button** on each row
     - On click: Triggers LLM validation immediately
     - If offline: Shows "offline mode" message, stores locally, auto-verifies when online
     - Shows loading spinner during API call
     - Updates status badge with result (✓/✗ + timestamp)
   - Filter by validation status (e.g., "Show all pending")
   - Edit existing reference (triggers re-validation on save)
   - Delete reference (with cascade warnings showing where it's linked)
   - Batch "Verify All Pending" action

2. **Reference Detail Page** (`/admin/references/[id]`)
   - Full reference details (authors, year, source type, etc.)
   - Formatted citation display
   - Validation status with last verified timestamp
   - If invalid: Show error messages from LLM
   - **"Verify Reference" button** (prominent)
   - Edit button
   - Delete button with cascade warning
   - Reverse lookup: Show all content (snippets/deepenings/media) citing this reference

3. **Reference Creation Form** (`/admin/references/new`)
   - Textarea for raw citation paste OR
   - Structured form (author, year, title, source type, publisher, URL, DOI, etc.)
   - Source type selector (book, journal, website, bahai-text, spiritual-concept, etc.)
   - Real-time validation display
   - Error messages from LLM (or local offline validation if available)
   - Shows formatted citation preview
   - Save button (disabled until validation passes)

4. **Reference Linking UI** (in snippet/deepening/media edit forms)
   - Search existing references by title/author/concept
   - Add new reference inline (quick create)
   - Per-reference options:
     - Page/verse/paragraph reference input (flexible format)
     - Context description (why/how this reference is used)
     - Relationship type selector (cites, illustrates, derived-from, contradicts, extends)
   - Show reference validation status
   - Reorder references (drag-and-drop)

### Export Enhancements
- Export content with formatted APA bibliography
- Generate BibTeX format for reference managers
- Include reference list in PDF exports

---

## 11. Non-Goals
- No social network features
- No AI-generated doctrine
- No proprietary content lock-in

## 12. Guiding Principle
> **The system exists to support teaching and consultation, not to replace them.**
