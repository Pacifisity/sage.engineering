/**
 * logic/selectors.js
 * * Centralized DOM element references.
 */

/**
 * Returns an object containing primary application elements.
 * * NOTE: This is wrapped in a function to ensure elements are queried 
 * lazily (only when needed), preventing 'null' references if the script 
 * executes before the DOM has fully parsed.
 */
export const getElements = () => ({
    // Containers & Status
    library: document.getElementById('library'),
    syncStatus: document.querySelector('#sync-status strong'),
    
    // Modals & Overlays
    modalOverlay: document.getElementById('modal-overlay'),
    modalTitle: document.getElementById('modal-title'),
    accountModal: document.getElementById('account-modal'),
    deleteConfirmModal: document.getElementById('delete-confirm-modal'),
    importConfirmModal: document.getElementById('import-confirm-modal'),
    
    // Form Inputs
    bookForm: document.getElementById('book-form'),
    bookIdInput: document.getElementById('book-id'),
    titleInput: document.getElementById('title'),
    urlInput: document.getElementById('url'),
    statusInput: document.getElementById('status'),
    typeInput: document.getElementById('tracking-type'),
    countInput: document.getElementById('tracking-value'),
    ratingInput: document.getElementById('rating'),
    
    // Action Buttons & Controls
    deleteBtn: document.getElementById('delete-btn'),
    confirmDeleteBtn: document.getElementById('confirm-delete-btn'),
    confirmImportBtn: document.getElementById('confirm-import-btn'),
    importFile: document.getElementById('import-file'),
    exportBtn: document.getElementById('export-btn'),
    googleLoginBtn: document.getElementById('google-login-btn'),
});

/**
 * Grouped selector queries for bulk event binding and state management.
 */
export const getGroups = {
    // Selects all overlay containers for global close actions
    allModals: () => document.querySelectorAll('.modal-overlay'),
    
    // Selects all category filter controls
    filterBtns: () => document.querySelectorAll('.filter-btn'),
    
    // Aggregates various UI 'close' or 'cancel' triggers across different modals
    closeBtns: () => document.querySelectorAll('#close-modal, #close-account-modal, #cancel-delete, #cancel-import')
};