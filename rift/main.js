import { UI } from './logic/ui.js';
import { DriveService } from './logic/drive.js';
import { state } from './logic/state.js';
import { getElements } from './logic/selectors.js';
import { Events } from './logic/events.js'; 

document.addEventListener('DOMContentLoaded', () => {
    const elements = getElements();
    
    // Initialize Services
    DriveService.init();
    
    // Setup specific event domains
    Events.initGlobalHandlers();
    Events.initDataHandlers(elements);
    Events.initLibraryHandlers(elements);
    Events.initFormHandlers(elements);
    
    // Initial Render
    UI.renderBooks(state.books, state.currentFilter, elements.library);
});