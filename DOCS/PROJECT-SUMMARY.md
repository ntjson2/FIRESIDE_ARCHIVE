# Fireside Archive — Project Summary

> A web-based and locally mirrorable system for archiving BUPC (Bahá'í) fireside content. Build custom teaching outlines from atomic snippets with AI-assisted search.

---

## 1. Project Identity

| Attribute | Description |
|---|---|
| **Name** | Fireside Archive |
| **Version** | 0.1.0 |
| **License** | See `LICENSE` |
| **Repository** | `https://github.com/ntjson2/FIRESIDE_ARCHIVE.git` |
| **Status** | Active development — Phase 1 (Content Management) |

**Core Philosophy:** Markdown-first, Atomic Content, Offline-Mirrorable, AI-Augmented (not dependent).

**Guiding Principle:** > The system exists to support teaching and consultation, not to replace them.

---

## 2. Tech Stack

| Layer | Technology | Version |
|---|---|---|
| **Framework** | Next.js (App Router) | 16.1.1 |
| **Language** | TypeScript | ~5 |
| **Styling** | Tailwind CSS | ^4 |
| **Database** | Firebase Firestore (NoSQL) | ^12.7.0 |
| **Authentication** | Firebase Auth | ^12.7.0 |
| **State Management** | Zustand | ^5.0.9 |
| **Rich Text Editor** | Tiptap (`@tiptap/react` + `@tiptap/starter-kit`) | ^3.14.0 |
| **Drag & Drop** | dnd-kit (`@dnd-kit/core`, `@dnd-kit/sortable`) | ^6.3.1 / ^10.0.0 |
| **Icons** | Lucide React | ^0.562.0 |
| **Markdown Render** | react-markdown | ^10.1.0 |
| **CSS Utilities** | clsx, tailwind-merge | ^2.1.1 / ^3.4.0 |
| **Linting** | ESLint (next/core-web-vitals) | ^9 |
| **Primary AI** | DeepSeek v4 (OpenAI-compatible API) | deepseek-chat |
| **Local AI Fallback** | Ollama (Llama 3 / Mistral 7B) | localhost:11434 |
| **Online Reference Lookup** | Crossref API + Google Books API | Free |

**Planned Additions:**
- Ollama production deployment (local LLM runtime)
- Puppeteer (server-side PDF generation)
- QLoRA fine-tuning pipeline (AI specialization)
- Vector database (Pinecone / Chroma / LanceDB)
- Docker Compose (local deployment)

---

## 3. Architecture

The project follows a strict **Repository + Factory + Service** pattern layered on top of Next.js App Router.

### Layer Overview

```
┌─────────────────────────────────────────────────────────┐
│                     UI Layer                             │
│  src/app/    — Next.js App Router pages & routes         │
│  src/components/ — Reusable React components             │
│  src/context/    — AuthContext, ThemeContext              │
├─────────────────────────────────────────────────────────┤
│                   Service Layer                          │
│  src/services/   — Business logic (authService,          │
│                    referenceService, firestoreService)   │
├─────────────────────────────────────────────────────────┤
│                 Repository Layer                         │
│  src/repositories/ — Data access (CRUD via Firestore)   │
├─────────────────────────────────────────────────────────┤
│                 Factory Layer                            │
│  src/factories/   — Entity creation & validation         │
├─────────────────────────────────────────────────────────┤
│              Types & Lib Layer                           │
│  src/types/    — TypeScript interfaces                   │
│  src/lib/      — Firebase config, seed data, utils       │
│  src/store/    — Zustand stores (outline editor)         │
└─────────────────────────────────────────────────────────┘
```

### Directory Map

```
FIRESIDE_ARCHIVE/
├── src/
│   ├── app/               # Next.js App Router
│   │   ├── (auth)/        # Login / Signup
│   │   ├── admin/         # Admin CRUD pages
│   │   ├── firesides/     # Public fireside views
│   │   ├── snippets/      # Public snippet views
│   │   ├── profile/       # User profile
│   │   ├── layout.tsx     # Root layout
│   │   └── page.tsx       # Home page
│   ├── components/
│   │   ├── Navbar.tsx
│   │   └── ui/            # shadcn/ui primitives
│   ├── context/
│   │   ├── AuthContext.tsx
│   │   └── ThemeContext.tsx
│   ├── factories/
│   │   ├── BaseFactory.ts
│   │   ├── FiresideFactory.ts, SnippetFactory.ts, DeepeningFactory.ts, ...
│   │   └── index.ts
│   ├── repositories/
│   │   ├── BaseRepository.ts
│   │   ├── FiresideFamilyRepository.ts, SnippetRepository.ts, ...
│   │   └── index.ts       # Singleton exports
│   ├── services/
│   │   ├── authService.ts
│   │   ├── firestoreService.ts
│   │   └── referenceService.ts
│   ├── store/
│   │   └── useOutlineStore.ts
│   ├── types/
│   │   └── index.ts
│   └── lib/
│       ├── firebase.ts    # Firebase init
│       ├── seed.ts        # Seed data script
│       └── utils.ts
├── DOCS/
│   ├── SPEC.md            # Full technical specification
│   ├── ROADMAP.md         # Project roadmap & progress
│   └── PROJECT-SUMMARY.md # ← This file
├── public/                # Static assets
├── firestore.rules
├── firestore.indexes.json
├── next.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

---

## 4. Data Model

### Content Hierarchy

```
FiresideFamily  (e.g. "General Firesides", "Youth Firesides")
    └── Fireside  (e.g. "Why Life", "The Purpose of Life")
        └── Snippet  (atomic teaching unit, Markdown)
            └── Deepening  (extended research text)
```

### Firestore Collections (11 total)

| Collection | Key Fields | Purpose |
|---|---|---|
| **`user`** | uid, email, displayName, role | User accounts & permissions |
| **`firesideFamily`** | uid, name, description | Top-level grouping |
| **`fireside`** | firesideFamilyId, name, description, date | Individual fireside |
| **`snippet`** | firesideId, name, text, naturalOrder, tags, references | Atomic teaching content |
| **`deepening`** | snippetId, name, text, tags, references, mediaIds | Extended research |
| **`supportingMaterial`** | sourceIds, sourceType, text, mediaIds | Reference text blocks |
| **`comment`** | sourceId, sourceType, userId, text | User comments |
| **`tag`** | name, count, mediaIds | Global tag registry |
| **`outline`** | userId, title, items, isPublic | User-created outlines |
| **`media`** | name, description, ipfsLink, size, type | File metadata (IPFS) |
| **`references`** | title, sourceType, citationFormat, authors, year, validationStatus | Global citation registry |

### Reference System

References support multiple **source types** with format-specific validation:
- **Academic:** book, journal, website (APA 7th edition)
- **Bahai:** bahai-text (e.g., Kitab-i-Aqdas, Hidden Words)
- **Religious:** religious-scripture (Quran, Bible with book:chapter:verse)
- **Conceptual:** spiritual-concept (Bahai principles with metadata)
- **Oral:** oral-tradition (community teachings with documentation)

Relationship types for linking references to content: `cites`, `illustrates`, `derived-from`, `contradicts`, `extends`.

---

## 5. User Roles & Permissions

| Role | Description |
|---|---|
| **SuperAdmin** | Full system access, user management, schema changes |
| **Admin** | Content CRUD (snippets, deepenings, firesides, tags, references, media) |
| **Participant** | View content, create personal outlines, add comments |
| **Guest** | Read-only access to public content |

### Permission Matrix

| Action | SuperAdmin | Admin | Participant | Guest |
|---|---|---|---|---|
| CRUD Snippets/Deepenings/Firesides | ✓ | ✓ | ✗ | ✗ |
| CRUD Tags | ✓ | ✓ | ✗ | ✗ |
| CRUD References | ✓ | ✓ | ✗ | ✗ |
| Link References to Content | ✓ | ✓ | ✗ | ✗ |
| Create Personal Outlines | ✓ | ✓ | ✓ | ✗ |
| View Public Content | ✓ | ✓ | ✓ | ✓ |
| View References (read-only) | ✓ | ✓ | ✓ | ✓ |
| User Management | ✓ | ✗ | ✗ | ✗ |

---

## 6. Key Features

### Content Management (CRUD)
- Firesides, snippets, deepenings: full CRUD for Admin/SuperAdmin
- Tags with weight (1-100) and distance (1-10) metrics
- Visibility controls (public/private)
- Markdown-first editing via Tiptap WYSIWYG

### References & Citations
- Global citation registry with deduplication
- Multi-format support (APA 7, Bahai, religious, descriptive)
- LLM-powered validation with per-source-type system prompts
- Verification status badges (✓ valid | ✗ invalid | ⏳ pending | 📡 offline-check)
- Batch verification and offline fallback
- Reverse lookup: "where is this reference used?"
- Export in APA and BibTeX formats

### Outline Editor (In Progress)
- Split-pane interface (Library + Canvas)
- Drag-and-drop composition via dnd-kit
- Auto-save every 5 seconds
- Export to PDF, Markdown, static HTML

### AI Integration (Planned)
- **Phase:** Cloud prototype → Local deployment
- **Model:** Llama 3 (8B) or Mistral 7B via Ollama
- **Fine-tuning:** QLoRA adapters for BUPC specialization
- **RAG:** Semantic search with vector database
- **Capabilities:** Semantic discovery, outline suggestions, tag recommendations
- **Principle:** Fully optional — system works without AI

### Export System
- Markdown (.md) export
- PDF generation (Puppeteer or client-side)
- Static HTML + images (ZIP)
- Bibliography generation from linked references

### Offline & Local Mirroring
- Firebase Emulator Suite for local development
- Static snapshot export (JSON, Markdown)
- LAN-only deployment via Docker Compose
- Git-friendly content structure

---

## 7. AI Strategy (Detailed)

### AI Provider Fallback Chain

The `ReferenceService` uses a priority-based provider chain for all AI operations:

1. **DeepSeek v4** (primary cloud AI) — OpenAI-compatible API, fast and cost-effective
2. **Ollama** (local fallback) — Llama 3 / Mistral 7B running on `localhost:11434`
3. **Local offline mock** (development only) — structured JSON response fallback

Fallback configuration via `.env.local`:
```
NEXT_PUBLIC_DEEPSEEK_API_KEY=sk-xxxxx
NEXT_PUBLIC_DEEPSEEK_MODEL=deepseek-chat
NEXT_PUBLIC_OLLAMA_BASE_URL=http://localhost:11434
NEXT_PUBLIC_OLLAMA_MODEL=llama3
```

### Advisory Pipeline (References)

The reference system uses a three-step "check → advise → rewrite" flow:

1. **Analyze & Detect** — `analyzeReference(rawInput)` detects source type, recommends best format, rewrites the citation
2. **Format Switching** — `rewriteToFormat(rawInput, targetFormat)` converts between APA 7th, Chicago, Bahai, Religious, Descriptive, or Custom formats
3. **Locate Online** — `locateReferenceOnline(partialInput)` searches Crossref (academic) → Google Books → DeepSeek AI, returns candidates for user approval

### Stack (Future Local)

| Component | Technology | Purpose |
|---|---|---|
| **Base Model** | Llama 3 (8B) / Mistral 7B | General language understanding |
| **Runtime** | Ollama (`localhost:11434`) | Local model execution |
| **Fine-tuning** | QLoRA | BUPC-specific adapter |
| **Retrieval** | RAG (Vector DB) | Grounded, citeable answers |

### Deployment Phases

1. **Cloud Prototype (Current):** DeepSeek v4 API (OpenAI-compatible) for citation advisory, reference lookup, and future RAG
2. **Local Transition (Phase 5, Q4 2026–Q1 2027):** Train QLoRA adapter, switch to local Ollama, fall back to DeepSeek when offline

### Key Rules
- AI never overwrites source text
- AI outputs references, not doctrine
- User must **accept** formatted citations before saving (approval gate)
- Fully optional — system functions without any AI component

---

## 8. Current Status

### ✅ Completed (Foundation)

- Next.js 15 project initialized with TypeScript + App Router
- Tailwind CSS configured
- Firebase project setup (Firestore + Auth)
- Repository pattern (8 repositories with singleton exports)
- Factory pattern (6 factories)
- Complete TypeScript type system (16 interfaces)
- Firebase Auth integration with AuthContext
- Login/Signup pages
- Role-based access patterns
- Navbar component, shadcn/ui primitives
- Complete SPEC.md, ROADMAP.md, AI instructions
- Deepening CRUD (create, edit, delete forms)
- Reference management (service, repository, admin pages)

### 🔄 In Progress (Current Sprint)

- Seed data script for Firestore
- Admin seed UI page (`/admin/seed`)
- Fireside listing page (read-only)
- Fireside detail page with snippet list
- Snippet detail page with Markdown rendering

### ⏳ Next Up (Phase 1 — Content Management)

- Admin CRUD for snippets, firesides, families
- Search & discovery (text + tag search)
- Navigation improvements (breadcrumbs, related content)

### 🚀 Future Phases

| Phase | Timeline | Focus |
|---|---|---|
| **2 — Outline Editor** | Q2 2026 | Split-pane DnD editor, auto-save, export |
| **3 — Tiptap Editor** | Q2–Q3 2026 | Rich text editing for snippets/deepenings |
| **4 — AI Cloud Prototype** | Q3 2026 | RAG service, semantic search, Groq/Together AI |
| **5 — Local AI** | Q4 2026–Q1 2027 | Ollama, QLoRA fine-tuning, local vector DB |
| **6 — Advanced Features** | 2027 | Media (IPFS), comments, supporting materials, audit logs |
| **7 — Offline & Local** | 2027 | Docker Compose, static export, LAN deployment |

---

## 9. Quick Start

```bash
# Clone
git clone https://github.com/ntjson2/FIRESIDE_ARCHIVE.git
cd FIRESIDE_ARCHIVE

# Install
npm install

# Environment
cp .env.local.example .env.local
# Edit .env.local with Firebase credentials

# Run
npm run dev     # → http://localhost:3000
npm run build   # Production build
npm run lint    # ESLint

# Seed Firestore
node -e "const seed = require('./src/lib/seed'); seed.seedData();"
```

---

## 10. Design Principles

- **Markdown-First:** All content portable as Markdown
- **Atomic Content:** Snippets are self-contained, composable units
- **Privacy-Respecting:** Data stays local when possible
- **AI-Augmented, Not Dependent:** Fully functional without AI
- **No Vendor Lock-In:** Export at every layer
- **Offline-Capable:** Work without internet

### Non-Goals
- No social networking features
- No AI-generated doctrine
- No proprietary content formats
- No cloud-only architecture
- No subscription or paywall

---

## 11. Key Files Index

| File | Purpose |
|---|---|
| `DOCS/SPEC.md` | Full 1393-line technical specification |
| `DOCS/ROADMAP.md` | 576-line phased roadmap with progress tracking |
| `DOCS/PROJECT-SUMMARY.md` | This file |
| `src/types/index.ts` | All TypeScript interfaces (16 entities) |
| `src/lib/firebase.ts` | Firebase app initialization |
| `src/repositories/BaseRepository.ts` | Generic CRUD base class |
| `src/repositories/index.ts` | 8 repository singletons |
| `src/factories/index.ts` | 6 factory classes |
| `src/services/authService.ts` | Authentication logic |
| `src/services/referenceService.ts` | Reference validation & formatting |
| `src/context/AuthContext.tsx` | Auth state provider |
| `src/store/useOutlineStore.ts` | Zustand store for outline editor |
| `src/app/(auth)/login/page.tsx` | Login page |
| `src/app/(auth)/signup/page.tsx` | Signup page |
| `src/app/admin/references/new/page.tsx` | Reference creation form |
| `firestore.rules` | Firestore security rules |
| `firestore.indexes.json` | Firestore composite indexes |
| `next.config.ts` | Next.js configuration |
| `package.json` | Dependencies and scripts |

---

> *This summary reflects the project as of June 2026. For the most detailed technical information, see `SPEC.md`. For current progress and upcoming work, see `ROADMAP.md`.*