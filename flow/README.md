# Flow structure

## Overview
- Keep files under 200 lines.
- Group by goal: core logic, app wiring, integrations.
- CSS and JS live in dedicated folders.

## Folders
- css
  - base.css: global tokens and layout
  - components: UI pieces (buttons, cards, inputs, overlays, motion)
- js
  - core: shared logic (data, UI rendering)
  - app: feature wiring (tasks, google sync)
  - integrations: external I/O (Google Drive, file import/export)

## Entry points
- index.html links CSS and loads js/app.js

## Where to add things
- New UI styles: css/components
- New view logic: js/app
- Shared helpers: js/core
- External APIs: js/integrations
