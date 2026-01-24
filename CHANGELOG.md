# Changelog

All notable changes to vLLM Studio will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.3.1] - 2026-01-24

### Added
- Frontend: Added `frontend/AGENTS.md` with rebuild notes and standalone asset copy guidance

### Fixed
- Chat: Toolbelt controls remain interactive regardless of composer state
- Chat: Session navigation loads messages and titles when opening a session id
- Chat: Model list now uses `/v1/models` ids for selection
- Mobile: Composer input respects min-height without fixed cap

## [0.3.0] - 2026-01-10

### Added
- **Unified Sidebar Navigation**: All app navigation (Dashboard, Chat, Recipes, Logs, Usage, Configs) moved into the chat sidebar
- **Chat Pagination**: Chats now load 15 at a time with "Load more" button to prevent performance issues
- **Date Grouping**: Chat sessions organized by Today, Yesterday, Last 7 days, Older
- **Model Selector Dropdown**: Quick model switching directly in chat header with search
- **Sidebar Search**: Filter conversations by title or model name
- **Empty State Illustration**: Friendly SVG art when no conversations exist

### Changed
- **Sidebar Design**: Full-height sidebar with logo, nav, and chat list in one unified component
- **Color Scheme**: Replaced green accent with subtle purple (`hsl(270)`) for links and highlights
- **Composer Buttons**: Unified dim accent styling instead of multiple colored badges (blue/purple/emerald/amber)
- **Light Mode**: Improved readability with better contrast and softer backgrounds
- **Collapsed Sidebar**: Minimal icon rail with nav icons and first-letter chat indicators

### Fixed
- Chat page layout now properly accounts for full-height sidebar
- Navigation hidden on chat page (sidebar contains all nav)

## [0.2.1] - 2025-12-20

### Fixed
- Frontend: Added redirect from `/models` to `/recipes` to fix 404 error when accessing model management page
  - Updated `frontend/next.config.ts` with permanent redirect (HTTP 308)

## [0.2.0] - 2024-12-XX

Previous release - vLLM Studio v0.2.0
