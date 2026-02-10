# Story 2.4: PWA Shell with Routing and Technique Selection

Status: ready-for-dev

## Story
As a user, I want to open WikiRAG in my browser as an installable app with technique selection.

## Acceptance Criteria
1. App loads within 3 seconds on localhost with PWA install option
2. Single query view as default with technique selector dropdown
3. Mode toggle switches between single/comparison within 100ms (client-side)
4. Keyboard navigation reaches all interactive elements
5. Semantic HTML for accessibility

## Dev Notes

**Implementation:** React SPA in apps/web with Vite + vite-plugin-pwa. Zustand for state, Shadcn/ui + Tailwind for UI, React Router for routing.

**Key Files:** apps/web/src/App.tsx, pages/SingleQuery.tsx, components/TechniqueSelector.tsx, stores/query-store.ts, manifest.json

**Testing:** Vitest + React Testing Library, accessibility tests, PWA manifest validation.

## Dev Agent Record
_To be filled by dev agent_
