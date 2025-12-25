# Fireside Archive - Project Specification

## 1. Project Overview
A prototype website to store, manage, and compile snippets and deepenings from BUPC firesides. The system allows users to explore content, create custom outlines via drag-and-drop, and export them.
**Core Philosophy**: Markdown-first, Atomic Content, Offline-Mirrorable, AI-Augmented (not dependent).

## 2. Tech Stack
- **Frontend Framework**: Next.js 14+ (App Router)
- **Styling**: Tailwind CSS
- **Database**: Firebase Firestore (NoSQL)
- **Authentication**: Firebase Authentication
- **State Management**: Zustand (for Outline editor state)
- **Editor**: Tiptap (WYSIWYG serialization to Markdown)
- **Drag & Drop**: dnd-kit (Recommended for accessibility/performance)
- **Export Engine**: Puppeteer (Server-side PDF generation) or Client-side fallback.

## 3. AI Strategy (Specialist & Local-First)
**Goal**: Create a "BUPC Specialist" AI that is free, open-source, and runs locally.

### The Stack
- **Base Model**: **Llama 3 (8B)** or **Mistral 7B**.
    - *Why*: "Sweet spot" for performance vs. hardware requirements (runs on consumer laptops).
- **Engine**: **Ollama**.
    - *Role*: The local runtime to execute the model on Windows/Mac/Linux.
- **Training (The "Brain")**: **Fine-Tuning with QLoRA**.
    - *Method*: Train the base model on the specific vocabulary, tone, and concepts of the archive.
    - *Artifact*: A lightweight "adapter" file distributed to users.
- **Retrieval (The "Library")**: **RAG (Retrieval Augmented Generation)**.
    - *Method*: Connect the AI to the Firestore/Vector database to fetch exact citations.
    - *Benefit*: Prevents hallucinations by grounding answers in the actual text.

### Deployment Phases
- **Phase 1 (Cloud Prototype)**: Use a Cloud API (e.g., Groq/Together AI) mimicking Llama 3 to build the UI and RAG logic.
- **Phase 2 (Local Transition)**:
    - Train the QLoRA adapter on the dataset.
    - Create a custom Ollama Modelfile.
    - Switch the Next.js app to talk to `localhost:11434` (Ollama) instead of the Cloud API.

## 4. User Roles
- **SuperAdmin**: Full system access, user management, schema changes.
- **Admin**: Content management (CRUD on Snippets, Deepenings, etc.), view logs.
- **Participant**: View content, create personal outlines, add comments (if enabled).
- **Guest**: Read-only access to public content.

## 5. Data Model (Firestore Schema)

### `user` Collection
- `uid` (string): Firebase Auth ID
- `email` (string)
- `displayName` (string)
- `role` (string): "SuperAdmin" | "Admin" | "Participant" | "Guest"
- `createdAt` (timestamp)

### `firesideFamily` Collection
- `uid` (string): Unique ID
- `name` (string): e.g., "General Firesides"
- `description` (string)

### `fireside` Collection
- `id` (string): Auto-generated
- `firesideFamilyId` (string): Reference to `firesideFamily` doc
- `name` (string): e.g., "Why Life"
- `description` (string)
- `date` (timestamp)

### `snippet` Collection
- `id` (string): Auto-generated
- `firesideId` (string): Reference to `fireside` doc
- `name` (string): Short name
- `text` (string): **Markdown content**
- `naturalOrder` (number): e.g., 2.30
- `tags` (array of objects): `[{ tagId, name, weight, distance }]`
- `visibility` (string): "public" | "private"

### `deepening` Collection
- `id` (string): Auto-generated
- `snippetId` (string): Reference to parent `snippet` doc
- `name` (string)
- `text` (string): **Markdown content**
- `tags` (array of objects)
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
- `userId` (string)
- `text` (string)
- `mediaIds` (array of strings): Optional references to `media` docs

### `tag` Collection (Global Tag Registry)
- `id` (string): Auto-generated
- `name` (string): e.g., "Shilo"
- `count` (number): Usage frequency
- `mediaIds` (array of strings): Optional references to `media` docs

### `outline` Collection
- `id` (string): Auto-generated
- `userId` (string)
- `title` (string)
- `items` (array of objects - JSON):
  - Structure: `[{ itemId: "uuid", type: "snippet"|"deepening"|"media", refId: "db_id", isVisible: boolean, children: [] }]`
- `markdown` (string): Cached compiled markdown of the outline (optional)

### `media` Collection
- `id` (string): Auto-generated
- `name` (string)
- `description` (string)
- `ipfsLink` (string): IPFS CID or gateway URL
- `size` (number): Size in bytes
- `type` (string): MIME type
- `dimensions` (string): Optional, e.g., "1920x1080"
- `createdAt` (timestamp)

### `auditLog` Collection
- `id` (string)
- `userId` (string)
- `action` (string): "CREATE", "UPDATE", "DELETE"
- `summary` (string)
- `timestamp` (timestamp)

## 6. Functional Requirements

### Content Management
- **Rich Text Editing**: Tiptap editor configured to save as Markdown.
- **Tagging**: Advanced tagging with "weight" and "distance" metadata.

### Outline Editor (The "Advanced Feature")
- **Split-Pane Interface**:
    - **Library (Side)**: Searchable/Filterable list of Snippets/Deepenings.
    - **Canvas (Main)**: Drag-and-drop zone.
- **Features**:
    - Reorder items.
    - Toggle visibility.
    - Auto-save (Zustand + Firestore debounce).
- **Export**:
    - **PDF**: Clean, formatted document.
    - **Markdown**: Raw text file.
    - **HTML/Zip**: Static export.

### Local Mirroring (Future)
- Architecture designed to allow running Firebase Emulators + Local LLM Docker container for a fully offline experience.
