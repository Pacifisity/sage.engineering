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
    sortSelect: document.getElementById('sort-select'),
    
    // Modals & Overlays
    modalOverlay: document.getElementById('modal-overlay'),
    modalTitle: document.getElementById('modal-title'),
    accountModal: document.getElementById('account-modal'),
    deleteConfirmModal: document.getElementById('delete-confirm-modal'),
    disconnectConfirmModal: document.getElementById('disconnect-confirm-modal'),
    importConfirmModal: document.getElementById('import-confirm-modal'),
    exportFormatModal: document.getElementById('export-format-modal'),
    importFormatModal: document.getElementById('import-format-modal'),
    syncModal: document.getElementById('sync-modal'),
    themeModal: document.getElementById('theme-modal'),
    
    // Form Inputs
    bookForm: document.getElementById('book-form'),
    bookIdInput: document.getElementById('book-id'),
    titleInput: document.getElementById('title'),
    authorInput: document.getElementById('author'),
    urlInput: document.getElementById('url'),
    statusInput: document.getElementById('status'),
    typeInput: document.getElementById('tracking-type'),
    countInput: document.getElementById('tracking-value'),
    ratingInput: document.getElementById('rating'),
    notesInput: document.getElementById('notes'),
    
    // Action Buttons & Controls
    deleteBtn: document.getElementById('delete-btn'),
    confirmDeleteBtn: document.getElementById('confirm-delete-btn'),
    cancelDeleteBtn: document.getElementById('cancel-delete'),
    confirmDisconnectBtn: document.getElementById('confirm-disconnect-btn'),
    cancelDisconnectBtn: document.getElementById('cancel-disconnect'),
    confirmImportBtn: document.getElementById('confirm-import-btn'),
    importFile: document.getElementById('import-file'),
    exportTrigger: document.getElementById('export-trigger'),
    importTrigger: document.getElementById('import-trigger'),
    exportJsonBtn: document.getElementById('export-json-btn'),
    exportCsvBtn: document.getElementById('export-csv-btn'),
    exportMdBtn: document.getElementById('export-md-btn'),
    importJsonBtn: document.getElementById('import-json-btn'),
    importCsvBtn: document.getElementById('import-csv-btn'),
    importMdBtn: document.getElementById('import-md-btn'),
    googleLoginBtn: document.getElementById('google-login-btn'),
    googleLogoutBtn: document.getElementById('google-logout-btn'),
    themeTrigger: document.getElementById('theme-trigger'),
    themeInputs: document.querySelectorAll('#theme-modal [data-theme-key]'),
    themeAdvancedToggle: document.getElementById('theme-advanced-toggle'),
    saveThemeBtn: document.getElementById('save-theme'),
    resetThemeBtn: document.getElementById('reset-theme'),
    cancelThemeBtn: document.getElementById('cancel-theme'),
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
    closeBtns: () => document.querySelectorAll('#close-modal, #close-account-modal, #cancel-delete, #cancel-disconnect, #cancel-import, #cancel-theme, #cancel-sync')
};