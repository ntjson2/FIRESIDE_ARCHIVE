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

## Common Terminal Commands

### Development

```bash
# Start development server on port 3000
npm run dev

# Start on custom port (e.g., 3001)
npm run dev -- -p 3001

# Build for production
npm run build

# Start production server (after build)
npm run start

# Check TypeScript compilation
npx tsc --noEmit

# Run linter
npm run lint

# Fix linting errors automatically
npx eslint src --fix
```

### Testing & Validation

```bash
# Seed Firestore with test data
# (Run this once at project start)
node -e "const seed = require('./src/lib/seed'); seed.seedData();"

# View Firebase Firestore console
firebase firestore:inspect

# Check Firebase project status
firebase projects:list

# Validate firestore.rules
firebase deploy --only firestore:rules --dry-run
```

### Firebase Deployment

```bash
# Login to Firebase
firebase login

# Deploy everything (functions, hosting, firestore)
firebase deploy

# Deploy only Firestore rules
firebase deploy --only firestore

# Deploy only Firestore indexes
firebase deploy --only firestore:indexes

# Deploy with dry-run (preview changes without applying)
firebase deploy --dry-run

# View deployment history
firebase deploy:log
```

### Database Management

```bash
# Export Firestore data
firebase firestore:delete --export-path ./backup --all-collections

# Import Firestore data from backup
firebase firestore:delete --all-collections --yes && firebase firestore:import ./backup

# Clear entire database (WARNING: destructive)
firebase firestore:delete --all-collections --yes

# View specific collection in Firestore
firebase firestore:get --collection references --limit 10

# Watch collection changes in real-time
firebase firestore:query collections/snippets --limit 5
```

### Local Development (WSL/Linux)

```bash
# If running in WSL, build context might be needed
# Kill hung dev processes
pkill -9 -f "next dev"

# Restart dev server
npm run dev

# Check if port 3000/3001 is in use
lsof -i :3000

# Kill process on specific port
kill -9 $(lsof -t -i:3000)
```

### Environment & Configuration

```bash
# View current environment variables
cat .env.local

# Validate required env vars are set
grep -E "NEXT_PUBLIC|GEMINI_API_KEY" .env.local

# Recreate env file from example
cp .env.local.example .env.local
# Then edit with your credentials
```

### Code Quality

```bash
# Run full type check
npx tsc --noEmit --listFiles

# Find unused imports/variables
npx eslint src --no-eslintrc --parser-options=ecmaVersion:12

# Format code with Prettier (if configured)
npx prettier --write "src/**/*.{ts,tsx}"
```

### Debugging

```bash
# Enable verbose logging for Next.js
DEBUG=* npm run dev

# Check build size
npm run build && npm ls

# View compiled code size
npx next build --analyze

# Inspect TypeScript errors in detail
npx tsc src/**/*.tsx --noEmit --pretty false
```

### Cleanup & Maintenance

```bash
# Remove node_modules and reinstall
rm -rf node_modules package-lock.json && npm install

# Clean build artifacts
rm -rf .next && npm run build

# Clear Firebase cache
rm -rf ~/.cache/firebase

# Check for outdated dependencies
npm outdated

# Update all dependencies
npm update
```

### Quick Reference: Before Deployment

```bash
# 1. Update environment variables
nano .env.local

# 2. Check types and linting
npx tsc --noEmit && npm run lint

# 3. Build locally
npm run build

# 4. Verify Firestore rules
firebase deploy --only firestore --dry-run

# 5. Deploy to Firebase
firebase deploy
```

---



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
