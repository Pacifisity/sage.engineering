# Project Guidelines

## Project Context
- This workspace is a static browser-based story reader plus story content repository.
- Runtime is file-based: open `index.html` directly in a browser.
- Primary app files:
  - `script.js` (reader state, library loading, markdown rendering, chapter navigation)
  - `styles.css` (UI/theme)
  - `stories/stories-library.json` (story registry and chapter paths)

## Build and Test
- No build step or package manager tasks are required.
- Validation workflow:
  1. Open `index.html` in browser.
  2. Verify story list and chapter navigation load correctly.
  3. Confirm edited markdown renders correctly in the reader.
  4. If changing story registration, ensure `stories/stories-library.json` paths resolve.

## Architecture and Data Boundaries
- Treat `stories/stories-library.json` as the source of truth for what appears in the reader.
- Story chapter files are markdown in `stories/<Story Name>/<N>.md`.
- Some stories can be intentionally hidden in `script.js` via `hiddenStoryIds`; do not change hidden/visible behavior unless asked.
- Keep reader state compatibility (`grimoire.readerState.v1`) unless migration is explicitly requested.

## Story Editing Conventions
- Preserve narrative continuity and existing tone for each story.
- For `stories/Pay in Bone`, consult notes before editing chapters:
  - `stories/Pay in Bone/notes/characters.md`
  - `stories/Pay in Bone/notes/world-rules.md`
  - `stories/Pay in Bone/notes/continuity-checkpoints.md`
  - `stories/Pay in Bone/notes/power.md`
  - `stories/Pay in Bone/notes/quick-reference-continuation.md`
- Keep single-MC POV constraints where defined in story notes.
- Keep magic/cost mechanics explicit where required by story canon.

## Authoring Guardrails
- Avoid fourth-wall/meta references in prose (e.g., "Chapter X", "Episode").
- When referencing prior events in narrative text, use diegetic memory cues instead of structural labels.
- Do not introduce retcons to locked timeline/canon notes unless explicitly requested.

## Editing Safety
- Prefer minimal changes scoped to the requested story/chapter.
- Do not rename story folders, chapter files, or IDs unless requested.
- If adding a chapter, update `stories/stories-library.json` consistently with title/path.
