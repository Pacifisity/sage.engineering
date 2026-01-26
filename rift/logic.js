import { UI } from './logic/ui.js';
import { DriveService } from './logic/drive.js';
import { DataService } from './logic/data.js';
import { state } from './logic/state.js';

// --- DOM Elements ---
const elements = {
    library: document.getElementById('library'),
    bookForm: document.getElementById('book-form'),
    modal: document.getElementById('modal-overlay'),
    modalTitle: document.getElementById('modal-title'),
    bookId: document.getElementById('book-id'),
    deleteBtn: document.getElementById('delete-btn'),
    googleLoginBtn: document.getElementById('google-login-btn'),
    syncStatus: document.querySelector('#sync-status strong')
};

// --- Core Logic ---
const render = () => {
    UI.renderBooks(state.books, state.currentFilter, elements.library);
};

const saveAndSync = async () => {
    state.save(state.books);
    render();
    if (DriveService.accessToken) {
        try { 
            await DriveService.saveStories(state.books); 
        } catch (err) { 
            console.error("Sync Failed", err); 
        }
    }
};

const closeAllModals = () => {
    document.querySelectorAll('.modal-overlay').forEach(m => m.style.display = 'none');
};

// --- Event Handlers ---
const setupEventListeners = () => {

    // Global: Close modals on background click
    window.onclick = (event) => {
        if (event.target.classList.contains('modal-overlay')) {
            closeAllModals();
        }
    };

    // 1. Data Import/Export
    const exportBtn = document.getElementById('export-btn');
    if (exportBtn) exportBtn.onclick = () => DataService.exportJSON(state.books);

    const importFile = document.getElementById('import-file');
    const importTrigger = document.getElementById('import-trigger');
    
    if (importTrigger && importFile) {
        importTrigger.onclick = () => importFile.click();
        importFile.onchange = (e) => {
            if (e.target.files.length > 0) {
                const modal = document.getElementById('import-confirm-modal');
                if (modal) modal.style.display = 'flex';
            }
        };
    }

    const confirmImportBtn = document.getElementById('confirm-import-btn');
    if (confirmImportBtn) {
        confirmImportBtn.onclick = async () => {
            const file = importFile?.files[0];
            if (!file) return;
            try {
                const newData = await DataService.importJSON(file);
                if (Array.isArray(newData)) {
                    state.books = newData;
                    await saveAndSync();
                    closeAllModals();
                    importFile.value = '';
                }
            } catch (err) { alert(err); }
        };
    }

    // 2. Library Card Actions (Favorites & Editing)
    elements.library?.addEventListener('click', (e) => {
        const card = e.target.closest('.book-card');
        const favBtn = e.target.closest('.fav-btn');

        if (favBtn) {
            e.stopPropagation();
            const id = parseInt(favBtn.dataset.id);
            state.books = state.books.map(b => b.id === id ? { ...b, isFavorite: !b.isFavorite } : b);
            saveAndSync();
            return;
        }

        if (card) openEditModal(parseInt(card.dataset.id));
    });

    // 3. Modal Controls (Open/Delete/Cancel)
    elements.deleteBtn.onclick = () => {
        document.getElementById('delete-confirm-modal').style.display = 'flex';
    };

    document.getElementById('open-modal').onclick = () => {
        elements.bookForm.reset();
        elements.bookId.value = '';
        elements.modalTitle.innerText = "Add New Book";
        elements.deleteBtn.style.display = 'none';
        elements.modal.style.display = 'flex';
    };

    document.getElementById('open-account-modal').onclick = () => {
        document.getElementById('account-modal').style.display = 'flex';
    };

    document.querySelectorAll('#close-modal, #close-account-modal, #cancel-delete, #cancel-import').forEach(btn => {
        btn.onclick = closeAllModals;
    });

    document.getElementById('confirm-delete-btn').onclick = () => {
        const idToDelete = parseInt(elements.bookId.value);
        state.books = state.books.filter(b => b.id !== idToDelete);
        saveAndSync();
        closeAllModals();
    };

    // 4. Form Submission (Create/Update)
    elements.bookForm.onsubmit = (e) => {
        e.preventDefault();
        const currentId = elements.bookId.value;
        const bookData = {
            id: currentId ? parseInt(currentId) : Date.now(),
            title: document.getElementById('title').value,
            url: document.getElementById('url').value,
            status: document.getElementById('status').value,
            trackingType: document.getElementById('tracking-type').value,
            currentCount: document.getElementById('tracking-value').value || 0,
            rating: parseInt(document.getElementById('rating').value),
            isFavorite: state.books.find(b => b.id == currentId)?.isFavorite || false
        };

        if (currentId) {
            state.books = state.books.map(b => b.id === bookData.id ? bookData : b);
        } else {
            state.books.push(bookData);
        }

        saveAndSync();
        closeAllModals();
    };

    // 5. Filtering
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.currentFilter = btn.dataset.filter;
            render();
        };
    });
};

// --- Helpers ---
const openEditModal = (id) => {
    const book = state.books.find(b => b.id === id);
    if (!book) return;

    elements.bookId.value = book.id;
    document.getElementById('title').value = book.title;
    document.getElementById('status').value = book.status;
    document.getElementById('tracking-type').value = book.trackingType;
    document.getElementById('tracking-value').value = book.currentCount;
    document.getElementById('rating').value = book.rating;
    document.getElementById('url').value = book.url || '';

    elements.modalTitle.innerText = "Edit Book";
    elements.deleteBtn.style.display = 'block';
    elements.modal.style.display = 'flex';
};

// --- Init ---
setupEventListeners();
render();
DriveService.init();