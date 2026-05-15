# Agent & Skills System

This directory contains AI coding assistant configuration for the Fireside Archive project.

## Structure

```
.github/
├── copilot-instructions.md    # Main instructions for GitHub Copilot
├── AGENTS.md                   # Specialized agent definitions
├── skills/                     # Step-by-step guides for common tasks
│   ├── crud-page-builder.md
│   ├── repository-factory-creator.md
│   ├── tag-management.md
│   └── firebase-operations.md
└── README.md                   # This file
```

## How to Use

### For Developers

When working with GitHub Copilot in this project:

1. **General Tasks**: Copilot automatically uses `copilot-instructions.md` for context
2. **Specialized Tasks**: Ask to invoke specific agents: *"Use firebase-expert to debug security rules"*
3. **Step-by-Step Guides**: Reference skills: *"Follow crud-page-builder to create admin page for deepenings"*

### Quick Start Examples

```
"Create admin CRUD for deepenings using crud-page-builder skill"
"Debug Firebase permission error with firebase-expert"
"Add tag autocomplete using tag-management skill"
"Create new repository for media collection following repository-factory-creator"
```

## Agent Descriptions

### firebase-expert
Specialist in Firebase operations - Firestore queries, security rules, authentication flows, and troubleshooting common Firebase issues.

### crud-builder  
Expert in building admin CRUD interfaces following the project's Repository/Factory pattern with consistent styling and role-based access.

### tag-specialist
Focused on the normalized tag system - global tag management, snippet associations, usage tracking, and tag-based features.

### outline-architect
Specialist in hierarchical outline editor - Zustand state management, drag-and-drop, content organization, and export features.

### theme-designer
Expert in IBM Plex Sans theme system, light/dark modes, Tailwind patterns, and consistent component styling.

### ai-integrator
Plans and implements AI features - local LLM setup (Ollama), RAG architecture, semantic search, and content suggestions.

### deployment-manager
Handles Firebase deployments, Next.js production builds, security rules deployment, and CI/CD pipelines.

## Skill Guides

### crud-page-builder.md
Complete template for creating standardized admin CRUD pages including:
- Listing page with search/filter
- Create/edit forms with validation  
- Delete with confirmation
- Role-based access control
- Loading states and error handling

### repository-factory-creator.md
Step-by-step guide for creating new data access layers:
- Type definition in `src/types/`
- Factory class with validation
- Repository class extending BaseRepository
- Custom query methods
- Security rules patterns

### tag-management.md
Comprehensive guide to tag system:
- Tag architecture (global tags + snippet associations)
- TagRepository operations
- Tag autocomplete component
- Add/remove tags with count management
- Tag cleanup utilities

### firebase-operations.md
Firebase patterns and troubleshooting:
- Firestore configuration
- Security rules patterns
- Common query operations
- Authentication flows
- Batch operations and transactions
- Common errors and solutions

## Best Practices

1. **Reference Documentation**: Always check SPEC.md and ROADMAP.md for project context
2. **Use Existing Patterns**: Follow established Repository/Factory patterns
3. **Null Safety**: Use optional chaining for old data compatibility
4. **Role Checks**: Verify admin access in UI and security rules
5. **Consistent Styling**: Follow IBM Plex Sans theme with Tailwind patterns

## Contributing

When adding new agents or skills:

1. Add agent definition to `AGENTS.md`
2. Create skill file in `skills/` directory with YAML frontmatter
3. Update `copilot-instructions.md` quick reference
4. Test with actual Copilot prompts

## Related Documentation

- [DOCS/SPEC.md](../DOCS/SPEC.md) - Technical specification
- [DOCS/ROADMAP.md](../DOCS/ROADMAP.md) - Project roadmap and tasks
- [src/repositories/](../src/repositories/) - Data access layer implementations
- [src/factories/](../src/factories/) - Entity factory implementations
