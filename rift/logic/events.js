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
        // Local File Export
        elements.exportBtn?.addEventListener('click', () => DataService.exportJSON(state.books));
        
        // Import Workflow: Trigger confirm modal when a file is selected
        elements.importFile?.addEventListener('change', (e) => {
            if (e.target.files.length > 0) ModalController.open(elements.importConfirmModal);
        });

        // Finalize Import: Parse JSON and update application state
        elements.confirmImportBtn?.addEventListener('click', async () => {
            const file = elements.importFile?.files[0];
            if (!file) return;
            try {
                const newData = await DataService.importJSON(file);
                await AppController.handleImport(newData);
                ModalController.closeAll();
                elements.importFile.value = ''; // Reset input to allow re-selection of same file
            } catch (err) { 
                alert(err); 
            }
        });

        // Proxy click for custom styled upload buttons
        document.getElementById('import-trigger').onclick = () => elements.importFile.click();

        // Cloud Authentication
        if (elements.googleLoginBtn) {
            elements.googleLoginBtn.addEventListener('click', () => {
                DriveService.login();
            });
        }
    },

    /**
     * Handle library-wide interactions using event delegation for efficiency.
     */
    initLibraryHandlers(elements) {
        elements.library?.addEventListener('click', (e) => {
            const card = e.target.closest('.book-card');
            const favBtn = e.target.closest('.fav-btn');
            const id = parseInt(card?.dataset.id || favBtn?.dataset.id);

            // Handle Favorite Toggle
            if (favBtn) {
                e.stopPropagation();
                BookActions.toggleFavorite(id);
                AppController.sync();
            } 
            // Handle Edit Mode: Populate and open form
            else if (card) {
                const book = state.books.find(b => b.id === id);
                if (book) {
                    FormHandler.setFormData(book, elements);
                    ModalController.open(elements.modalOverlay, "Edit Book", elements);
                    elements.deleteBtn.style.display = 'block';
                }
            }
        });

        // Setup filter categorization listeners
        getGroups.filterBtns().forEach(btn => {
            btn.onclick = () => {
                getGroups.filterBtns().forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                state.currentFilter = btn.dataset.filter;
                UI.renderBooks(state.books, state.currentFilter, elements.library);
            };
        });
    },

    /**
     * Manage form submissions, deletions, and entry-point triggers.
     */
    initFormHandlers(elements) {
        // Form Submission (Add/Edit)
        elements.bookForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            const bookData = FormHandler.getFormData(elements);
            BookActions.saveBook(bookData);
            AppController.sync();
            ModalController.closeAll();
        });

        // Multi-step Deletion Workflow
        elements.deleteBtn?.addEventListener('click', () => ModalController.open(elements.deleteConfirmModal));
        
        elements.confirmDeleteBtn?.addEventListener('click', () => {
            BookActions.deleteBook(parseInt(elements.bookIdInput.value));
            AppController.sync();
            ModalController.closeAll();
        });

        // UI Open Triggers
        document.getElementById('open-modal')?.addEventListener('click', () => {
            FormHandler.reset(elements);
            ModalController.open(elements.modalOverlay, "Add New Book", elements);
            elements.deleteBtn.style.display = 'none'; // Hide delete for new entries
        });

        document.getElementById('open-account-modal')?.addEventListener('click', () => {
            ModalController.open(elements.accountModal);
        });
    }
};