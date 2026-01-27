/**
 * main.js
 * * Application Entry Point & Orchestrator.
 * Responsible for bootstrapping services, binding event domains, 
 * and executing the initial UI draw.
 */

import { UI } from './logic/ui.js';
import { DriveService } from './logic/drive.js';
import { state } from './logic/state.js';
import { getElements } from './logic/selectors.js';
import { Events } from './logic/events.js'; 

document.addEventListener('DOMContentLoaded', () => {
    // Retrieve centralized DOM references
    const elements = getElements();
    
    // --- SERVICE INITIALIZATION ---
    // Prepare external integrations (e.g., Google Drive API client)
    DriveService.init();
    
    // --- EVENT BINDING ---
    // Initialize event listeners by functional domain
    Events.initGlobalHandlers();            // Modals and window-level clicks
    Events.initDataHandlers(elements);      // Import, Export, and Cloud Sync
    Events.initLibraryHandlers(elements);   // Card interactions and filtering
    Events.initFormHandlers(elements);      // CRUD operations and form logic
    
    // --- INITIAL RENDER ---
    // Hydrate the UI with data from state.js (LocalStorage source-of-truth)
    UI.renderBooks(state.books, state.currentFilter, elements.library);
});