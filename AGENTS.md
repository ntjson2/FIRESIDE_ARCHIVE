# Fireside Archive — Agent Handoff Guide

> For AI coding agents and developers taking over this project. Read this first.

---

## 1. Project Overview

**Fireside Archive** is a web-based, locally-mirrorable system for archiving BUPC (Bahá'í) fireside content — short-form teaching talks and deepenings. Content is stored as atomic **snippets** (Markdown), assembled into teaching **outlines**.

**Core Philosophy:**
- Markdown-first
- Atomic content, composable outlines
- Offline-capable / mirrorable
- AI-augmented, **not** AI-dependent
- No vendor lock-in

**Guiding Principle:** *The system exists to support teaching and consultation, not to replace them.*

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.1.1 (App Router) + TypeScript |
| Styling | Tailwind CSS 4 |
| Database | Firebase Firestore (NoSQL) |
| Auth | Firebase Auth |
| Hosting | Firebase Hosting (static export) |
| State | Zustand |
| Markdown | react-markdown |
| PDF parsing | pdfjs-dist |
| Icons | lucide-react |
| AI (primary) | DeepSeek (deepseek-chat + Reasoner v4) |
| AI (vision) | Gemini Flash |
| AI (local fallback) | Ollama (llama3) |

---

## 3. Architecture

Strict **Repository + Factory + Service** layering on top of Next.js App Router:

```
UI Layer        src/app/          Next.js pages & routes
                src/components/   Reusable React components (Navbar, ui/*)
                src/context/      AuthContext, ThemeContext
Service Layer   src/services/     Business logic (referenceService, firesideIntegrationService, ...)
Repository      src/repositories/ Data access (CRUD via Firestore)
Factory         src/factories/    Entity creation & validation
Types & Lib     src/types/        TypeScript interfaces
                src/lib/          Firebase config, seed, utils
                src/store/        Zustand stores
```

**Rules:**
- All DB access goes through repositories (never direct Firestore calls in UI)
- Entities are created/validated via factories
- Services handle cross-cutting business logic (AI calls, orchestration)

---

## 4. Directory Map

```
src/
├── app/
│   ├── (auth)/          login, signup, layout
│   ├── admin/
│   │   ├── deepenings/  CRUD
│   │   ├── families/    CRUD (Fireside Families)
│   │   ├── fireside-integration/   ← PDF batch import pipeline
│   │   ├── firesides/   CRUD
│   │   ├── integrate/   ← legacy single-PDF import (deprecated in favor of fireside-integration)
│   │   ├── references/  CRUD + validation
│   │   ├── snippets/    CRUD
│   │   └── tags/        CRUD
│   ├── firesides/       public fireside list + detail
│   ├── snippets/        public snippet detail
│   ├── profile/         user profile
│   ├── layout.tsx       root layout (IBM Plex fonts, providers)
│   └── page.tsx         dashboard/home
├── components/
│   ├── Navbar.tsx       ← consolidated nav with Admin dropdown
│   └── ui/              shadcn/ui primitives (button, input, label)
├── context/             AuthContext, ThemeContext
├── factories/           Base + domain factories (6 total)
├── repositories/        Base + domain repos (9 total, incl. IntegrationJob)
├── services/            authService, firestoreService, referenceService, pdfParserService, firesideIntegrationService
├── store/               useOutlineStore (Zustand)
├── types/               ALL TypeScript interfaces
└── lib/                 firebase.ts, seed.ts, utils.ts

DOCS/
├── SPEC.md              Full technical spec (15 sections)
├── ROADMAP.md           Phased roadmap
├── PROJECT-SUMMARY.md   High-level overview
└── FIREBASE_SETUP.md    Firebase config notes
```

---

## 5. Data Model

### Content Hierarchy
```
FiresideFamily (e.g. "General Firesides")
  └── Fireside (e.g. "Why Life")
      └── Snippet (atomic teaching unit, Markdown)
          └── Deepening (extended research text)
```

### Firestore Collections (12 total)
`user`, `firesideFamily`, `fireside`, `snippet`, `deepening`, `supportingMaterial`, `comment`, `tag`, `outline`, `media`, `references`, `integrationJobs`

**Key patterns:**
- `Snippet.tags`: `[{ tagId, weight (1-100), distance (1-10) }]`
- `Snippet.references` / `Deepening.references`: `[{ refId, page, context, relationshipType }]`
- `ReferenceEntity.citationFormat`: `apa-7 | chicago | bahai | religious | descriptive | custom`
- `IntegrationJob.processedPdfs`: tracks per-PDF batch processing state

### 7 Universal Fireside Categories
1. Why Life
2. The Proofs for Jesus Christ
3. The Proofs for Baha'U'llah
4. The Covenant
5. The Proofs for the Establisher
6. The Great Pyramid of Giza
7. The Lamb's Explanations and Commentaries on The Book of Revelations

---

## 6. Current State

### ✅ Completed (working & deployed)
- Authentication (Firebase Auth, login/signup/profile)
- Role-based access (SuperAdmin, Admin, Participant, Guest)
- Full admin CRUD: firesides, families, snippets, deepenings, references, tags
- Consolidated Navbar with "Admin" dropdown (2 sections: Content + Reference)
- **Fireside Integration Pipeline** (`/admin/fireside-integration`):
  - guide.md-driven import: define fireside transitions + PDF list + LLM instructions
  - One fireside at a time: process → preview → review/CRUD → approve → next
  - Local-first scratch space in **IndexedDB** (`src/lib/indexedDb.ts`): raw PDF blobs, parsed snippets, job cursor/status
  - **Firestore holds only final atoms** — `fireside`, `snippet` (+ `deepening` when flagged), written on "Approve Fireside"
  - Snippet preview with full CRUD: edit, delete/restore, status (IN-REVIEW/APPROVED/REJECTED/MERGED/DEEPENING/UNDER-RESEARCH), deepens flag, annotation notes
  - Checkpoint/resume across reloads via IndexedDB (`src/services/localIntegrationService.ts`)
  - Real PDF parsing via `pdfjs-dist` (`src/services/pdfParserService.ts`)
- Reference system with APA 7 + Chicago, parallel ref lookup

### 🚀 In Progress / Next Up (from ROADMAP)
- Phase 1: Content management completion (search, tag browsing)
- Phase 2: Outline editor (dnd-kit installed, UI not built)
- Phase 3: Tiptap editor integration

---

## 7. Key Commands

```bash
npm run dev              # Local dev on localhost:3000
npm run build            # Production build
npm run lint             # ESLint

# Firebase
firebase deploy                  # Deploy hosting + firestore rules + indexes
firebase deploy --only hosting   # Deploy only hosting
firebase deploy --only firestore:rules    # Deploy rules
firebase deploy --only firestore:indexes  # Deploy composite indexes

# Seed data
node -e "const seed = require('./src/lib/seed'); seed.seedData();"
```

---

## 8. Environment Variables

Defined in `.env.local` (gitignored). Template in `.env.local.example`:

```
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
NEXT_MEASUREMENT_ID
NEXT_PUBLIC_DEEPSEEK_API_KEY
NEXT_PUBLIC_DEEPSEEK_MODEL
NEXT_PUBLIC_DEEPSEEK_REASONER_MODEL   # optional, defaults to deepseek-chat
NEXT_PUBLIC_OLLAMA_BASE_URL
NEXT_PUBLIC_OLLAMA_MODEL
NEXT_PUBLIC_GEMINI_API_KEY            # for image labeling
```

---

## 9. Critical Gotchas (READ THIS)

These are hard-won lessons from previous sessions. Do **not** repeat these mistakes:

1. **`output: 'export'` was removed from `next.config.ts`**
   - It caused runtime errors: dynamic routes rejected real Firestore IDs because `generateStaticParams()` returned only `[{ id: '_' }]`
   - For Firebase static deploy: temporarily re-add `output: 'export'`, run `npm run build`, deploy `out/`, then remove it

2. **Dynamic routes use `generateStaticParams()` in `layout.tsx`, NOT in client pages**
   - `"use client"` pages cannot export `generateStaticParams()`
   - The `[id]/layout.tsx` files exist solely to satisfy static-export config

3. **`firestore.rules` needs EXACT collection names**
   - `integrationJobs` was missing, causing "Missing or insufficient permissions"
   - Every new collection MUST be added to `firestore.rules`

4. **`firestore.indexes.json` needs composite indexes**
   - `IntegrationJobRepository.findLatestPending()` queries `WHERE status IN [...] ORDER BY createdAt DESC`
   - This required a composite index on `status` + `createdAt`

5. **Firebase Factory validation requires non-empty strings**
   - `FiresideFamilyFactory` requires `description` — always pass `description || 'No description'`

6. **Button component has NO `destructive` or `asChild` variants**
   - Use raw `<button>` with Tailwind classes for destructive actions
   - Available variants: `default | outline | ghost | link | secondary`

7. **Null safety on Firestore data**
   - `snippet.text` / `deepening.text` can be `undefined` — always use `?.` before `.substring()`

8. **Firebase deploy 503 errors** are transient Google outages — retry `<component>` or deploy services separately (`--only hosting`, `--only firestore`)

---

## 10. Fireside Integration Pipeline (most complex feature)

**Location:** `src/app/admin/fireside-integration/page.tsx` + `src/services/localIntegrationService.ts` + `src/lib/indexedDb.ts`

**Architecture:** IndexedDB scratch space + Firestore for final atoms only. Intermediate parse state (raw PDF blobs, parsed snippets, job cursor) lives in IndexedDB; Firestore receives only the finalized `fireside` + `snippet`(+`deepening`) entities on approval.

**Workflow (one fireside at a time):**
1. Admin uploads `guide.md` (defines PDF list + fireside transitions + LLM instructions) and the raw PDFs it references.
2. Create job → stored entirely in IndexedDB (`integrationDb`).
3. "Process This Fireside" — `pdfjs-dist` parses the current fireside's page range and groups text into 30–50 word snippets (`localIntegrationService.processCurrentFireside`).
4. Preview + full CRUD: edit, delete/restore, status change, deepens flag, annotation notes — every action persists to IndexedDB.
5. "Approve Fireside" — writes final atomized `fireside` + `snippet`(+`deepening`) into Firestore, then advances the cursor.
6. Reload-safe: resume from the IndexedDB cursor; PDFs and progress persist in-browser.

**guide.md format:**
```
# Fireside Family: General Firesides
## Fireside Transitions
| # | Fireside | PDF | Page |
|---|----------|-----|------|
| 1 | Why Life | raw-collection-1.pdf | 1 |
## PDF Files
- raw-collection-1.pdf
## LLM Instructions
...
```

**Note:** There are TWO import pages — `/admin/integrate` (legacy, single PDF, manual) and `/admin/fireside-integration` (new, guide.md-driven, one-fireside-at-a-time). New work should go into `fireside-integration`.

---

## 11. Design Conventions

- **Styling**: Tailwind utility classes with theme tokens (`bg-card`, `text-muted-foreground`, `border-border`, `bg-primary`, `text-primary-foreground`)
- **Components**: Reuse `src/components/ui/*` (Button, Input, Label). Don't create duplicate primitives.
- **Icons**: `lucide-react` only
- **Client components**: Mark with `'use client'` at top where using hooks
- **Auth guards**: Each admin page starts with `useEffect` checking `profile.role`
- **Page layout**: `max-w-6xl mx-auto space-y-6` for admin, `max-w-4xl mx-auto` for public

---

## 12. Documentation Sync Requirements

When making changes, keep these docs in sync:
- `DOCS/SPEC.md` — the authoritative technical spec
- `DOCS/PROJECT-SUMMARY.md` — high-level features & status
- `DOCS/ROADMAP.md` — phased progress
- `AGENTS.md` — this file (update "Current State" when completing features)

---

## Quick Reference: Where Things Live

| Need | File |
|---|---|
| Add a new entity | `src/types/index.ts` + `src/repositories/NewRepo.ts` + `src/factories/NewFactory.ts` |
| Add a Firestore collection | `firestore.rules` (+ `firestore.indexes.json` if querying) |
| Add an admin page | `src/app/admin/<feature>/page.tsx` + Navbar dropdown entry |
| LLM integration | `src/services/referenceService.ts` (patterns), `src/services/firesideIntegrationService.ts` |
| AI provider fallback | DeepSeek → Ollama → mock (see `referenceService.ts` PROVIDERS) |