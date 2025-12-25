# Fireside Archive - Project Specification

## 1. Project Overview
A prototype website to store, manage, and compile snippets and deepenings from BUPC firesides. The system allows users to explore content, create custom outlines via drag-and-drop, and export them.

## 2. Tech Stack
- **Frontend Framework**: Next.js 14+ (App Router)
- **Styling**: Tailwind CSS
- **Database**: Firebase Firestore (NoSQL)
- **Authentication**: Firebase Authentication
- **State Management**: Zustand (for Outline editor state)
- **Drag & Drop**: dnd-kit or react-beautiful-dnd
- **AI Integration**: Gemini Pro API (Future integration)

## 3. User Roles
- **SuperAdmin**: Full system access, user management, schema changes.
- **Admin**: Content management (CRUD on Snippets, Deepenings, etc.), view logs.
- **Participant**: View content, create personal outlines, add comments (if enabled).
- **Guest**: Read-only access to public content.

## 4. Data Model (Firestore Schema)

### `users` Collection
- `uid` (string): Firebase Auth ID
- `email` (string)
- `displayName` (string)
- `role` (string): "SuperAdmin" | "Admin" | "Participant" | "Guest"
- `createdAt` (timestamp)
- `lastLogin` (timestamp)

### `firesides` Collection
- `id` (string): Auto-generated
- `name` (string): e.g., "Why Life"
- `description` (string): e.g., "The purpose of life..."
- `date` (timestamp)
- `createdAt` (timestamp)

### `snippets` Collection
- `id` (string): Auto-generated
- `firesideId` (string): Reference to `firesides` doc
- `name` (string): Short name (up to 72 words)
- `text` (string): Main content
- `naturalOrder` (number): e.g., 2.30 (Rank in original fireside)
- `tags` (array of objects): 
  - `[{ tagId: string, name: string, weight: number (1-100), distance: number (1-10) }]`

### `deepenings` Collection
- `id` (string): Auto-generated
- `snippetId` (string): Reference to parent `snippets` doc
- `name` (string)
- `text` (string): Extended research text
- `tags` (array of objects): Same structure as Snippets

### `supportingMaterials` Collection
- `id` (string): Auto-generated
- `sourceId` (string): ID of the Snippet or Deepening
- `sourceType` (string): "snippet" | "deepening"
- `text` (string): Reference text

### `comments` Collection
- `id` (string): Auto-generated
- `sourceId` (string): ID of the Snippet or Deepening
- `sourceType` (string): "snippet" | "deepening"
- `userId` (string): Author
- `text` (string)
- `createdAt` (timestamp)

### `tags` Collection (Global Tag Registry)
- `id` (string): Auto-generated
- `name` (string): e.g., "Shilo"
- `count` (number): Usage frequency

### `outlines` Collection
- `id` (string): Auto-generated
- `userId` (string): Owner
- `title` (string)
- `isPublic` (boolean)
- `items` (array of objects - JSON):
  - Stores the structure and order of the outline.
  - Structure: `[{ itemId: "uuid", type: "snippet"|"deepening", refId: "db_id", isVisible: boolean, children: [] }]`
- `createdAt` (timestamp)
- `updatedAt` (timestamp)

### `auditLogs` Collection
- `id` (string): Auto-generated
- `userId` (string): Who performed the action
- `userName` (string): Cached display name
- `action` (string): "CREATE", "UPDATE", "DELETE"
- `targetCollection` (string): e.g., "snippets"
- `targetId` (string)
- `summary` (string): e.g., "Joe B. updated Snippet X"
- `timestamp` (timestamp)

## 5. Functional Requirements

### Content Management (CRUD)
- **Firesides**: Manual entry in Firestore initially (Read-only in app for now).
- **Snippets/Deepenings**: Full CRUD for Admins.
- **Tags**: Ability to associate tags with weight/distance metrics during creation/editing.

### Outline Editor (Advanced Feature)
- **Interface**: Split screen or drawer.
    - **Source (Right/Left Panel)**: Searchable list of Snippets, Deepenings, etc.
    - **Canvas (Main Panel)**: Drop zone for compiling content.
- **Actions**:
    - Drag and drop to reorder.
    - Toggle visibility of specific sections.
    - Auto-save every 5 seconds.
- **Export**:
    - PDF
    - Markdown
    - Static HTML + Images (Zip)

### Administration
- **Audit Log**: View history of data changes.
- **User Management**: Assign roles (SuperAdmin only).

### Architecture Patterns
- **Service Layer**: Isolate Firestore logic (Factory/Repository pattern adaptation).
- **Components**: Reusable Tailwind components.
