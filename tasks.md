# Project Task List

## Phase 1: Initialization & Infrastructure
- [ ] **Initialize Next.js Project**: Setup Next.js 14+ (App Router), TypeScript, Tailwind CSS.
- [ ] **Setup Firebase**: Initialize Firebase project, configure Firestore and Auth.
- [ ] **Setup State Management**: Install and configure Zustand.
- [ ] **Setup UI Components**: Install `lucide-react` (icons) and `clsx`/`tailwind-merge`.

## Phase 2: Core Data & Authentication
- [ ] **Authentication Flow**: Implement Login/Signup pages with Firebase Auth.
- [ ] **User Profile**: Create `users` collection and profile management.
- [ ] **Firestore Service Layer**: Create generic service for Firestore interactions (Factory pattern).
- [ ] **Seed Data**: Create a script to populate Firestore with initial "Fireside" and "Snippet" data for testing.

## Phase 3: Content Management (CRUD)
- [ ] **Fireside View**: Create page to list and view Firesides.
- [ ] **Snippet Management**:
    - [ ] Create/Edit Snippet Form (Tiptap Editor integration).
    - [ ] Implement Tagging system (with weight/distance UI).
    - [ ] View Snippet details.
- [ ] **Deepening Management**: Similar CRUD for Deepenings.
- [ ] **Search Interface**: Basic text search for content.

## Phase 4: The Outline Editor (Advanced)
- [ ] **Editor Layout**: Create the split-pane layout (Library vs. Canvas).
- [ ] **Drag & Drop Engine**: Implement `dnd-kit` for the Canvas.
- [ ] **Library Panel**: Implement draggable source items (Snippets/Deepenings).
- [ ] **Canvas Logic**:
    - [ ] Handle dropping items.
    - [ ] Reordering logic.
    - [ ] Nested structures (if applicable).
- [ ] **Persistence**: Connect Zustand store to Firestore `outlines` collection (Auto-save).
- [ ] **Export**: Implement Markdown and PDF export.

## Phase 5: AI Integration (Cloud Prototype)
- [ ] **RAG Service**: Implement vector search logic (or simple keyword search initially).
- [ ] **AI Client**: Create a service to talk to an OpenAI-compatible API (Groq/Together).
- [ ] **Chat Interface**: Add a "Consultant" chat window to the Outline Editor.
- [ ] **Context Injection**: Logic to feed relevant Snippets to the AI prompt.

## Phase 6: Local/Offline Transition
- [ ] **Ollama Integration**: Update AI Client to support `localhost:11434`.
- [ ] **Dataset Preparation**: Export content for Fine-tuning.
- [ ] **Training Pipeline**: Document the QLoRA training process.
- [ ] **Local Deployment**: Create Docker Compose or startup scripts for the full local stack.
