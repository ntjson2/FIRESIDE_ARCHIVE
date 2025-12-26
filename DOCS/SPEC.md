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
- **AI Integration**: Self-hosted LLM (Ollama / Mistral / Llama 3)

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

### Deployment Phases
- **Phase 1 (Cloud Prototype)**: Use a Cloud API (e.g., Groq/Together AI) mimicking Llama 3 to build the UI and RAG logic
- **Phase 2 (Local Transition)**:
  - Train the QLoRA adapter on the dataset
  - Create a custom Ollama Modelfile
  - Switch the Next.js app to talk to `localhost:11434` (Ollama) instead of the Cloud API

## 5. User Roles
- **SuperAdmin**: Full system access, user management, schema changes.
- **Admin**: Content management (CRUD on Snippets, Deepenings, etc.), view logs.
- **Participant**: View content, create personal outlines, add comments (if enabled).
- **Guest**: Read-only access to public content.

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

### `deepening` Collection
- `id` (string): Auto-generated
- `snippetId` (string): Reference to parent `snippet` doc
- `name` (string)
- `text` (string): Extended research text
- `tags` (array of objects): Same structure as Snippets
- `mediaIds` (array of strings): Optional references to `media` docs

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

### `media` Collection
- `id` (string): Auto-generated
- `name` (string)
- `description` (string)
- `ipfsLink` (string): IPFS CID or gateway URL
- `size` (number): Size in bytes
- `type` (string): MIME type
- `dimensions` (string): Optional, e.g., "1920x1080"
- `createdAt` (timestamp)

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
- **Firesides**: Manual entry in Firestore initially (Read-only in app for now).
- **Snippets/Deepenings**: Full CRUD for Admins.
- **Tags**: Ability to associate tags with weight/distance metrics during creation/editing.

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

## 10. Non-Goals
- No social network features
- No AI-generated doctrine
- No proprietary content lock-in

## 11. Guiding Principle
> **The system exists to support teaching and consultation, not to replace them.**
