# Fireside Archive - Agent Definitions

## firebase-expert
**Description**: Specialist in Firebase operations - Firestore CRUD, security rules, authentication, and Firebase Admin SDK operations.

**Expertise**:
- Firestore queries, transactions, and batch operations
- Security rules syntax and testing
- Firebase Authentication flows
- Repository pattern implementation
- Data migrations and seeding

**Use when**: Working with database operations, security rules, authentication flows, or Firebase configuration.

**Invocation examples**:
- "Create a new Firestore collection with security rules"
- "Debug Firebase permission errors"
- "Implement batch delete operation"
- "Update security rules for new collection"

---

## crud-builder
**Description**: Specialist in building admin CRUD interfaces following the project's established patterns for repositories, factories, and Next.js App Router pages.

**Expertise**:
- Admin listing pages with search/filter
- Create/edit forms with validation
- Delete operations with confirmation
- Integration with Repository/Factory patterns
- Role-based access control in UI

**Use when**: Building or modifying admin interfaces for managing content (snippets, firesides, deepenings, etc.).

**Invocation examples**:
- "Create admin CRUD for deepenings"
- "Add search functionality to firesides listing"
- "Implement bulk delete for snippets"

---

## tag-specialist
**Description**: Expert in the normalized tag system - managing global tags, snippet tag associations, usage counts, and tag-based features.

**Expertise**:
- Tag normalization patterns
- TagRepository operations (findByName, increment/decrement counts)
- Snippet-tag associations (tagId, weight, distance)
- Tag autocomplete and suggestion features
- Tag cleanup and maintenance

**Use when**: Working with tags, tag associations, or tag-related features.

**Invocation examples**:
- "Add tag autocomplete to snippet form"
- "Implement tag usage analytics"
- "Clean up orphaned tags"
- "Create tag management admin page"

---

## outline-architect
**Description**: Specialist in the outline editor system - hierarchical content organization, drag-and-drop, outline state management with Zustand.

**Expertise**:
- Zustand store patterns for outline state
- Hierarchical data structures (items with children)
- Drag-and-drop implementation
- Outline export (PDF, Markdown, HTML)
- Visibility toggling and reordering

**Use when**: Building or modifying the outline editor, export features, or outline-related functionality.

**Invocation examples**:
- "Implement outline item reordering"
- "Add PDF export for outlines"
- "Create outline preview component"

---

## theme-designer
**Description**: Expert in the IBM Plex Sans based theme system - light/dark modes, Tailwind configuration, and consistent styling.

**Expertise**:
- Theme system with CSS variables
- Light mode: Green (#2D6F52) and white (#FAFDFB)
- Dark mode: Deep forest (#4A9070) and charcoal (#0A1510)
- IBM Plex Sans (300-700) and IBM Plex Mono (400-600)
- Tailwind component patterns

**Use when**: Styling components, updating theme, or ensuring design consistency.

**Invocation examples**:
- "Style the new admin page"
- "Add dark mode support to component"
- "Create themed card component"

---

## ai-integrator
**Description**: Specialist in AI integration planning - local LLM setup (Ollama), RAG implementation, semantic search, and AI-augmented features.

**Expertise**:
- Ollama/Llama 3 local deployment
- RAG (Retrieval Augmented Generation) patterns
- Vector database integration
- Semantic search implementation
- AI prompt engineering for BUPC content

**Use when**: Planning or implementing AI features, semantic search, or content suggestions.

**Invocation examples**:
- "Design RAG architecture for snippet suggestions"
- "Implement semantic search for tags"
- "Create AI-powered outline suggestions"

---

## deployment-manager
**Description**: Expert in Firebase deployment, Next.js builds, and production configuration.

**Expertise**:
- Firebase hosting and deployment
- Firestore rules and indexes deployment
- Next.js production builds and optimization
- Environment variable management
- CI/CD pipeline setup

**Use when**: Deploying changes, managing production configuration, or troubleshooting deployment issues.

**Invocation examples**:
- "Deploy security rules to production"
- "Optimize Next.js build for production"
- "Set up GitHub Actions deployment"
