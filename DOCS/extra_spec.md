# Fireside Project – Full Technical Specification

## 1. Project Overview

**Fireside** is a web-based and locally mirrorable system for collecting, searching, composing, and exporting short-form BUPC (Bahá’í) fireside deepenings. Content is stored as atomic snippets and assembled into teaching outlines. The system integrates a self-hosted, open-source AI for semantic search, suggestion, and outline assistance.

Primary goals:

* Fast retrieval of short authoritative deepenings
* Easy composition of outlines for teaching and reference
* Clean export to PDF / Markdown
* Privacy-respecting AI assistance
* Simple mirroring for local or LAN-only use

---

## 2. Core Design Principles

* **Markdown-first** content model
* **Atomic snippets, composable outlines**
* **Offline-capable / mirrorable** architecture
* **No vendor lock-in** for content
* **AI-augmented, not AI-dependent**

---

## 3. Technology Stack

### Frontend

* **Next.js (App Router)**
* React
* Tailwind CSS
* Tiptap (WYSIWYG → Markdown)
* react-markdown (preview rendering)

### Backend

* Firebase

  * Firestore (document database)
  * Firebase Authentication
  * Cloud Functions (API + AI bridge)
  * Firebase Hosting

### AI Layer

* Self-hosted, open-source LLM

  * Ollama / Mistral / Llama 3 (pluggable)
* Runs as Docker container
* Accessed via REST API

### Local / Offline

* Firebase Emulator Suite
* Docker Compose (AI + app)
* Static export support

---

## 4. User Roles

### Anonymous User

* Browse public snippets
* Search and preview content

### Authenticated User

* Create/edit snippets
* Create/save outlines
* Export outlines
* Private collections

### Admin (optional)

* Approve canonical snippets
* Manage tags/sources
* Moderate content

---

## 5. Data Model (Firestore)

### Snippets Collection

```json
snippets/{snippetId} {
  markdown: string,
  title: string,
  tags: string[],
  source: string,
  author: string,
  createdAt: timestamp,
  updatedAt: timestamp,
  visibility: "public" | "private"
}
```

### Outlines Collection

```json
outlines/{outlineId} {
  userId: string,
  title: string,
  markdown: string,
  snippetRefs: string[],
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### Users Collection

```json
users/{userId} {
  name: string,
  email: string,
  role: "user" | "admin",
  createdAt: timestamp
}
```

---

## 6. Content Workflow

### Snippet Creation

1. User opens WYSIWYG editor
2. Content entered visually
3. Stored as Markdown
4. Tagged and sourced

### Outline Composition

1. User searches snippets
2. Selects snippets
3. Snippets combined into outline Markdown
4. User edits transitions/headings
5. Outline saved

---

## 7. Editor Specification

* **Tiptap** editor
* Supported formatting:

  * Headings
  * Bold / Italic
  * Quotes
  * Lists
  * Links
* No raw HTML
* Markdown serialization only

---

## 8. Search System

### Basic Search

* Firestore text + tag search

### AI-Enhanced Search

* Semantic query → AI
* AI returns ranked snippet IDs
* No AI content rewriting by default

---

## 9. AI Integration

### Capabilities

* Semantic snippet discovery
* Suggested snippet groupings
* Optional outline suggestions

### Constraints

* AI never overwrites source text
* AI outputs references, not doctrine
* Fully optional layer

---

## 10. Export System

### Supported Formats

* Markdown (.md)
* PDF

### PDF Pipeline (Server-side)

1. Markdown → HTML
2. HTML → PDF (Puppeteer)
3. Download or email

---

## 11. Authentication & Security

* Firebase Auth (Email / OAuth optional)
* Firestore security rules:

  * Public read
  * Private write
  * User-owned outlines

---

## 12. Local / Offline Mirroring

### Supported Modes

* Full local Firebase emulator
* LAN-only deployment
* Static snapshot export

### Data Portability

* Markdown files exportable
* JSON snapshot support
* Git-friendly structure

---

## 13. Deployment

### Cloud

* Firebase Hosting
* Cloud Functions

### Local

* Docker Compose
* `.env` driven configuration

---

## 14. Non-Goals

* No social network features
* No AI-generated doctrine
* No proprietary content lock-in

---

## 15. Roadmap (High Level)

### Phase 1

* Snippets
* Search
* Markdown editor

### Phase 2

* Outlines
* PDF export

### Phase 3

* AI semantic layer

### Phase 4

* Offline mirror tooling

---

## 16. Guiding Principle

> **The system exists to support teaching and consultation, not to replace them.**
