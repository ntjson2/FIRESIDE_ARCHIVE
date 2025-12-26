# Fireside Archive - Project Roadmap

## 🎯 Vision
Build a privacy-respecting, offline-capable archive for BUPC fireside content with AI-augmented search and outline creation capabilities.

---

## ✅ Where We've Been (Completed)

### Foundation & Architecture ✓
- ✅ Next.js 15 (App Router) project initialized with TypeScript
- ✅ Tailwind CSS configured
- ✅ Firebase project setup (Firestore + Authentication)
- ✅ Environment configuration (`.env.local`)
- ✅ Project structure established
- ✅ Zustand installed and configured
- ✅ UI components: `lucide-react` icons, `clsx`, `tailwind-merge`

### Core Patterns ✓
- ✅ Repository pattern implemented
  - BaseRepository with CRUD operations (`findAll`, `findById`, `findWhere`, `save`, `update`, `delete`)
  - Domain-specific repositories: FiresideFamilyRepository, FiresideRepository, SnippetRepository, DeepeningRepository, OutlineRepository, MediaRepository
- ✅ Factory pattern implemented
  - BaseFactory with validation & timestamp helpers
  - Entity-specific factories: FiresideFamilyFactory, FiresideFactory, SnippetFactory, DeepeningFactory
- ✅ TypeScript type definitions
  - Complete type system in `src/types/index.ts`
  - BaseEntity interface with timestamps
  - All domain entities defined

### Authentication ✓
- ✅ Firebase Auth integration
- ✅ AuthContext provider created
- ✅ Auth layout and routes (`(auth)` group)
- ✅ Login page implemented
- ✅ Signup page implemented
- ✅ User profile page
- ✅ Role-based access patterns (Participant, Admin, SuperAdmin, Guest)
- ✅ User collection with role management

### UI Components ✓
- ✅ Navbar component with auth state
- ✅ shadcn/ui primitives (button, input, label)
- ✅ Layout structure

### Documentation ✓
- ✅ Comprehensive SPEC.md
- ✅ AI agent instructions (`.github/copilot-instructions.md`)
- ✅ Project ROADMAP
- ✅ Updated README with project overview

---

## 📍 Where We Are (In Progress)

### Current Sprint: Content Management & Seed Data

#### Completed Recently
- ✅ Repository/Factory pattern fully implemented
- ✅ Legacy service layer migrated to repositories
- ✅ Documentation consolidated and organized

#### Active Work
- 🔄 **Seed Data Script**: Populate Firestore with initial Fireside and Snippet data for testing
- 🔄 **Admin Seed Page**: Create `/admin/seed` page for data initialization
- 🔄 **Testing**: Verify repository & factory patterns with real data

#### Next Immediate Tasks
- ⏳ **Fireside Views**: 
  - List all firesides (read-only initially)
  - View fireside details page
  - Display associated snippets
- ⏳ **Snippet Management**:
  - Browse snippets by fireside
  - View snippet details with metadata
  - Display tags, natural order
- ⏳ **Basic Search**: Text search across snippets and firesides

---

## 🚀 Where We're Going (Upcoming Phases)

### Phase 1: Content Management (Current - Q1 2026)
**Goal**: Enable full CRUD operations for all content types

#### Stage 1.1: Read-Only Views (In Progress)
- [x] Seed data script
- [ ] **Fireside Listing Page**
  - [ ] Display all firesides with families
  - [ ] Filter by fireside family
  - [ ] Sort by date
  - [ ] Search by name/description
- [ ] **Fireside Detail Page**
  - [ ] Show fireside metadata (name, description, date)
  - [ ] List associated snippets in natural order
  - [ ] Navigation to snippet details
- [ ] **Snippet Detail Page**
  - [ ] Display snippet content (Markdown rendered)
  - [ ] Show tags with weight/distance
  - [ ] Show natural order
  - [ ] Link to parent fireside
  - [ ] List associated deepenings

#### Stage 1.2: Admin CRUD - Snippets
- [ ] **Create Snippet Form**
  - [ ] Basic text input (textarea initially)
  - [ ] Select parent fireside
  - [ ] Set natural order
  - [ ] Add tags with weight/distance UI
  - [ ] Set visibility (public/private)
  - [ ] Preview rendered Markdown
- [ ] **Edit Snippet Form**
  - [ ] Load existing snippet
  - [ ] Update all fields
  - [ ] Auto-save functionality
- [ ] **Delete Snippet**
  - [ ] Confirmation dialog
  - [ ] Cascade considerations
  
#### Stage 1.3: Admin CRUD - Deepenings
- [ ] **Create Deepening Form**
  - [ ] Link to parent snippet
  - [ ] Text editor for content
  - [ ] Tag management
  - [ ] Media attachment (future)
- [ ] **Edit Deepening**
  - [ ] Update deepening content
  - [ ] Manage tags
- [ ] **Delete Deepening**
  - [ ] Confirmation with snippet reference

#### Stage 1.4: Admin CRUD - Firesides & Families
- [ ] **FiresideFamily Management**
  - [ ] Create family (name, description)
  - [ ] Edit family
  - [ ] Delete family (with cascade checks)
- [ ] **Fireside Management**
  - [ ] Create fireside (manual entry)
  - [ ] Edit fireside metadata
  - [ ] Delete fireside (with snippet cascade)
  - [ ] Move fireside between families

#### Stage 1.5: Search & Discovery
- [ ] **Basic Search**
  - [ ] Full-text search across snippets
  - [ ] Filter by tags
  - [ ] Filter by fireside family
  - [ ] Search results page
  - [ ] Relevance sorting
- [ ] **Tag System**
  - [ ] Tag autocomplete
  - [ ] Tag cloud view
  - [ ] Tag detail page (all content with tag)
  - [ ] Tag weight/distance visualization
- [ ] **Navigation Improvements**
  - [ ] Breadcrumb navigation
  - [ ] Related content suggestions
  - [ ] Recent activity feed

---

### Phase 2: Outline Editor (Q2 2026)
**Goal**: Enable users to create custom teaching outlines

#### Stage 2.1: Editor UI
- [ ] **Layout Design**
  - [ ] Split-pane interface (Library | Canvas)
  - [ ] Resizable panels
  - [ ] Responsive design for tablets
  - [ ] Toolbar with actions
- [ ] **Library Panel (Source)**
  - [ ] Search snippets/deepenings
  - [ ] Filter by tags/firesides
  - [ ] Preview on hover
  - [ ] Drag handles
  - [ ] Pagination for large lists

#### Stage 2.2: Drag & Drop System
- [ ] **dnd-kit Implementation**
  - [ ] Install and configure dnd-kit
  - [ ] Draggable source items (Library)
  - [ ] Droppable canvas area
  - [ ] Smooth animations
  - [ ] Mobile-friendly touch support
- [ ] **Canvas Logic**
  - [ ] Drop items from library
  - [ ] Reorder items in outline
  - [ ] Nested structures (chapters/sections)
  - [ ] Multi-select and bulk operations
  - [ ] Copy/duplicate items

#### Stage 2.3: Outline Management
- [ ] **Outline Operations**
  - [ ] Create new outline
  - [ ] Save outline (manual + auto-save every 5s)
  - [ ] Load saved outlines
  - [ ] Rename outline
  - [ ] Delete outline
  - [ ] Duplicate outline as template
- [ ] **Visibility Controls**
#### Stage 3.1: Editor Setup
- [ ] **Installation**
  - [ ] Install Tiptap and extensions
  - [ ] Configure Markdown parser/serializer
  - [ ] Set up custom styling
  - [ ] Test Markdown round-trip (edit → save → load)

#### Stage 3.2: Editor Features
- [ ] **Basic Formatting**
  - [ ] Headings (H1-H6) with toolbar
  - [ ] Bold, Italic, Underline
  - [ ] Strikethrough, Code
  - [ ] Clear formatting
- [ ] **Blocks**
  - [ ] Paragraphs
  - [ ] Blockquotes
  - [ ] Code blocks with syntax highlighting
  - [ ] Horizontal rules
- [ ] **Lists**
  - [ ] Ordered lists
  - [ ] Unordered lists
  - [ ] Task lists (checkboxes)
  - [ ] Nested lists
- [ ] **Links**
  - [ ] Insert/edit links
  - [ ] Link preview
  - [ ] Auto-link detection
- [ ] **Advanced**
  - [ ] Tables (optional)
  - [ ] Mention system (tag references)
  - [ ] Emoji support
  - [ ] Keyboard shortcuts

#### Stage 3.3: Integration Points
- [ ] **Snippet Editor**
  - [ ] Replace textarea with Tiptap
  - [ ] Preview toggle (editor/rendered)
  - [ ] Word count
  - [ ] Character limit warnings
- [ ] **Deepening Editor**
  - [ ] Full Tiptap integration
  - [ ] Extended editing features
  - [ ] Media embedding
- [ ] **Outline Editor Enhancement**
  - [ ] Edit items inline in canvas
  - [ ] Rich text transitions between items
  - [ ] Collapsible sections with styled headersaving/saved)
  - [ ] Conflict detection
  - [ ] Session timeout handling
- [ ] **Persistence**
  - [ ] Save to Firestore `outlines` collection
  - [ ] Load outline by ID
  - [ ] Handle concurrent edits

#### Stage 2.5: Export System
- [ ] **Markdown Export**
  - [ ] Generate Markdown from outline
  - [ ] Include headings and structure
  - [ ] Preserve formatting
  - [ ] Download .md file
- [ ] **PDF Export**
  - [ ] Server-side generation (Puppeteer)
  - [ ] Styled PDF template
  - [ ] Page breaks and formatting
  - [ ] Download or email
- [ ] **Static HTML + Images**
  - [ ] Generate standalone HTML
  - [ ] Bundle images from media
  - [ ] Create ZIP file
  - [ ] Self-contained archive

#### Stage 4.1: RAG Service Setup
- [ ] **Vector Database**
  - [ ] Choose provider (Pinecone, Weaviate, or Supabase)
  - [ ] Set up vector database
  - [ ] Configure embeddings model (text-embedding-3-small)
  - [ ] Design schema for snippets/deepenings
- [ ] **Embedding Pipeline**
  - [ ] Create embedding generation script
  - [ ] Embed all existing snippets
  - [ ] Embed deepenings
  - [ ] Automatic embedding on new content
  - [ ] Re-embedding on updates
- [ ] **Semantic Search**
  - [ ] Implement vector similarity search
  - [ ] Hybrid search (keyword + semantic)
  - [ ] Result ranking and scoring
  - [ ] Context window management

#### Stage 4.2: Cloud AI Client
- [ ] **API Integration**
  - [ ] Set up Groq or Together AI account
  - [ ] Configure API keys and rate limits
  - [ ] Select model (Llama 3 or Mistral)
  - [ ] Error handling and retries
- [ ] **Prompt Engineering**
  - [ ] System prompts for BUPC context
  - [ ] Few-shot examples
  - [ ] Citation formatting
  - [ ] No content rewriting rules
#### Stage 5.1: Ollama Integration
- [ ] **Setup**
  - [ ] Ollama installation guide
  - [ ] Model download instructions (Llama 3, Mistral)
  - [ ] Performance benchmarking
  - [ ] Hardware requirements documentation
- [ ] **API Client Update**
  - [ ] Detect localhost:11434 availability
  - [ ] Fallback to cloud if local unavailable
  - [ ] Configuration toggle (cloud/local)
  - [ ] Health check and monitoring

#### Stage 5.2: Fine-Tuning Pipeline
- [ ] **Dataset Preparation**
  - [ ] Export all snippets/deepenings to JSONL
  - [ ] Create instruction-tuning format
  - [ ] Generate Q&A pairs
  - [ ] Split train/validation sets
- [ ] **QLoRA Training**
  - [ ] Set up training environment
  - [ ] Configure LoRA parameters
  - [ ] Train adapter on BUPC content
  - [ ] Evaluate adapter performance
  - [ ] Iterate on training data
- [ ] **Model Distribution**
  - [ ] Create Ollama Modelfile
  - [ ] Package adapter for distribution
  - [ ] Version control for models
  - [ ] Update documentation

#### Stage 5.3: Local Vector Store
- [ ] **Setup**
  - [ ] Choose local solution (Chroma, LanceDB)
  - [ ] Install and configure
  - [ ] Migration from cloud vector DB
- [ ] **Embedding Generation**
  - [ ] Use local embedding model
  - [ ] Batch processing for performance
  - [ ] Index optimization
  - [ ] Incremental updates

#### Stage 5.4: Deployment
- [ ] **Docker Compose**
  - [ ] Ollama container configuration
  - [ ] Vector DB container
  - [ ] Network configuration
  - [ ] Volume mounts for models
- [ ] **Startup Scripts**
  - [ ] One-command startup
  - [ ] Model loading verification
  - [ ] Service health checks
  - [ ] Graceful shutdown
- [ ] **Documentation**
  - [ ] System requirements (RAM, GPU)
  - [ ] Step-by-step setup guide
  - [ ] Troubleshooting guide
  - [ ] Performance tuning tips
#### Stage 4.4: AI-Assisted Features
- [ ] **Semantic Discovery**
  - [ ] "Find similar snippets" button
  - [ ] Query expansion suggestions
  - [ ] Related topics
- [ ] **Outline Suggestions**
  - [ ] "Suggest outline structure" for topic
  - [ ] AI-recommended snippet groupings
  - [ ] Generate outline template
- [ ] **Tag Recommendations**
  - [ ] Auto-suggest tags for new content
  - [ ] Tag similarity analysis
  - [ ] Weight/distancee preview mode

---

### Phase 4: AI Integration - Cloud Prototype (Q3 2026)
**Goal**: AI-assisted search and outline suggestions (cloud-based)

- [ ] **RAG Service**
  - [ ] Vector database setup (Pinecone or similar)
  - [ ] Embed all snippets/deepenings
  - [ ] Semantic search implementation
  - [ ] Context injection logic

- [ ] **Cloud AI Client**
  - [ ] Groq/Together AI API integration
  - [ ] Llama 3 model selection
  - [ ] Prompt engineering for BUPC context
#### Stage 7.1: Firebase Emulator
- [ ] **Setup**
  - [ ] Full emulator suite installation
  - [ ] Firestore emulator config
  - [ ] Auth emulator config
  - [ ] Storage emulator (if needed)
- [ ] **Data Seeding**
  - [ ] Export production data script
  - [ ] Import to emulator script
  - [ ] Sample data generation
  - [ ] Automated seeding on startup

#### Stage 7.2: Static Export
- [ ] **Site Generation**
  - [ ] Generate static HTML for all pages
  - [ ] Pre-render content
  - [ ] Build-time data fetching
  - [ ] Asset optimization
- [ ] **Markdown Files**
  - [ ] Export all content to .md files
  - [ ] Organize by fireside/family
  - [ ] Include metadata (frontmatter)
  - [ ] Git-friendly structure
- [ ] **JSON Snapshots**
  - [ ] Full database export
  - [ ] Versioned snapshots
  - [ ] Import/restore functionality
  - [ ] Diff tools for changes

#### Stage 7.3: LAN Deployment
- [ ] **Docker Containerization**
  - [ ] Multi-stage build
  - [ ] Production Dockerfile
  - [ ] Docker Compose for full stack
  - [ ] Environment configuration
- [ ] **Network Configuration**
  - [ ] LAN discovery
  - [ ] mDNS/Bonjour setup
  - [ ] Port configuration
  - [ ] SSL/TLS for local network
- [ ] **Offline-First**
  - [ ] Service workers
  - [ ] Cache strategies
  - [ ] Background sync
  - [ ] Offline indicators

#### Stage 7.4: Mirroring & Backup Tools
- [ ] **Backup Utilities**
  - [ ] One-click full backup
  - [ ] Incremental backups
  - [ ] Backup verification
  - [ ] Cloud backup option
- [ ] **Data Migration**
  - [ ] Export wizard
  - [ ] Import wizard
  - [ ] Format conversion tools
  - [ ] Validation and error handling
- [ ] **Version Control**
  - [ ] Git integration for content
  - [ ] Change tracking
  - [ ] Merge conflict resolution
  - [ ] Collaboration workflowsost:11434
  -📚 Documentation References

- **[SPEC.md](SPEC.md)**: Complete technical specification
- **[README.md](../README.md)**: Project overview and quick start
- **[copilot-instructions.md](../.github/copilot-instructions.md)**: AI agent guidance

---

**Last Updated**: December 25, 2025  
**Current Phase**: Phase 1 - Stage 1.1 (Content Management - Read-Only Views
  - [ ] Docker Compose configuration
  - [ ] Startup scripts
  - [ ] Resource requirements documentation

---

### Phase 6: Advanced Features (2027)
**Goal**: Enhanced collaboration and administration

- [ ] **Media Management**
  - [ ] IPFS integration
  - [ ] Image upload/attachment
  - [ ] Media gallery
  - [ ] Thumbnail generation

- [ ] **Comments System**
  - [ ] Comment on snippets/deepenings
  - [ ] Threaded discussions
  - [ ] Moderation tools

- [ ] **Supporting Materials**
  - [ ] Link multiple sources
  - [ ] Cross-references
  - [ ] Citation management

- [ ] **Audit Logging**
  - [ ] Track all content changes
  - [ ] User activity logs
  - [ ] Admin review interface

- [ ] **User Management**
  - [ ] Role assignment (SuperAdmin only)
  - [ ] Permission controls
  - [ ] User activity metrics

---

### Phase 7: Offline & Local Deployment (2027)
**Goal**: Complete offline capability

- [ ] **Firebase Emulator**
  - [ ] Full emulator suite setup
  - [ ] Data seeding scripts
  - [ ] Local development instructions

- [ ] **Static Export**
  - [ ] Generate static site
  - [ ] Markdown file exports
  - [ ] Git-friendly structure
  - [ ] JSON snapshots

- [ ] **LAN Deployment**
  - [ ] Docker containerization
  - [ ] Network configuration
  - [ ] Offline-first service workers
  - [ ] Data synchronization

- [ ] **Mirroring Tools**
  - [ ] Backup/restore utilities
  - [ ] Data migration scripts
  - [ ] Version control integration

---

## 🎨 Design Philosophy Throughout

### Core Principles (Maintained Across All Phases)
- **Markdown-First**: All content stored as portable Markdown
- **Atomic Content**: Snippets are self-contained, composable units
- **Privacy-Respecting**: User data stays local when possible
- **AI-Augmented, Not Dependent**: System fully functional without AI
- **No Vendor Lock-In**: Export capabilities at every layer
- **Offline-Capable**: Work without internet connectivity

### Non-Goals (What We're NOT Building)
- ❌ Social networking features
- ❌ AI-generated doctrine or teachings
- ❌ Proprietary content formats
- ❌ Cloud-only architecture
- ❌ Subscription or paywall systems

---

## 📊 Success Metrics

### Phase 1-3
- 100+ snippets successfully stored and searchable
- 10+ users creating and exporting outlines
- <500ms average page load time

### Phase 4-5
- AI semantic search accuracy >85%
- Local AI running on consumer hardware
- <2s response time for AI queries

### Phase 6-7
- Full offline functionality
- Successful LAN deployments in 3+ locations
- Complete data portability demonstrated

---

## 🤝 Contributing & Feedback

This roadmap is a living document. Priorities may shift based on:
- User feedback and needs
- Technical discoveries
- Resource availability
- Community contributions

For detailed implementation tasks, see [tasks.md](tasks.md).  
For technical specifications, see [SPEC.md](SPEC.md).

---

**Last Updated**: December 25, 2025  
**Current Phase**: Phase 1 (Content Management)  
**Target Production**: Q2 2027
