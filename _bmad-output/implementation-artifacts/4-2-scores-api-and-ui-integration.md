# Story 4.2: Scores API and UI Integration

Status: ready-for-dev

## Story
As a user, I want to see quality scores alongside each response in both modes.

## Acceptance Criteria
1. Quality scores displayed alongside response via SSE quality.score events
2. Each dimension shows score value
3. In comparison mode, scores displayed per panel
4. Loading indicator shows while scoring runs
5. Scores appear when ready without refresh

## Dev Notes
**Implementation:** Extend SSE to emit quality.score events. UI components for score display.
**Key Files:** apps/api quality scoring integration, apps/web components/QualityScores.tsx
## Dev Agent Record
_To be filled by dev agent_
