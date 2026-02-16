# Flow structure

## Overview
- Keep files under 200 lines.
- Group by goal: core logic, app wiring, integrations.
- CSS and JS live in dedicated folders.
- Don't forget to update README to reflect changes

## Folders
- css
  - base.css: global tokens and layout
  - components: UI pieces (buttons, cards, inputs, overlays, motion)
- js
  - core: shared logic (data, UI rendering, date utilities)
    - data.js: task normalization and scoring
    - rendering.js: view rendering functions (tasks, backlog, focus, schedule)
    - dateUtils.js: date formatting and calculations
    - ui.js: view switching and form utilities
  - app: feature wiring (tasks, google sync, UI controls)
    - tasks.js: task management core
    - taskModal.js: task create/edit modal logic
    - googleSync.js: sync logic between local and cloud
    - conflictUI.js: sync conflict resolution modals
    - focusTimer.js: pomodoro timer implementation
    - quoteManager.js: daily quote loading and preferences
    - profilePanel.js: account panel positioning and auth state
    - scheduleAnimation.js: schedule view transitions
    - eventHandlers.js: all DOM event listener setup
  - integrations: external I/O (Google Drive, file import/export)
    - googleDrive.js: public API facade for Google Drive
    - googleAuth.js: OAuth token management and refresh
    - driveOperations.js: Drive file upload/download
    - fileIO.js: local file import/export handlers

## Entry points
- index.html links CSS and loads js/app.js
- app.js initializes all managers and wires event handlers

## Where to add things
- New UI styles: css/components
- New view logic: js/app
- Shared helpers: js/core
- External APIs: js/integrations
- Keep all logic files under 200 lines by extracting reusable modules
