# Fireside Archive

A web-based and locally mirrorable system for archiving BUPC (Bahá'í) fireside content. Build custom teaching outlines from atomic snippets with AI-assisted search.

## Features

- 🔥 **Fireside Content Management**: Store and organize talks, snippets, and deepenings
- 📝 **Markdown-First**: All content stored as portable Markdown
- 🎨 **Outline Editor**: Drag-and-drop interface to create custom teaching outlines
- 🤖 **AI-Assisted Search**: Semantic search powered by local LLM (planned)
- 🔒 **Privacy-Respecting**: Role-based access with offline capability
- 📦 **Export Options**: PDF, Markdown, and static HTML

## Tech Stack

- **Frontend**: Next.js 15 (App Router) + TypeScript
- **Styling**: Tailwind CSS
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth
- **State**: Zustand
- **Patterns**: Repository + Factory

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Firebase project (see [setup guide](DOCS/SPEC.md))

### Installation

```bash
# Clone the repository
git clone https://github.com/ntjson2/FIRESIDE_ARCHIVE.git
cd FIRESIDE_ARCHIVE

# Install dependencies
npm install

# Setup environment variables
cp .env.local.example .env.local
# Edit .env.local with your Firebase credentials

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Project Structure

```
FIRESIDE_ARCHIVE/
├── src/
│   ├── app/              # Next.js App Router pages
│   ├── components/       # React components
│   ├── factories/        # Entity creation logic
│   ├── repositories/     # Data access layer
│   ├── services/         # Business logic
│   ├── types/           # TypeScript definitions
│   └── lib/             # Utilities & Firebase config
├── DOCS/                # Project documentation
│   ├── SPEC.md         # Technical specification
│   ├── ROADMAP.md      # Project roadmap
│   └── tasks.md        # Implementation tasks
└── public/             # Static assets
```

## Documentation

- **[Technical Specification](DOCS/SPEC.md)**: Complete project requirements and architecture
- **[Roadmap](DOCS/ROADMAP.md)**: Detailed project phases, progress tracking, and task breakdown
- **[AI Instructions](.github/copilot-instructions.md)**: Guide for AI coding agents

## Available Commands

```bash
npm run dev          # Start development server
npm run build        # Create production build
npm run start        # Start production server
npm run lint         # Run ESLint
```

## Core Concepts

### Data Hierarchy
- **FiresideFamily** → **Fireside** → **Snippet** → **Deepening**
- Each level can have tags, media, and comments
- Users create **Outlines** by composing snippets/deepenings

### Repository Pattern
All database operations go through repositories:
```typescript
import { firesideRepository } from '@/repositories';
const firesides = await firesideRepository.findAll();
```

### Factory Pattern
Entities are created and validated through factories:
```typescript
import { FiresideFactory } from '@/factories';
const factory = new FiresideFactory();
const fireside = factory.create({ name, description, ... });
```

## Contributing

This is an active project. See [ROADMAP.md](DOCS/ROADMAP.md) for current priorities.

## License

See [LICENSE](LICENSE) file for details.

---

## Learn More About Next.js

- [Next.js Documentation](https://nextjs.org/docs)
- [Learn Next.js](https://nextjs.org/learn)
