// logic/selectors.js

// We use a getter function so we don't grab elements before the DOM is ready
export const getElements = () => ({
    library: document.getElementById('library'),
    syncStatus: document.querySelector('#sync-status strong'),
    modalOverlay: document.getElementById('modal-overlay'),
    modalTitle: document.getElementById('modal-title'),
    accountModal: document.getElementById('account-modal'),
    deleteConfirmModal: document.getElementById('delete-confirm-modal'),
    importConfirmModal: document.getElementById('import-confirm-modal'),
    bookForm: document.getElementById('book-form'),
    bookIdInput: document.getElementById('book-id'),
    titleInput: document.getElementById('title'),
    urlInput: document.getElementById('url'),
    statusInput: document.getElementById('status'),
    typeInput: document.getElementById('tracking-type'),
    countInput: document.getElementById('tracking-value'),
    ratingInput: document.getElementById('rating'),
    deleteBtn: document.getElementById('delete-btn'),
    confirmDeleteBtn: document.getElementById('confirm-delete-btn'),
    confirmImportBtn: document.getElementById('confirm-import-btn'),
    importFile: document.getElementById('import-file'),
    exportBtn: document.getElementById('export-btn'),
    googleLoginBtn: document.getElementById('google-login-btn'),
});

export const getGroups = {
    allModals: () => document.querySelectorAll('.modal-overlay'),
    filterBtns: () => document.querySelectorAll('.filter-btn'),
    closeBtns: () => document.querySelectorAll('#close-modal, #close-account-modal, #cancel-delete, #cancel-import')
};