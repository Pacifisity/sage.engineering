import { ModalController } from './modalController.js';
import { DriveService } from './drive.js';
import { DataService } from './data.js';
import { BookActions } from './actions.js';
import { AppController } from './appController.js';
import { FormHandler } from './formHandler.js';
import { getGroups } from './selectors.js';
import { state } from './state.js';
import { UI } from './ui.js';

/**
 * Orchestrates event listeners and user interactions across the application.
 */
export const Events = {
    // Helper to prevent animation lag during rapid typing
    _debounce(func, delay = 250) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), delay);
        };
    },

    /**
     * Set up global UI interactions like closing modals via backdrop or dedicated buttons.
     */
    initGlobalHandlers() {
        window.onclick = (e) => {
            if (e.target.classList.contains('modal-overlay')) ModalController.closeAll();
        };
        getGroups.closeBtns().forEach(btn => btn.onclick = ModalController.closeAll);
    },

    /**
     * Initialize handlers for local data import/export and Google Drive integration.
     */
    initDataHandlers(elements) {
        elements.exportBtn?.addEventListener('click', () => DataService.exportJSON(state.books));
        
        elements.importFile?.addEventListener('change', (e) => {
            if (e.target.files.length > 0) ModalController.open(elements.importConfirmModal);
        });

        elements.confirmImportBtn?.addEventListener('click', async () => {
            const file = elements.importFile?.files[0];
            if (!file) return;
            try {
                const newData = await DataService.importJSON(file);
                await AppController.handleImport(newData);
                ModalController.closeAll();
                elements.importFile.value = ''; 
            } catch (err) { 
                alert(err); 
            }
        });

        document.getElementById('import-trigger').onclick = () => elements.importFile.click();

        if (elements.googleLoginBtn) {
            elements.googleLoginBtn.addEventListener('click', () => {
                DriveService.login();
            });
        }
    },

    /**
     * Handle library-wide interactions including Search and Filtering.
     */
    initLibraryHandlers(elements) {
        // --- SEARCH LOGIC ---
        const debouncedSearch = this._debounce((query) => {
            // Re-render with current filter + search query
            UI.renderBooks(state.books, state.currentFilter, elements.library, query);
        });

        elements.searchBar?.addEventListener('input', (e) => {
            debouncedSearch(e.target.value);
        });

        // Prevent search bar from refreshing page on 'Enter'
        elements.searchBar?.closest('form')?.addEventListener('submit', e => e.preventDefault());


        // --- CARD & FAVORITE INTERACTION ---
        elements.library?.addEventListener('click', (e) => {
            const card = e.target.closest('.book-card');
            const favBtn = e.target.closest('.fav-btn');
            const id = parseInt(card?.dataset.id || favBtn?.dataset.id);

            if (favBtn) {
                e.stopPropagation();
                BookActions.toggleFavorite(id);
                AppController.sync();
            } 
            else if (card) {
                const book = state.books.find(b => b.id === id);
                if (book) {
                    FormHandler.setFormData(book, elements);
                    ModalController.open(elements.modalOverlay, "Edit Book", elements);
                    elements.deleteBtn.style.display = 'block';
                }
            }
        });

        // --- FILTER TAB LOGIC ---
        getGroups.filterBtns().forEach(btn => {
            btn.onclick = () => {
                getGroups.filterBtns().forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                state.currentFilter = btn.dataset.filter;
                
                // When switching tabs, respect the current search term
                const currentSearch = elements.searchBar?.value || '';
                UI.renderBooks(state.books, state.currentFilter, elements.library, currentSearch);
            };
        });
    },

    /**
     * Manage form submissions, deletions, and entry-point triggers.
     */
    initFormHandlers(elements) {
        elements.bookForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            const bookData = FormHandler.getFormData(elements);
            BookActions.saveBook(bookData);
            AppController.sync();
            ModalController.closeAll();
        });

        elements.deleteBtn?.addEventListener('click', () => ModalController.open(elements.deleteConfirmModal));
        
        elements.confirmDeleteBtn?.addEventListener('click', () => {
            BookActions.deleteBook(parseInt(elements.bookIdInput.value));
            AppController.sync();
            ModalController.closeAll();
        });

        document.getElementById('open-modal')?.addEventListener('click', () => {
            FormHandler.reset(elements);
            ModalController.open(elements.modalOverlay, "Add New Book", elements);
            elements.deleteBtn.style.display = 'none';
        });

        document.getElementById('open-account-modal')?.addEventListener('click', () => {
            ModalController.open(elements.accountModal);
        });
    }
};