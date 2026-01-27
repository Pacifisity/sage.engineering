/**
 * logic/selectors.js
 * Centralized DOM element references.
 */

/**
 * Returns an object containing primary application elements.
 */
export const getElements = () => ({
    // Containers & Status
    library: document.getElementById('library'),
    searchBar: document.getElementById('search'),
    filterButtons: document.querySelectorAll('.filter-btn'),
    syncStatus: document.querySelector('#sync-status strong'),
    
    // Modals & Overlays
    modalOverlay: document.getElementById('modal-overlay'),
    modalTitle: document.getElementById('modal-title'),
    accountModal: document.getElementById('account-modal'),
    deleteConfirmModal: document.getElementById('delete-confirm-modal'),
    importConfirmModal: document.getElementById('import-confirm-modal'),
    syncModal: document.getElementById('sync-modal'),
    
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
    
    // Aggregates various UI 'close' or 'cancel' triggers
    // Added #cancel-sync here just in case you add a close button to that modal
    closeBtns: () => document.querySelectorAll('#close-modal, #close-account-modal, #cancel-delete, #cancel-import, #cancel-sync')
};